import type { TableAnalysis } from './templateGenerator.js';

/**
 * Full analysis report.
 */
export interface AnalysisReport {
  databaseName: string;
  tableCount: number;
  totalColumns: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  tables: TableAnalysis[];
  sampleSize: number;
  hasSampleData: boolean;
}

/**
 * Builds an analysis report from table analyses.
 */
export function buildAnalysisReport(
  tables: TableAnalysis[],
  databaseName: string,
  sampleSize: number,
  hasSampleData: boolean,
): AnalysisReport {
  let totalColumns = 0;
  let highConfidenceCount = 0;
  let mediumConfidenceCount = 0;
  let lowConfidenceCount = 0;

  for (const table of tables) {
    for (const col of table.columns) {
      totalColumns++;
      switch (col.detection.confidence) {
        case 'high': highConfidenceCount++; break;
        case 'medium': mediumConfidenceCount++; break;
        case 'low': lowConfidenceCount++; break;
      }
    }
  }

  return {
    databaseName,
    tableCount: tables.length,
    totalColumns,
    highConfidenceCount,
    mediumConfidenceCount,
    lowConfidenceCount,
    tables,
    sampleSize,
    hasSampleData,
  };
}

/**
 * Formats the analysis report for interactive CLI output.
 */
export function formatAnalysisReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('RealityDB Schema Analysis');
  lines.push('═══════════════════════════════════════');
  lines.push(`Database: ${report.databaseName}`);
  lines.push(`Tables: ${report.tableCount}`);
  lines.push(`Columns: ${report.totalColumns}`);
  if (report.hasSampleData) {
    lines.push(`Sample size: ${report.sampleSize} rows per table`);
  }
  lines.push('');

  // Confidence summary
  const total = report.totalColumns;
  const highPct = total > 0 ? Math.round((report.highConfidenceCount / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((report.mediumConfidenceCount / total) * 100) : 0;
  const lowPct = total > 0 ? Math.round((report.lowConfidenceCount / total) * 100) : 0;

  lines.push('Detection Confidence');
  lines.push('───────────────────────────────────────');
  lines.push(`  High:   ${report.highConfidenceCount}/${total} (${highPct}%)`);
  lines.push(`  Medium: ${report.mediumConfidenceCount}/${total} (${medPct}%)`);
  lines.push(`  Low:    ${report.lowConfidenceCount}/${total} (${lowPct}%)`);
  lines.push('');

  // Per-table breakdown
  for (const table of report.tables) {
    lines.push(`${table.tableName} (${table.estimatedRowCount} rows)`);
    lines.push('───────────────────────────────────────');

    for (const col of table.columns) {
      const conf = col.detection.confidence === 'high' ? '+' : col.detection.confidence === 'medium' ? '~' : '?';
      const strategyStr = col.refinedStrategy.kind;
      const optionsStr = col.refinedStrategy.options ? ` ${formatOptions(col.refinedStrategy.options)}` : '';

      lines.push(`  [${conf}] ${col.detection.columnName}: ${strategyStr}${optionsStr}`);

      // Show sample stats if notable
      if (col.sampleStats) {
        if (col.sampleStats.nullRate > 0) {
          lines.push(`      null rate: ${Math.round(col.sampleStats.nullRate * 100)}%`);
        }
        if (col.sampleStats.numericStats) {
          const { min, max, mean } = col.sampleStats.numericStats;
          lines.push(`      range: ${min} - ${max} (mean: ${mean.toFixed(1)})`);
        }
        if (col.sampleStats.isEnumLike && col.sampleStats.topValues) {
          const vals = col.sampleStats.topValues.slice(0, 5).map((v) => `${v.value}(${Math.round(v.frequency * 100)}%)`).join(', ');
          lines.push(`      values: ${vals}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Formats the analysis report for CI JSON output.
 */
export function formatAnalysisReportCI(report: AnalysisReport): Record<string, unknown> {
  return {
    databaseName: report.databaseName,
    tableCount: report.tableCount,
    totalColumns: report.totalColumns,
    confidence: {
      high: report.highConfidenceCount,
      medium: report.mediumConfidenceCount,
      low: report.lowConfidenceCount,
    },
    sampleSize: report.sampleSize,
    hasSampleData: report.hasSampleData,
    tables: report.tables.map((t) => ({
      tableName: t.tableName,
      estimatedRowCount: t.estimatedRowCount,
      columns: t.columns.map((c) => ({
        columnName: c.detection.columnName,
        dataType: c.detection.dataType,
        detectedKind: c.detection.detectedKind,
        confidence: c.detection.confidence,
        reason: c.detection.reason,
        refinedStrategy: c.refinedStrategy,
        nullRate: c.sampleStats?.nullRate ?? null,
        distinctCount: c.sampleStats?.distinctCount ?? null,
        isEnumLike: c.sampleStats?.isEnumLike ?? false,
      })),
    })),
  };
}

function formatOptions(opts: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(opts)) {
    if (Array.isArray(val)) {
      if (key === 'values') {
        parts.push(`[${val.slice(0, 5).join(', ')}${val.length > 5 ? '...' : ''}]`);
      }
    } else {
      parts.push(`${key}=${val}`);
    }
  }
  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}
