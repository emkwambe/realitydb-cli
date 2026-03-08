export type {
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  PrimaryKeySchema,
  ForeignKeySchema,
} from './types.js';

export {
  getTables,
  getColumns,
  getForeignKeys,
  getPrimaryKeys,
} from './introspection/index.js';
