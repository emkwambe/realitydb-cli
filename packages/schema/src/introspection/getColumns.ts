import type { DbPool } from '@databox/shared';
import type { RawColumnInfo } from './rawTypes.js';

export async function getColumns(
  pool: DbPool,
  schemaName: string = 'public',
): Promise<RawColumnInfo[]> {
  if (pool.dialect === 'mysql') {
    const result = await pool.query<RawColumnInfo>(
      `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
              DATA_TYPE AS data_type, COLUMN_TYPE AS udt_name,
              IS_NULLABLE AS is_nullable, COLUMN_DEFAULT AS column_default,
              CHARACTER_MAXIMUM_LENGTH AS character_maximum_length,
              NUMERIC_PRECISION AS numeric_precision, NUMERIC_SCALE AS numeric_scale,
              ORDINAL_POSITION AS ordinal_position,
              EXTRA AS extra
       FROM information_schema.columns
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
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
