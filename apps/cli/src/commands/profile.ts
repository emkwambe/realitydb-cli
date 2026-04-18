import * as fs from 'fs';
import * as path from 'path';

interface ColumnProfile {
  table: string;
  column: string;
  dataType: string;
  totalRows: number;
  nullCount: number;
  nullPct: number;
  uniqueCount: number;
  uniquePct: number;
  min?: string;
  max?: string;
  mean?: number;
  median?: number;
  topValues: { value: string; count: number; pct: number }[];
  distribution: 'uniform' | 'skewed' | 'bimodal' | 'constant' | 'unique' | 'unknown';
}

interface TableProfile {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  fkRelationships: { column: string; refTable: string; refColumn: string }[];
}

interface DatasetProfile {
  file: string;
  format: string;
  tables: TableProfile[];
  totalRows: number;
  totalColumns: number;
  totalTables: number;
  estimatedSizeKB: number;
  scanTime: number;
  watermarked: boolean;
  certified: boolean;
}

// ============================================================
// SQL PARSER — Extract structure + data
// ============================================================

interface ParsedTable {
  name: string;
  columns: { name: string; type: string }[];
  fks: { column: string; refTable: string; refColumn: string }[];
  rows: Record<string, string>[];
}

function parseSqlFile(content: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
  const insertRegex = /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;

  // Parse CREATE TABLE
  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName === '_realitydb_meta') continue;
    const colDefs = match[2];
    const columns: { name: string; type: string }[] = [];
    const fks: { column: string; refTable: string; refColumn: string }[] = [];

    for (const line of colDefs.split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('CONSTRAINT')) continue;

      // FK detection
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
      if (fkMatch) {
        fks.push({ column: fkMatch[1], refTable: fkMatch[2], refColumn: fkMatch[3] });
        continue;
      }

      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w\s()]*)/);
      if (colMatch) {
        columns.push({ name: colMatch[1], type: colMatch[2].trim().split(/\s/)[0] });
      }
    }

    tables.push({ name: tableName, columns, fks, rows: [] });
  }

  // Parse INSERT INTO
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (tableName === '_realitydb_meta') continue;
    const colList = match[2].split(',').map(c => c.trim().replace(/["']/g, ''));
    const valuesBlock = match[3];

    const table = tables.find(t => t.name === tableName);
    if (!table) continue;

    const rowRegex = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
      const vals = splitSqlValues(rowMatch[1]);
      const row: Record<string, string> = {};
      for (let i = 0; i < colList.length && i < vals.length; i++) {
        row[colList[i]] = vals[i].replace(/^'|'$/g, '').trim();
      }
      table.rows.push(row);
    }
  }

  return tables;
}

function splitSqlValues(valStr: string): string[] {
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

function parseCsvFile(content: string, fileName: string): ParsedTable[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
  const tableName = path.basename(fileName, path.extname(fileName));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < vals.length; j++) {
      row[headers[j]] = vals[j].trim().replace(/["']/g, '');
    }
    rows.push(row);
  }

  return [{
    name: tableName,
    columns: headers.map(h => ({ name: h, type: inferType(rows, h) })),
    fks: [],
    rows,
  }];
}

function inferType(rows: Record<string, string>[], column: string): string {
  const samples = rows.slice(0, 20).map(r => r[column]).filter(v => v && v !== 'NULL');
  if (samples.length === 0) return 'unknown';

  const allUuid = samples.every(v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));
  if (allUuid) return 'UUID';

  const allNum = samples.every(v => !isNaN(Number(v)));
  if (allNum) {
    const allInt = samples.every(v => Number.isInteger(Number(v)));
    return allInt ? 'INTEGER' : 'NUMERIC';
  }

  const allBool = samples.every(v => ['true', 'false', 'TRUE', 'FALSE', 't', 'f'].includes(v));
  if (allBool) return 'BOOLEAN';

  const allDate = samples.every(v => !isNaN(Date.parse(v)) && v.length > 8);
  if (allDate) return 'TIMESTAMP';

  return 'TEXT';
}

