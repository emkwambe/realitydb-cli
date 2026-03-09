import type { DataboxConfig } from '@databox/config';
import type { ScenarioConfig, ScenarioResult } from '@databox/shared';
import { createPostgresClient, testConnection, closeConnection } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import { generateDataset, generateTimelineDataset, exportToJson, exportToCsv, exportToSql, applyScenarios } from '@databox/generators';
import { buildGenerationPlan } from './planning/index.js';
import { parseTimelineString } from './planning/parseTimeline.js';

export interface ExportOptions {
  format?: 'json' | 'csv' | 'sql';
  outputDir?: string;
  records?: number;
  seed?: number;
  template?: string;
  timeline?: string;
  scenarios?: string;
  scenarioIntensity?: 'low' | 'medium' | 'high';
}

export interface ExportResult {
  format: string;
  files: string[];
  totalRows: number;
  outputDir: string;
  timelineUsed?: boolean;
  scenariosApplied?: ScenarioResult[];
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
  if (options?.template !== undefined) {
    effectiveConfig.template = options.template;
  }

  // Parse timeline if provided
  const timelineConfig = options?.timeline
    ? parseTimelineString(options.timeline)
    : undefined;

  const pool = createPostgresClient(effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig, timelineConfig);

    // Generate dataset — use timeline engine if timeline provided
    let dataset = timelineConfig
      ? generateTimelineDataset(plan, timelineConfig)
      : generateDataset(plan);

    // Apply scenarios if provided
    let scenariosApplied: ScenarioResult[] | undefined;
    if (options?.scenarios) {
      const scenarioConfigs = parseScenarioString(
        options.scenarios,
        options.scenarioIntensity ?? 'medium',
      );
      const random = createSeededRandom(plan.reproducibility.randomSeed);
      const result = applyScenarios(dataset, scenarioConfigs, random);
      dataset = result.dataset;
      scenariosApplied = result.results;
    }

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
      timelineUsed: !!timelineConfig,
      scenariosApplied,
    };
  } finally {
    await closeConnection(pool);
  }
}

function parseScenarioString(
  scenarios: string,
  intensity: 'low' | 'medium' | 'high',
): ScenarioConfig[] {
  return scenarios
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((name) => ({
      name,
      intensity,
    }));
}
