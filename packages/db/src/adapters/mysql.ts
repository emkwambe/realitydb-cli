import mysql from 'mysql2/promise';
import type { DbPool, DbClient, QueryResult } from '../adapter.js';

class MysqlClient implements DbClient {
  constructor(private connection: mysql.PoolConnection) {}

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const [rows] = await this.connection.query(sql, params);
    return { rows: rows as T[] };
  }

  release(): void {
    this.connection.release();
  }
}

class MysqlPool implements DbPool {
  readonly dialect = 'mysql' as const;
  private pool: mysql.Pool;

  constructor(connectionString: string) {
    this.pool = mysql.createPool(connectionString);
  }

  async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const [rows] = await this.pool.query(sql, params);
    return { rows: rows as T[] };
  }

  async connect(): Promise<DbClient> {
    const connection = await this.pool.getConnection();
    return new MysqlClient(connection);
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

export function createMysqlPool(connectionString: string): DbPool {
  return new MysqlPool(connectionString);
}
