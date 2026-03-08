import type pg from 'pg';
import type { RawPrimaryKeyInfo } from './rawTypes.js';

export async function getPrimaryKeys(
  pool: pg.Pool,
  schemaName: string = 'public',
): Promise<RawPrimaryKeyInfo[]> {
  const result = await pool.query<RawPrimaryKeyInfo>(
    `SELECT
       tc.constraint_name,
       kcu.table_name,
       kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.constraint_schema = $1
     ORDER BY kcu.table_name, kcu.ordinal_position`,
    [schemaName],
  );
  return result.rows;
}
