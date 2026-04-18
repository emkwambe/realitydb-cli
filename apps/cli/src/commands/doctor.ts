import * as fs from 'fs';
import * as path from 'path';

interface Diagnosis {
  level: 'critical' | 'warning' | 'ok';
  check: string;
  message: string;
  fixable: boolean;
  details?: string[];
}

type PackFormat = 'studio-v4' | 'studio-export' | 'cli-object' | 'empty' | 'unknown';

function detectFormat(pack: any): PackFormat {
  if (!pack || typeof pack !== 'object') return 'unknown';
  if (pack.tables && typeof pack.tables === 'object' && !Array.isArray(pack.tables)) {
    const firstKey = Object.keys(pack.tables)[0];
    if (firstKey && (pack.tables[firstKey]?.columns || pack.tables[firstKey]?.match)) return 'studio-export';
    return 'cli-object';
  }
  if (Array.isArray(pack.tables)) {
    if (pack.tables.length === 0) return 'empty';
    const first = pack.tables[0];
    if (Array.isArray(first.columns)) {
      const hasFkTarget = first.columns.some((c: any) => c.fkTarget);
      const hasId = first.id && first.id.startsWith('tbl-');
      if (hasFkTarget || hasId) return 'studio-v4';
    }
  }
  return 'unknown';
}

function buildIdToNameMap(tables: any[]): Map<string, { tableName: string; columns: Map<string, string> }> {
  const map = new Map<string, { tableName: string; columns: Map<string, string> }>();
  for (const table of tables) {
    const colMap = new Map<string, string>();
    if (Array.isArray(table.columns)) {
      for (const col of table.columns) {
        if (col.id && col.name) colMap.set(col.id, col.name);
      }
    }
    if (table.id && table.name) map.set(table.id, { tableName: table.name, columns: colMap });
  }
  return map;
}

function inferStrategy(name: string, type: string): string {
  const n = name.toLowerCase();
  if (n === 'id') return 'uuid';
  if (n === 'email' || n.includes('email')) return 'email';
  if (n === 'name' || n === 'first_name' || n === 'last_name' || n === 'full_name') return 'string';
  if (n === 'phone' || n.includes('phone')) return 'phone';
  if (n.endsWith('_id')) return 'uuid';
  if (n.includes('amount') || n.includes('price') || n.includes('cost') || n.includes('salary')) return 'decimal';
  if (n.includes('count') || n.includes('quantity') || n === 'age') return 'integer';
  if (n === 'description' || n === 'notes' || n === 'comment' || n === 'bio') return 'paragraph';
  if (n === 'address' || n.includes('address')) return 'address';
  if (n === 'city') return 'city';
  if (n === 'state') return 'state';
  if (n === 'zip' || n === 'postal_code' || n === 'zip_code') return 'zip';
  if (n === 'country') return 'country';
  if (n === 'url' || n === 'website') return 'url';
  if (n === 'company' || n === 'company_name' || n === 'organization') return 'company_name';
  const t = (type || '').toLowerCase();
  if (t.includes('timestamp') || t.includes('date') || t.includes('time')) return 'timestamp';
  if (t.includes('uuid')) return 'uuid';
  if (t.includes('int')) return 'integer';
  if (t.includes('float') || t.includes('decimal') || t.includes('numeric') || t.includes('double')) return 'decimal';
  if (t.includes('bool')) return 'boolean';
  if (t.includes('text') || t.includes('varchar') || t.includes('string')) return 'string';
  return 'string';
}

