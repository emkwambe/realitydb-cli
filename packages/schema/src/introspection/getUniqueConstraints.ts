import type { DbPool } from '@databox/shared';

export interface RawUniqueConstraintInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
}

export async function getUniqueConstraints(
  pool: DbPool,
  schemaName: string = 'public',
): Promise<RawUniqueConstraintInfo[]> {
  if (pool.dialect === 'mysql') {
    const result = await pool.query<RawUniqueConstraintInfo>(
      `SELECT
         tc.CONSTRAINT_NAME AS constraint_name,
         kcu.TABLE_NAME AS table_name,
         kcu.COLUMN_NAME AS column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
         AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
         AND tc.TABLE_NAME = kcu.TABLE_NAME
       WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
         AND tc.TABLE_SCHEMA = ?
       ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION`,
      [schemaName],
    );
    return result.rows;
  }

  const result = await pool.query<RawUniqueConstraintInfo>(
    `SELECT
       tc.constraint_name,
       kcu.table_name,
       kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
     WHERE tc.constraint_type = 'UNIQUE'
       AND tc.constraint_schema = $1
     ORDER BY kcu.table_name, kcu.ordinal_position`,
    [schemaName],
  );
  return result.rows;
}
