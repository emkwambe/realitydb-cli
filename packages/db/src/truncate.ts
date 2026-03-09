import pg from 'pg';
import { withTransaction } from './transaction.js';

export interface TruncateResult {
  tablesCleared: string[];
  durationMs: number;
}

export async function truncateTables(
  pool: pg.Pool,
  tableNames: string[],
  cascade: boolean,
): Promise<TruncateResult> {
  const start = performance.now();

  await withTransaction(pool, async (client) => {
    for (const tableName of tableNames) {
      const sql = cascade
        ? `TRUNCATE "${tableName}" CASCADE`
        : `TRUNCATE "${tableName}"`;
      await client.query(sql);
    }
  });

  const durationMs = Math.round(performance.now() - start);

  return {
    tablesCleared: [...tableNames],
    durationMs,
  };
}
