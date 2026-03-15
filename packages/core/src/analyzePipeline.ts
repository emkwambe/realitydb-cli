import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import { createDatabaseClient, testConnection, closeConnection, readTableRows } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import {
  detectTableColumns,
  analyzeTableSample,
  refineDetection,
  generateTemplate,
  serializeTemplate,
  buildAnalysisReport,
  scanColumnValues,
  isFreeTextColumn,
} from '@databox/generators';
import type {
  TableAnalysis,
  ColumnAnalysisEntry,
  AnalysisReport,
  ValueScanResult,
} from '@databox/generators';

export interface AnalyzeOptions {
  sampleSize?: number;
  output?: string;
  safeMode?: boolean;
  autoTemplate?: boolean;
}

export interface SanitizationReport {
  totalScanned: number;
  totalDetections: number;
  byCategory: Record<string, number>;
}

export interface AnalyzeResult {
  schema: DatabaseSchema;
  report: AnalysisReport;
  templateJson?: string;
  templatePath?: string;
  confidenceBreakdown: { high: number; medium: number; low: number };
  sanitizationReport?: SanitizationReport;
  durationMs: number;
}

/**
 * Maps PII scan categories to column detection strategy kinds for confidence boosting.
 */
const PII_TO_KIND: Record<string, string> = {
  email: 'email',
  phone: 'phone',
  name: 'full_name',
  address: 'address',
  ssn: 'text',
  ip_address: 'text',
  url: 'url',
  financial: 'text',
  medical: 'text',
  date_of_birth: 'timestamp',
};

export async function analyzeDatabase(
  config: DataboxConfig,
  options?: AnalyzeOptions,
): Promise<AnalyzeResult> {
  const start = performance.now();
  const sampleSize = options?.sampleSize ?? 1000;
  const safeMode = options?.safeMode ?? true;

  const pool = createDatabaseClient(config.database.client, config.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    // Phase 1: Detect column semantics using heuristics
    const tableAnalyses: TableAnalysis[] = [];

    // Sanitization tracking
    let totalScanned = 0;
    let totalDetections = 0;
    const byCategory: Record<string, number> = {};

    for (const table of schema.tables) {
      const tableForeignKeys = schema.foreignKeys.filter(
        (fk) => fk.sourceTable === table.name,
      );

      const detections = detectTableColumns(table.columns, tableForeignKeys, table.name);

      // Phase 1b: Safe mode — scan sample values for PII before passing to analysis
      if (safeMode && table.estimatedRowCount > 0) {
        const scanSampleSize = Math.min(sampleSize, 100);
        const columnNames = table.columns.map((c) => c.name);
        const sampleRows = await readTableRows(pool, table.name, columnNames, scanSampleSize);

        if (sampleRows.length > 0) {
          for (let i = 0; i < detections.length; i++) {
            const detection = detections[i];
            if (detection.isPrimaryKey || detection.isForeignKey) continue;

            const col = table.columns.find((c) => c.name === detection.columnName);
            const values = sampleRows.map((r) => r[detection.columnName]);
            const freeText = col ? isFreeTextColumn(col.name, col.udtName, col.maxLength) : false;
            const scanResults = scanColumnValues(values, { isFreeText: freeText });

            totalScanned++;

            if (scanResults.length > 0) {
              for (const result of scanResults) {
                totalDetections++;
                byCategory[result.category] = (byCategory[result.category] ?? 0) + 1;
              }

              // Use PII detection as positive signal to boost confidence
              const best = scanResults.sort((a, b) => b.hitRate - a.hitRate)[0];
              const mappedKind = PII_TO_KIND[best.category];
              if (mappedKind && (detection.confidence === 'low' || detection.confidence === 'medium')) {
                detections[i] = {
                  ...detection,
                  confidence: best.confidence === 'high' ? 'high' : 'medium',
                  reason: `${detection.reason}; value scan confirmed ${best.matchedPattern} (${Math.round(best.hitRate * 100)}% hit rate)`,
                };
              }
            }
          }
        }
      }

      // Phase 2: Sample actual data for distribution learning
      const queryFn = async (sql: string): Promise<Record<string, unknown>[]> => {
        const result = await pool.query(sql);
        return result.rows as Record<string, unknown>[];
      };

      const sampleAnalysis = await analyzeTableSample(
        table.name,
        detections,
        table.estimatedRowCount,
        queryFn,
        sampleSize,
      );

      // Phase 3: Refine detections with sample data
      const columns: ColumnAnalysisEntry[] = detections.map((detection) => {
        const stats = sampleAnalysis.columns.find((s) => s.columnName === detection.columnName) ?? null;
        const refinedStrategy = refineDetection(detection, stats);
        return { detection, sampleStats: stats, refinedStrategy };
      });

      tableAnalyses.push({
        tableName: table.name,
        estimatedRowCount: table.estimatedRowCount,
        columns,
      });
    }

    // Extract database name from connection string
    const dbName = extractDatabaseName(config.database.connectionString);
    const hasSampleData = schema.tables.some((t) => t.estimatedRowCount > 0);

    const report = buildAnalysisReport(tableAnalyses, dbName, sampleSize, hasSampleData);

    // Compute confidence breakdown
    const confidenceBreakdown = { high: 0, medium: 0, low: 0 };
    for (const analysis of tableAnalyses) {
      for (const col of analysis.columns) {
        confidenceBreakdown[col.detection.confidence]++;
      }
    }

    // Phase 4: Generate template if requested
    let templateJson: string | undefined;
    if (options?.output || options?.autoTemplate) {
      const template = generateTemplate(tableAnalyses, dbName);
      templateJson = serializeTemplate(template);
    }

    // Build sanitization report if safe mode was used
    const sanitizationReport: SanitizationReport | undefined = safeMode
      ? { totalScanned, totalDetections, byCategory }
      : undefined;

    const durationMs = Math.round(performance.now() - start);

    return {
      schema,
      report,
      templateJson,
      templatePath: options?.output,
      confidenceBreakdown,
      sanitizationReport,
      durationMs,
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
    // Fallback: try to extract from connection string manually
    const match = connectionString.match(/\/([^/?]+)(?:\?|$)/);
    return match?.[1] ?? 'database';
  }
}
