import type { PIIDetection, ComplianceMode } from './piiDetector.js';
import type { MaskTableResult } from './maskEngine.js';

/**
 * Complete audit log for a masking operation.
 */
export interface MaskAuditLog {
  version: string;
  timestamp: string;
  complianceMode: ComplianceMode;
  seed: number;
  databaseName: string;
  summary: {
    tablesScanned: number;
    tablesMasked: number;
    totalPIIColumnsDetected: number;
    totalColumnsMasked: number;
    totalRowsMasked: number;
  };
  tables: MaskAuditTableEntry[];
}

export interface MaskAuditTableEntry {
  tableName: string;
  rowCount: number;
  piiColumnsDetected: number;
  columnsMasked: number;
  columns: MaskAuditColumnEntry[];
}

export interface MaskAuditColumnEntry {
  columnName: string;
  dataType: string;
  piiCategory: string;
  confidence: string;
  reason: string;
  masked: boolean;
  maskStrategy: string;
  rowsMasked: number;
}

/**
 * Builds an audit log from detection and masking results.
 */
export function buildAuditLog(
  detectionsByTable: Map<string, PIIDetection[]>,
  maskResults: MaskTableResult[],
  mode: ComplianceMode,
  seed: number,
  databaseName: string,
): MaskAuditLog {
  const tables: MaskAuditTableEntry[] = [];
  let totalPIIColumnsDetected = 0;
  let totalColumnsMasked = 0;
  let totalRowsMasked = 0;
  let tablesMasked = 0;

  for (const [tableName, detections] of detectionsByTable) {
    const maskResult = maskResults.find((r) => r.tableName === tableName);
    const piiColumns = detections.filter((d) => d.shouldMask);
    const maskedCount = maskResult?.columnsMasked ?? 0;

    totalPIIColumnsDetected += piiColumns.length;
    totalColumnsMasked += maskedCount;
    if (maskedCount > 0) tablesMasked++;

    if (maskResult) {
      for (const mc of maskResult.maskedColumns) {
        totalRowsMasked += mc.rowsMasked;
      }
    }

    const columns: MaskAuditColumnEntry[] = detections.map((d) => {
      const mc = maskResult?.maskedColumns.find((m) => m.columnName === d.columnName);
      return {
        columnName: d.columnName,
        dataType: d.dataType,
        piiCategory: d.category,
        confidence: d.confidence,
        reason: d.reason,
        masked: d.shouldMask,
        maskStrategy: d.maskStrategy,
        rowsMasked: mc?.rowsMasked ?? 0,
      };
    });

    tables.push({
      tableName,
      rowCount: maskResult?.rowCount ?? 0,
      piiColumnsDetected: piiColumns.length,
      columnsMasked: maskedCount,
      columns,
    });
  }

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    complianceMode: mode,
    seed,
    databaseName,
    summary: {
      tablesScanned: detectionsByTable.size,
      tablesMasked,
      totalPIIColumnsDetected,
      totalColumnsMasked,
      totalRowsMasked,
    },
    tables,
  };
}

/**
 * Formats audit log for interactive CLI output.
 */
export function formatAuditLog(log: MaskAuditLog): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('RealityDB Mask Audit Log');
  lines.push('═══════════════════════════════════════');
  lines.push(`Database: ${log.databaseName}`);
  lines.push(`Compliance mode: ${log.complianceMode}`);
  lines.push(`Timestamp: ${log.timestamp}`);
  lines.push(`Seed: ${log.seed}`);
  lines.push('');

  lines.push('Summary');
  lines.push('───────────────────────────────────────');
  lines.push(`  Tables scanned: ${log.summary.tablesScanned}`);
  lines.push(`  Tables with PII: ${log.summary.tablesMasked}`);
  lines.push(`  PII columns detected: ${log.summary.totalPIIColumnsDetected}`);
  lines.push(`  Columns masked: ${log.summary.totalColumnsMasked}`);
  lines.push(`  Total rows masked: ${log.summary.totalRowsMasked}`);
  lines.push('');

  for (const table of log.tables) {
    if (table.columnsMasked === 0) continue;

    lines.push(`${table.tableName} (${table.rowCount} rows)`);
    lines.push('───────────────────────────────────────');
    for (const col of table.columns) {
      if (!col.masked) continue;
      lines.push(`  ${col.columnName}: ${col.piiCategory} → ${col.maskStrategy} (${col.rowsMasked} rows)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Serializes audit log to JSON string.
 */
export function serializeAuditLog(log: MaskAuditLog): string {
  return JSON.stringify(log, null, 2);
}
