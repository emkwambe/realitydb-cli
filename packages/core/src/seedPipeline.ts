import type { DataboxConfig } from '@databox/config';
import type { DatabaseSchema } from '@databox/schema';
import type { GenerationPlan } from '@databox/shared';
import type { DatasetInsertResult } from '@databox/db';
import { createPostgresClient, testConnection, closeConnection, withTransaction, batchInsertDataset } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { generateDataset } from '@databox/generators';
import { buildGenerationPlan, validateGenerationPlan } from './planning/index.js';

export interface SeedOptions {
  records?: number;
  seed?: number;
  template?: string;
}

export interface SeedResult {
  schema: DatabaseSchema;
  plan: GenerationPlan;
  insertResult: DatasetInsertResult;
  totalRows: number;
  durationMs: number;
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

  const pool = createPostgresClient(effectiveConfig.database.connectionString);

  try {
    await testConnection(pool);

    const schema = await introspectDatabase(pool);

    const plan = buildGenerationPlan(schema, effectiveConfig);

    const validation = validateGenerationPlan(plan);
    if (!validation.valid) {
      throw new Error(
        `Generation plan validation failed:\n${validation.errors.join('\n')}`,
      );
    }

    const dataset = generateDataset(plan);

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
    };
  } finally {
    await closeConnection(pool);
  }
}
