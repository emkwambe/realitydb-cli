import type { DbClient, DbPool } from './adapter.js';
import { placeholder, quoteIdent } from './adapter.js';
import type { GeneratedTable } from '@databox/generators';

export interface InsertResult {
  tableName: string;
  rowsInserted: number;
  batchCount: number;
  durationMs: number;
}

export interface DatasetInsertResult {
  tables: InsertResult[];
  totalRows: number;
  totalDurationMs: number;
}

export async function batchInsertTable(
  client: DbClient,
  table: GeneratedTable,
  batchSize: number,
  dialect: 'postgres' | 'mysql' = 'postgres',
): Promise<InsertResult> {
  const start = performance.now();

  if (table.rows.length === 0) {
    return {
      tableName: table.tableName,
      rowsInserted: 0,
      batchCount: 0,
      durationMs: 0,
    };
  }

  const columns = table.columns;
  const quotedColumns = columns.map((c) => quoteIdent(dialect, c)).join(', ');
  const colCount = columns.length;

  let batchCount = 0;
  let rowsInserted = 0;

  for (let offset = 0; offset < table.rows.length; offset += batchSize) {
    const batch = table.rows.slice(offset, offset + batchSize);
    const values: unknown[] = [];
    const rowPlaceholders: string[] = [];

    for (let rowIdx = 0; rowIdx < batch.length; rowIdx++) {
      const row = batch[rowIdx];
      const placeholders: string[] = [];
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const paramIndex = rowIdx * colCount + colIdx + 1;
        placeholders.push(placeholder(dialect, paramIndex));
        values.push(row[columns[colIdx]]);
      }
      rowPlaceholders.push(`(${placeholders.join(', ')})`);
    }

    const tableName = quoteIdent(dialect, table.tableName);
    const sql = `INSERT INTO ${tableName} (${quotedColumns}) VALUES ${rowPlaceholders.join(', ')}`;
    await client.query(sql, values);

    batchCount++;
    rowsInserted += batch.length;
  }

  const durationMs = Math.round(performance.now() - start);

  return {
    tableName: table.tableName,
    rowsInserted,
    batchCount,
    durationMs,
  };
}

export async function batchInsertDataset(
  client: DbClient,
  dataset: { tables: Map<string, GeneratedTable> },
  tableOrder: string[],
  batchSize: number,
  dialect: 'postgres' | 'mysql' = 'postgres',
): Promise<DatasetInsertResult> {
  const start = performance.now();
  const results: InsertResult[] = [];
  let totalRows = 0;

  for (const tableName of tableOrder) {
    const table = dataset.tables.get(tableName);
    if (!table) continue;

    const result = await batchInsertTable(client, table, batchSize, dialect);
    results.push(result);
    totalRows += result.rowsInserted;
  }

  const totalDurationMs = Math.round(performance.now() - start);

  return {
    tables: results,
    totalRows,
    totalDurationMs,
  };
}
