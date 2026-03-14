export type { QueryResult, DbClient, DbPool, DatabaseClientType } from '@databox/shared';

export function placeholder(dialect: 'postgres' | 'mysql', index: number): string {
  return dialect === 'mysql' ? '?' : `$${index}`;
}

export function quoteIdent(dialect: 'postgres' | 'mysql', name: string): string {
  return dialect === 'mysql' ? `\`${name}\`` : `"${name}"`;
}