function convertStudioV4ToExport(pack: any): any {
  const idMap = buildIdToNameMap(pack.tables);
  const converted: any = {
    name: pack.name || 'studio-export',
    version: pack.version || '1.0.0',
    description: pack.description || 'Converted from Studio v4 by realitydb doctor',
    tables: {},
  };
  for (const table of pack.tables) {
    const columns: any = {};
    for (const col of table.columns) {
      const colDef: any = { strategy: col.strategy || inferStrategy(col.name, col.type) };
      if (col.options && Object.keys(col.options).length > 0) colDef.options = col.options;
      if (col.strategy === 'enum' && col.options?.values) {
        colDef.options = {
          values: col.options.values,
          weights: col.options.weights || col.options.values.map(() => Math.round(100 / col.options.values.length)),
        };
      }
      if (col.isFK && col.fkTarget) {
        const targetTable = idMap.get(col.fkTarget.tableId);
        if (targetTable) {
          const targetColName = targetTable.columns.get(col.fkTarget.columnId) || 'id';
          colDef.foreignKey = { table: targetTable.tableName, column: targetColName };
          colDef.strategy = 'uuid';
        }
      }
      columns[col.name] = colDef;
    }
    converted.tables[table.name] = { match: table.name, columns };
  }
  return converted;
}

function checkDateStrategies(pack: any, format: PackFormat): Diagnosis {
  const badDates: string[] = [];
  const known = ['past_date', 'future_date', 'timestamp', 'date', 'recent_date', 'date_of_birth'];
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    for (const table of pack.tables) {
      for (const col of table.columns || []) {
        const type = (col.type || '').toLowerCase();
        if ((type.includes('date') || type.includes('time') || type.includes('timestamp')) && !known.includes(col.strategy)) {
          badDates.push(`${table.name}.${col.name} (strategy: "${col.strategy || 'none'}", type: ${col.type})`);
        }
      }
    }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    for (const [tableName, tableDef] of Object.entries(pack.tables)) {
      for (const [colName, colDef] of Object.entries((tableDef as any).columns || {})) {
        const strategy = (colDef as any).strategy || '';
        if ((colName.includes('_at') || colName.includes('date') || colName.includes('time')) && !known.includes(strategy) && !strategy.includes('date') && !strategy.includes('time')) {
          badDates.push(`${tableName}.${colName} (strategy: "${strategy || 'none'}")`);
        }
      }
    }
  }
  if (badDates.length === 0) return { level: 'ok', check: 'Date Strategies', message: 'All date/timestamp columns have valid strategies', fixable: false };
  return { level: 'warning', check: 'Date Strategies', message: `${badDates.length} date column(s) have missing or invalid strategies`, fixable: true, details: badDates };
}

function checkOrphanedFKs(pack: any, format: PackFormat): Diagnosis {
  const orphaned: string[] = [];
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    const idMap = buildIdToNameMap(pack.tables);
    for (const table of pack.tables) {
      for (const col of table.columns || []) {
        if (col.isFK && col.fkTarget && !idMap.has(col.fkTarget.tableId)) {
          orphaned.push(`${table.name}.${col.name} -> tableId "${col.fkTarget.tableId}" not found`);
        }
      }
    }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    const tableNames = new Set(Object.keys(pack.tables));
    for (const [tableName, tableDef] of Object.entries(pack.tables)) {
      for (const [colName, colDef] of Object.entries((tableDef as any).columns || {})) {
        const fk = (colDef as any).foreignKey;
        if (fk && !tableNames.has(fk.table)) orphaned.push(`${tableName}.${colName} -> table "${fk.table}" not found`);
      }
    }
  }
  if (orphaned.length === 0) return { level: 'ok', check: 'FK References', message: 'All foreign keys reference valid tables', fixable: false };
  return { level: 'critical', check: 'FK References', message: `${orphaned.length} orphaned FK reference(s)`, fixable: false, details: orphaned };
}

