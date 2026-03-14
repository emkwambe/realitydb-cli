import type { DbPool } from './adapter.js';
import { quoteIdent } from './adapter.js';
import { withTransaction } from './transaction.js';

export interface TruncateResult {
  tablesCleared: string[];
  durationMs: number;
}

export async function truncateTables(
  pool: DbPool,
  tableNames: string[],
  cascade: boolean,
): Promise<TruncateResult> {
  const start = performance.now();
  const dialect = pool.dialect;

  await withTransaction(pool, async (client) => {
    if (dialect === 'mysql') {
      // MySQL doesn't support TRUNCATE CASCADE; disable FK checks instead
      await client.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const tableName of tableNames) {
        const sql = `TRUNCATE TABLE ${quoteIdent(dialect, tableName)}`;
        await client.query(sql);
      }
      await client.query('SET FOREIGN_KEY_CHECKS = 1');
    } else {
      for (const tableName of tableNames) {
        const quoted = quoteIdent(dialect, tableName);
        const sql = cascade
          ? `TRUNCATE ${quoted} CASCADE`
          : `TRUNCATE ${quoted}`;
        await client.query(sql);
      }
    }
  });

  const durationMs = Math.round(performance.now() - start);

  return {
    tablesCleared: [...tableNames],
    durationMs,
  };
}
