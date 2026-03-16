import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import type { GenerationPlan, ScenarioConfig, ScenarioResult } from '@databox/shared';
import type { DatasetInsertResult } from '@databox/db';
import { createDatabaseClient, testConnection, closeConnection, withTransaction, batchInsertDataset } from '@databox/db';
import { createSeededRandom } from '@databox/shared';
import { introspectDatabase } from '@databox/schema';
import { generateDataset, generateTimelineDataset, simulateLifecycles, applyCorrelations } from '@databox/generators';
import { composeScenarios, parseScheduleString, applyScheduledScenarios, buildScenarioReport, formatScenarioReportCI } from '@databox/generators';
import type { GeneratedDataset } from '@databox/generators';
import type { LifecycleDefinition, SimulationResult } from '@databox/shared';
import { buildGenerationPlan, validateGenerationPlan } from './planning/index.js';
import { parseTimelineString } from './planning/parseTimeline.js';
import { resolveLifecycle } from './resolveLifecycle.js';
import { loadTemplateFromJSON } from '@databox/templates';

export interface SeedOptions {
  records?: number;
  seed?: number;
  template?: string;
  timeline?: string;
  scenarios?: string;
  scenarioIntensity?: 'low' | 'medium' | 'high';
  scenarioSchedule?: string;
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
  scenarioReport?: Record<string, unknown>;
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

  // If no --records flag was passed, check if template has generationConfig.seed.defaultRecords
  if (options?.records === undefined && effectiveConfig.template) {
    const isFilePath = effectiveConfig.template.includes('/') || effectiveConfig.template.includes('\\') || effectiveConfig.template.endsWith('.json');
    if (isFilePath) {
      try {
        const tmpl = loadTemplateFromJSON(effectiveConfig.template);
        if (tmpl.generationConfig?.seed?.defaultRecords) {
          effectiveConfig.seed.defaultRecords = tmpl.generationConfig.seed.defaultRecords;
        }
      } catch {
        // Template will be validated later in buildGenerationPlan
      }
    }
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

    const validation = validateGenerationPlan(plan);
    if (!validation.valid) {
      throw new Error(
        `Generation plan validation failed:\n${validation.errors.join('\n')}`,
      );
    }

    // STEP 1: Generate full dataset using normal engine (always)
    const lifecycleUsed = !!options?.lifecycle;
    let dataset: GeneratedDataset = timelineConfig
      ? generateTimelineDataset(plan, timelineConfig)
      : generateDataset(plan);

    // STEP 2: If lifecycle enabled, overlay lifecycle state onto dataset
    if (options?.lifecycle && options?.template) {
      const lifecycle = resolveLifecycle(options.template);
      if (lifecycle) {
        dataset = applyLifecycleOverlay(dataset, lifecycle, plan, schema);
      }
    }

    // Apply scenarios: scheduled or composed
    let scenariosApplied: ScenarioResult[] | undefined;
    let scenarioReportData: Record<string, unknown> | undefined;

    if (options?.scenarioSchedule && timelineConfig) {
      // Timeline-scheduled scenarios
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
      // Composed scenarios (sequential application with conflict detection)
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

    const insertResult = await withTransaction(pool, async (client) => {
      return batchInsertDataset(client, dataset, plan.tableOrder, plan.config.batchSize, pool.dialect);
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
      scenarioReport: scenarioReportData,
    };
  } finally {
    await closeConnection(pool);
  }
}

/**
 * Overlays lifecycle simulation results onto an already-generated dataset.
 *
 * Instead of replacing the dataset (which loses all generated columns/FKs),
 * this function:
 * 1. Runs the lifecycle simulation to get per-entity state assignments
 * 2. Overlays state columnValues onto existing root table rows
 * 3. Overlays side-effect values onto existing related table rows
 * 4. Filters out columns that don't exist in the schema (with deduplicated warnings)
 */
function applyLifecycleOverlay(
  dataset: GeneratedDataset,
  lifecycle: LifecycleDefinition,
  plan: GenerationPlan,
  schema: DatabaseSchema,
): GeneratedDataset {
  const random = createSeededRandom(plan.reproducibility.randomSeed);
  const rootTable = dataset.tables.get(lifecycle.rootTable);
  const entityCount = rootTable?.rowCount ?? plan.tables[0]?.rowCount ?? 0;

  // Run lifecycle simulation
  const simResult: SimulationResult = simulateLifecycles(lifecycle, entityCount, random);
  const correlatedResult = applyCorrelations(simResult, lifecycle.correlations, random);

  // Build schema column lookup for validation
  const schemaColumnLookup = new Map<string, Set<string>>();
  for (const table of schema.tables) {
    schemaColumnLookup.set(table.name, new Set(table.columns.map((c) => c.name)));
  }

  // Track warned columns to deduplicate warnings (one per column, not per row)
  const warnedColumns = new Set<string>();

  // Overlay root table: merge lifecycle columnValues onto existing generated rows
  if (rootTable) {
    const lifecycleRootRows = correlatedResult.tables.get(lifecycle.rootTable);
    if (lifecycleRootRows) {
      const validColumns = schemaColumnLookup.get(lifecycle.rootTable);
      const count = Math.min(rootTable.rows.length, lifecycleRootRows.length);
      for (let i = 0; i < count; i++) {
        for (const [col, val] of Object.entries(lifecycleRootRows[i])) {
          if (col === 'id') continue; // Never overwrite generated IDs
          if (validColumns && !validColumns.has(col)) {
            const key = `${lifecycle.rootTable}.${col}`;
            if (!warnedColumns.has(key)) {
              console.warn(`Skipping lifecycle column '${col}' on table '${lifecycle.rootTable}' — not in schema`);
              warnedColumns.add(key);
            }
            continue;
          }
          rootTable.rows[i][col] = val;
        }
      }
    }
  }

  // Overlay side-effect tables: merge lifecycle values onto existing generated rows
  for (const [tableName, lifecycleRows] of correlatedResult.tables) {
    if (tableName === lifecycle.rootTable) continue;

    const existingTable = dataset.tables.get(tableName);
    if (!existingTable || lifecycleRows.length === 0) continue;

    const validColumns = schemaColumnLookup.get(tableName);
    const entityIdCol = `${lifecycle.entityName}_id`;

    // Overlay lifecycle values onto existing rows proportionally
    // (lifecycle rows may not have valid FKs, so we modify existing rows in-place)
    const count = Math.min(lifecycleRows.length, existingTable.rows.length);
    for (let i = 0; i < count; i++) {
      for (const [col, val] of Object.entries(lifecycleRows[i])) {
        // Skip generated IDs and lifecycle-injected FK columns
        if (col === 'id' || col === entityIdCol) continue;
        if (validColumns && !validColumns.has(col)) {
          const key = `${tableName}.${col}`;
          if (!warnedColumns.has(key)) {
            console.warn(`Skipping lifecycle column '${col}' on table '${tableName}' — not in schema`);
            warnedColumns.add(key);
          }
          continue;
        }
        existingTable.rows[i][col] = val;
      }
    }
  }

  return dataset;
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
