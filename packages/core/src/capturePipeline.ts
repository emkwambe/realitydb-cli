import type { DataboxConfig } from '@databox/config';
import type { RealityPack, PackSchema, PackDataset } from '@databox/shared';
import { createDatabaseClient, testConnection, closeConnection, readTableRows } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { generateCreateTableDDL } from '@databox/schema';
import { saveRealityPack } from '@databox/generators';
import { buildDependencyGraph, topologicalSort } from './planning/index.js';

export interface CaptureOptions {
  name: string;
  description?: string;
  tables?: string[];
  outputDir?: string;
}

export interface CaptureResult {
  pack: RealityPack;
  filePath: string;
  totalRows: number;
  tableCount: number;
  durationMs: number;
  tableDetails: { name: string; rowCount: number }[];
}

function maskConnection(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    return connectionString.replace(/:([^@/]+)@/, ':****@');
  }
}

export async function captureDatabase(
  config: DataboxConfig,
  options: CaptureOptions,
): Promise<CaptureResult> {
  const start = performance.now();

  const pool = createDatabaseClient(config.database.client, config.database.connectionString);

  try {
    await testConnection(pool);

    // Introspect schema
    const schema = await introspectDatabase(pool);

    // Build dependency graph for ordering
    const graph = buildDependencyGraph(schema.foreignKeys);
    const sorted = topologicalSort(graph);
    // Include all schema tables (graph only has tables with FKs)
    const graphOrder = sorted.order;
    const allTableNames = schema.tables.map((t) => t.name);
    const tableOrder = [
      ...graphOrder,
      ...allTableNames.filter((t) => !graphOrder.includes(t)),
    ];

    // Determine which tables to capture
    let tablesToCapture: string[];
    if (options.tables && options.tables.length > 0) {
      // Include requested tables + their FK dependencies
      const requested = new Set(options.tables);
      const allDeps = new Set<string>();

      function addDeps(tableName: string): void {
        if (allDeps.has(tableName)) return;
        allDeps.add(tableName);
        for (const fk of schema.foreignKeys) {
          if (fk.sourceTable === tableName && fk.sourceTable !== fk.targetTable) {
            addDeps(fk.targetTable);
          }
        }
      }

      for (const t of requested) {
        addDeps(t);
      }

      // Order by dependency
      tablesToCapture = tableOrder.filter((t) => allDeps.has(t));
    } else {
      tablesToCapture = tableOrder;
    }

    // Filter schema to only captured tables
    const capturedTableSet = new Set(tablesToCapture);
    const filteredTables = schema.tables.filter((t) => capturedTableSet.has(t.name));
    const filteredFKs = schema.foreignKeys.filter(
      (fk) => capturedTableSet.has(fk.sourceTable) && capturedTableSet.has(fk.targetTable),
    );

    const filteredSchema = {
      ...schema,
      tables: filteredTables,
      foreignKeys: filteredFKs,
      tableCount: filteredTables.length,
      foreignKeyCount: filteredFKs.length,
    };

    // Generate DDL from filtered schema
    const ddl = generateCreateTableDDL(filteredSchema);

    // Read data from each table
    const packDataset: PackDataset = { tables: {} };
    const tableDetails: { name: string; rowCount: number }[] = [];
    let totalRows = 0;

    for (const tableName of tablesToCapture) {
      const tableSchema = filteredTables.find((t) => t.name === tableName);
      if (!tableSchema) continue;

      const columns = tableSchema.columns.map((c) => c.name);
      const rows = await readTableRows(pool, tableName, columns);
      const rowCount = rows.length;

      packDataset.tables[tableName] = {
        columns,
        rows,
        rowCount,
      };

      tableDetails.push({ name: tableName, rowCount });
      totalRows += rowCount;
    }

    // Build pack schema
    const packSchema: PackSchema = {
      tables: filteredTables.map((t) => ({
        name: t.name,
        columns: t.columns.map((c) => ({
          name: c.name,
          dataType: c.dataType,
          nullable: c.isNullable,
          maxLength: c.maxLength,
        })),
        primaryKey: t.primaryKey?.columnName,
      })),
      foreignKeys: filteredFKs.map((fk) => ({
        sourceTable: fk.sourceTable,
        sourceColumn: fk.sourceColumn,
        targetTable: fk.targetTable,
        targetColumn: fk.targetColumn,
      })),
    };

    // Build a minimal GenerationPlan for the pack
    const plan = {
      version: '1.0',
      planId: `capture-${options.name}-${Date.now()}`,
      tables: [],
      tableOrder: tablesToCapture,
      config: {
        targetDatabase: 'postgres' as const,
        defaultRowCount: 0,
        batchSize: config.seed?.batchSize ?? 1000,
        environment: 'dev' as const,
      },
      reproducibility: {
        randomSeed: 0,
        strategyVersion: '0.3.0',
      },
    };

    const masked = maskConnection(config.database.connectionString);

    const pack: RealityPack = {
      format: 'realitydb-pack',
      version: '1.0',
      metadata: {
        name: options.name,
        description: options.description,
        createdAt: new Date().toISOString(),
        seed: 0,
        totalRows,
        tableCount: tablesToCapture.length,
        ddl,
        capturedFrom: masked,
      },
      schema: packSchema,
      plan: plan as RealityPack['plan'],
      dataset: packDataset,
    };

    // Save to file
    const outputDir = options.outputDir ?? '.';
    const filePath = await saveRealityPack(pack, outputDir);

    const durationMs = Math.round(performance.now() - start);

    return {
      pack,
      filePath,
      totalRows,
      tableCount: tablesToCapture.length,
      durationMs,
      tableDetails,
    };
  } finally {
    await closeConnection(pool);
  }
}
