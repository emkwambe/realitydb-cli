import {
  normalizeTables,
  topologicalSort,
  distributeRows,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function explainCommand(options: {
  pack: string;
  rows?: string;
}): Promise<void> {
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  console.log(`\n\u{1F50D} RealityDB Explain`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Template: ${templateName || 'custom'}`);
  console.log(`   Requested rows: ${rows.toLocaleString()}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Generation order (topological):\n`);

  let totalPlanned = 0;
  let rootCount = 0;
  let childCount = 0;

  for (let i = 0; i < ordered.length; i++) {
    const table = ordered[i];
    const tableRows = rowsPerTable[table.name] || 0;
    totalPlanned += tableRows;

    const cols = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
    const fkCols = cols.filter((c: any) => c.isFK || c.foreignKey || c.fkTarget);
    const enumCols = cols.filter((c: any) => c.strategy === 'enum');
    const lifecycleCols = cols.filter((c: any) => c.options?.lifecycleRules?.length > 0);

    const isRoot = fkCols.length === 0;
    if (isRoot) rootCount++; else childCount++;

    const fkRefs = fkCols.map((c: any) => {
      if (c.foreignKey?.table) return c.foreignKey.table;
      if (c.fkTarget?.tableId) {
        const target = ordered.find((t: any) => t.id === c.fkTarget.tableId);
        return target?.name || c.fkTarget.tableId;
      }
      return '?';
    });

    const pct = ((tableRows / rows) * 100).toFixed(1);
    const icon = isRoot ? '\u{1F7E2}' : '\u{1F535}';
    const type = isRoot ? 'root' : `refs: ${fkRefs.join(', ')}`;

    console.log(`   ${String(i + 1).padStart(2)}. ${icon} ${table.name}`);
    console.log(`       Rows: ${tableRows.toLocaleString()} (${pct}%) | ${type}`);
    console.log(`       Columns: ${cols.length} | FKs: ${fkCols.length} | Enums: ${enumCols.length} | Lifecycle: ${lifecycleCols.length}`);
  }

  console.log(`\n${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4CA} Total planned: ${totalPlanned.toLocaleString()} rows`);
  console.log(`   \u{1F7E2} Root tables: ${rootCount} (2x rows)`);
  console.log(`   \u{1F535} Child tables: ${childCount} (1x rows)`);
  console.log(`   \u{1F4C8} Estimated speed: ~${Math.round(rows / 0.05).toLocaleString()} rows/sec`);
  console.log(`   \u23F1\uFE0F  Estimated time: ${(rows / 200000).toFixed(2)}s\n`);
  console.log(`   No data generated. Use 'realitydb run' to generate.\n`);
}
