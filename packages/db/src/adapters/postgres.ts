import pg from 'pg';
import type { DbPool, DbClient, QueryResult } from '../adapter.js';

class PostgresClient implements DbClient {
  constructor(private client: pg.PoolClient) {}

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const result = await this.client.query(sql, params);
    return { rows: result.rows as T[] };
  }

  release(): void {
    this.client.release();
  }
}

class PostgresPool implements DbPool {
  readonly dialect = 'postgres' as const;
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const result = await this.pool.query(sql, params);
    return { rows: result.rows as T[] };
  }

  async connect(): Promise<DbClient> {
    const client = await this.pool.connect();
    return new PostgresClient(client);
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgresPool(connectionString: string): DbPool {
  return new PostgresPool(connectionString);
}
