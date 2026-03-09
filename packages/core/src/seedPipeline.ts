import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import type { GenerationPlan, ScenarioConfig, ScenarioResult } from '@databox/shared';
import type { DatasetInsertResult } from '@databox/db';
import { createPostgresClient, testConnection, closeConnection, withTransaction, batchInsertDataset } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import { generateDataset, generateTimelineDataset, applyScenarios } from '@databox/generators';
import { buildGenerationPlan, validateGenerationPlan } from './planning/index.js';
import { parseTimelineString } from './planning/parseTimeline.js';

export interface SeedOptions {
  records?: number;
  seed?: number;
  template?: string;
  timeline?: string;
  scenarios?: string;
  scenarioIntensity?: 'low' | 'medium' | 'high';
}

export interface SeedResult {
  schema: DatabaseSchema;
  plan: GenerationPlan;
  insertResult: DatasetInsertResult;
  totalRows: number;
  durationMs: number;
  timelineUsed?: boolean;
  scenariosApplied?: ScenarioResult[];
}

export async function seedDatabase(
  config: DataboxConfig,
  options?: SeedOptions,
): Promise<SeedResult> {
  const start = performance.now();

  // Apply overrides from options
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

  const pool = createPostgresClient(effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig, timelineConfig);

    const validation = validateGenerationPlan(plan);
    if (!validation.valid) {
      throw new Error(
        `Generation plan validation failed:\n${validation.errors.join('\n')}`,
      );
    }

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

    const insertResult = await withTransaction(pool, async (client) => {
      return batchInsertDataset(client, dataset, plan.tableOrder, plan.config.batchSize);
    });

    const durationMs = Math.round(performance.now() - start);

    return {
      schema,
      plan,
      insertResult,
      totalRows: insertResult.totalRows,
      durationMs,
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