function checkEmptyEnums(pack: any, format: PackFormat): Diagnosis {
  const empty: string[] = [];
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    for (const table of pack.tables) {
      for (const col of table.columns || []) {
        if (col.strategy === 'enum' && (!col.options?.values || col.options.values.length === 0)) empty.push(`${table.name}.${col.name}`);
      }
    }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    for (const [tableName, tableDef] of Object.entries(pack.tables)) {
      for (const [colName, colDef] of Object.entries((tableDef as any).columns || {})) {
        if ((colDef as any).strategy === 'enum' && (!(colDef as any).options?.values || (colDef as any).options.values.length === 0)) empty.push(`${tableName}.${colName}`);
      }
    }
  }
  if (empty.length === 0) return { level: 'ok', check: 'Enum Values', message: 'All enum columns have values defined', fixable: false };
  return { level: 'warning', check: 'Enum Values', message: `${empty.length} enum column(s) have empty values`, fixable: false, details: empty };
}

function checkDuplicateNames(pack: any, format: PackFormat): Diagnosis {
  const dupes: string[] = [];
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    const seen = new Map<string, number>();
    for (const table of pack.tables) { const l = table.name.toLowerCase(); seen.set(l, (seen.get(l) || 0) + 1); }
    for (const [name, count] of seen) { if (count > 1) dupes.push(`Table "${name}" appears ${count} times`); }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    const seen = new Map<string, string[]>();
    for (const key of Object.keys(pack.tables)) { const l = key.toLowerCase(); if (!seen.has(l)) seen.set(l, []); seen.get(l)!.push(key); }
    for (const [, names] of seen) { if (names.length > 1) dupes.push(`Case collision: ${names.join(', ')}`); }
  }
  if (dupes.length === 0) return { level: 'ok', check: 'Duplicate Names', message: 'No duplicate or colliding table names', fixable: false };
  return { level: 'warning', check: 'Duplicate Names', message: `${dupes.length} naming issue(s)`, fixable: false, details: dupes };
}

function checkMissingStrategies(pack: any, format: PackFormat): Diagnosis {
  const missing: string[] = [];
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    for (const table of pack.tables) {
      for (const col of table.columns || []) {
        if (!col.strategy || col.strategy === '' || col.strategy === 'none') missing.push(`${table.name}.${col.name} (type: ${col.type})`);
      }
    }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    for (const [tableName, tableDef] of Object.entries(pack.tables)) {
      for (const [colName, colDef] of Object.entries((tableDef as any).columns || {})) {
        if (!(colDef as any).strategy) missing.push(`${tableName}.${colName}`);
      }
    }
  }
  if (missing.length === 0) return { level: 'ok', check: 'Generator Strategies', message: 'All columns have generation strategies', fixable: false };
  return { level: 'warning', check: 'Generator Strategies', message: `${missing.length} column(s) missing generation strategies`, fixable: true, details: missing };
}

function countTablesAndColumns(pack: any, format: PackFormat): { tables: number; columns: number; fks: number } {
  let tables = 0, columns = 0, fks = 0;
  if (format === 'studio-v4' && Array.isArray(pack.tables)) {
    tables = pack.tables.length;
    for (const table of pack.tables) { columns += (table.columns || []).length; fks += (table.columns || []).filter((c: any) => c.isFK).length; }
  } else if (format === 'studio-export' && typeof pack.tables === 'object') {
    const entries = Object.entries(pack.tables);
    tables = entries.length;
    for (const [, tableDef] of entries) { const cols = Object.entries((tableDef as any).columns || {}); columns += cols.length; fks += cols.filter(([, c]) => (c as any).foreignKey).length; }
  }
  return { tables, columns, fks };
}

