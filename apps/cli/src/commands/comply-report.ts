import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { suggestNext } from '../utils/suggest';

// ============================================================
// TYPES (reuses assess logic inline — no cross-file imports)
// ============================================================

interface MetricResult {
  name: string;
  pillar: 'fidelity' | 'structure' | 'privacy';
  value: number | string;
  threshold?: number | string;
  score: number;
  status: 'pass' | 'warn' | 'info';
  detail?: string;
}

interface PillarScore {
  name: string;
  score: number;
  metrics: MetricResult[];
}

interface ComplianceReport {
  id: string;
  version: '1.0';
  framework: string;
  frameworkDescription: string;
  timestamp: string;
  file: string;
  datasetHash: string;
  format: string;
  tables: number;
  columns: number;
  rows: number;
  overallScore: number;
  pillars: PillarScore[];
  piiFindings: PiiColumnFinding[];
  hipaa18: { found: string[]; notDetected: string[]; coverage: number } | null;
  disclaimer: string;
  generatedBy: string;
}

interface PiiColumnFinding {
  table: string;
  column: string;
  pattern: string;
  confidence: string;
}

// ============================================================
// SQL / CSV PARSER
// ============================================================

interface ParsedTable {
  name: string;
  columns: { name: string; type: string }[];
  fks: { column: string; refTable: string; refColumn: string }[];
  rows: Record<string, string>[];
}

