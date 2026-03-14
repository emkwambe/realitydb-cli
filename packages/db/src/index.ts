export type { DbPool, DbClient, QueryResult } from './adapter.js';
export { placeholder, quoteIdent } from './adapter.js';

export { createPostgresClient, createDatabaseClient, testConnection, closeConnection } from './client.js';
export type { DatabaseClientType } from './client.js';

export { createPostgresPool } from './adapters/postgres.js';
export { createMysqlPool } from './adapters/mysql.js';

export { withTransaction } from './transaction.js';
export { batchInsertTable, batchInsertDataset } from './batchInsert.js';
export type { InsertResult, DatasetInsertResult } from './batchInsert.js';
export { truncateTables } from './truncate.js';
export type { TruncateResult } from './truncate.js';
export { readTableRows, readTableRowCount } from './readTable.js';