export async function doctorCommand(options: { pack: string; fix?: boolean; output?: string }): Promise<void> {
  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) { console.error(`\n   Pack file not found: ${packPath}`); process.exit(1); }
  let pack: any;
  try { pack = JSON.parse(fs.readFileSync(packPath, 'utf-8')); } catch (e: any) { console.error(`\n   Invalid JSON: ${e.message}`); process.exit(1); }

  const format = detectFormat(pack);
  const counts = countTablesAndColumns(pack, format);

  console.log(`\nRealityDB Doctor - Pack Diagnosis`);
  console.log('─'.repeat(40));
  console.log(`   Pack: ${path.basename(packPath)}`);
  console.log(`   Format: ${format}${format === 'studio-v4' ? ' (incompatible with CLI)' : format === 'studio-export' ? ' (CLI-compatible)' : ''}`);
  console.log(`   Tables: ${counts.tables} | Columns: ${counts.columns} | FKs: ${counts.fks}`);
  console.log('─'.repeat(40) + '\n');

  const diagnoses: Diagnosis[] = [];

  if (format === 'studio-v4') {
    diagnoses.push({ level: 'critical', check: 'Format Compatibility', message: 'Pack is studio-v4 format - CLI expects studio-export', fixable: true, details: ['FK references use fkTarget.tableId/columnId (need foreignKey.table/column)', 'Tables are array-based with .id fields (need object-keyed by name)', 'Fix: --fix will convert to studio-export format'] });
  } else if (format === 'studio-export') {
    diagnoses.push({ level: 'ok', check: 'Format Compatibility', message: 'Pack is studio-export format (CLI-compatible)', fixable: false });
  } else if (format === 'empty') {
    diagnoses.push({ level: 'critical', check: 'Format Compatibility', message: 'Pack has no tables', fixable: false });
  } else if (format === 'unknown') {
    diagnoses.push({ level: 'critical', check: 'Format Compatibility', message: 'Unrecognized pack format', fixable: false });
  } else {
    diagnoses.push({ level: 'ok', check: 'Format Compatibility', message: `Pack format: ${format}`, fixable: false });
  }

  diagnoses.push(checkOrphanedFKs(pack, format));
  diagnoses.push(checkDateStrategies(pack, format));
  diagnoses.push(checkMissingStrategies(pack, format));
  diagnoses.push(checkEmptyEnums(pack, format));
  diagnoses.push(checkDuplicateNames(pack, format));

  for (const d of diagnoses) {
    const icon = d.level === 'ok' ? '[OK]' : d.level === 'warning' ? '[WARN]' : '[CRITICAL]';
    console.log(`   ${icon} ${d.check}`);
    console.log(`      ${d.message}`);
    if (d.details) { for (const detail of d.details.slice(0, 5)) console.log(`      - ${detail}`); if (d.details.length > 5) console.log(`      ... and ${d.details.length - 5} more`); }
    console.log();
  }

  const criticals = diagnoses.filter(d => d.level === 'critical').length;
  const warnings = diagnoses.filter(d => d.level === 'warning').length;
  const oks = diagnoses.filter(d => d.level === 'ok').length;
  const fixable = diagnoses.filter(d => d.fixable && d.level !== 'ok').length;

  console.log('─'.repeat(40));
  console.log(`   Summary: ${criticals} critical, ${warnings} warning(s), ${oks} passed`);
  if (fixable > 0 && !options.fix) console.log(`   ${fixable} issue(s) are auto-fixable - run with --fix to repair`);

  if (options.fix) {
    console.log(`\n   Applying fixes...\n`);
    let fixed = pack;
    let fixCount = 0;
    if (format === 'studio-v4') { fixed = convertStudioV4ToExport(pack); console.log('   [FIXED] Converted studio-v4 -> studio-export format'); fixCount++; }
    if (typeof fixed.tables === 'object' && !Array.isArray(fixed.tables)) {
      for (const [tableName, tableDef] of Object.entries(fixed.tables)) {
        for (const [colName, colDef] of Object.entries((tableDef as any).columns || {})) {
          if (!(colDef as any).strategy) { const inferred = inferStrategy(colName, ''); (colDef as any).strategy = inferred; console.log(`   [FIXED] Inferred strategy for ${tableName}.${colName}: ${inferred}`); fixCount++; }
        }
      }
    }
    if (fixCount === 0) { console.log('   No fixes needed.'); }
    else { const outPath = options.output ? path.resolve(options.output) : packPath; fs.writeFileSync(outPath, JSON.stringify(fixed, null, 2), 'utf-8'); console.log(`\n   ${fixCount} fix(es) applied -> ${outPath}`); }
  }
}