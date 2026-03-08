import type pg from 'pg';
import type { RawForeignKeyInfo } from './rawTypes.js';

export async function getForeignKeys(
  pool: pg.Pool,
  schemaName: string = 'public',
): Promise<RawForeignKeyInfo[]> {
  const result = await pool.query<RawForeignKeyInfo>(
    `SELECT
       kcu.constraint_name,
       kcu.table_name AS source_table,
       kcu.column_name AS source_column,
       ccu.table_name AS target_table,
       ccu.column_name AS target_column
     FROM information_schema.key_column_usage kcu
     JOIN information_schema.referential_constraints rc
       ON kcu.constraint_name = rc.constraint_name
       AND kcu.constraint_schema = rc.constraint_schema
     JOIN information_schema.constraint_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name
       AND rc.unique_constraint_schema = ccu.constraint_schema
     WHERE kcu.constraint_schema = $1
     ORDER BY kcu.table_name, kcu.column_name`,
    [schemaName],
  );
  return result.rows;
}
