export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
}

export interface DbClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface DbPool {
  dialect: 'postgres' | 'mysql';
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  connect(): Promise<DbClient>;
  end(): Promise<void>;
}

export type DatabaseClientType = 'postgres' | 'mysql';
