import { createSeededRandom } from '@databox/shared';
import type { SeededRandom } from '@databox/shared';
import type { DatabaseSchema, ColumnSchema } from '@databox/schema';
import { sampleDistribution } from './distributions/index.js';
import type { DistributionConfig } from './distributions/index.js';
import { generateUuid, generateEmail, generateFirstName, generateLastName, generateFullName, generatePhone, generateTimestamp, generateBoolean, generateText } from './primitives/index.js';
import type { GeneratorContext, GeneratedRow } from './types.js';

/**
 * Schema definition for the generate command — no DB required.
 */
export interface GenerateSchema {
  tables: GenerateTableDef[];
}

export interface GenerateTableDef {
  name: string;
  columns: GenerateColumnDef[];
}

export interface GenerateColumnDef {
  name: string;
  type: string;
  distribution?: DistributionConfig;
  nullable?: boolean;
  nullProbability?: number;
  values?: unknown[];
  /** Foreign key reference: "table.column" */
  references?: string;
}

export interface ColumnCorrelation {
  source: string; // "column_name"
  target: string; // "column_name"
  /** Correlation coefficient [-1, 1]. Positive = same direction. */
  coefficient: number;
}

export interface GenerateOptions {
  schema: GenerateSchema;
  records: number;
  seed?: number;
  correlations?: ColumnCorrelation[];
}

/**
 * Streaming generator that yields rows in batches for constant memory usage.
 * Suitable for million+ row generation.
 */
export function* streamingGenerate(
  tableDef: GenerateTableDef,
  records: number,
  seed: number = 42,
  correlations?: ColumnCorrelation[],
): Generator<GeneratedRow[], void, undefined> {
  const BATCH_SIZE = 10_000;
  const random = createSeededRandom(seed);

  // Pre-generate correlated pairs if needed
  const correlationMap = buildCorrelationMap(correlations ?? [], tableDef.columns);

  let remaining = records;
  while (remaining > 0) {
    const batchSize = Math.min(BATCH_SIZE, remaining);
    const batch: GeneratedRow[] = [];

    for (let i = 0; i < batchSize; i++) {
      const rowIndex = records - remaining + i;
      const row = generateRow(tableDef, random, rowIndex, correlationMap);
      batch.push(row);
    }

    yield batch;
    remaining -= batchSize;
  }
}

/**
 * Generate a complete dataset in memory. For smaller datasets (< 100k rows).
 */
export function generateInMemory(
  tableDef: GenerateTableDef,
  records: number,
  seed: number = 42,
  correlations?: ColumnCorrelation[],
): GeneratedRow[] {
  const rows: GeneratedRow[] = [];
  for (const batch of streamingGenerate(tableDef, records, seed, correlations)) {
    rows.push(...batch);
  }
  return rows;
}

function generateRow(
  tableDef: GenerateTableDef,
  random: SeededRandom,
  rowIndex: number,
  correlationMap: Map<string, CorrelatedColumn>,
): GeneratedRow {
  const row: GeneratedRow = {};

  // First pass: generate independent columns
  for (const col of tableDef.columns) {
    if (correlationMap.has(col.name) && correlationMap.get(col.name)!.isTarget) {
      continue; // Will be filled in second pass
    }
    row[col.name] = generateColumnValue(col, random, rowIndex);
  }

  // Second pass: generate correlated columns
  for (const [colName, corr] of correlationMap) {
    if (!corr.isTarget) continue;
    const sourceValue = row[corr.sourceColumn] as number;
    const col = tableDef.columns.find((c) => c.name === colName)!;
    row[colName] = generateCorrelatedValue(col, random, sourceValue, corr.coefficient);
  }

  return row;
}

function generateColumnValue(
  col: GenerateColumnDef,
  random: SeededRandom,
  rowIndex: number,
): unknown {
  // Handle nullable
  if (col.nullable && col.nullProbability) {
    if (random.next() < col.nullProbability) {
      return null;
    }
  }

  // Handle enum-like values
  if (col.values && col.values.length > 0) {
    return random.pick(col.values);
  }

  // Handle distribution
  if (col.distribution) {
    const value = sampleDistribution(random, col.distribution);
    return isIntegerType(col.type) ? Math.round(value) : Math.round(value * 100) / 100;
  }

  // Infer from type
  return inferValueFromType(col, random, rowIndex);
}

