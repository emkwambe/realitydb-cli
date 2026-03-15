import type { DbPool } from './adapter.js';
import { quoteIdent } from './adapter.js';

/**
 * Reads all rows from a table, returning them as an array of objects.
 */
export async function readTableRows(
  pool: DbPool,
  tableName: string,
  columns: string[],
  limit?: number,
): Promise<Record<string, unknown>[]> {
  const dialect = pool.dialect;
  const quotedColumns = columns.map((c) => quoteIdent(dialect, c)).join(', ');
  const quotedTable = quoteIdent(dialect, tableName);
  let sql = `SELECT ${quotedColumns} FROM ${quotedTable}`;
  if (limit !== undefined && limit > 0) {
    sql += ` LIMIT ${Math.floor(limit)}`;
  }
  const result = await pool.query(sql);
  return result.rows;
}

/**
 * Returns the count of rows in a table.
 */
export async function readTableRowCount(
  pool: DbPool,
  tableName: string,
): Promise<number> {
  const quotedTable = quoteIdent(pool.dialect, tableName);
  const sql = pool.dialect === 'mysql'
    ? `SELECT COUNT(*) AS count FROM ${quotedTable}`
    : `SELECT COUNT(*)::int AS count FROM ${quotedTable}`;
  const result = await pool.query<{ count: number }>(sql);
  return Number(result.rows[0].count);
}
