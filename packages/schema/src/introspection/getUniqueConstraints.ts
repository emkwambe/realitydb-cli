import type pg from 'pg';

export interface RawUniqueConstraintInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
}

export async function getUniqueConstraints(
  pool: pg.Pool,
  schemaName: string = 'public',
): Promise<RawUniqueConstraintInfo[]> {
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
