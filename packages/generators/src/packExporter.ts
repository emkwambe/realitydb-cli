import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GenerationPlan, RealityPack, PackSchema, PackDataset } from '@databox/shared';
import type { DatabaseSchema } from '@databox/schema';
import type { GeneratedDataset } from './types.js';

/**
 * Converts a generated dataset + plan + schema into the Reality Pack format.
 * The pack is fully self-contained — no external dependencies needed to replay.
 */
export function exportRealityPack(
  dataset: GeneratedDataset,
  plan: GenerationPlan,
  schema: DatabaseSchema,
  options?: { name?: string; description?: string },
): RealityPack {
  const name = options?.name ?? plan.config.templateName ?? 'realitydb-pack';

  const packSchema: PackSchema = {
    tables: schema.tables.map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => ({
        name: c.name,
        dataType: c.dataType,
        nullable: c.isNullable,
        maxLength: c.maxLength,
      })),
      primaryKey: t.primaryKey?.columnName,
    })),
    foreignKeys: schema.foreignKeys.map((fk) => ({
      sourceTable: fk.sourceTable,
      sourceColumn: fk.sourceColumn,
      targetTable: fk.targetTable,
      targetColumn: fk.targetColumn,
    })),
  };

  const packDataset: PackDataset = { tables: {} };
  // Use Array.from to guarantee all Map entries are captured during serialization
  for (const [tableName, table] of Array.from(dataset.tables.entries())) {
    packDataset.tables[tableName] = {
      columns: [...table.columns],
      rows: table.rows.map((row) => ({ ...row })),
      rowCount: table.rowCount,
    };
  }

  return {
    format: 'realitydb-pack',
    version: '1.0',
    metadata: {
      name,
      description: options?.description,
      createdAt: dataset.generatedAt,
      templateName: plan.config.templateName ?? plan.template?.name,
      seed: dataset.seed,
      totalRows: dataset.totalRows,
      tableCount: dataset.tables.size,
    },
    schema: packSchema,
    plan,
    dataset: packDataset,
  };
}

/**
 * Writes a Reality Pack as a single JSON file.
 * Returns the file path written.
 */
export async function saveRealityPack(pack: RealityPack, outputPath: string): Promise<string> {
  const filePath = outputPath.endsWith('.realitydb-pack.json') || outputPath.endsWith('.databox-pack.json')
    ? outputPath
    : `${outputPath}/${pack.metadata.name}.realitydb-pack.json`;

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(pack, null, 2), 'utf-8');
  return filePath;
}

/**
 * Reads and validates a Reality Pack file.
 * Throws a clear error if the format is invalid.
 */
export async function loadRealityPack(filePath: string): Promise<RealityPack> {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read Reality Pack file: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid Reality Pack file: not valid JSON`);
  }

  const pack = parsed as Record<string, unknown>;

  if (pack.format !== 'realitydb-pack' && pack.format !== 'databox-reality-pack') {
    throw new Error(
      `Invalid Reality Pack: expected format "realitydb-pack", got "${String(pack.format)}"`,
    );
  }

  if (!pack.version) {
    throw new Error('Invalid Reality Pack: missing version field');
  }

  if (!pack.metadata || typeof pack.metadata !== 'object') {
    throw new Error('Invalid Reality Pack: missing or invalid metadata');
  }

  if (!pack.schema || typeof pack.schema !== 'object') {
    throw new Error('Invalid Reality Pack: missing or invalid schema');
  }

  if (!pack.plan || typeof pack.plan !== 'object') {
    throw new Error('Invalid Reality Pack: missing or invalid plan');
  }

  if (!pack.dataset || typeof pack.dataset !== 'object') {
    throw new Error('Invalid Reality Pack: missing or invalid dataset');
  }

  return parsed as RealityPack;
}
