import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import { createDatabaseClient, testConnection, closeConnection, withTransaction, batchInsertTable, readTableRows, truncateTables } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import { detectTablePII, maskTableRows, buildAuditLog, exportToJson, exportToCsv, exportToSql, tokenizeTableRows, buildTokenMap, serializeTokenMap, generateTokenPrefix, scanColumnValues, isFreeTextColumn } from '@databox/generators';
import type { PIIDetection, ComplianceMode, MaskTableResult, MaskAuditLog, GeneratedTable, TokenEntry, TokenMap } from '@databox/generators';
import { buildDependencyGraph, topologicalSort } from './planning/index.js';

export interface MaskOptions {
  mode?: ComplianceMode;
  seed?: number;
  dryRun?: boolean;
  output?: string;
  outputFormat?: 'json' | 'csv' | 'sql';
  auditLog?: string;
  confirm?: boolean;
  tokenize?: boolean;
  tokenMapOutput?: string;
  deepScan?: boolean;
}

export interface MaskResult {
  schema: DatabaseSchema;
  auditLog: MaskAuditLog;
  durationMs: number;
  dryRun: boolean;
  tablesProcessed: number;
  totalRowsMasked: number;
  outputFiles?: string[];
  tokenMap?: TokenMap;
}

export async function maskDatabase(
  config: DataboxConfig,
  options?: MaskOptions,
): Promise<MaskResult> {
  const start = performance.now();
  const mode: ComplianceMode = options?.mode ?? 'gdpr';
  const seed = options?.seed ?? 42;
  const dryRun = options?.dryRun ?? false;

  const pool = createDatabaseClient(config.database.client, config.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    // Build table order for FK consistency
    const depGraph = buildDependencyGraph(schema.foreignKeys);
    const sortResult = topologicalSort(depGraph);
    const tableOrder = sortResult.order;

    // Ensure all tables are included (some may not appear in FK graph)
    for (const table of schema.tables) {
      if (!tableOrder.includes(table.name)) {
        tableOrder.push(table.name);
      }
    }

    // Phase 1: Detect PII across all tables
    const detectionsByTable = new Map<string, PIIDetection[]>();

    for (const table of schema.tables) {
      const tableForeignKeys = schema.foreignKeys.filter(
        (fk) => fk.sourceTable === table.name,
      );
      const detections = detectTablePII(table.columns, tableForeignKeys, table.name, mode);
      detectionsByTable.set(table.name, detections);
    }

    // Phase 1b (optional): Deep scan — sample row values to detect PII missed by schema analysis
    if (options?.deepScan) {
      for (const table of schema.tables) {
        const detections = detectionsByTable.get(table.name);
        if (!detections) continue;

        // Find columns marked safe that are text-type — candidates for value scanning
        const safeCandidates = detections.filter(
          (d) => d.category === 'safe' && !d.isPrimaryKey && !d.isForeignKey,
        );
        if (safeCandidates.length === 0) continue;

        const candidateNames = safeCandidates.map((d) => d.columnName);
        const sampleRows = await readTableRows(pool, table.name, candidateNames, 100);
        if (sampleRows.length === 0) continue;

        for (const candidate of safeCandidates) {
          const values = sampleRows.map((r) => r[candidate.columnName]);
          const col = table.columns.find((c) => c.name === candidate.columnName);
          const freeText = col ? isFreeTextColumn(col.name, col.udtName, col.maxLength) : false;
          const scanResults = scanColumnValues(values, { isFreeText: freeText });

          if (scanResults.length > 0) {
            // Promote the most confident result
            const best = scanResults.sort((a, b) => b.hitRate - a.hitRate)[0];
            const idx = detections.findIndex((d) => d.columnName === candidate.columnName);
            if (idx !== -1) {
              detections[idx] = {
                ...detections[idx],
                category: best.category,
                confidence: best.confidence,
                reason: `Value scan: ${Math.round(best.hitRate * 100)}% of samples contain ${best.matchedPattern}`,
                shouldMask: true,
                maskStrategy: best.suggestedStrategy,
              };
            }
          }
        }
      }
    }

    // Phase 2: Read, mask, and write data
    const maskResults: MaskTableResult[] = [];
    const random = createSeededRandom(seed);
    const useTokenization = options?.tokenize ?? false;
    const tokenPrefix = useTokenization ? generateTokenPrefix() : 'TOK';
    const allTokenEntries: TokenEntry[] = [];

    // For file export mode
    const maskedTables = new Map<string, GeneratedTable>();

    for (const tableName of tableOrder) {
      const table = schema.tables.find((t) => t.name === tableName);
      if (!table) continue;

      const detections = detectionsByTable.get(tableName);
      if (!detections) continue;

      const hasPII = detections.some((d) => d.shouldMask);
      if (!hasPII) {
        // No PII in this table, still record it
        maskResults.push({
          tableName,
          rowCount: 0,
          columnsMatched: detections.length,
          columnsMasked: 0,
          maskedColumns: [],
        });
        continue;
      }

      // Read rows
      const columns = table.columns.map((c) => c.name);
      const rows = await readTableRows(pool, tableName, columns);

      if (rows.length === 0) {
        maskResults.push({
          tableName,
          rowCount: 0,
          columnsMatched: detections.length,
          columnsMasked: detections.filter((d) => d.shouldMask).length,
          maskedColumns: [],
        });
        continue;
      }

      let outputRows: Record<string, unknown>[];

      if (useTokenization) {
        // Tokenization mode: replace values with reversible tokens
        const { tokenizedRows, entries } = tokenizeTableRows(rows, detections, tableName, tokenPrefix);
        outputRows = tokenizedRows;
        allTokenEntries.push(...entries);

        // Build a compatible MaskTableResult
        const columnsToMask = detections.filter((d) => d.shouldMask);
        const maskedColumns = columnsToMask.map((d) => ({
          columnName: d.columnName,
          strategy: d.maskStrategy,
          rowsMasked: tokenizedRows.filter((r) => r[d.columnName] !== null && r[d.columnName] !== undefined).length,
        }));
        maskResults.push({
          tableName,
          rowCount: rows.length,
          columnsMatched: detections.length,
          columnsMasked: columnsToMask.length,
          maskedColumns,
        });
      } else {
        // Standard masking mode
        const { maskedRows, result } = maskTableRows(rows, detections, random, tableName);
        outputRows = maskedRows;
        maskResults.push(result);
      }

      if (dryRun) continue;

      // Store for file output
      maskedTables.set(tableName, {
        tableName,
        columns,
        rows: outputRows,
        rowCount: outputRows.length,
      });
    }

    // Phase 3: Write masked data
    let outputFiles: string[] | undefined;

    if (!dryRun && options?.output) {
      // Export to files
      const dataset = {
        tables: maskedTables,
        generatedAt: new Date().toISOString(),
        seed,
        totalRows: Array.from(maskedTables.values()).reduce((sum, t) => sum + t.rowCount, 0),
      };

      const format = options.outputFormat ?? 'json';
      switch (format) {
        case 'json':
          outputFiles = await exportToJson(dataset, options.output);
          break;
        case 'csv':
          outputFiles = await exportToCsv(dataset, options.output);
          break;
        case 'sql':
          outputFiles = await exportToSql(dataset, options.output, tableOrder);
          break;
      }
    } else if (!dryRun && options?.confirm) {
      // Write back to database
      await withTransaction(pool, async (client) => {
        // Truncate and reinsert in reverse dependency order for FK safety
        const reversedOrder = [...tableOrder].reverse();
        for (const tableName of reversedOrder) {
          const maskedTable = maskedTables.get(tableName);
          if (!maskedTable || maskedTable.rowCount === 0) continue;
          await truncateTables(pool, [tableName], true);
        }

        // Insert in dependency order
        for (const tableName of tableOrder) {
          const maskedTable = maskedTables.get(tableName);
          if (!maskedTable || maskedTable.rowCount === 0) continue;
          await batchInsertTable(client, maskedTable, 1000, pool.dialect);
        }
      });
    }

    // Phase 4: Build audit log
    const dbName = extractDatabaseName(config.database.connectionString);
    const auditLog = buildAuditLog(detectionsByTable, maskResults, mode, seed, dbName);

    // Build token map if tokenization mode was used
    let tokenMap: TokenMap | undefined;
    if (useTokenization && allTokenEntries.length > 0) {
      tokenMap = buildTokenMap(allTokenEntries, tokenPrefix);
    }

    const durationMs = Math.round(performance.now() - start);

    return {
      schema,
      auditLog,
      durationMs,
      dryRun,
      tablesProcessed: maskResults.length,
      totalRowsMasked: auditLog.summary.totalRowsMasked,
      outputFiles,
      tokenMap,
    };
  } finally {
    await closeConnection(pool);
  }
}

function extractDatabaseName(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    return url.pathname.replace(/^\//, '') || 'database';
  } catch {
    const match = connectionString.match(/\/([^/?]+)(?:\?|$)/);
    return match?.[1] ?? 'database';
  }
}
