import type { DataboxConfig } from '@databox/config';
import { createPostgresClient, testConnection, closeConnection, truncateTables } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { buildDependencyGraph, topologicalSort } from './planning/index.js';

export interface ResetResult {
  tablesCleared: string[];
  durationMs: number;
}

export async function resetDatabase(
  config: DataboxConfig,
): Promise<ResetResult> {
  const start = performance.now();
  const pool = createPostgresClient(config.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    // Build dependency graph and get topological order
    const graph = buildDependencyGraph(schema.foreignKeys);
    const allTableNames = schema.tables.map((t) => t.name);
    for (const name of allTableNames) {
      if (!graph.nodes.includes(name)) {
        graph.nodes.push(name);
      }
    }
    graph.nodes.sort();

    const sortResult = topologicalSort(graph);
    const insertionOrder = [...sortResult.order];
    for (const name of allTableNames) {
      if (!insertionOrder.includes(name)) {
        insertionOrder.push(name);
      }
    }

    // Reverse order: children before parents
    const reverseOrder = [...insertionOrder].reverse();

    const truncateResult = await truncateTables(pool, reverseOrder, true);

    const durationMs = Math.round(performance.now() - start);

    return {
      tablesCleared: truncateResult.tablesCleared,
      durationMs,
    };
  } finally {
    await closeConnection(pool);
  }
}
