export { detectPII, detectTablePII } from './piiDetector.js';
export type { PIICategory, PIIDetection, ComplianceMode, MaskStrategy } from './piiDetector.js';

export { maskTableRows } from './maskEngine.js';
export type { MaskTableResult } from './maskEngine.js';

export { buildAuditLog, formatAuditLog, serializeAuditLog } from './auditLog.js';
export type { MaskAuditLog, MaskAuditTableEntry, MaskAuditColumnEntry } from './auditLog.js';
