import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import { createPostgresClient, testConnection, closeConnection } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import {
  detectTableColumns,
  analyzeTableSample,
  refineDetection,
  generateTemplate,
  serializeTemplate,
  buildAnalysisReport,
} from '@databox/generators';
import type {
  TableAnalysis,
  ColumnAnalysisEntry,
  AnalysisReport,
} from '@databox/generators';

export interface AnalyzeOptions {
  sampleSize?: number;
  output?: string;
}

export interface AnalyzeResult {
  schema: DatabaseSchema;
  report: AnalysisReport;
  templateJson?: string;
  durationMs: number;
}

export async function analyzeDatabase(
  config: DataboxConfig,
  options?: AnalyzeOptions,
): Promise<AnalyzeResult> {
  const start = performance.now();
  const sampleSize = options?.sampleSize ?? 1000;

  const pool = createPostgresClient(config.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    // Phase 1: Detect column semantics using heuristics
    const tableAnalyses: TableAnalysis[] = [];

    for (const table of schema.tables) {
      const tableForeignKeys = schema.foreignKeys.filter(
        (fk) => fk.sourceTable === table.name,
      );

      const detections = detectTableColumns(table.columns, tableForeignKeys, table.name);

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

    // Phase 4: Generate template if requested
    let templateJson: string | undefined;
    if (options?.output) {
      const template = generateTemplate(tableAnalyses, dbName);
      templateJson = serializeTemplate(template);
    }

    const durationMs = Math.round(performance.now() - start);

    return { schema, report, templateJson, durationMs };
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
