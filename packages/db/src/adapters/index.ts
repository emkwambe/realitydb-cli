import type { DbPool } from '../adapter.js';
import { createPostgresPool } from './postgres.js';
import { createMysqlPool } from './mysql.js';

export type DatabaseClientType = 'postgres' | 'mysql';

export function createDatabaseClient(client: DatabaseClientType, connectionString: string): DbPool {
  switch (client) {
    case 'postgres':
      return createPostgresPool(connectionString);
    case 'mysql':
      return createMysqlPool(connectionString);
    default:
      throw new Error(`[databox] Unsupported database client: ${client}`);
  }
}

export { createPostgresPool } from './postgres.js';
export { createMysqlPool } from './mysql.js';
