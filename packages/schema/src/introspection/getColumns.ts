import type { DbPool } from '@databox/shared';
import type { RawColumnInfo } from './rawTypes.js';

export async function getColumns(
  pool: DbPool,
  schemaName: string = 'public',
): Promise<RawColumnInfo[]> {
  if (pool.dialect === 'mysql') {
    const result = await pool.query<RawColumnInfo>(
      `SELECT table_name, column_name, data_type, column_type AS udt_name,
              is_nullable, column_default, character_maximum_length,
              numeric_precision, numeric_scale, ordinal_position
       FROM information_schema.columns
       WHERE table_schema = ?
       ORDER BY table_name, ordinal_position`,
      [schemaName],
    );
    return result.rows;
  }

  const result = await pool.query<RawColumnInfo>(
    `SELECT table_name, column_name, data_type, udt_name,
            is_nullable, column_default, character_maximum_length,
            numeric_precision, numeric_scale, ordinal_position
     FROM information_schema.columns
     WHERE table_schema = $1
     ORDER BY table_name, ordinal_position`,
    [schemaName],
  );
  return result.rows;
}