function inferValueFromType(
  col: GenerateColumnDef,
  random: SeededRandom,
  rowIndex: number,
): unknown {
  const ctx: GeneratorContext = {
    seed: random,
    rowIndex,
    tableName: '',
    columnName: col.name,
    allGeneratedTables: new Map(),
    maxLength: null,
  };

  const type = col.type.toLowerCase();

  if (type === 'uuid') return generateUuid(ctx);
  if (type.includes('bool')) return generateBoolean(ctx, 0.5);
  if (type.includes('timestamp') || type === 'date') return generateTimestamp(ctx, 'past');
  if (type === 'text' || type.includes('varchar') || type.includes('char')) {
    // Infer from column name
    const name = col.name.toLowerCase();
    if (name.includes('email')) return generateEmail(ctx);
    if (name === 'first_name' || name === 'firstname') return generateFirstName(ctx);
    if (name === 'last_name' || name === 'lastname') return generateLastName(ctx);
    if (name === 'name' || name === 'full_name') return generateFullName(ctx);
    if (name.includes('phone')) return generatePhone(ctx);
    return generateText(ctx, 'short');
  }

  if (isIntegerType(type)) {
    return Math.floor(random.next() * 10000);
  }
  if (isNumericType(type)) {
    return Math.round(random.next() * 10000) / 100;
  }

  return generateText(ctx, 'short');
}

function generateCorrelatedValue(
  col: GenerateColumnDef,
  random: SeededRandom,
  sourceValue: number,
  coefficient: number,
): unknown {
  // Generate correlated numeric value
  // Use the source value as the base, add noise inversely proportional to coefficient
  const noise = (1 - Math.abs(coefficient)) * (random.next() - 0.5) * 2;
  const sign = coefficient >= 0 ? 1 : -1;

  if (col.distribution) {
    const dist = col.distribution;
    const min = dist.min ?? 0;
    const max = dist.max ?? sourceValue * 3;
    const range = max - min;
    const baseValue = min + (((sourceValue - min) / range) * sign + noise) * range;
    const clamped = Math.max(min, Math.min(max, baseValue));
    return isIntegerType(col.type) ? Math.round(clamped) : Math.round(clamped * 100) / 100;
  }

  const baseValue = sourceValue * sign + noise * sourceValue;
  return isIntegerType(col.type) ? Math.round(Math.abs(baseValue)) : Math.round(Math.abs(baseValue) * 100) / 100;
}

interface CorrelatedColumn {
  sourceColumn: string;
  coefficient: number;
  isTarget: boolean;
}

function buildCorrelationMap(
  correlations: ColumnCorrelation[],
  columns: GenerateColumnDef[],
): Map<string, CorrelatedColumn> {
  const map = new Map<string, CorrelatedColumn>();
  const colNames = new Set(columns.map((c) => c.name));

  for (const corr of correlations) {
    if (!colNames.has(corr.source) || !colNames.has(corr.target)) continue;
    map.set(corr.target, {
      sourceColumn: corr.source,
      coefficient: corr.coefficient,
      isTarget: true,
    });
    if (!map.has(corr.source)) {
      map.set(corr.source, {
        sourceColumn: corr.source,
        coefficient: corr.coefficient,
        isTarget: false,
      });
    }
  }

  return map;
}

function isIntegerType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('int') || t === 'serial' || t === 'bigserial' || t === 'smallserial';
}

function isNumericType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double') || t === 'real' || t === 'money';
}

/**
 * Converts a DatabaseSchema (from SQL parsing or introspection) to GenerateSchema.
 */
export function databaseSchemaToGenerateSchema(schema: DatabaseSchema): GenerateSchema {
  return {
    tables: schema.tables.map((table) => ({
      name: table.name,
      columns: table.columns
        .filter((col) => !col.hasDefault || !col.isPrimaryKey) // Skip auto-generated PKs
        .map((col) => columnSchemaToGenerateColumn(col)),
    })),
  };
}

function columnSchemaToGenerateColumn(col: ColumnSchema): GenerateColumnDef {
  return {
    name: col.name,
    type: col.udtName || col.dataType,
    nullable: col.isNullable,
    nullProbability: col.isNullable ? 0.05 : undefined,
  };
}
