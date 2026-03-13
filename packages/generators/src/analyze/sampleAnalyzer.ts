import type { ColumnDetection } from './columnDetector.js';

/**
 * Statistics computed from sampling actual data in a column.
 */
export interface ColumnSampleStats {
  columnName: string;
  totalSampled: number;
  nullCount: number;
  nullRate: number;
  distinctCount: number;
  /** For string columns: frequency distribution of top values */
  topValues?: { value: string; count: number; frequency: number }[];
  /** For numeric columns: statistical summary */
  numericStats?: { min: number; max: number; mean: number; stddev: number };
  /** For boolean columns: true/false distribution */
  booleanStats?: { trueCount: number; falseCount: number; trueRate: number };
  /** For timestamp columns: date range */
  temporalStats?: { earliest: string; latest: string };
  /** Whether the column looks enum-like (≤ distinctThreshold unique values) */
  isEnumLike: boolean;
}

/**
 * Analysis results for an entire table.
 */
export interface TableSampleAnalysis {
  tableName: string;
  estimatedRowCount: number;
  sampledRowCount: number;
  columns: ColumnSampleStats[];
}

const DISTINCT_THRESHOLD = 20;

/**
 * Analyzes sample data from a database table.
 * queryFn executes a SQL query and returns rows.
 */
export async function analyzeTableSample(
  tableName: string,
  columns: ColumnDetection[],
  estimatedRowCount: number,
  queryFn: (sql: string) => Promise<Record<string, unknown>[]>,
  sampleSize: number,
): Promise<TableSampleAnalysis> {
  if (estimatedRowCount === 0) {
    return {
      tableName,
      estimatedRowCount: 0,
      sampledRowCount: 0,
      columns: columns.map((c) => ({
        columnName: c.columnName,
        totalSampled: 0,
        nullCount: 0,
        nullRate: 0,
        distinctCount: 0,
        isEnumLike: false,
      })),
    };
  }

  // Build column list for query (exclude FK and PK-only columns for sampling — still include them but skip heavy analysis)
  const columnNames = columns.map((c) => `"${c.columnName}"`).join(', ');

  // Sample rows using TABLESAMPLE or LIMIT
  const sql = `SELECT ${columnNames} FROM "${tableName}" LIMIT ${sampleSize}`;
  let rows: Record<string, unknown>[];
  try {
    rows = await queryFn(sql);
  } catch {
    // Table might be empty or inaccessible
    return {
      tableName,
      estimatedRowCount,
      sampledRowCount: 0,
      columns: columns.map((c) => ({
        columnName: c.columnName,
        totalSampled: 0,
        nullCount: 0,
        nullRate: 0,
        distinctCount: 0,
        isEnumLike: false,
      })),
    };
  }

  const sampledRowCount = rows.length;
  const columnStats: ColumnSampleStats[] = [];

  for (const col of columns) {
    if (col.isForeignKey || col.isPrimaryKey) {
      columnStats.push({
        columnName: col.columnName,
        totalSampled: sampledRowCount,
        nullCount: 0,
        nullRate: 0,
        distinctCount: sampledRowCount,
        isEnumLike: false,
      });
      continue;
    }

    const values = rows.map((r) => r[col.columnName]);
    const stats = computeColumnStats(col.columnName, values, col.dataType);
    columnStats.push(stats);
  }

  return { tableName, estimatedRowCount, sampledRowCount, columns: columnStats };
}

function computeColumnStats(
  columnName: string,
  values: unknown[],
  dataType: string,
): ColumnSampleStats {
  const totalSampled = values.length;
  let nullCount = 0;
  const nonNullValues: unknown[] = [];

  for (const v of values) {
    if (v === null || v === undefined) {
      nullCount++;
    } else {
      nonNullValues.push(v);
    }
  }

  const nullRate = totalSampled > 0 ? nullCount / totalSampled : 0;

  // Distinct count
  const distinct = new Set(nonNullValues.map((v) => String(v)));
  const distinctCount = distinct.size;

  const isEnumLike = distinctCount > 0 && distinctCount <= DISTINCT_THRESHOLD && totalSampled >= 10;

  const result: ColumnSampleStats = {
    columnName,
    totalSampled,
    nullCount,
    nullRate,
    distinctCount,
    isEnumLike,
  };

  // Compute type-specific stats
  const dt = dataType.toLowerCase();

  if (dt === 'bool' || dt === 'boolean') {
    let trueCount = 0;
    let falseCount = 0;
    for (const v of nonNullValues) {
      if (v === true || v === 't' || v === 'true' || v === 1) trueCount++;
      else falseCount++;
    }
    result.booleanStats = {
      trueCount,
      falseCount,
      trueRate: nonNullValues.length > 0 ? trueCount / nonNullValues.length : 0.5,
    };
  } else if (isNumericType(dt)) {
    const nums = nonNullValues.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      const stddev = Math.sqrt(variance);
      result.numericStats = { min, max, mean, stddev };
    }
  } else if (isTemporalType(dt)) {
    const dates = nonNullValues
      .map((v) => new Date(String(v)))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length > 0) {
      result.temporalStats = {
        earliest: dates[0].toISOString(),
        latest: dates[dates.length - 1].toISOString(),
      };
    }
  }

  // Top values for enum-like or string columns
  if (isEnumLike || (isStringType(dt) && distinctCount <= 50)) {
    const freq = new Map<string, number>();
    for (const v of nonNullValues) {
      const s = String(v);
      freq.set(s, (freq.get(s) ?? 0) + 1);
    }
    const sorted = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    result.topValues = sorted.map(([value, count]) => ({
      value,
      count,
      frequency: nonNullValues.length > 0 ? count / nonNullValues.length : 0,
    }));
  }

  return result;
}

function isNumericType(dt: string): boolean {
  return ['int2', 'int4', 'int8', 'integer', 'serial', 'bigserial', 'smallint', 'bigint',
    'numeric', 'decimal', 'float4', 'float8', 'float', 'real', 'double precision', 'money'].includes(dt);
}

function isTemporalType(dt: string): boolean {
  return ['timestamp', 'timestamptz', 'date', 'time', 'timetz'].includes(dt);
}

function isStringType(dt: string): boolean {
  return ['varchar', 'text', 'char', 'character varying', 'character'].includes(dt);
}
