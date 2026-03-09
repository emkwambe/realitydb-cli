import type { DataboxConfig } from '@databox/config';
import type { RealityPack } from '@databox/shared';
import type { DatasetInsertResult } from '@databox/db';
import { createPostgresClient, testConnection, closeConnection, withTransaction, batchInsertDataset } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { loadRealityPack } from '@databox/generators';
import type { GeneratedDataset, GeneratedTable } from '@databox/generators';

export interface PackImportResult {
  pack: RealityPack;
  insertResult: DatasetInsertResult;
  totalRows: number;
  durationMs: number;
}

export async function importPack(
  config: DataboxConfig,
  filePath: string,
): Promise<PackImportResult> {
  const start = performance.now();

  // Load and validate Reality Pack
  const pack = await loadRealityPack(filePath);

  // Convert PackDataset → GeneratedDataset for batch insert compatibility
  const dataset = packDatasetToGenerated(pack);

  // Determine table order from plan
  const tableOrder = pack.plan.tableOrder;

  const pool = createPostgresClient(config.database.connectionString);

  try {
    await testConnection(pool);

    // Verify that required tables exist by introspecting the schema
    const schema = await introspectDatabase(pool);
    const existingTables = new Set(schema.tables.map((t) => t.name));
    const missingTables = tableOrder.filter((t) => !existingTables.has(t));

    if (missingTables.length > 0) {
      throw new Error(
        `Cannot import Reality Pack: the following tables are missing from the database:\n` +
        `  ${missingTables.join(', ')}\n` +
        `Create these tables first, then retry the import.`,
      );
    }

    const insertResult = await withTransaction(pool, async (client) => {
      return batchInsertDataset(client, dataset, tableOrder, pack.plan.config.batchSize);
    });

    const durationMs = Math.round(performance.now() - start);

    return {
      pack,
      insertResult,
      totalRows: insertResult.totalRows,
      durationMs,
    };
  } finally {
    await closeConnection(pool);
  }
}

/**
 * Converts a Reality Pack's dataset into the GeneratedDataset format
 * expected by batchInsertDataset.
 */
function packDatasetToGenerated(pack: RealityPack): GeneratedDataset {
  const tables = new Map<string, GeneratedTable>();

  for (const [tableName, tableData] of Object.entries(pack.dataset.tables)) {
    tables.set(tableName, {
      tableName,
      columns: tableData.columns,
      rows: tableData.rows,
      rowCount: tableData.rowCount,
    });
  }

  return {
    tables,
    generatedAt: pack.metadata.createdAt,
    seed: pack.metadata.seed,
    totalRows: pack.metadata.totalRows,
  };
}
