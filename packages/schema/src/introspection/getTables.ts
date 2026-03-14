import type { DbPool } from '@databox/shared';
import type { RawTableInfo } from './rawTypes.js';

export async function getTables(
  pool: DbPool,
  schemaName: string = 'public',
): Promise<RawTableInfo[]> {
  if (pool.dialect === 'mysql') {
    const result = await pool.query<RawTableInfo>(
      `SELECT TABLE_NAME AS table_name, TABLE_SCHEMA AS table_schema, TABLE_TYPE AS table_type
       FROM information_schema.tables
       WHERE TABLE_SCHEMA = ?
         AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [schemaName],
    );
    return result.rows;
  }

  const result = await pool.query<RawTableInfo>(
    `SELECT table_name, table_schema, table_type
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schemaName],
  );
  return result.rows;
}
