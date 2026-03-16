import type { DataboxConfig } from '@databox/config';
import type { RealityPack, PackSchema, PackDataset } from '@databox/shared';
import { createSeededRandom } from '@databox/shared';
import { createDatabaseClient, testConnection, closeConnection, readTableRows } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { generateCreateTableDDL } from '@databox/schema';
import { saveRealityPack, detectTablePII, maskTableRows, tokenizeTableRows, generateTokenPrefix } from '@databox/generators';
import type { PIIDetection } from '@databox/generators';
import { buildDependencyGraph, topologicalSort } from './planning/index.js';

export type SafeMode = 'mask' | 'tokenize' | 'redact';

export interface CaptureOptions {
  name: string;
  description?: string;
  tables?: string[];
  outputDir?: string;
  safe?: boolean;
  safeMode?: SafeMode;
  maxRows?: number;
  around?: { column: string; value: string };
}

export interface CaptureResult {
  pack: RealityPack;
  filePath: string;
  totalRows: number;
  tableCount: number;
  durationMs: number;
  tableDetails: { name: string; rowCount: number }[];
  piiSummary?: {
    columnsDetected: number;
    tablesAffected: number;
    categoriesFound: string[];
  };
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

    // If --around is specified, find related rows via FK chains
    let aroundFilter: Map<string, { column: string; values: Set<string> }> | undefined;
    if (options.around) {
      aroundFilter = new Map();
      const { column: aroundCol, value: aroundVal } = options.around;

      // Find which table has this column
      for (const table of filteredTables) {
        const hasCol = table.columns.some((c) => c.name === aroundCol);
        if (hasCol) {
          aroundFilter.set(table.name, { column: aroundCol, values: new Set([aroundVal]) });
        }
      }

      // Follow FK chains: if table A has aroundCol, and table B has FK to A, capture related rows
      for (const fk of filteredFKs) {
        const sourceFilter = aroundFilter.get(fk.targetTable);
        if (sourceFilter && sourceFilter.column === fk.targetColumn) {
          aroundFilter.set(fk.sourceTable, { column: fk.sourceColumn, values: sourceFilter.values });
        }
      }
    }

    // Phase: Detect PII if --safe mode
    const detectionsByTable = new Map<string, PIIDetection[]>();
    let piiSummary: CaptureResult['piiSummary'];

    if (options.safe) {
      const mode = 'gdpr'; // default compliance mode for safe capture
      for (const table of filteredTables) {
        const tableForeignKeys = filteredFKs.filter((fk) => fk.sourceTable === table.name);
        const detections = detectTablePII(table.columns, tableForeignKeys, table.name, mode);
        detectionsByTable.set(table.name, detections);
      }

      // Build PII summary
      let columnsDetected = 0;
      let tablesAffected = 0;
      const categoriesFound = new Set<string>();

      for (const [, detections] of detectionsByTable) {
        const piiCols = detections.filter((d) => d.shouldMask);
        if (piiCols.length > 0) {
          tablesAffected++;
          columnsDetected += piiCols.length;
          for (const d of piiCols) {
            categoriesFound.add(d.category);
          }
        }
      }

      piiSummary = {
        columnsDetected,
        tablesAffected,
        categoriesFound: Array.from(categoriesFound),
      };
    }

    // Read data from each table
    const packDataset: PackDataset = { tables: {} };
    const tableDetails: { name: string; rowCount: number }[] = [];
    let totalRows = 0;

    const safeMode = options.safeMode ?? 'mask';
    const random = options.safe ? createSeededRandom(42) : undefined;
    const tokenPrefix = options.safe && safeMode === 'tokenize' ? generateTokenPrefix() : undefined;

    for (const tableName of tablesToCapture) {
      const tableSchema = filteredTables.find((t) => t.name === tableName);
      if (!tableSchema) continue;

      const columns = tableSchema.columns.map((c) => c.name);
      let rows = await readTableRows(pool, tableName, columns);

      // Apply --around filter
      const filter = aroundFilter?.get(tableName);
      if (filter) {
        rows = rows.filter((row) => {
          const val = row[filter.column];
          return val !== null && val !== undefined && filter.values.has(String(val));
        });
      }

      // Apply --max-rows limit
      if (options.maxRows !== undefined && rows.length > options.maxRows) {
        rows = rows.slice(0, options.maxRows);
      }

      // Apply PII masking if --safe
      if (options.safe) {
        const detections = detectionsByTable.get(tableName);
        if (detections) {
          const hasPII = detections.some((d) => d.shouldMask);
          if (hasPII) {
            if (safeMode === 'tokenize' && tokenPrefix) {
              const { tokenizedRows } = tokenizeTableRows(rows, detections, tableName, tokenPrefix);
              rows = tokenizedRows;
            } else if (safeMode === 'redact') {
              // Override all mask strategies to 'redact' for redact mode
              const redactDetections = detections.map((d) =>
                d.shouldMask ? { ...d, maskStrategy: 'redact' as const } : d,
              );
              const { maskedRows } = maskTableRows(rows, redactDetections, random!, tableName);
              rows = maskedRows;
            } else {
              // Default: mask mode with realistic fakes
              const { maskedRows } = maskTableRows(rows, detections, random!, tableName);
              rows = maskedRows;
            }
          }
        }
      }

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

    // Determine safeMode metadata value
    const safeModeValue: 'raw' | 'masked' | 'tokenized' | 'redacted' = options.safe
      ? safeMode === 'tokenize'
        ? 'tokenized'
        : safeMode === 'redact'
          ? 'redacted'
          : 'masked'
      : 'raw';

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
        safeMode: safeModeValue,
        piiSummary,
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
      piiSummary,
    };
  } finally {
    await closeConnection(pool);
  }
}
