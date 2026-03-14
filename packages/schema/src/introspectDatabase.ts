import type { DbPool } from '@databox/shared';
import type { DatabaseSchema } from './types.js';
import { getTables } from './introspection/getTables.js';
import { getColumns } from './introspection/getColumns.js';
import { getForeignKeys } from './introspection/getForeignKeys.js';
import { getPrimaryKeys } from './introspection/getPrimaryKeys.js';
import { getUniqueConstraints } from './introspection/getUniqueConstraints.js';
import { normalizeSchema } from './normalizer.js';
import { validateSchema } from './validator.js';

export interface IntrospectOptions {
  verbose?: boolean;
}

export async function introspectDatabase(
  pool: DbPool,
  schemaName?: string,
  options?: IntrospectOptions,
): Promise<DatabaseSchema> {
  let effectiveSchema: string;
  if (schemaName) {
    effectiveSchema = schemaName;
  } else if (pool.dialect === 'mysql') {
    const result = await pool.query<{ db: string }>('SELECT DATABASE() AS db');
    effectiveSchema = result.rows[0].db;
  } else {
    effectiveSchema = 'public';
  }

  const [tables, columns, foreignKeys, primaryKeys, uniqueConstraints] = await Promise.all([
    getTables(pool, effectiveSchema),
    getColumns(pool, effectiveSchema),
    getForeignKeys(pool, effectiveSchema),
    getPrimaryKeys(pool, effectiveSchema),
    getUniqueConstraints(pool, effectiveSchema),
  ]);

  const schema = normalizeSchema({ tables, columns, foreignKeys, primaryKeys, uniqueConstraints });

  const validation = validateSchema(schema);

  for (const warning of validation.warnings) {
    console.warn(`[databox] Schema warning: ${warning}`);
  }

  if (options?.verbose) {
    for (const vw of validation.verboseWarnings) {
      console.warn(`[databox] Schema warning: ${vw}`);
    }
  }

  for (const error of validation.errors) {
    console.error(`[databox] Schema error: ${error}`);
  }

  return schema;
}
