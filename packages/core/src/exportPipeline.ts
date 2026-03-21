import type { DataboxConfig } from '@databox/config';
import type { ScenarioConfig, ScenarioResult } from '@databox/shared';
import { createDatabaseClient, testConnection, closeConnection } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase, generateCreateTableDDL } from '@databox/schema';
import { generateDataset, generateTimelineDataset, exportToJson, exportToCsv, exportToSql } from '@databox/generators';
import { composeScenarios, parseScheduleString, applyScheduledScenarios, buildScenarioReport, formatScenarioReportCI } from '@databox/generators';
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
  scenarioSchedule?: string;
  batchSize?: number;
}

export interface ExportResult {
  format: string;
  files: string[];
  totalRows: number;
  outputDir: string;
  timelineUsed?: boolean;
  scenariosApplied?: ScenarioResult[];
  scenarioReport?: Record<string, unknown>;
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

  // Set finalCount from plan's rowCount so the config is self-consistent
  if (timelineConfig) {
    timelineConfig.growthModel.finalCount = effectiveConfig.seed.defaultRecords;
  }

  const pool = createDatabaseClient(effectiveConfig.database.client, effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig, timelineConfig);

    // Generate dataset — use timeline engine if timeline provided
    let dataset = timelineConfig
      ? generateTimelineDataset(plan, timelineConfig)
      : generateDataset(plan);

    // Apply scenarios: scheduled or composed
    let scenariosApplied: ScenarioResult[] | undefined;
    let scenarioReportData: Record<string, unknown> | undefined;

    if (options?.scenarioSchedule && timelineConfig) {
      const intensity = options.scenarioIntensity ?? 'medium';
      const scheduled = parseScheduleString(options.scenarioSchedule, intensity);
      const random = createSeededRandom(plan.reproducibility.randomSeed);
      const totalMonths = computeTotalMonths(timelineConfig);
      const result = applyScheduledScenarios(dataset, scheduled, random, totalMonths);
      dataset = result.dataset;
      scenariosApplied = result.results;

      const report = buildScenarioReport(result.results, [], true);
      scenarioReportData = formatScenarioReportCI(report);
    } else if (options?.scenarios) {
      const scenarioConfigs = parseScenarioString(
        options.scenarios,
        options.scenarioIntensity ?? 'medium',
      );
      const random = createSeededRandom(plan.reproducibility.randomSeed);
      const result = composeScenarios(dataset, scenarioConfigs, random);
      dataset = result.dataset;
      scenariosApplied = result.results;

      const report = buildScenarioReport(result.results, result.conflicts, false);
      scenarioReportData = formatScenarioReportCI(report);
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
        files = await exportToSql(dataset, outputDir, plan.tableOrder, {
          ddl: generateCreateTableDDL(schema),
          batchSize: options?.batchSize ?? 50,
          templateName: plan.config.templateName,
        });
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
      scenarioReport: scenarioReportData,
    };
  } finally {
    await closeConnection(pool);
  }
}

function computeTotalMonths(tc: { startDate: string; endDate: string }): number {
  const start = new Date(tc.startDate);
  const end = new Date(tc.endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(months, 1);
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
