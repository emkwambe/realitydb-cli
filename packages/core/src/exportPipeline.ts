import type { DataboxConfig } from '@databox/config';
import { createPostgresClient, testConnection, closeConnection } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { generateDataset, exportToJson, exportToCsv, exportToSql } from '@databox/generators';
import { buildGenerationPlan } from './planning/index.js';

export interface ExportOptions {
  format?: 'json' | 'csv' | 'sql';
  outputDir?: string;
  records?: number;
  seed?: number;
}

export interface ExportResult {
  format: string;
  files: string[];
  totalRows: number;
  outputDir: string;
}

export async function exportDataset(
  config: DataboxConfig,
  options?: ExportOptions,
): Promise<ExportResult> {
  const format = options?.format ?? config.export?.defaultFormat ?? 'json';
  const outputDir = options?.outputDir ?? config.export?.outputDir ?? './.databox';

  // Apply overrides
  const effectiveConfig = { ...config };
  effectiveConfig.seed = { ...config.seed };
  if (options?.records !== undefined) {
    effectiveConfig.seed.defaultRecords = options.records;
  }
  if (options?.seed !== undefined) {
    effectiveConfig.seed.randomSeed = options.seed;
  }

  const pool = createPostgresClient(effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig);

    const dataset = generateDataset(plan);

    let files: string[];

    switch (format) {
      case 'json':
        files = await exportToJson(dataset, outputDir);
        break;
      case 'csv':
        files = await exportToCsv(dataset, outputDir);
        break;
      case 'sql':
        files = await exportToSql(dataset, outputDir, plan.tableOrder);
        break;
      default:
        throw new Error(`Unknown export format: "${format}". Supported: json, csv, sql`);
    }

    return {
      format,
      files,
      totalRows: dataset.totalRows,
      outputDir,
    };
  } finally {
    await closeConnection(pool);
  }
}
