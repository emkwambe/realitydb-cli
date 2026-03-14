import type { DataboxConfig } from '@databox/config';
import type { ScenarioConfig, ScenarioResult, RealityPack } from '@databox/shared';
import { createDatabaseClient, testConnection, closeConnection } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import {
  generateDataset,
  generateTimelineDataset,
  applyScenarios,
  exportRealityPack,
  saveRealityPack,
} from '@databox/generators';
import { buildGenerationPlan } from './planning/index.js';
import { parseTimelineString } from './planning/parseTimeline.js';

export interface PackExportOptions {
  name?: string;
  description?: string;
  outputDir?: string;
  records?: number;
  seed?: number;
  template?: string;
  timeline?: string;
  scenarios?: string;
  scenarioIntensity?: 'low' | 'medium' | 'high';
}

export interface PackExportResult {
  filePath: string;
  pack: RealityPack;
}

export async function exportPack(
  config: DataboxConfig,
  options?: PackExportOptions,
): Promise<PackExportResult> {
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

  if (timelineConfig) {
    timelineConfig.growthModel.finalCount = effectiveConfig.seed.defaultRecords;
  }

  const pool = createDatabaseClient(effectiveConfig.database.client, effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig, timelineConfig);

    // Generate dataset
    let dataset = timelineConfig
      ? generateTimelineDataset(plan, timelineConfig)
      : generateDataset(plan);

    // Apply scenarios if provided
    if (options?.scenarios) {
      const scenarioConfigs = parseScenarioString(
        options.scenarios,
        options.scenarioIntensity ?? 'medium',
      );
      const random = createSeededRandom(plan.reproducibility.randomSeed);
      const result = applyScenarios(dataset, scenarioConfigs, random);
      dataset = result.dataset;
    }

    // Build Reality Pack
    const pack = exportRealityPack(dataset, plan, schema, {
      name: options?.name,
      description: options?.description,
    });

    // Save to file
    const outputDir = options?.outputDir ?? '.';
    const filePath = await saveRealityPack(pack, outputDir);

    return { filePath, pack };
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
