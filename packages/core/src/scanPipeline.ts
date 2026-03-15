import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import { createDatabaseClient, testConnection, closeConnection } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { buildDependencyGraph, topologicalSort } from './planning/index.js';

export interface ScanResult {
  schema: DatabaseSchema;
  insertionOrder: string[];
  hasCycles: boolean;
  cycleNodes?: string[];
  warnings: string[];
}

export async function scanDatabase(config: DataboxConfig): Promise<ScanResult> {
  const pool = createDatabaseClient(config.database.client, config.database.connectionString);

  try {
    const connected = await testConnection(pool);
    if (!connected) {
      throw new Error('Database connection test returned false');
    }

    const schema = await introspectDatabase(pool);

    const graph = buildDependencyGraph(schema.foreignKeys);
    const sortResult = topologicalSort(graph);

    // Include tables that have no FK relationships in the insertion order
    const allTableNames = schema.tables.map((t) => t.name);
    const tablesInGraph = new Set(graph.nodes);
    const tablesNotInGraph = allTableNames
      .filter((t) => !tablesInGraph.has(t))
      .sort();

    const insertionOrder = [...tablesNotInGraph, ...sortResult.order];

    const warnings: string[] = [];
    if (sortResult.hasCycle && sortResult.cycleNodes) {
      warnings.push(
        `Circular dependency detected among tables: ${sortResult.cycleNodes.join(', ')}`,
      );
    }

    return {
      schema,
      insertionOrder,
      hasCycles: sortResult.hasCycle,
      cycleNodes: sortResult.cycleNodes,
      warnings,
    };
  } finally {
    await closeConnection(pool);
  }
}