function parseSql(content: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
  const insertRegex = /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;

  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const columns: { name: string; type: string }[] = [];
    const fks: { column: string; refTable: string; refColumn: string }[] = [];

    for (const line of match[2].split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('CONSTRAINT')) continue;
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
      if (fkMatch) { fks.push({ column: fkMatch[1], refTable: fkMatch[2], refColumn: fkMatch[3] }); continue; }
      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w\s()]*)/);
      if (colMatch) columns.push({ name: colMatch[1], type: colMatch[2].trim().split(/\s/)[0] });
    }
    tables.push({ name, columns, fks, rows: [] });
  }

  while ((match = insertRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const table = tables.find(t => t.name === name);
    if (!table) continue;
    const colList = match[2].split(',').map(c => c.trim().replace(/["']/g, ''));
    const valuesBlock = match[3];
    const rowRegex = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
      const vals = splitValues(rowMatch[1]);
      const row: Record<string, string> = {};
      for (let i = 0; i < colList.length && i < vals.length; i++) {
        row[colList[i]] = vals[i].replace(/^'|'$/g, '').trim();
      }
      table.rows.push(row);
    }
  }
  return tables;
}

function splitValues(valStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (ch === "'" && valStr[i - 1] !== '\\') { inString = !inString; current += ch; }
    else if (ch === ',' && !inString) { values.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

// ============================================================
// METRICS (inline from assess — same logic)
// ============================================================

function computeCompleteness(tables: ParsedTable[]): MetricResult {
  let total = 0, nulls = 0;
  for (const t of tables) for (const r of t.rows) for (const c of t.columns) {
    total++; const v = r[c.name]; if (!v || v === 'NULL' || v === '') nulls++;
  }
  const pct = total > 0 ? Math.round(((total - nulls) / total) * 100) : 0;
  return { name: 'Completeness', pillar: 'fidelity', value: pct + '%', threshold: '>=90%', score: Math.min(100, pct), status: pct >= 90 ? 'pass' : 'warn', detail: `${nulls} nulls / ${total} cells` };
}

function computeFkIntegrity(tables: ParsedTable[]): MetricResult {
  const map = new Map<string, ParsedTable>(); for (const t of tables) map.set(t.name, t);
  let total = 0, valid = 0;
  for (const t of tables) for (const fk of t.fks) {
    const parent = map.get(fk.refTable); if (!parent) continue;
    const ids = new Set(parent.rows.map(r => r[fk.refColumn]));
    for (const r of t.rows) { const v = r[fk.column]; if (!v || v === 'NULL') continue; total++; if (ids.has(v)) valid++; }
  }
  const pct = total > 0 ? Math.round((valid / total) * 100) : 100;
  return { name: 'FK integrity', pillar: 'structure', value: `${pct}% (${valid}/${total})`, threshold: '100%', score: pct, status: pct === 100 ? 'pass' : 'warn' };
}

function computeUniqueness(tables: ParsedTable[]): MetricResult {
  let checks = 0, unique = 0;
  for (const t of tables) {
    const idCol = t.columns.find(c => c.name === 'id'); if (!idCol) continue;
    checks++; const vals = t.rows.map(r => r['id']).filter(v => v && v !== 'NULL');
    if (new Set(vals).size === vals.length) unique++;
  }
  const score = checks > 0 ? Math.round((unique / checks) * 100) : 100;
  return { name: 'PK uniqueness', pillar: 'structure', value: `${unique}/${checks}`, threshold: '100%', score, status: score === 100 ? 'pass' : 'warn' };
}

function computeTemporalLogic(tables: ParsedTable[]): MetricResult {
  let checks = 0, valid = 0;
  for (const t of tables) {
    const tsCols = t.columns.filter(c => c.name.endsWith('_at')).map(c => c.name);
    const createdAt = tsCols.find(c => c === 'created_at'); if (!createdAt || tsCols.length < 2) continue;
    for (const r of t.rows) {
      const cv = r[createdAt]; if (!cv || cv === 'NULL') continue; const cd = new Date(cv); if (isNaN(cd.getTime())) continue;
      for (const other of tsCols.filter(c => c !== 'created_at')) {
        const ov = r[other]; if (!ov || ov === 'NULL') continue; const od = new Date(ov); if (isNaN(od.getTime())) continue;
        checks++; if (od >= cd) valid++;
      }
    }
  }
  const score = checks > 0 ? Math.round((valid / checks) * 100) : 100;
  return { name: 'Temporal ordering', pillar: 'structure', value: `${valid}/${checks}`, threshold: '100%', score, status: score === 100 ? 'pass' : 'warn' };
}

function computeExactMatchRate(tables: ParsedTable[]): MetricResult {
  let total = 0, dupes = 0;
  for (const t of tables) {
    if (t.rows.length < 2) continue; total += t.rows.length;
    const seen = new Set<string>();
    for (const r of t.rows) { const k = JSON.stringify(r); if (seen.has(k)) dupes++; else seen.add(k); }
  }
  const rate = total > 0 ? (dupes / total) * 100 : 0;
  return { name: 'Exact match rate', pillar: 'privacy', value: rate.toFixed(2) + '%', threshold: '0%', score: rate === 0 ? 100 : Math.max(0, 100 - rate * 20), status: rate === 0 ? 'pass' : 'warn' };
}

// PII detection
const PII_PATTERNS: { name: string; regex: RegExp[]; hipaaId?: string }[] = [
  { name: 'SSN', regex: [/\bssn\b/i, /\bsocial.?security/i], hipaaId: 'SSN' },
  { name: 'Email', regex: [/\bemail\b/i], hipaaId: 'Email' },
  { name: 'Phone', regex: [/\bphone\b/i, /\bmobile\b/i, /\bcell\b/i, /\bfax\b/i], hipaaId: 'Phone/Fax' },
  { name: 'Credit Card', regex: [/\bcredit.?card\b/i, /\bcard.?num/i], hipaaId: 'Credit Card' },
  { name: 'DOB', regex: [/\bdob\b/i, /\bdate.?of.?birth/i, /\bbirth.?date/i], hipaaId: 'Date of Birth' },
  { name: 'Name', regex: [/\bfull.?name\b/i, /\bfirst.?name\b/i, /\blast.?name\b/i, /\bsurname\b/i], hipaaId: 'Name' },
  { name: 'Address', regex: [/\baddress\b/i, /\bstreet\b/i], hipaaId: 'Address' },
  { name: 'IP Address', regex: [/\bip.?addr/i, /\bsource.?ip/i], hipaaId: 'IP Address' },
  { name: 'Passport', regex: [/\bpassport/i], hipaaId: 'Passport' },
  { name: 'Driver License', regex: [/\bdriver.?lic/i, /\bdl.?num/i], hipaaId: 'Driver License' },
  { name: 'MRN', regex: [/\bmrn\b/i, /\bmedical.?record/i, /\bpatient.?id/i], hipaaId: 'Medical Record' },
  { name: 'Health Insurance', regex: [/\binsurance.?id/i, /\bpolicy.?num/i, /\bmember.?id/i], hipaaId: 'Health Insurance ID' },
  { name: 'Bank Account', regex: [/\baccount.?num/i, /\biban\b/i, /\brouting/i], hipaaId: 'Bank Account' },
  { name: 'VIN', regex: [/\bvin\b/i, /\bvehicle.?id/i], hipaaId: 'Vehicle ID' },
  { name: 'License Plate', regex: [/\blicense.?plate/i], hipaaId: 'License Plate' },
  { name: 'Biometric', regex: [/\bbiometric/i, /\bfingerprint/i], hipaaId: 'Biometric' },
  { name: 'Photo', regex: [/\bphoto\b/i, /\bavatar\b/i, /\bprofile.?pic/i], hipaaId: 'Photo' },
  { name: 'National ID', regex: [/\bnational.?id/i, /\bcitizen.?id/i], hipaaId: 'National ID' },
  { name: 'Gender', regex: [/\bgender\b/i, /\bsex\b/i] },
  { name: 'Race/Ethnicity', regex: [/\brace\b/i, /\bethnicity\b/i] },
  { name: 'ZIP Code', regex: [/\bzip\b/i, /\bpostal.?code/i] },
  { name: 'Salary', regex: [/\bsalary\b/i, /\bincome\b/i, /\bwage\b/i] },
  { name: 'Password', regex: [/\bpassword\b/i, /\bpasswd\b/i, /\bsecret\b/i, /\bapi.?key/i] },
];

function detectPii(tables: ParsedTable[]): PiiColumnFinding[] {
  const findings: PiiColumnFinding[] = [];
  for (const t of tables) for (const c of t.columns) {
    for (const p of PII_PATTERNS) {
      if (p.regex.some(r => r.test(c.name))) {
        findings.push({ table: t.name, column: c.name, pattern: p.name, confidence: 'high' });
        break;
      }
    }
  }
  return findings;
}

function checkHipaa18(findings: PiiColumnFinding[]): { found: string[]; notDetected: string[]; coverage: number } {
  const hipaa18 = ['Name', 'Address', 'Date of Birth', 'Phone/Fax', 'Email', 'SSN', 'Medical Record', 'Health Insurance ID', 'Bank Account', 'Credit Card', 'Driver License', 'Vehicle ID', 'License Plate', 'Photo', 'Biometric', 'IP Address', 'National ID', 'Date of Birth'];
  const unique18 = [...new Set(hipaa18)];
  const foundPatterns = new Set(findings.map(f => f.pattern));
  const hipaaMapping: Record<string, string> = {};
  for (const p of PII_PATTERNS) { if (p.hipaaId) hipaaMapping[p.name] = p.hipaaId; }

  const found: string[] = [];
  const notDetected: string[] = [];
  for (const id of unique18) {
    const patternName = Object.entries(hipaaMapping).find(([, v]) => v === id)?.[0];
    if (patternName && foundPatterns.has(patternName)) found.push(id);
    else notDetected.push(id);
  }
  return { found, notDetected, coverage: Math.round((found.length / unique18.length) * 100) };
}

// ============================================================
// FRAMEWORK DEFINITIONS
// ============================================================

interface Framework {
  id: string;
  name: string;
  fullName: string;
  description: string;
  reference: string;
  includeHipaa18: boolean;
  sections: { title: string; checks: string[] }[];
}

const FRAMEWORKS: Record<string, Framework> = {
  hipaa: {
    id: 'hipaa', name: 'HIPAA Safe Harbor', fullName: 'Health Insurance Portability and Accountability Act',
    description: 'HIPAA Safe Harbor de-identification standard — 18 identifier verification',
    reference: '45 CFR \u00A7164.514(b)',
    includeHipaa18: true,
    sections: [
      { title: 'PHI Identifier Detection', checks: ['Scan for 18 HIPAA Safe Harbor identifiers', 'Flag columns matching PHI patterns'] },
      { title: 'Data Integrity', checks: ['FK referential integrity', 'PK uniqueness', 'Temporal ordering'] },
      { title: 'Privacy Metrics', checks: ['Exact match rate', 'k-Anonymity for quasi-identifiers'] },
    ],
  },
  gdpr: {
    id: 'gdpr', name: 'GDPR Pseudonymization', fullName: 'General Data Protection Regulation',
    description: 'GDPR Article 4(5) — pseudonymization and re-identification risk assessment',
    reference: 'GDPR Article 4(5), Recital 26',
    includeHipaa18: false,
    sections: [
      { title: 'Personal Data Detection', checks: ['Scan for PII patterns', 'Quasi-identifier analysis'] },
      { title: 'Re-identification Risk', checks: ['k-Anonymity assessment', 'Exact match rate'] },
      { title: 'Data Quality', checks: ['Completeness', 'Structural integrity'] },
    ],
  },
  pci: {
    id: 'pci', name: 'PCI DSS', fullName: 'Payment Card Industry Data Security Standard',
    description: 'PCI DSS Requirement 3 — cardholder data detection and protection',
    reference: 'PCI DSS v4.0, Requirement 3',
    includeHipaa18: false,
    sections: [
      { title: 'Cardholder Data Detection', checks: ['Credit card number patterns', 'CVV/CVC detection', 'Expiry date fields'] },
      { title: 'Data Protection', checks: ['PII column scan', 'Exact match rate'] },
      { title: 'Structural Integrity', checks: ['FK integrity', 'PK uniqueness'] },
    ],
  },

  'eu-ai-act': {
    id: 'eu-ai-act', name: 'EU AI Act', fullName: 'Regulation (EU) 2024/1689 — Artificial Intelligence Act',
    description: 'EU AI Act data governance assessment — Articles 10 (Data Quality), 11 (Technical Documentation), 12 (Record-Keeping), 50 (Transparency)',
    reference: 'EU AI Act Articles 10, 11, 12, 50',
    includeHipaa18: false,
    sections: [
      { title: 'Article 10 — Data Governance', checks: [
        'Data origin and provenance documented',
        'Data preparation methodology recorded',
        'Statistical properties assessed (completeness, representativeness)',
        'Bias evaluation performed (distribution analysis)',
        'PII and sensitive data detection',
        'Data gaps and shortcomings identified',
      ]},
      { title: 'Article 11 — Technical Documentation', checks: [
        'Generation methodology documented',
        'Schema structure recorded (tables, columns, FKs)',
        'Quality assessment methodology specified (SQR v1.0)',
        'Seed-based reproducibility verified',
      ]},
      { title: 'Article 12 — Record-Keeping', checks: [
        'Unique report ID generated',
        'Dataset hash computed (SHA-256)',
        'Assessment timestamp recorded',
        'Certification status checked',
      ]},
      { title: 'Article 50 — Transparency', checks: [
        'Machine-readable marking present (_realitydb_meta)',
        'Content hash embedded for detectability',
        'Verification command documented',
      ]},
    ],
  },

  'eu-ai-act': {
    id: 'eu-ai-act', name: 'EU AI Act', fullName: 'Regulation (EU) 2024/1689 — Artificial Intelligence Act',
    description: 'EU AI Act data governance assessment — Articles 10 (Data Quality), 11 (Technical Documentation), 12 (Record-Keeping), 50 (Transparency)',
    reference: 'EU AI Act Articles 10, 11, 12, 50',
    includeHipaa18: false,
    sections: [
      { title: 'Article 10 — Data Governance', checks: [
        'Data origin and provenance documented',
        'Data preparation methodology recorded',
        'Statistical properties assessed (completeness, representativeness)',
        'Bias evaluation performed (distribution analysis)',
        'PII and sensitive data detection',
        'Data gaps and shortcomings identified',
      ]},
      { title: 'Article 11 — Technical Documentation', checks: [
        'Generation methodology documented',
        'Schema structure recorded (tables, columns, FKs)',
        'Quality assessment methodology specified (SQR v1.0)',
        'Seed-based reproducibility verified',
      ]},
      { title: 'Article 12 — Record-Keeping', checks: [
        'Unique report ID generated',
        'Dataset hash computed (SHA-256)',
        'Assessment timestamp recorded',
        'Certification status checked',
      ]},
      { title: 'Article 50 — Transparency', checks: [
        'Machine-readable marking present (_realitydb_meta)',
        'Content hash embedded for detectability',
        'Verification command documented',
      ]},
    ],
  },
  soc2: {
    id: 'soc2', name: 'SOC 2', fullName: 'System and Organization Controls 2',
    description: 'SOC 2 Trust Service Criteria — data integrity and confidentiality checks',
    reference: 'AICPA TSC CC6.1, CC6.7',
    includeHipaa18: false,
    sections: [
      { title: 'Data Integrity', checks: ['FK integrity', 'PK uniqueness', 'Temporal ordering', 'Completeness'] },
      { title: 'Confidentiality', checks: ['PII detection', 'Sensitive data patterns'] },
      { title: 'Privacy', checks: ['Exact match rate', 'k-Anonymity'] },
    ],
  },
};


// ============================================================
// REALITYDB META PARSER (for Article 50 transparency)
// ============================================================

interface RealityDBMeta {
  generator?: string;
  version?: string;
  template?: string;
  template_hash?: string;
  seed?: string;
  generated_at?: string;
  tables?: string;
  total_rows?: string;
  content_hash?: string;
  signature?: string;
  key_id?: string;
  cert_version?: string;
  license_tier?: string;
  user_id?: string;
}

function parseRealityDBMeta(content: string): RealityDBMeta | null {
  const metaMatch = content.match(/INSERT\s+INTO\s+["']?_realitydb_meta["']?[\s\S]*?VALUES\s*([\s\S]*?);/i);
  if (!metaMatch) return null;

  const meta: RealityDBMeta = {};
  const pairRegex = /\('([^']+)',\s*'([^']*)'\)/g;
  let m;
  while ((m = pairRegex.exec(metaMatch[1])) !== null) {
    const key = m[1] as keyof RealityDBMeta;
    meta[key] = m[2];
  }
  return Object.keys(meta).length > 0 ? meta : null;
}


// ============================================================
// REALITYDB META PARSER (for Article 50 transparency)
// ============================================================

interface RealityDBMeta {
  generator?: string;
  version?: string;
  template?: string;
  template_hash?: string;
  seed?: string;
  generated_at?: string;
  tables?: string;
  total_rows?: string;
  content_hash?: string;
  signature?: string;
  key_id?: string;
  cert_version?: string;
  license_tier?: string;
  user_id?: string;
}

function parseRealityDBMeta(content: string): RealityDBMeta | null {
  const metaMatch = content.match(/INSERT\s+INTO\s+["']?_realitydb_meta["']?[\s\S]*?VALUES\s*([\s\S]*?);/i);
  if (!metaMatch) return null;

  const meta: RealityDBMeta = {};
  const pairRegex = /\('([^']+)',\s*'([^']*)'\)/g;
  let m;
  while ((m = pairRegex.exec(metaMatch[1])) !== null) {
    const key = m[1] as keyof RealityDBMeta;
    meta[key] = m[2];
  }
  return Object.keys(meta).length > 0 ? meta : null;
}

// ============================================================
// HTML REPORT GENERATOR
// ============================================================

function generateHtmlReport(report: ComplianceReport, meta?: RealityDBMeta | null): string {
  const fw = FRAMEWORKS[report.framework] || FRAMEWORKS.hipaa;

  const statusIcon = (s: string) => s === 'pass' ? '<span class="pass">PASS</span>' : s === 'info' ? '<span class="info">INFO</span>' : '<span class="warn">WARN</span>';
  const scoreColor = (s: number) => s >= 90 ? '#0F6E56' : s >= 70 ? '#BA7517' : '#A32D2D';

  const pillarRows = report.pillars.map(p => {
    const metricRows = p.metrics.map(m =>
      `<tr><td class="metric-name">${m.name}</td><td>${m.value}</td><td>${m.threshold || '-'}</td><td>${statusIcon(m.status)}</td></tr>`
      + (m.detail && m.status !== 'pass' ? `<tr><td colspan="4" class="detail">${m.detail}</td></tr>` : '')
    ).join('\n');

    return `
      <div class="pillar">
        <div class="pillar-header">
          <span class="pillar-name">${p.name}</span>
          <span class="pillar-score" style="color:${scoreColor(p.score)}">${p.score}/100</span>
        </div>
        <table class="metrics-table">
          <thead><tr><th>Metric</th><th>Value</th><th>Threshold</th><th>Status</th></tr></thead>
          <tbody>${metricRows}</tbody>
        </table>
      </div>`;
  }).join('\n');

  const piiSection = report.piiFindings.length > 0
    ? `<div class="section">
        <h2>PII Column Findings</h2>
        <table class="metrics-table">
          <thead><tr><th>Table</th><th>Column</th><th>Pattern</th><th>Confidence</th></tr></thead>
          <tbody>${report.piiFindings.map(f => `<tr><td>${f.table}</td><td>${f.column}</td><td>${f.pattern}</td><td>${f.confidence}</td></tr>`).join('\n')}</tbody>
        </table>
      </div>`
    : '<div class="section"><h2>PII Column Findings</h2><p class="pass-text">No PII-pattern columns detected.</p></div>';

  const hipaaSection = report.hipaa18
    ? `<div class="section">
        <h2>HIPAA Safe Harbor \u2014 18 Identifier Check</h2>
        <p>Coverage: <strong>${report.hipaa18.found.length}/18</strong> identifiers detected (${report.hipaa18.coverage}%)</p>
        ${report.hipaa18.found.length > 0 ? '<h3>Detected Identifiers</h3><ul>' + report.hipaa18.found.map(id => `<li class="warn-item">${id}</li>`).join('') + '</ul>' : ''}
        ${report.hipaa18.notDetected.length > 0 && report.hipaa18.notDetected.length < 18 ? '<h3>Not Detected</h3><ul>' + report.hipaa18.notDetected.map(id => `<li class="pass-item">${id}</li>`).join('') + '</ul>' : ''}
      </div>`
    : '';

  const frameworkSections = fw.sections.map(s =>
    `<div class="fw-section"><h3>${s.title}</h3><ul>${s.checks.map(c => `<li>${c}</li>`).join('')}</ul></div>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RealityDB Compliance Report \u2014 ${fw.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 32px; }
  .header h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .header .subtitle { font-size: 14px; color: #666; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; font-size: 13px; }
  .meta-grid .label { color: #666; }
  .meta-grid .value { font-weight: 500; }
  .overall-score { text-align: center; margin: 32px 0; padding: 24px; border: 2px solid #e0e0e0; border-radius: 8px; }
  .overall-score .number { font-size: 48px; font-weight: 700; }
  .overall-score .label { font-size: 14px; color: #666; }
  .pillar { margin: 24px 0; }
  .pillar-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f5f5f5; border-radius: 6px; margin-bottom: 8px; }
  .pillar-name { font-weight: 600; font-size: 16px; }
  .pillar-score { font-weight: 700; font-size: 18px; }
  .metrics-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  .metrics-table th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #e0e0e0; font-weight: 600; color: #666; }
  .metrics-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
  .metric-name { font-weight: 500; }
  .detail { font-size: 12px; color: #888; padding-left: 24px !important; font-style: italic; }
  .pass { color: #0F6E56; font-weight: 600; }
  .warn { color: #BA7517; font-weight: 600; }
  .info { color: #185FA5; font-weight: 600; }
  .section { margin: 32px 0; }
  .section h2 { font-size: 18px; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 16px; }
  .section h3 { font-size: 14px; font-weight: 600; margin: 12px 0 8px; }
  .pass-text { color: #0F6E56; font-weight: 500; }
  .warn-item { color: #A32D2D; }
  .pass-item { color: #0F6E56; }
  ul { margin-left: 20px; }
  li { margin: 4px 0; font-size: 13px; }
  .fw-section { margin: 16px 0; }
  .disclaimer { margin-top: 40px; padding: 16px; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 12px; color: #666; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
  @media print {
    body { padding: 20px; }
    .pillar-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>RealityDB Compliance Report</h1>
  <div class="subtitle">${fw.fullName} \u2014 ${fw.name}</div>
</div>

<div class="meta-grid">
  <span class="label">Report ID:</span><span class="value">${report.id}</span>
  <span class="label">Date:</span><span class="value">${new Date(report.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  <span class="label">File:</span><span class="value">${path.basename(report.file)}</span>
  <span class="label">Format:</span><span class="value">${report.format.toUpperCase()}</span>
  <span class="label">Tables:</span><span class="value">${report.tables}</span>
  <span class="label">Columns:</span><span class="value">${report.columns}</span>
  <span class="label">Rows:</span><span class="value">${report.rows.toLocaleString()}</span>
  <span class="label">Dataset hash:</span><span class="value">sha256:${report.datasetHash}</span>
  <span class="label">Standard:</span><span class="value">${fw.name} (${fw.reference})</span>
  <span class="label">Methodology:</span><span class="value">SQR v${report.version}</span>
</div>

<div class="overall-score">
  <div class="number" style="color:${scoreColor(report.overallScore)}">${report.overallScore}/100</div>
  <div class="label">Overall Assessment Score</div>
</div>

${pillarRows}

${piiSection}

${hipaaSection}

<div class="section">
  <h2>Framework: ${fw.name}</h2>
  <p style="font-size:13px;color:#666;margin-bottom:12px">${fw.description}</p>
  ${frameworkSections}
</div>



${report.framework === 'eu-ai-act' && meta ? `
<div class="section">
  <h2>Article 10 — Data Origin & Provenance</h2>
  <table class="metrics-table">
    <thead><tr><th>Property</th><th>Value</th><th>Article Reference</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Generator</td><td>${meta.generator || 'Unknown'} v${meta.version || '?'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Template</td><td>${meta.template || 'custom'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Template Hash</td><td>${meta.template_hash || 'N/A'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Generation Seed</td><td>${meta.seed || 'N/A'} (deterministic reproduction)</td><td>Art. 10(2)(b)</td></tr>
      <tr><td class="metric-name">Generated At</td><td>${meta.generated_at || 'Unknown'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Tables</td><td>${meta.tables || report.tables}</td><td>Art. 10(2)(d)</td></tr>
      <tr><td class="metric-name">Total Rows</td><td>${meta.total_rows || report.rows}</td><td>Art. 10(2)(d)</td></tr>
      <tr><td class="metric-name">Content Hash</td><td>${meta.content_hash || 'Not embedded'}</td><td>Art. 50(2)</td></tr>
      <tr><td class="metric-name">Data Type</td><td>100% synthetic — no real personal data used</td><td>Art. 10(5)</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 50 — Transparency & Machine-Readable Marking</h2>
  <table class="metrics-table">
    <thead><tr><th>Requirement</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>
      <tr>
        <td class="metric-name">Machine-readable marking</td>
        <td><span class="pass">PRESENT</span></td>
        <td>_realitydb_meta table embedded with ${Object.keys(meta).length} fields</td>
      </tr>
      <tr>
        <td class="metric-name">Content hash (detectability)</td>
        <td>${meta.content_hash ? '<span class="pass">EMBEDDED</span>' : '<span class="warn">NOT FOUND</span>'}</td>
        <td>${meta.content_hash || 'Generate with: realitydb attest sign <file>'}</td>
      </tr>
      <tr>
        <td class="metric-name">Cryptographic signature</td>
        <td>${meta.signature ? '<span class="pass">ED25519 SIGNED</span>' : '<span class="info">UNSIGNED</span>'}</td>
        <td>${meta.signature ? 'Key ID: ' + (meta.key_id || 'unknown') : 'Available with: realitydb attest sign <file> --embed'}</td>
      </tr>
      <tr>
        <td class="metric-name">Verification method</td>
        <td><span class="pass">AVAILABLE</span></td>
        <td>realitydb attest verify &lt;file&gt;</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 11 — Technical Documentation</h2>
  <table class="metrics-table">
    <thead><tr><th>Documentation Element</th><th>Status</th><th>Reference</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Generation methodology</td><td>Schema-aware synthetic generation (RealityDB CLI)</td><td>Art. 11, Annex IV §2(b)</td></tr>
      <tr><td class="metric-name">Assessment methodology</td><td>SQR v1.0 — Synthetic Quality Report (3 pillars, 12 metrics)</td><td>Art. 11, Annex IV §2(e)</td></tr>
      <tr><td class="metric-name">Reproducibility</td><td>${meta.seed ? 'Seed: ' + meta.seed + ' (deterministic)' : 'Seed not recorded'}</td><td>Art. 11, Annex IV §2(d)</td></tr>
      <tr><td class="metric-name">No real data dependency</td><td>Generates from schema definition only — no real data ingested</td><td>Art. 10(5)</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 12 — Record-Keeping & Audit Trail</h2>
  <table class="metrics-table">
    <thead><tr><th>Record</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Report ID</td><td>${report.id}</td></tr>
      <tr><td class="metric-name">Assessment timestamp</td><td>${report.timestamp}</td></tr>
      <tr><td class="metric-name">Dataset hash</td><td>sha256:${report.datasetHash}</td></tr>
      <tr><td class="metric-name">Generator version</td><td>${meta.generator || 'realitydb-cli'} v${meta.version || 'unknown'}</td></tr>
      <tr><td class="metric-name">License tier</td><td>${meta.license_tier || 'unknown'}</td></tr>
      <tr><td class="metric-name">Certification</td><td>${meta.signature ? 'Ed25519 signed (key: ' + meta.key_id + ')' : 'Unsigned watermark'}</td></tr>
    </tbody>
  </table>
</div>
` : ''}
${report.framework === 'eu-ai-act' && !meta ? `
<div class="section">
  <h2>Article 50 — Transparency</h2>
  <p style="color:#BA7517;font-weight:500">⚠ No _realitydb_meta watermark detected in this dataset.</p>
  <p style="font-size:13px;color:#666;margin-top:8px">
    To embed machine-readable provenance marking (Article 50 compliance), generate data with RealityDB CLI:<br>
    <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px">realitydb run --pack template.json --rows 5000 --format sql -o data.sql</code><br>
    Then certify: <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px">realitydb attest sign data.sql --embed</code>
  </p>
</div>
` : ''}


${report.framework === 'eu-ai-act' && meta ? `
<div class="section">
  <h2>Article 10 — Data Origin & Provenance</h2>
  <table class="metrics-table">
    <thead><tr><th>Property</th><th>Value</th><th>Article Reference</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Generator</td><td>${meta.generator || 'Unknown'} v${meta.version || '?'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Template</td><td>${meta.template || 'custom'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Template Hash</td><td>${meta.template_hash || 'N/A'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Generation Seed</td><td>${meta.seed || 'N/A'} (deterministic reproduction)</td><td>Art. 10(2)(b)</td></tr>
      <tr><td class="metric-name">Generated At</td><td>${meta.generated_at || 'Unknown'}</td><td>Art. 10(2)(a)</td></tr>
      <tr><td class="metric-name">Tables</td><td>${meta.tables || report.tables}</td><td>Art. 10(2)(d)</td></tr>
      <tr><td class="metric-name">Total Rows</td><td>${meta.total_rows || report.rows}</td><td>Art. 10(2)(d)</td></tr>
      <tr><td class="metric-name">Content Hash</td><td>${meta.content_hash || 'Not embedded'}</td><td>Art. 50(2)</td></tr>
      <tr><td class="metric-name">Data Type</td><td>100% synthetic — no real personal data used</td><td>Art. 10(5)</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 50 — Transparency & Machine-Readable Marking</h2>
  <table class="metrics-table">
    <thead><tr><th>Requirement</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>
      <tr>
        <td class="metric-name">Machine-readable marking</td>
        <td><span class="pass">PRESENT</span></td>
        <td>_realitydb_meta table embedded with ${Object.keys(meta).length} fields</td>
      </tr>
      <tr>
        <td class="metric-name">Content hash (detectability)</td>
        <td>${meta.content_hash ? '<span class="pass">EMBEDDED</span>' : '<span class="warn">NOT FOUND</span>'}</td>
        <td>${meta.content_hash || 'Generate with: realitydb attest sign <file>'}</td>
      </tr>
      <tr>
        <td class="metric-name">Cryptographic signature</td>
        <td>${meta.signature ? '<span class="pass">ED25519 SIGNED</span>' : '<span class="info">UNSIGNED</span>'}</td>
        <td>${meta.signature ? 'Key ID: ' + (meta.key_id || 'unknown') : 'Available with: realitydb attest sign <file> --embed'}</td>
      </tr>
      <tr>
        <td class="metric-name">Verification method</td>
        <td><span class="pass">AVAILABLE</span></td>
        <td>realitydb attest verify &lt;file&gt;</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 11 — Technical Documentation</h2>
  <table class="metrics-table">
    <thead><tr><th>Documentation Element</th><th>Status</th><th>Reference</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Generation methodology</td><td>Schema-aware synthetic generation (RealityDB CLI)</td><td>Art. 11, Annex IV §2(b)</td></tr>
      <tr><td class="metric-name">Assessment methodology</td><td>SQR v1.0 — Synthetic Quality Report (3 pillars, 12 metrics)</td><td>Art. 11, Annex IV §2(e)</td></tr>
      <tr><td class="metric-name">Reproducibility</td><td>${meta.seed ? 'Seed: ' + meta.seed + ' (deterministic)' : 'Seed not recorded'}</td><td>Art. 11, Annex IV §2(d)</td></tr>
      <tr><td class="metric-name">No real data dependency</td><td>Generates from schema definition only — no real data ingested</td><td>Art. 10(5)</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Article 12 — Record-Keeping & Audit Trail</h2>
  <table class="metrics-table">
    <thead><tr><th>Record</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td class="metric-name">Report ID</td><td>${report.id}</td></tr>
      <tr><td class="metric-name">Assessment timestamp</td><td>${report.timestamp}</td></tr>
      <tr><td class="metric-name">Dataset hash</td><td>sha256:${report.datasetHash}</td></tr>
      <tr><td class="metric-name">Generator version</td><td>${meta.generator || 'realitydb-cli'} v${meta.version || 'unknown'}</td></tr>
      <tr><td class="metric-name">License tier</td><td>${meta.license_tier || 'unknown'}</td></tr>
      <tr><td class="metric-name">Certification</td><td>${meta.signature ? 'Ed25519 signed (key: ' + meta.key_id + ')' : 'Unsigned watermark'}</td></tr>
    </tbody>
  </table>
</div>
` : ''}
${report.framework === 'eu-ai-act' && !meta ? `
<div class="section">
  <h2>Article 50 — Transparency</h2>
  <p style="color:#BA7517;font-weight:500">⚠ No _realitydb_meta watermark detected in this dataset.</p>
  <p style="font-size:13px;color:#666;margin-top:8px">
    To embed machine-readable provenance marking (Article 50 compliance), generate data with RealityDB CLI:<br>
    <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px">realitydb run --pack template.json --rows 5000 --format sql -o data.sql</code><br>
    Then certify: <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px">realitydb attest sign data.sql --embed</code>
  </p>
</div>
` : ''}
<div class="disclaimer">
  <strong>Disclaimer:</strong> ${report.disclaimer}
</div>

<div class="footer">
  Generated by ${report.generatedBy} \u2014 ${report.timestamp}<br>
  RealityDB Comply \u2014 Mpingo Systems LLC
</div>

</body>
</html>`;
}

// ============================================================
// COMMAND
// ============================================================

export async function complyReportCommand(options: {
  file: string;
  framework: string;
  output?: string;
  json?: boolean;
}): Promise<void> {
  const filePath = path.resolve(options.file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   \u274C File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  const content = fs.readFileSync(filePath, 'utf-8');
  const datasetHash = createHash('sha256').update(content).digest('hex').substring(0, 16);

  const ext = path.extname(filePath).toLowerCase();
  let format = 'unknown';
  let tables: ParsedTable[] = [];

  if (ext === '.sql' || content.includes('CREATE TABLE')) {
    format = 'sql';
    tables = parseSql(content);
  } else if (ext === '.csv') {
    format = 'csv';
    // Simple single-table CSV parse
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',');
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length && j < vals.length; j++) row[headers[j]] = vals[j].trim().replace(/["']/g, '');
        rows.push(row);
      }
      tables = [{ name: path.basename(filePath, ext), columns: headers.map(h => ({ name: h, type: 'TEXT' })), fks: [], rows }];
    }
  } else {
    console.error(`\n   \u274C Unsupported format. Supported: .sql, .csv`);
    process.exit(1);
  }

  // Parse _realitydb_meta for Article 50 transparency data
  const meta = parseRealityDBMeta(content);

  // Parse _realitydb_meta for Article 50 transparency data
  const meta = parseRealityDBMeta(content);

  const frameworkKey = options.framework.toLowerCase();
  const fw = FRAMEWORKS[frameworkKey];
  if (!fw) {
    console.error(`\n   \u274C Unknown framework: ${options.framework}`);
    console.error(`   Available: ${Object.keys(FRAMEWORKS).join(', ')}`);
    process.exit(1);
  }

  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
  const totalColumns = tables.reduce((s, t) => s + t.columns.length, 0);

  // Run metrics
  const fidelityMetrics: MetricResult[] = [computeCompleteness(tables)];
  const structureMetrics: MetricResult[] = [computeFkIntegrity(tables), computeUniqueness(tables), computeTemporalLogic(tables)];
  const privacyMetrics: MetricResult[] = [computeExactMatchRate(tables)];

  // PII detection as a metric
  const piiFindings = detectPii(tables);
  const piiScore = piiFindings.length === 0 ? 100 : Math.max(0, 100 - piiFindings.length * 15);
  privacyMetrics.push({
    name: 'PII column detection', pillar: 'privacy', value: `${piiFindings.length} found`,
    threshold: '0', score: piiScore, status: piiFindings.length === 0 ? 'pass' : 'warn',
    detail: piiFindings.length > 0 ? piiFindings.slice(0, 3).map(f => `${f.table}.${f.column} (${f.pattern})`).join('; ') : undefined,
  });

  // HIPAA 18 check
  const hipaa18 = fw.includeHipaa18 ? checkHipaa18(piiFindings) : null;

  const fScore = Math.round(fidelityMetrics.reduce((s, m) => s + m.score, 0) / fidelityMetrics.length);
  const sScore = Math.round(structureMetrics.reduce((s, m) => s + m.score, 0) / structureMetrics.length);
  const pScore = Math.round(privacyMetrics.reduce((s, m) => s + m.score, 0) / privacyMetrics.length);
  const overall = Math.round((fScore + sScore + pScore) / 3);

  const reportPrefix = frameworkKey === 'eu-ai-act' ? 'RDB-EUAIA' : 'RDB-COMPLY';
  const reportId = `${reportPrefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6)}`;

  const report: ComplianceReport = {
    id: reportId,
    version: '1.0',
    framework: frameworkKey,
    frameworkDescription: fw.description,
    timestamp: new Date().toISOString(),
    file: filePath,
    datasetHash,
    format,
    tables: tables.length,
    columns: totalColumns,
    rows: totalRows,
    overallScore: overall,
    pillars: [
      { name: 'Fidelity', score: fScore, metrics: fidelityMetrics },
      { name: 'Structure', score: sScore, metrics: structureMetrics },
      { name: 'Privacy', score: pScore, metrics: privacyMetrics },
    ],
    piiFindings,
    hipaa18,
    disclaimer: frameworkKey === 'eu-ai-act'
      ? 'This report presents measured statistical properties of a dataset in the context of EU AI Act (Regulation 2024/1689) Articles 10, 11, 12, and 50. It does NOT constitute a conformity assessment under Article 43, legal advice, or regulatory certification. This report does not determine compliance with the EU AI Act. Conformity assessment and compliance determination are the responsibility of the AI system provider and/or deployer in accordance with their obligations under the Act.'
      : 'This report presents measured statistical properties against reference thresholds derived from the specified regulatory framework. It does not constitute legal advice, regulatory certification, or compliance determination. Compliance assessment is the responsibility of the data controller.',
    generatedBy: 'realitydb-cli v2.36.0',
  };

  const elapsed = Date.now() - startTime;

  // JSON output
  if (options.json) {
    const jsonStr = JSON.stringify(report, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, jsonStr, 'utf-8');
      console.log(`\n   \u2705 JSON report saved: ${options.output}\n`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // HTML output
  const html = generateHtmlReport(report, meta);
  const outPath = options.output || filePath.replace(/\.\w+$/, `-${frameworkKey}-report.html`);
  fs.writeFileSync(outPath, html, 'utf-8');

  // Console summary
  console.log(`\n\u{1F4CB} RealityDB Compliance Report`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`   Report ID: ${reportId}`);
  console.log(`   Framework: ${fw.name} (${fw.reference})`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Tables: ${tables.length} | Columns: ${totalColumns} | Rows: ${totalRows.toLocaleString()}`);
  console.log(`${'═'.repeat(50)}\n`);

  const overallIcon = overall >= 90 ? '\u{1F7E2}' : overall >= 70 ? '\u{1F7E1}' : '\u{1F534}';
  console.log(`   ${overallIcon} OVERALL: ${overall}/100\n`);

  for (const pillar of report.pillars) {
    const icon = pillar.score >= 90 ? '\u2705' : '\u26A0\uFE0F ';
    console.log(`   ${icon} ${pillar.name}: ${pillar.score}/100`);
    for (const m of pillar.metrics) {
      const mIcon = m.status === 'pass' ? '\u2705' : m.status === 'info' ? '\u2139\uFE0F ' : '\u26A0\uFE0F ';
      console.log(`      ${mIcon} ${m.name}: ${m.value}`);
    }
  }

  if (piiFindings.length > 0) {
    console.log(`\n   PII findings: ${piiFindings.length} column(s)`);
    for (const f of piiFindings.slice(0, 5)) {
      console.log(`      \u{1F534} ${f.table}.${f.column} \u2192 ${f.pattern}`);
    }
  }

  if (hipaa18) {
    console.log(`\n   HIPAA 18: ${hipaa18.found.length}/18 identifiers detected (${hipaa18.coverage}%)`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`   \u{1F4C4} Report saved: ${outPath}`);
  console.log(`   Open in browser to view or print to PDF`);
  console.log(`   Generated in ${elapsed}ms`);

  suggestNext({
    command: 'comply-report',
    outputFile: outPath,
    score: overall,
    framework: frameworkKey,
  });
}
