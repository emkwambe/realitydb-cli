export { detectPII, detectTablePII } from './piiDetector.js';
export type { PIICategory, PIIDetection, ComplianceMode, MaskStrategy } from './piiDetector.js';

export { maskTableRows } from './maskEngine.js';
export type { MaskTableResult } from './maskEngine.js';

export { buildAuditLog, formatAuditLog, serializeAuditLog, verifyAuditLogIntegrity } from './auditLog.js';
export type { MaskAuditLog, MaskAuditTableEntry, MaskAuditColumnEntry, AuditIntegrityChain } from './auditLog.js';

export { tokenizeTableRows, detokenizeRows, buildTokenMap, serializeTokenMap, generateTokenPrefix } from './tokenizer.js';
export type { TokenEntry, TokenMap, TokenizeTableResult } from './tokenizer.js';

export { scanColumnValues, containsPII } from './valueScanners.js';
export type { ValueScanResult } from './valueScanners.js';
