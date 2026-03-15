import { createHash } from 'node:crypto';
import type { PIIDetection, ComplianceMode } from './piiDetector.js';
import type { MaskTableResult } from './maskEngine.js';

/**
 * Complete audit log for a masking operation.
 * Includes a SHA-256 hash chain for tamper evidence.
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
  integrityChain: AuditIntegrityChain;
}

/**
 * SHA-256 hash chain for tamper-evident audit logs.
 * Each table entry is hashed with the previous hash, forming a chain.
 * If any entry is modified after generation, the chain verification fails.
 */
export interface AuditIntegrityChain {
  algorithm: 'sha256';
  genesisHash: string;
  tableHashes: { tableName: string; hash: string }[];
  finalHash: string;
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

  const integrityChain = buildIntegrityChain(tables, mode, seed, databaseName);

  return {
    version: '1.1',
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
    integrityChain,
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

  // Integrity chain summary
  if (log.integrityChain) {
    lines.push('Integrity Chain');
    lines.push('───────────────────────────────────────');
    lines.push(`  Algorithm: ${log.integrityChain.algorithm}`);
    lines.push(`  Genesis: ${log.integrityChain.genesisHash.substring(0, 16)}...`);
    lines.push(`  Final:   ${log.integrityChain.finalHash.substring(0, 16)}...`);
    const verification = verifyAuditLogIntegrity(log);
    lines.push(`  Status:  ${verification.valid ? 'VERIFIED' : `BROKEN at ${verification.brokenAt}`}`);
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

/**
 * Builds a SHA-256 hash chain across all table audit entries.
 * The genesis hash seeds the chain from metadata (mode, seed, db name).
 * Each subsequent hash includes the previous hash + serialized table entry.
 */
function buildIntegrityChain(
  tables: MaskAuditTableEntry[],
  mode: ComplianceMode,
  seed: number,
  databaseName: string,
): AuditIntegrityChain {
  const genesisHash = sha256(`genesis:${mode}:${seed}:${databaseName}`);

  const tableHashes: { tableName: string; hash: string }[] = [];
  let previousHash = genesisHash;

  for (const table of tables) {
    const payload = `${previousHash}:${JSON.stringify(table)}`;
    const hash = sha256(payload);
    tableHashes.push({ tableName: table.tableName, hash });
    previousHash = hash;
  }

  return {
    algorithm: 'sha256',
    genesisHash,
    tableHashes,
    finalHash: previousHash,
  };
}

/**
 * Verifies the integrity of an audit log's hash chain.
 * Returns true if the chain is intact (no entries were tampered with).
 */
export function verifyAuditLogIntegrity(log: MaskAuditLog): { valid: boolean; brokenAt?: string } {
  if (!log.integrityChain) {
    return { valid: false, brokenAt: 'missing integrityChain' };
  }

  const chain = log.integrityChain;
  const expectedGenesis = sha256(`genesis:${log.complianceMode}:${log.seed}:${log.databaseName}`);

  if (chain.genesisHash !== expectedGenesis) {
    return { valid: false, brokenAt: 'genesisHash' };
  }

  let previousHash = chain.genesisHash;

  for (let i = 0; i < log.tables.length; i++) {
    const table = log.tables[i];
    const payload = `${previousHash}:${JSON.stringify(table)}`;
    const expectedHash = sha256(payload);
    const recorded = chain.tableHashes[i];

    if (!recorded || recorded.hash !== expectedHash) {
      return { valid: false, brokenAt: table.tableName };
    }

    previousHash = expectedHash;
  }

  if (previousHash !== chain.finalHash) {
    return { valid: false, brokenAt: 'finalHash' };
  }

  return { valid: true };
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
