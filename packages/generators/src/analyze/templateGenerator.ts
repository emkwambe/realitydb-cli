import type { ColumnDetection } from './columnDetector.js';
import type { TableSampleAnalysis, ColumnSampleStats } from './sampleAnalyzer.js';

/**
 * Template JSON structure matching the existing TemplateJSON format.
 */
interface GeneratedTemplateJSON {
  name: string;
  version: string;
  description: string;
  tables: Record<string, GeneratedTableJSON>;
}

interface GeneratedTableJSON {
  match: string[];
  columns: Record<string, GeneratedColumnJSON>;
}

interface GeneratedColumnJSON {
  strategy: string;
  options?: Record<string, unknown>;
  description?: string;
}

/**
 * Full analysis result for a single table.
 */
export interface TableAnalysis {
  tableName: string;
  estimatedRowCount: number;
  columns: ColumnAnalysisEntry[];
}

export interface ColumnAnalysisEntry {
  detection: ColumnDetection;
  sampleStats: ColumnSampleStats | null;
  /** Final refined strategy after combining detection + sample data */
  refinedStrategy: { kind: string; options?: Record<string, unknown> };
}

/**
 * Refines a column detection using sample data statistics.
 * Sample data can upgrade confidence and tune strategy options.
 */
export function refineDetection(
  detection: ColumnDetection,
  stats: ColumnSampleStats | null,
): { kind: string; options?: Record<string, unknown> } {
  if (!stats || stats.totalSampled === 0) {
    return { kind: detection.strategy.kind, options: detection.strategy.options };
  }

  // If sample shows enum-like values, override to enum strategy
  if (stats.isEnumLike && stats.topValues && stats.topValues.length > 0 && !detection.isForeignKey && !detection.isPrimaryKey) {
    const values = stats.topValues.map((v) => v.value);
    const weights = stats.topValues.map((v) => Math.round(v.frequency * 100) / 100);
    return {
      kind: 'enum',
      options: { values, weights },
    };
  }

  // Refine numeric ranges from actual data
  if (stats.numericStats && (detection.detectedKind === 'integer' || detection.detectedKind === 'float' || detection.detectedKind === 'money')) {
    const { min, max } = stats.numericStats;
    // Expand range slightly for realistic generation
    const rangeMin = Math.floor(min * 0.8);
    const rangeMax = Math.ceil(max * 1.2);
    return {
      kind: detection.strategy.kind,
      options: {
        ...detection.strategy.options,
        min: Math.max(0, rangeMin),
        max: Math.max(rangeMax, rangeMin + 1),
      },
    };
  }

  // Refine boolean true weight from actual data
  if (stats.booleanStats && detection.detectedKind === 'boolean') {
    return {
      kind: 'boolean',
      options: { trueWeight: Math.round(stats.booleanStats.trueRate * 100) / 100 },
    };
  }

  // If status/enum column has sample data with top values, use them
  if (detection.detectedKind === 'enum' && stats.topValues && stats.topValues.length > 0) {
    const values = stats.topValues.map((v) => v.value);
    const weights = stats.topValues.map((v) => Math.round(v.frequency * 100) / 100);
    return {
      kind: 'enum',
      options: { values, weights },
    };
  }

  return { kind: detection.strategy.kind, options: detection.strategy.options };
}

/**
 * Generates a template JSON object from table analysis results.
 */
export function generateTemplate(
  analyses: TableAnalysis[],
  databaseName?: string,
): GeneratedTemplateJSON {
  const name = databaseName ?? 'analyzed-schema';
  const tables: Record<string, GeneratedTableJSON> = {};

  for (const table of analyses) {
    const columns: Record<string, GeneratedColumnJSON> = {};

    for (const col of table.columns) {
      // Skip PK and FK columns — they're handled by the engine
      if (col.detection.isPrimaryKey || col.detection.isForeignKey) continue;

      // Skip enum strategies with placeholder values — let auto-inference handle these
      if (
        col.refinedStrategy.kind === 'enum' &&
        col.refinedStrategy.options?.['values'] &&
        Array.isArray(col.refinedStrategy.options['values'])
      ) {
        const vals = col.refinedStrategy.options['values'] as string[];
        if (vals.length === 1 && vals[0] === 'default') continue;
      }

      const entry: GeneratedColumnJSON = {
        strategy: col.refinedStrategy.kind,
      };

      if (col.refinedStrategy.options && Object.keys(col.refinedStrategy.options).length > 0) {
        entry.options = col.refinedStrategy.options;
      }

      // Add description for context
      if (col.detection.confidence !== 'high') {
        entry.description = col.detection.reason;
      }

      columns[col.detection.columnName] = entry;
    }

    // Only include tables with columns to override
    if (Object.keys(columns).length > 0) {
      tables[table.tableName] = {
        match: [table.tableName, `*${table.tableName}*`],
        columns,
      };
    }
  }

  return {
    name,
    version: '1.0',
    description: `Auto-generated template from schema analysis of "${name}"`,
    tables,
  };
}

/**
 * Serializes template to JSON string.
 */
export function serializeTemplate(template: GeneratedTemplateJSON): string {
  return JSON.stringify(template, null, 2);
}
