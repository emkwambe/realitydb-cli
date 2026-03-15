import type { DbPool } from './adapter.js';
import type { DatabaseClientType } from './adapters/index.js';
import { createDatabaseClient } from './adapters/index.js';
import { createPostgresPool } from './adapters/postgres.js';

export { createDatabaseClient };
export type { DatabaseClientType };

/**
 * @deprecated Use createDatabaseClient('postgres', connectionString) instead.
 */
export function createPostgresClient(connectionString: string): DbPool {
  return createPostgresPool(connectionString);
}

export async function testConnection(pool: DbPool): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Database connection failed: ${message}`);
  }
}

export async function closeConnection(pool: DbPool): Promise<void> {
  try {
    await pool.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to close database connection: ${message}`);
  }
}