// ============================================================
// PROFILING ENGINE
// ============================================================

function profileColumn(table: string, colName: string, colType: string, rows: Record<string, string>[]): ColumnProfile {
  const values = rows.map(r => r[colName]);
  const totalRows = values.length;
  const nullCount = values.filter(v => !v || v === 'NULL' || v === 'null' || v === '').length;
  const nonNull = values.filter(v => v && v !== 'NULL' && v !== 'null' && v !== '');
  const uniqueValues = new Set(nonNull);

  // Top values (frequency analysis)
  const freq = new Map<string, number>();
  for (const v of nonNull) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const topValues = sorted.slice(0, 5).map(([value, count]) => ({
    value: value.length > 40 ? value.substring(0, 37) + '...' : value,
    count,
    pct: Math.round((count / Math.max(nonNull.length, 1)) * 100),
  }));

  // Distribution shape
  let distribution: ColumnProfile['distribution'] = 'unknown';
  if (uniqueValues.size === 0) {
    distribution = 'constant';
  } else if (uniqueValues.size === 1) {
    distribution = 'constant';
  } else if (uniqueValues.size === nonNull.length) {
    distribution = 'unique';
  } else {
    const topPct = sorted[0] ? sorted[0][1] / nonNull.length : 0;
    if (topPct > 0.5) {
      distribution = 'skewed';
    } else {
      const avgFreq = nonNull.length / uniqueValues.size;
      const variance = sorted.reduce((sum, [, c]) => sum + Math.pow(c - avgFreq, 2), 0) / sorted.length;
      const cv = Math.sqrt(variance) / avgFreq;
      distribution = cv < 0.3 ? 'uniform' : 'skewed';
    }
  }

  // Numeric stats
  let min: string | undefined;
  let max: string | undefined;
  let mean: number | undefined;
  let median: number | undefined;

  const numVals = nonNull.map(Number).filter(n => !isNaN(n));
  if (numVals.length > 0 && numVals.length === nonNull.length) {
    numVals.sort((a, b) => a - b);
    min = numVals[0].toString();
    max = numVals[numVals.length - 1].toString();
    mean = Math.round((numVals.reduce((s, n) => s + n, 0) / numVals.length) * 100) / 100;
    median = numVals.length % 2 === 0
      ? (numVals[numVals.length / 2 - 1] + numVals[numVals.length / 2]) / 2
      : numVals[Math.floor(numVals.length / 2)];
  } else if (nonNull.length > 0) {
    const sortedStr = [...nonNull].sort();
    min = sortedStr[0].length > 40 ? sortedStr[0].substring(0, 37) + '...' : sortedStr[0];
    max = sortedStr[sortedStr.length - 1].length > 40 ? sortedStr[sortedStr.length - 1].substring(0, 37) + '...' : sortedStr[sortedStr.length - 1];
  }

  return {
    table,
    column: colName,
    dataType: colType,
    totalRows,
    nullCount,
    nullPct: Math.round((nullCount / Math.max(totalRows, 1)) * 100),
    uniqueCount: uniqueValues.size,
    uniquePct: Math.round((uniqueValues.size / Math.max(nonNull.length, 1)) * 100),
    min,
    max,
    mean,
    median,
    topValues,
    distribution,
  };
}

function profileTable(parsed: ParsedTable): TableProfile {
  const columns = parsed.columns.map(col =>
    profileColumn(parsed.name, col.name, col.type, parsed.rows)
  );

  return {
    name: parsed.name,
    rowCount: parsed.rows.length,
    columnCount: parsed.columns.length,
    columns,
    fkRelationships: parsed.fks,
  };
}

// ============================================================
// COMMAND
// ============================================================

