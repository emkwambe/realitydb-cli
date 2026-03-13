export type {
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  PrimaryKeySchema,
  ForeignKeySchema,
} from './types.js';

export { normalizeSchema } from './normalizer.js';
export type { RawIntrospectionData } from './normalizer.js';

export { validateSchema } from './validator.js';
export type { ValidationResult } from './validator.js';

export { introspectDatabase } from './introspectDatabase.js';
export type { IntrospectOptions } from './introspectDatabase.js';

export {
  getTables,
  getColumns,
  getForeignKeys,
  getPrimaryKeys,
} from './introspection/index.js';

export { generateCreateTableDDL } from './generateDDL.js';

export { parseSQLSchema } from './parseSQLSchema.js';
