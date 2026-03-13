import type pg from 'pg';
import type { DatabaseSchema } from './types.js';
import { getTables } from './introspection/getTables.js';
import { getColumns } from './introspection/getColumns.js';
import { getForeignKeys } from './introspection/getForeignKeys.js';
import { getPrimaryKeys } from './introspection/getPrimaryKeys.js';
import { normalizeSchema } from './normalizer.js';
import { validateSchema } from './validator.js';

export interface IntrospectOptions {
  verbose?: boolean;
}

export async function introspectDatabase(
  pool: pg.Pool,
  schemaName: string = 'public',
  options?: IntrospectOptions,
): Promise<DatabaseSchema> {
  const [tables, columns, foreignKeys, primaryKeys] = await Promise.all([
    getTables(pool, schemaName),
    getColumns(pool, schemaName),
    getForeignKeys(pool, schemaName),
    getPrimaryKeys(pool, schemaName),
  ]);

  const schema = normalizeSchema({ tables, columns, foreignKeys, primaryKeys });

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
