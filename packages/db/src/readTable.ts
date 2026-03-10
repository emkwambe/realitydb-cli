import type pg from 'pg';

/**
 * Reads all rows from a table, returning them as an array of objects.
 */
export async function readTableRows(
  pool: pg.Pool,
  tableName: string,
  columns: string[],
): Promise<Record<string, unknown>[]> {
  const quotedColumns = columns.map((c) => `"${c}"`).join(', ');
  const result = await pool.query(
    `SELECT ${quotedColumns} FROM "${tableName}"`,
  );
  return result.rows;
}

/**
 * Returns the count of rows in a table.
 */
export async function readTableRowCount(
  pool: pg.Pool,
  tableName: string,
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM "${tableName}"`,
  );
  return result.rows[0].count;
}
