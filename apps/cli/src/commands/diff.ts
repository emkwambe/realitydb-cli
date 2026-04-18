import * as fs from 'fs';
import * as path from 'path';
import { suggestNext } from '../utils/suggest';

interface DiffResult {
  tablesAdded: string[];
  tablesRemoved: string[];
  tablesShared: string[];
  columnChanges: { table: string; added: string[]; removed: string[] }[];
  rowCountChanges: { table: string; left: number; right: number; delta: number; pct: string }[];
  distributionShifts: { table: string; column: string; leftTop: string; rightTop: string; shift: string }[];
  fkChanges: { table: string; added: string[]; removed: string[] }[];
  summary: { totalChanges: number; breaking: number; cosmetic: number };
}

// ============================================================
// SQL PARSER (shared with profile)
// ============================================================

interface ParsedTable {
  name: string;
  columns: string[];
  columnTypes: Map<string, string>;
  fks: { column: string; refTable: string }[];
  rows: Record<string, string>[];
  rowCount: number;
}

function parseSql(content: string): Map<string, ParsedTable> {
  const tables = new Map<string, ParsedTable>();
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
  const insertRegex = /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;

  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const columns: string[] = [];
    const columnTypes = new Map<string, string>();
    const fks: { column: string; refTable: string }[] = [];

    for (const line of match[2].split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('CONSTRAINT')) continue;

      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+["']?(\w+)["']?/i);
      if (fkMatch) {
        fks.push({ column: fkMatch[1], refTable: fkMatch[2] });
        continue;
      }

      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w\s()]*)/);
      if (colMatch) {
        columns.push(colMatch[1]);
        columnTypes.set(colMatch[1], colMatch[2].trim().split(/\s/)[0]);
      }
    }

    tables.set(name, { name, columns, columnTypes, fks, rows: [], rowCount: 0 });
  }

  // Parse INSERT for row counts and sample data
  while ((match = insertRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const table = tables.get(name);
    if (!table) continue;

    const colList = match[2].split(',').map(c => c.trim().replace(/["']/g, ''));
    const valuesBlock = match[3];
    const rowRegex = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
      table.rowCount++;
      if (table.rows.length < 50) {
        const vals = splitValues(rowMatch[1]);
        const row: Record<string, string> = {};
        for (let i = 0; i < colList.length && i < vals.length; i++) {
          row[colList[i]] = vals[i].replace(/^'|'$/g, '').trim();
        }
        table.rows.push(row);
      }
    }
  }

  return tables;
}

function splitValues(valStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (ch === "'" && valStr[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
    } else if (ch === ',' && !inString) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

// ============================================================
// DIFF ENGINE
// ============================================================

function getTopValue(rows: Record<string, string>[], column: string): string {
  const freq = new Map<string, number>();
  for (const row of rows) {
    const v = row[column];
    if (v && v !== 'NULL') freq.set(v, (freq.get(v) || 0) + 1);
  }
  if (freq.size === 0) return '-';
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const pct = Math.round((top[1] / rows.length) * 100);
  const val = top[0].length > 25 ? top[0].substring(0, 22) + '...' : top[0];
  return `${val} (${pct}%)`;
}

function computeDiff(left: Map<string, ParsedTable>, right: Map<string, ParsedTable>): DiffResult {
  const leftNames = new Set(left.keys());
  const rightNames = new Set(right.keys());

  const tablesAdded = [...rightNames].filter(n => !leftNames.has(n));
  const tablesRemoved = [...leftNames].filter(n => !rightNames.has(n));
  const tablesShared = [...leftNames].filter(n => rightNames.has(n));

  const columnChanges: DiffResult['columnChanges'] = [];
  const rowCountChanges: DiffResult['rowCountChanges'] = [];
  const distributionShifts: DiffResult['distributionShifts'] = [];
  const fkChanges: DiffResult['fkChanges'] = [];

  for (const tableName of tablesShared) {
    const l = left.get(tableName)!;
    const r = right.get(tableName)!;

    // Column changes
    const lCols = new Set(l.columns);
    const rCols = new Set(r.columns);
    const added = [...rCols].filter(c => !lCols.has(c));
    const removed = [...lCols].filter(c => !rCols.has(c));
    if (added.length > 0 || removed.length > 0) {
      columnChanges.push({ table: tableName, added, removed });
    }

    // Row count changes
    if (l.rowCount !== r.rowCount) {
      const delta = r.rowCount - l.rowCount;
      const pct = l.rowCount > 0 ? ((delta / l.rowCount) * 100).toFixed(1) + '%' : 'new';
      rowCountChanges.push({ table: tableName, left: l.rowCount, right: r.rowCount, delta, pct });
    }

    // Distribution shifts (on shared columns with data)
    const sharedCols = [...lCols].filter(c => rCols.has(c));
    for (const col of sharedCols) {
      if (l.rows.length < 3 || r.rows.length < 3) continue;

      const lTop = getTopValue(l.rows, col);
      const rTop = getTopValue(r.rows, col);

      if (lTop !== rTop && lTop !== '-' && rTop !== '-') {
        // Check if it's a meaningful shift (not just UUID differences)
        const lUnique = new Set(l.rows.map(row => row[col]).filter(v => v && v !== 'NULL'));
        const rUnique = new Set(r.rows.map(row => row[col]).filter(v => v && v !== 'NULL'));

        // Only report if it's a categorical column (low cardinality)
        if (lUnique.size <= l.rows.length * 0.5 || rUnique.size <= r.rows.length * 0.5) {
          distributionShifts.push({
            table: tableName,
            column: col,
            leftTop: lTop,
            rightTop: rTop,
            shift: 'top value changed',
          });
        }
      }
    }

    // FK changes
    const lFks = new Set(l.fks.map(fk => `${fk.column}->${fk.refTable}`));
    const rFks = new Set(r.fks.map(fk => `${fk.column}->${fk.refTable}`));
    const fkAdded = [...rFks].filter(f => !lFks.has(f));
    const fkRemoved = [...lFks].filter(f => !rFks.has(f));
    if (fkAdded.length > 0 || fkRemoved.length > 0) {
      fkChanges.push({ table: tableName, added: fkAdded, removed: fkRemoved });
    }
  }

  const breaking = tablesRemoved.length + columnChanges.reduce((s, c) => s + c.removed.length, 0) + fkChanges.reduce((s, c) => s + c.removed.length, 0);
  const cosmetic = tablesAdded.length + columnChanges.reduce((s, c) => s + c.added.length, 0) + rowCountChanges.length + distributionShifts.length;

  return {
    tablesAdded,
    tablesRemoved,
    tablesShared,
    columnChanges,
    rowCountChanges,
    distributionShifts,
    fkChanges,
    summary: { totalChanges: breaking + cosmetic, breaking, cosmetic },
  };
}

// ============================================================
// COMMAND
// ============================================================

export async function diffCommand(leftFile: string, rightFile: string, options: {
  json?: boolean;
}): Promise<void> {
  const leftPath = path.resolve(leftFile);
  const rightPath = path.resolve(rightFile);

  if (!fs.existsSync(leftPath)) {
    console.error(`\n   \u274C Left file not found: ${leftPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(rightPath)) {
    console.error(`\n   \u274C Right file not found: ${rightPath}`);
    process.exit(1);
  }

  const startTime = Date.now();

  const leftContent = fs.readFileSync(leftPath, 'utf-8');
  const rightContent = fs.readFileSync(rightPath, 'utf-8');

  const leftTables = parseSql(leftContent);
  const rightTables = parseSql(rightContent);

  const diff = computeDiff(leftTables, rightTables);
  const elapsed = Date.now() - startTime;

  if (options.json) {
    console.log(JSON.stringify(diff, null, 2));
    process.exit(diff.summary.breaking > 0 ? 1 : 0);
  }

  // Console output
  console.log(`\n\u{1F504} RealityDB Diff`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Left:  ${path.basename(leftPath)} (${leftTables.size} tables, ${[...leftTables.values()].reduce((s, t) => s + t.rowCount, 0)} rows)`);
  console.log(`   Right: ${path.basename(rightPath)} (${rightTables.size} tables, ${[...rightTables.values()].reduce((s, t) => s + t.rowCount, 0)} rows)`);
  console.log(`${'─'.repeat(60)}\n`);

  if (diff.summary.totalChanges === 0) {
    console.log(`   \u2705 Datasets are structurally identical.\n`);
    return;
  }

  // Tables added/removed
  if (diff.tablesAdded.length > 0) {
    console.log(`   \u{1F7E2} Tables added (${diff.tablesAdded.length}):`);
    for (const t of diff.tablesAdded) {
      const rt = rightTables.get(t)!;
      console.log(`      + ${t} (${rt.columns.length} columns, ${rt.rowCount} rows)`);
    }
    console.log();
  }

  if (diff.tablesRemoved.length > 0) {
    console.log(`   \u{1F534} Tables removed (${diff.tablesRemoved.length}):`);
    for (const t of diff.tablesRemoved) {
      const lt = leftTables.get(t)!;
      console.log(`      - ${t} (${lt.columns.length} columns, ${lt.rowCount} rows)`);
    }
    console.log();
  }

  // Column changes
  if (diff.columnChanges.length > 0) {
    console.log(`   \u{1F527} Column changes (${diff.columnChanges.length} table(s)):`);
    for (const change of diff.columnChanges) {
      console.log(`      ${change.table}:`);
      for (const col of change.added) console.log(`         + ${col}`);
      for (const col of change.removed) console.log(`         - ${col}`);
    }
    console.log();
  }

  // Row count changes
  if (diff.rowCountChanges.length > 0) {
    console.log(`   \u{1F4CA} Row count changes:`);
    for (const rc of diff.rowCountChanges) {
      const arrow = rc.delta > 0 ? '\u2191' : '\u2193';
      console.log(`      ${rc.table}: ${rc.left} \u2192 ${rc.right} (${rc.delta > 0 ? '+' : ''}${rc.delta}, ${rc.pct})`);
    }
    console.log();
  }

  // Distribution shifts
  if (diff.distributionShifts.length > 0) {
    console.log(`   \u{1F4C8} Distribution shifts (${diff.distributionShifts.length}):`);
    for (const ds of diff.distributionShifts.slice(0, 10)) {
      console.log(`      ${ds.table}.${ds.column}:`);
      console.log(`         ${ds.leftTop} \u2192 ${ds.rightTop}`);
    }
    if (diff.distributionShifts.length > 10) {
      console.log(`      ... and ${diff.distributionShifts.length - 10} more`);
    }
    console.log();
  }

  // FK changes
  if (diff.fkChanges.length > 0) {
    console.log(`   \u{1F517} FK relationship changes:`);
    for (const fk of diff.fkChanges) {
      console.log(`      ${fk.table}:`);
      for (const a of fk.added) console.log(`         + ${a}`);
      for (const r of fk.removed) console.log(`         - ${r}`);
    }
    console.log();
  }

  // Summary
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Summary: ${diff.summary.totalChanges} change(s) \u2014 ${diff.summary.breaking} breaking, ${diff.summary.cosmetic} cosmetic`);
  console.log(`   Compared in ${elapsed}ms\n`);

  process.exit(diff.summary.breaking > 0 ? 1 : 0);
}