export async function profileCommand(file: string, options: {
  json?: boolean;
  table?: string;
  columns?: boolean;
}): Promise<void> {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   \u274C File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileSizeKB = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);

  // Detect format
  const ext = path.extname(filePath).toLowerCase();
  let format = 'unknown';
  let tables: ParsedTable[] = [];

  if (ext === '.sql' || content.includes('CREATE TABLE')) {
    format = 'sql';
    tables = parseSqlFile(content);
  } else if (ext === '.csv' || ext === '.tsv') {
    format = 'csv';
    tables = parseCsvFile(content, filePath);
  } else {
    console.error(`\n   \u274C Unsupported file format. Supported: .sql, .csv`);
    process.exit(1);
  }

  // Filter to specific table if requested
  if (options.table) {
    tables = tables.filter(t => t.name.toLowerCase() === options.table!.toLowerCase());
    if (tables.length === 0) {
      console.error(`\n   \u274C Table "${options.table}" not found.`);
      process.exit(1);
    }
  }

  // Check for watermark/certification
  const watermarked = content.includes('_realitydb_meta');
  const certified = content.includes('REALITYDB CERTIFIED DATASET') || content.includes('signature');

  // Profile all tables
  const profiles = tables.map(profileTable);
  const scanTime = Date.now() - startTime;

  const result: DatasetProfile = {
    file: filePath,
    format,
    tables: profiles,
    totalRows: profiles.reduce((s, t) => s + t.rowCount, 0),
    totalColumns: profiles.reduce((s, t) => s + t.columnCount, 0),
    totalTables: profiles.length,
    estimatedSizeKB: fileSizeKB,
    scanTime,
    watermarked,
    certified,
  };

  // JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Console output
  console.log(`\n\u{1F4CA} RealityDB Dataset Profile`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Format: ${format.toUpperCase()} | Size: ${fileSizeKB} KB`);
  console.log(`   Tables: ${result.totalTables} | Columns: ${result.totalColumns} | Rows: ${result.totalRows.toLocaleString()}`);
  if (watermarked) console.log(`   \u{1F3F7}\uFE0F  Watermarked${certified ? ' + Certified' : ''}`);
  console.log(`${'─'.repeat(60)}\n`);

  for (const table of profiles) {
    console.log(`   \u{1F4CB} ${table.name} (${table.rowCount} rows, ${table.columnCount} columns)`);

    if (table.fkRelationships.length > 0) {
      const fkStr = table.fkRelationships.map(fk => `${fk.column} \u2192 ${fk.refTable}.${fk.refColumn}`).join(', ');
      console.log(`      FKs: ${fkStr}`);
    }

    if (options.columns !== false) {
      console.log();
      // Column header
      console.log(`      ${'Column'.padEnd(25)} ${'Type'.padEnd(12)} ${'Null%'.padEnd(7)} ${'Uniq%'.padEnd(7)} ${'Distribution'.padEnd(12)} Top value`);
      console.log(`      ${'─'.repeat(25)} ${'─'.repeat(12)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(12)} ${'─'.repeat(20)}`);

      for (const col of table.columns) {
        const topVal = col.topValues[0] ? `${col.topValues[0].value} (${col.topValues[0].pct}%)` : '-';
        console.log(
          `      ${col.column.padEnd(25).substring(0, 25)} ${col.dataType.padEnd(12).substring(0, 12)} ${(col.nullPct + '%').padEnd(7)} ${(col.uniquePct + '%').padEnd(7)} ${col.distribution.padEnd(12)} ${topVal}`
        );
      }
    }

    console.log();

    // Numeric column summary
    const numericCols = table.columns.filter(c => c.mean !== undefined);
    if (numericCols.length > 0 && options.columns !== false) {
      console.log(`      Numeric summary:`);
      for (const col of numericCols) {
        console.log(`         ${col.column}: min=${col.min}, max=${col.max}, mean=${col.mean}, median=${col.median}`);
      }
      console.log();
    }
  }

  console.log(`${'─'.repeat(60)}`);
  console.log(`   Profiled in ${scanTime}ms`);
  console.log();
}
