import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import type { GenerationPlan, ScenarioConfig, ScenarioResult } from '@databox/shared';
import type { DatasetInsertResult } from '@databox/db';
import { createPostgresClient, testConnection, closeConnection, withTransaction, batchInsertDataset } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import { generateDataset, generateTimelineDataset, applyScenarios, simulateLifecycles, applyCorrelations } from '@databox/generators';
import type { GeneratedDataset, GeneratedTable } from '@databox/generators';
import { buildGenerationPlan, validateGenerationPlan } from './planning/index.js';
import { parseTimelineString } from './planning/parseTimeline.js';
import { resolveLifecycle } from './resolveLifecycle.js';

export interface SeedOptions {
  records?: number;
  seed?: number;
  template?: string;
  timeline?: string;
  scenarios?: string;
  scenarioIntensity?: 'low' | 'medium' | 'high';
  lifecycle?: boolean;
}

export interface SeedResult {
  schema: DatabaseSchema;
  plan: GenerationPlan;
  insertResult: DatasetInsertResult;
  totalRows: number;
  durationMs: number;
  timelineUsed?: boolean;
  lifecycleUsed?: boolean;
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

    // Generate dataset — lifecycle, timeline, or standard
    let dataset: GeneratedDataset;
    const lifecycleUsed = !!options?.lifecycle;

    if (options?.lifecycle && options?.template) {
      const lifecycle = resolveLifecycle(options.template);
      if (lifecycle) {
        const random = createSeededRandom(plan.reproducibility.randomSeed);
        const entityCount = effectiveConfig.seed.defaultRecords;
        const simResult = simulateLifecycles(lifecycle, entityCount, random);
        const correlatedResult = applyCorrelations(simResult, lifecycle.correlations, random);

        // Convert SimulationResult → GeneratedDataset
        const tables = new Map<string, GeneratedTable>();
        let totalRows = 0;
        for (const [tableName, rows] of correlatedResult.tables) {
          tables.set(tableName, {
            tableName,
            columns: rows.length > 0 ? Object.keys(rows[0]) : [],
            rows,
            rowCount: rows.length,
          });
          totalRows += rows.length;
        }

        dataset = {
          tables,
          generatedAt: new Date().toISOString(),
          seed: plan.reproducibility.randomSeed,
          totalRows,
        };
      } else {
        // No lifecycle for this template — fall back to standard generation
        dataset = timelineConfig
          ? generateTimelineDataset(plan, timelineConfig)
          : generateDataset(plan);
      }
    } else {
      dataset = timelineConfig
        ? generateTimelineDataset(plan, timelineConfig)
        : generateDataset(plan);
    }

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
      lifecycleUsed,
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
