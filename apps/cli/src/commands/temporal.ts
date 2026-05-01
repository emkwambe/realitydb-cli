import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────
// realitydb comply temporal <file>
//   --dry-run     Report violations without fixing
//   --fix         Apply fixes
//   --pack <path> Optional: read pack JSON for dependsOn metadata
//   --verbose     Show every fix applied
//   -o <output>   Output path (default: overwrite input)
// ─────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────

interface RowData {
  tableName: string;
  rowIndex: number;       // line number in the SQL file
  pk: string;             // first column value (assumed PK)
  columns: string[];      // column names from CREATE TABLE
  values: string[];       // raw string values from INSERT
  parsed: Record<string, string>;  // colName → value
}

interface Violation {
  table: string;
  row: number;
  rule: string;
  colA: string;
  valA: string;
  colB: string;
  valB: string;
  fixed?: boolean;
  newVal?: string;
}

interface TemporalPair {
  earlier: string;    // column that should be earlier
  later: string;      // column that should be later
  type: 'within-row' | 'cross-table' | 'lifecycle';
}

interface LifecycleRule {
  statusColumn: string;
  statusValue: string;
  nullFields: string[];
  notNullFields?: string[];
}

// ── Temporal Rules Auto-Detection ────────────────────────────────────

const WITHIN_ROW_PATTERNS: [RegExp, RegExp][] = [
  [/^created_at$/,        /^updated_at$/],
  [/^created_at$/,        /^deleted_at$/],
  [/^created_at$/,        /^closed_at$/],
  [/^start_date$/,        /^end_date$/],
  [/^opened_at$/,         /^closed_at$/],
  [/^opening_date$/,      /^closing_date$/],
  [/^opening_date$/,      /^closed_at$/],
  [/^incident_date$/,     /^filed_date$/],
  [/^incident_date$/,     /^filed_at$/],
  [/^diagnosis_date$/,    /^treatment_start/],
  [/^diagnosis_date$/,    /^procedure_date$/],
  [/^onset_date$/,        /^resolution_date$/],
  [/^onset_date$/,        /^resolved_date$/],
  [/^enrollment_date$/,   /^informed_consent_date$/],
  [/^procedure_date$/,    /^report_date$/],
  [/^start_date$/,        /^completion_date$/],
  [/^infusion_date$/,     /^resolution_date$/],
  [/^detection_date$/,    /^confirmation_date$/],
  [/^collection_date$/,   /^report_date$/],
  [/^order_date$/,        /^ship_date$/],
  [/^ship_date$/,         /^delivery_date$/],
  [/^initiated_at$/,      /^completed_at$/],
  [/^screening_date$/,    /^enrollment_date$/],
  [/^biopsy_date$/,       /^report_date$/],
  [/^referral_date$/,     /^visit_date$/],
  [/^irb_approval_date$/, /^start_date$/],
// ── Sprint 0.5 additions (created_at as row-start anchor) ──
  [/^created_at$/,        /^completed_at$/],
  [/^created_at$/,        /^delivered_at$/],
  [/^created_at$/,        /^dispensed_at$/],
  [/^created_at$/,        /^expires_at$/],
  [/^created_at$/,        /^issued_at$/],
  [/^created_at$/,        /^kyc_completed_at$/],
  [/^created_at$/,        /^last_active_at$/],
  [/^created_at$/,        /^payment_date$/],
  [/^created_at$/,        /^prescribed_at$/],
  [/^created_at$/,        /^resolved_at$/],
  [/^created_at$/,        /^shipped_at$/],
  [/^created_at$/,        /^transaction_date$/],
  [/^created_at$/,        /^verified_at$/],
];
const LIFECYCLE_RULES: LifecycleRule[] = [
  { statusColumn: 'status', statusValue: 'cancelled',  nullFields: ['completed_at', 'shipped_at', 'end_date', 'closed_at'] },
  { statusColumn: 'status', statusValue: 'completed',  nullFields: [], notNullFields: ['completed_at'] },
  { statusColumn: 'vital_status', statusValue: 'deceased_cancer',  nullFields: [], notNullFields: ['last_known_date'] },
  { statusColumn: 'vital_status', statusValue: 'deceased_other',   nullFields: [], notNullFields: ['last_known_date'] },
  { statusColumn: 'disposition_status', statusValue: 'completed',  nullFields: [], notNullFields: ['disposition_date'] },
  { statusColumn: 'claim_status', statusValue: 'denied', nullFields: ['paid_date'] },
  { statusColumn: 'completion_status', statusValue: 'discontinued', nullFields: [] },
  { statusColumn: 'order_status', statusValue: 'cancelled', nullFields: ['completion_date', 'delivered_at'] },
  { statusColumn: 'account_status', statusValue: 'closed', nullFields: [], notNullFields: ['closed_at'] },
        // ── AML / Banking ────────────────────────────────────────────────

  // SAR lifecycle
  { statusColumn: 'sar_status', statusValue: 'dismissed',       nullFields: ['filed_date', 'acknowledgment_date'] },
  { statusColumn: 'sar_status', statusValue: 'filed',           nullFields: [], notNullFields: ['filed_date'] },
  { statusColumn: 'sar_status', statusValue: 'acknowledged',    nullFields: [], notNullFields: ['filed_date', 'acknowledgment_date'] },

  // Account lifecycle
  { statusColumn: 'account_status', statusValue: 'closed',      nullFields: [], notNullFields: ['closed_at'] },
  { statusColumn: 'account_status', statusValue: 'frozen',      nullFields: [], notNullFields: ['frozen_at'] },
  { statusColumn: 'account_status', statusValue: 'suspended',   nullFields: [], notNullFields: ['suspended_at'] },

  // Transaction lifecycle
  { statusColumn: 'transaction_status', statusValue: 'reversed', nullFields: [], notNullFields: ['reversal_date'] },
  { statusColumn: 'transaction_status', statusValue: 'failed',   nullFields: ['completed_at', 'settlement_date'] },

  // Wire transfer lifecycle
  { statusColumn: 'wire_status', statusValue: 'cancelled',      nullFields: ['completed_at', 'settlement_date'] },
  { statusColumn: 'wire_status', statusValue: 'completed',      nullFields: [], notNullFields: ['completed_at'] },
  { statusColumn: 'wire_status', statusValue: 'blocked',        nullFields: ['completed_at', 'settlement_date'] },

  // ── Credit Risk / Loans ──────────────────────────────────────────

  // Loan lifecycle
  { statusColumn: 'loan_status', statusValue: 'defaulted',      nullFields: [], notNullFields: ['default_date'] },
  { statusColumn: 'loan_status', statusValue: 'paid_off',       nullFields: [], notNullFields: ['payoff_date'] },
  { statusColumn: 'loan_status', statusValue: 'charged_off',    nullFields: [], notNullFields: ['chargeoff_date'] },
  { statusColumn: 'loan_status', statusValue: 'current',        nullFields: ['default_date', 'chargeoff_date'] },

  // Payment lifecycle
  { statusColumn: 'payment_status', statusValue: 'missed',      nullFields: ['paid_date'] },
  { statusColumn: 'payment_status', statusValue: 'partial',     nullFields: [], notNullFields: ['paid_date'] },
  { statusColumn: 'payment_status', statusValue: 'paid',        nullFields: [], notNullFields: ['paid_date'] },

  // ── Insurance Lifecycle ──────────────────────────────────────────

  // Policy lifecycle
  { statusColumn: 'policy_status', statusValue: 'cancelled',    nullFields: ['renewal_date'] },
  { statusColumn: 'policy_status', statusValue: 'expired',      nullFields: ['renewal_date'], notNullFields: ['end_date'] },
  { statusColumn: 'policy_status', statusValue: 'active',       nullFields: ['cancellation_date'] },

  // Claim lifecycle
  { statusColumn: 'claim_status', statusValue: 'denied',        nullFields: ['paid_date', 'payment_date'], notNullFields: ['decision_date'] },
  { statusColumn: 'claim_status', statusValue: 'paid',          nullFields: [], notNullFields: ['paid_date', 'decision_date'] },
  { statusColumn: 'claim_status', statusValue: 'investigating', nullFields: ['decision_date', 'paid_date'] },
  { statusColumn: 'claim_status', statusValue: 'closed',        nullFields: [], notNullFields: ['decision_date', 'closed_date'] },

  // Investigation lifecycle
  { statusColumn: 'investigation_status', statusValue: 'cleared',    nullFields: [], notNullFields: ['completed_date'] },
  { statusColumn: 'investigation_status', statusValue: 'confirmed_fraud', nullFields: [], notNullFields: ['completed_date'] },
  { statusColumn: 'investigation_status', statusValue: 'pending',    nullFields: ['completed_date'] },

  // ── SaaS Billing ─────────────────────────────────────────────────

  // Subscription lifecycle
  { statusColumn: 'subscription_status', statusValue: 'churned',     nullFields: ['next_billing_date', 'renewal_date'] },
  { statusColumn: 'subscription_status', statusValue: 'cancelled',   nullFields: ['next_billing_date'], notNullFields: ['cancelled_at'] },
  { statusColumn: 'subscription_status', statusValue: 'past_due',    nullFields: [], notNullFields: ['past_due_since'] },
  { statusColumn: 'subscription_status', statusValue: 'trial',       nullFields: ['first_payment_date'] },
  { statusColumn: 'subscription_status', statusValue: 'active',      nullFields: ['cancelled_at', 'churned_at'] },

  // Invoice lifecycle
  { statusColumn: 'invoice_status', statusValue: 'void',             nullFields: ['paid_date'] },
  { statusColumn: 'invoice_status', statusValue: 'paid',             nullFields: [], notNullFields: ['paid_date'] },
  { statusColumn: 'invoice_status', statusValue: 'refunded',         nullFields: [], notNullFields: ['refund_date'] },
  { statusColumn: 'invoice_status', statusValue: 'uncollectible',    nullFields: ['paid_date'], notNullFields: ['written_off_date'] },

  // ── Trade Surveillance ───────────────────────────────────────────

  // Order lifecycle
  { statusColumn: 'order_status', statusValue: 'cancelled',     nullFields: ['filled_at', 'settlement_date'] },
  { statusColumn: 'order_status', statusValue: 'filled',        nullFields: [], notNullFields: ['filled_at'] },
  { statusColumn: 'order_status', statusValue: 'partially_filled', nullFields: ['settlement_date'] },
  { statusColumn: 'order_status', statusValue: 'rejected',      nullFields: ['filled_at', 'settlement_date'] },

  // ── Mortgage Servicing ───────────────────────────────────────────

  // Mortgage lifecycle
  { statusColumn: 'mortgage_status', statusValue: 'foreclosure',  nullFields: [], notNullFields: ['foreclosure_date'] },
  { statusColumn: 'mortgage_status', statusValue: 'paid_off',     nullFields: ['foreclosure_date'], notNullFields: ['payoff_date'] },
  { statusColumn: 'mortgage_status', statusValue: 'current',      nullFields: ['default_date', 'foreclosure_date'] },
  { statusColumn: 'mortgage_status', statusValue: 'delinquent',   nullFields: ['payoff_date'] },

  // Escrow lifecycle
  { statusColumn: 'escrow_status', statusValue: 'shortage',      nullFields: [], notNullFields: ['shortage_date'] },
  { statusColumn: 'escrow_status', statusValue: 'surplus',       nullFields: [], notNullFields: ['surplus_date'] },

  // ── KYB / UBO ────────────────────────────────────────────────────

  // Entity lifecycle
  { statusColumn: 'entity_status', statusValue: 'dissolved',     nullFields: [], notNullFields: ['dissolution_date'] },
  { statusColumn: 'entity_status', statusValue: 'active',        nullFields: ['dissolution_date', 'suspension_date'] },
  { statusColumn: 'entity_status', statusValue: 'suspended',     nullFields: [], notNullFields: ['suspension_date'] },

  // KYC lifecycle
  { statusColumn: 'kyc_status', statusValue: 'expired',          nullFields: [], notNullFields: ['expiry_date'] },
  { statusColumn: 'kyc_status', statusValue: 'verified',         nullFields: [], notNullFields: ['verified_date'] },
  { statusColumn: 'kyc_status', statusValue: 'rejected',         nullFields: ['verified_date'], notNullFields: ['rejection_date'] },
  { statusColumn: 'kyc_status', statusValue: 'pending',          nullFields: ['verified_date', 'rejection_date'] },

  // ── Wealth Management ────────────────────────────────────────────

  // Portfolio lifecycle
  { statusColumn: 'portfolio_status', statusValue: 'liquidated',  nullFields: [], notNullFields: ['liquidation_date'] },
  { statusColumn: 'portfolio_status', statusValue: 'active',      nullFields: ['liquidation_date', 'closed_date'] },
  { statusColumn: 'portfolio_status', statusValue: 'rebalancing', nullFields: ['closed_date'] },

  // ── POS / Card Fraud ─────────────────────────────────────────────

  // Dispute lifecycle
  { statusColumn: 'dispute_status', statusValue: 'resolved_customer',  nullFields: [], notNullFields: ['resolution_date'] },
  { statusColumn: 'dispute_status', statusValue: 'resolved_merchant',  nullFields: [], notNullFields: ['resolution_date'] },
  { statusColumn: 'dispute_status', statusValue: 'open',               nullFields: ['resolution_date'] },
  { statusColumn: 'dispute_status', statusValue: 'escalated',          nullFields: ['resolution_date'] },

  // Card lifecycle
  { statusColumn: 'card_status', statusValue: 'blocked',        nullFields: [], notNullFields: ['blocked_date'] },
  { statusColumn: 'card_status', statusValue: 'expired',        nullFields: [], notNullFields: ['expiry_date'] },
  { statusColumn: 'card_status', statusValue: 'active',         nullFields: ['blocked_date', 'cancelled_date'] },
  { statusColumn: 'card_status', statusValue: 'cancelled',      nullFields: [], notNullFields: ['cancelled_date'] },
];

// ── SQL Parser ───────────────────────────────────────────────────────

interface TableSchema {
  name: string;
  columns: string[];
  fkMap: Record<string, { table: string; column: string }>;
}

function parseCreateTables(sql: string): Map<string, TableSchema> {
  const schemas = new Map<string, TableSchema>();
  const createRegex = /CREATE TABLE\s+"?(\w+)"?\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = createRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: string[] = [];
    const fkMap: Record<string, { table: string; column: string }> = {};

    // Parse column definitions
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip constraints, empty lines
      if (trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('PRIMARY') || !trimmed) continue;

      // Column definition: "column_name" TYPE ...
      const colMatch = trimmed.match(/^"?(\w+)"?\s+/);
      if (colMatch && !trimmed.startsWith('CONSTRAINT')) {
        columns.push(colMatch[1]);
      }

      // FK constraint: FOREIGN KEY ("col") REFERENCES "table"("col")
      const fkMatch = trimmed.match(/FOREIGN KEY\s*\("(\w+)"\)\s*REFERENCES\s*"(\w+)"\s*\("(\w+)"\)/i);
      if (fkMatch) {
        fkMap[fkMatch[1]] = { table: fkMatch[2], column: fkMatch[3] };
      }
    }

    if (tableName !== '_realitydb_meta') {
      schemas.set(tableName, { name: tableName, columns, fkMap });
    }
  }

  return schemas;
}

function parseInsertRows(sql: string, schemas: Map<string, TableSchema>): Map<string, RowData[]> {
  const tableRows = new Map<string, RowData[]>();

  for (const [tableName] of schemas) {
    tableRows.set(tableName, []);
  }

  const lines = sql.split('\n');
  let currentTable = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect INSERT INTO "tableName" ...
    const insertMatch = line.match(/INSERT INTO\s+"(\w+)"/);
    if (insertMatch) {
      currentTable = insertMatch[1];
      continue;
    }

    // Parse value rows: ('val1', 'val2', ...)
    if (currentTable && line.startsWith('(')) {
      const schema = schemas.get(currentTable);
      if (!schema) continue;

      // Extract values between parentheses
      const valueStr = line.replace(/^\(/, '').replace(/\),?\s*$/, '');
      const values = parseValueRow(valueStr);

      if (values.length === schema.columns.length) {
        const parsed: Record<string, string> = {};
        for (let c = 0; c < schema.columns.length; c++) {
          parsed[schema.columns[c]] = values[c];
        }

        const row: RowData = {
          tableName: currentTable,
          rowIndex: i,
          pk: values[0],
          columns: schema.columns,
          values,
          parsed,
        };

        tableRows.get(currentTable)?.push(row);
      }
    }

    // Reset on empty line or new statement
    if (line === '' || line.startsWith('CREATE') || line.startsWith('--')) {
      currentTable = '';
    }
  }

  return tableRows;
}

function parseValueRow(valueStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let depth = 0;

  for (let i = 0; i < valueStr.length; i++) {
    const ch = valueStr[i];

    if (ch === "'" && !inString) {
      inString = true;
      continue;
    }
    if (ch === "'" && inString) {
      // Check for escaped quote ''
      if (i + 1 < valueStr.length && valueStr[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      inString = false;
      continue;
    }

    if (inString) {
      current += ch;
      continue;
    }

    if (ch === '(') { depth++; current += ch; continue; }
    if (ch === ')') { depth--; current += ch; continue; }

    if (ch === ',' && depth === 0) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values.map(v => {
    if (v === 'NULL' || v === 'null') return 'NULL';
    return v;
  });
}

// ── Timestamp Utilities ──────────────────────────────────────────────

function isTimestamp(value: string): boolean {
  if (value === 'NULL' || value === 'null') return false;
  // ISO 8601 patterns
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function parseTs(value: string): Date | null {
  if (value === 'NULL' || value === 'null') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatTs(date: Date): string {
  return date.toISOString();
}

function addRandomDays(base: Date, minDays: number, maxDays: number): Date {
  const days = minDays + Math.random() * (maxDays - minDays);
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(base.getTime() + ms);
}

// ── Violation Detection ──────────────────────────────────────────────

function detectTemporalPairs(columns: string[]): TemporalPair[] {
  const pairs: TemporalPair[] = [];
  const colSet = new Set(columns);

  for (const [earlierPattern, laterPattern] of WITHIN_ROW_PATTERNS) {
    let earlierCol = '';
    let laterCol = '';

    for (const col of columns) {
      if (earlierPattern.test(col)) earlierCol = col;
      if (laterPattern.test(col)) laterCol = col;
    }

    if (earlierCol && laterCol && colSet.has(earlierCol) && colSet.has(laterCol)) {
      pairs.push({ earlier: earlierCol, later: laterCol, type: 'within-row' });
    }
  }

  return pairs;
}

function detectWithinRowViolations(
  rows: RowData[],
  pairs: TemporalPair[]
): Violation[] {
  const violations: Violation[] = [];

  for (const row of rows) {
    for (const pair of pairs) {
      const valA = row.parsed[pair.earlier];
      const valB = row.parsed[pair.later];

      // Skip if either is NULL
      if (!valA || valA === 'NULL' || !valB || valB === 'NULL') continue;

      const dateA = parseTs(valA);
      const dateB = parseTs(valB);

      if (!dateA || !dateB) continue;

      if (dateB.getTime() < dateA.getTime()) {
        violations.push({
          table: row.tableName,
          row: row.rowIndex,
          rule: `${pair.earlier} < ${pair.later}`,
          colA: pair.earlier,
          valA,
          colB: pair.later,
          valB,
        });
      }
    }
  }

  return violations;
}

function detectCrossTableViolations(
  tableRows: Map<string, RowData[]>,
  schemas: Map<string, TableSchema>
): Violation[] {
  const violations: Violation[] = [];

  // Build PK → row index for quick lookup
  const pkIndex = new Map<string, Map<string, RowData>>();
  for (const [tableName, rows] of tableRows) {
    const idx = new Map<string, RowData>();
    for (const row of rows) {
      idx.set(row.pk, row);
    }
    pkIndex.set(tableName, idx);
  }

  // For each child table with FKs
  for (const [tableName, schema] of schemas) {
    const childRows = tableRows.get(tableName) || [];

    for (const [fkCol, fkRef] of Object.entries(schema.fkMap)) {
      const parentTable = fkRef.table;
      const parentIdx = pkIndex.get(parentTable);
      if (!parentIdx) continue;

      // Find timestamp columns in both tables
      const parentSchema = schemas.get(parentTable);
      if (!parentSchema) continue;

      const parentTimeCols = parentSchema.columns.filter(c =>
        /created_at|opened_at|start_date|enrollment_date/.test(c)
      );
      const childTimeCols = schema.columns.filter(c =>
        /created_at|opened_at|start_date|enrollment_date|timestamp/.test(c)
      );

      if (parentTimeCols.length === 0 || childTimeCols.length === 0) continue;

      // Check each child row
      for (const childRow of childRows) {
        const fkValue = childRow.parsed[fkCol];
        if (!fkValue || fkValue === 'NULL') continue;

        const parentRow = parentIdx.get(fkValue);
        if (!parentRow) continue;

        // Compare earliest parent time vs earliest child time
        const parentTimeCol = parentTimeCols[0];
        const childTimeCol = childTimeCols[0];

        const parentDate = parseTs(parentRow.parsed[parentTimeCol]);
        const childDate = parseTs(childRow.parsed[childTimeCol]);

        if (!parentDate || !childDate) continue;

        if (childDate.getTime() < parentDate.getTime()) {
          violations.push({
            table: tableName,
            row: childRow.rowIndex,
            rule: `${parentTable}.${parentTimeCol} <= ${tableName}.${childTimeCol} (via FK ${fkCol})`,
            colA: `${parentTable}.${parentTimeCol}`,
            valA: parentRow.parsed[parentTimeCol],
            colB: `${tableName}.${childTimeCol}`,
            valB: childRow.parsed[childTimeCol],
          });
        }
      }
    }
  }

  return violations;
}

function detectLifecycleViolations(rows: RowData[]): Violation[] {
  const violations: Violation[] = [];
  const colSet = new Set(rows[0]?.columns || []);

  for (const rule of LIFECYCLE_RULES) {
    if (!colSet.has(rule.statusColumn)) continue;

    for (const row of rows) {
      const statusVal = row.parsed[rule.statusColumn];
      if (statusVal !== rule.statusValue) continue;

      // Check null fields (should be NULL for this status)
      for (const nullField of rule.nullFields) {
        if (!colSet.has(nullField)) continue;
        const val = row.parsed[nullField];
        if (val && val !== 'NULL') {
          violations.push({
            table: row.tableName,
            row: row.rowIndex,
            rule: `${rule.statusColumn}='${rule.statusValue}' → ${nullField}=NULL`,
            colA: rule.statusColumn,
            valA: statusVal,
            colB: nullField,
            valB: val,
          });
        }
      }

      // Check not-null fields (should NOT be NULL for this status)
      if (rule.notNullFields) {
        for (const notNullField of rule.notNullFields) {
          if (!colSet.has(notNullField)) continue;
          const val = row.parsed[notNullField];
          if (!val || val === 'NULL') {
            violations.push({
              table: row.tableName,
              row: row.rowIndex,
              rule: `${rule.statusColumn}='${rule.statusValue}' → ${notNullField} NOT NULL`,
              colA: rule.statusColumn,
              valA: statusVal,
              colB: notNullField,
              valB: 'NULL',
            });
          }
        }
      }
    }
  }

  return violations;
}

// ── Fix Engine ───────────────────────────────────────────────────────

function fixWithinRowViolation(
  lines: string[],
  row: RowData,
  violation: Violation,
  schema: TableSchema
): string | null {
  const earlierDate = parseTs(row.parsed[violation.colA]);
  if (!earlierDate) return null;

  // Generate a new date: earlier + random 1-180 days
  const fixedDate = addRandomDays(earlierDate, 1, 180);
  const fixedVal = formatTs(fixedDate);

  // Replace in the SQL line
  const colIndex = schema.columns.indexOf(violation.colB);
  if (colIndex === -1) return null;

  const oldLine = lines[row.rowIndex];
  const values = parseValueRow(
    oldLine.trim().replace(/^\(/, '').replace(/\),?\s*$/, '')
  );

  values[colIndex] = fixedVal;

  // Rebuild the line
  const newValues = values.map((v, i) => {
    if (v === 'NULL') return 'NULL';
    // Determine if this column needs quotes (strings/timestamps get quotes, numbers don't)
    const colName = schema.columns[i];
    if (/^-?\d+(\.\d+)?$/.test(v)) return v; // numeric
    return `'${v}'`;
  });

  const suffix = oldLine.trimEnd().endsWith(',') ? ',' : '';
  const indent = oldLine.match(/^(\s*)/)?.[1] || '  ';
  const newLine = `${indent}(${newValues.join(', ')})${suffix}`;

  lines[row.rowIndex] = newLine;
  violation.fixed = true;
  violation.newVal = fixedVal;

  return fixedVal;
}

function fixLifecycleViolation(
  lines: string[],
  row: RowData,
  violation: Violation,
  schema: TableSchema
): boolean {
  const rule = violation.rule;

  // If rule says field should be NULL
  if (rule.includes('=NULL')) {
    const colIndex = schema.columns.indexOf(violation.colB);
    if (colIndex === -1) return false;

    const oldLine = lines[row.rowIndex];
    const values = parseValueRow(
      oldLine.trim().replace(/^\(/, '').replace(/\),?\s*$/, '')
    );

    values[colIndex] = 'NULL';

    const newValues = values.map((v, i) => {
      if (v === 'NULL') return 'NULL';
      if (/^-?\d+(\.\d+)?$/.test(v)) return v;
      return `'${v}'`;
    });

    const suffix = oldLine.trimEnd().endsWith(',') ? ',' : '';
    const indent = oldLine.match(/^(\s*)/)?.[1] || '  ';
    lines[row.rowIndex] = `${indent}(${newValues.join(', ')})${suffix}`;

    violation.fixed = true;
    violation.newVal = 'NULL';
    return true;
  }

  // If rule says field should NOT be NULL — generate a date after the earliest timestamp
  if (rule.includes('NOT NULL')) {
    const colIndex = schema.columns.indexOf(violation.colB);
    if (colIndex === -1) return false;

    // Find the earliest timestamp in this row to base the fix on
    let baseDate = new Date();
    for (const col of schema.columns) {
      const val = row.parsed[col];
      if (val && val !== 'NULL' && isTimestamp(val)) {
        const d = parseTs(val);
        if (d && d.getTime() < baseDate.getTime()) {
          baseDate = d;
        }
      }
    }

    const fixedDate = addRandomDays(baseDate, 1, 90);
    const fixedVal = formatTs(fixedDate);

    const oldLine = lines[row.rowIndex];
    const values = parseValueRow(
      oldLine.trim().replace(/^\(/, '').replace(/\),?\s*$/, '')
    );

    values[colIndex] = fixedVal;

    const newValues = values.map((v, i) => {
      if (v === 'NULL') return 'NULL';
      if (/^-?\d+(\.\d+)?$/.test(v)) return v;
      return `'${v}'`;
    });

    const suffix = oldLine.trimEnd().endsWith(',') ? ',' : '';
    const indent = oldLine.match(/^(\s*)/)?.[1] || '  ';
    lines[row.rowIndex] = `${indent}(${newValues.join(', ')})${suffix}`;

    violation.fixed = true;
    violation.newVal = fixedVal;
    return true;
  }

  return false;
}

function fixCrossTableViolation(
  lines: string[],
  childRow: RowData,
  violation: Violation,
  childSchema: TableSchema,
  parentDate: Date
): boolean {
  // Find the child's timestamp column
  const childTimeCol = violation.colB.split('.').pop() || '';
  const colIndex = childSchema.columns.indexOf(childTimeCol);
  if (colIndex === -1) return false;

  // Shift child date to after parent date
  const fixedDate = addRandomDays(parentDate, 0, 30);
  const fixedVal = formatTs(fixedDate);

  const oldLine = lines[childRow.rowIndex];
  const values = parseValueRow(
    oldLine.trim().replace(/^\(/, '').replace(/\),?\s*$/, '')
  );

  values[colIndex] = fixedVal;

  const newValues = values.map((v, i) => {
    if (v === 'NULL') return 'NULL';
    if (/^-?\d+(\.\d+)?$/.test(v)) return v;
    return `'${v}'`;
  });

  const suffix = oldLine.trimEnd().endsWith(',') ? ',' : '';
  const indent = oldLine.match(/^(\s*)/)?.[1] || '  ';
  lines[childRow.rowIndex] = `${indent}(${newValues.join(', ')})${suffix}`;

  violation.fixed = true;
  violation.newVal = fixedVal;
  return true;
}

// ── Main Command ─────────────────────────────────────────────────────

export interface TemporalOptions {
  file: string;
  dryRun?: boolean;
  fix?: boolean;
  pack?: string;
  verbose?: boolean;
  output?: string;
}

export function runTemporalCompliance(options: TemporalOptions): void {
  const filePath = path.resolve(options.file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   ❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  const lines = sql.split('\n');

  console.log(`\n🕐 RealityDB Temporal Compliance`);
  console.log(`────────────────────────────────────────`);
  console.log(`   File: ${path.basename(filePath)}`);

  // Step 1: Parse CREATE TABLE statements
  const schemas = parseCreateTables(sql);
  console.log(`   Tables: ${schemas.size}`);

  // Step 2: Parse INSERT rows
  const tableRows = parseInsertRows(sql, schemas);
  let totalRows = 0;
  for (const [, rows] of tableRows) totalRows += rows.length;
  console.log(`   Rows: ${totalRows}`);
  console.log(`────────────────────────────────────────`);

  // Step 3: Detect violations
  let allViolations: Violation[] = [];

  // 3a: Within-row temporal ordering
  let withinRowViolations: Violation[] = [];
  for (const [tableName, rows] of tableRows) {
    const schema = schemas.get(tableName);
    if (!schema) continue;
    const pairs = detectTemporalPairs(schema.columns);
    if (pairs.length > 0) {
      const violations = detectWithinRowViolations(rows, pairs);
      withinRowViolations = withinRowViolations.concat(violations);
    }
  }

  // 3b: Cross-table temporal ordering
  const crossTableViolations = detectCrossTableViolations(tableRows, schemas);

  // 3c: Lifecycle violations
  let lifecycleViolations: Violation[] = [];
  for (const [, rows] of tableRows) {
    if (rows.length === 0) continue;
    const violations = detectLifecycleViolations(rows);
    withinRowViolations = withinRowViolations.concat(violations);
  }

  allViolations = allViolations.concat(withinRowViolations, crossTableViolations, lifecycleViolations);

  // Step 4: Report
  const withinCount = withinRowViolations.length;
  const crossCount = crossTableViolations.length;
  const lifecycleCount = lifecycleViolations.length;
  const totalViolations = allViolations.length;

  if (totalViolations === 0) {
    console.log(`\n   ✅ No temporal violations found.`);
    console.log(`   Temporal compliance: 100%`);
    console.log(`────────────────────────────────────────`);
    return;
  }

  // Group violations by table for reporting
  const byTable = new Map<string, Violation[]>();
  for (const v of allViolations) {
    if (!byTable.has(v.table)) byTable.set(v.table, []);
    byTable.get(v.table)!.push(v);
  }

  console.log(`\n   Within-row violations:    ${withinCount} found`);
  if (withinCount > 0) {
    const grouped = new Map<string, number>();
    for (const v of withinRowViolations) {
      const key = `${v.table}: ${v.rule}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    for (const [key, count] of grouped) {
      console.log(`     ${key} (${count})`);
    }
  }

  console.log(`\n   Cross-table violations:   ${crossCount} found`);
  if (crossCount > 0) {
    const grouped = new Map<string, number>();
    for (const v of crossTableViolations) {
      const key = v.rule;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    for (const [key, count] of grouped) {
      console.log(`     ${key} (${count})`);
    }
  }

  console.log(`\n   Lifecycle violations:     ${lifecycleCount} found`);
  if (lifecycleCount > 0) {
    const grouped = new Map<string, number>();
    for (const v of lifecycleViolations) {
      const key = `${v.table}: ${v.rule}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }
    for (const [key, count] of grouped) {
      console.log(`     ${key} (${count})`);
    }
  }

  const complianceRate = (((totalRows - totalViolations) / totalRows) * 100).toFixed(1);
  console.log(`\n────────────────────────────────────────`);
  console.log(`   Total: ${totalViolations} violations`);
  console.log(`   Temporal compliance: ${complianceRate}%`);

  // Step 5: Fix if requested
  if (options.fix) {
    console.log(`\n   Applying fixes...`);
    let fixedCount = 0;

    // Fix within-row violations
    for (const v of withinRowViolations) {
      const schema = schemas.get(v.table);
      if (!schema) continue;
      const rows = tableRows.get(v.table) || [];
      const row = rows.find(r => r.rowIndex === v.row);
      if (!row) continue;

      const result = fixWithinRowViolation(lines, row, v, schema);
      if (result) {
        fixedCount++;
        if (options.verbose) {
          console.log(`     ✅ ${v.table}[${v.row}]: ${v.colB} ${v.valB} → ${result}`);
        }
      }
    }

    // Fix lifecycle violations
    for (const v of lifecycleViolations) {
      const schema = schemas.get(v.table);
      if (!schema) continue;
      const rows = tableRows.get(v.table) || [];
      const row = rows.find(r => r.rowIndex === v.row);
      if (!row) continue;

      const fixed = fixLifecycleViolation(lines, row, v, schema);
      if (fixed) {
        fixedCount++;
        if (options.verbose) {
          console.log(`     ✅ ${v.table}[${v.row}]: ${v.colB} → ${v.newVal}`);
        }
      }
    }

    // Fix cross-table violations
    for (const v of crossTableViolations) {
      const childTableName = v.colB.split('.')[0] || v.table;
      const childSchema = schemas.get(v.table);
      if (!childSchema) continue;
      const rows = tableRows.get(v.table) || [];
      const row = rows.find(r => r.rowIndex === v.row);
      if (!row) continue;

      const parentDate = parseTs(v.valA);
      if (!parentDate) continue;

      const fixed = fixCrossTableViolation(lines, row, v, childSchema, parentDate);
      if (fixed) {
        fixedCount++;
        if (options.verbose) {
          console.log(`     ✅ ${v.table}[${v.row}]: ${v.colB} → ${v.newVal}`);
        }
      }
    }

    console.log(`\n   ✅ ${fixedCount}/${totalViolations} violations fixed`);

    // Write output
    const outPath = options.output ? path.resolve(options.output) : filePath;
    fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
    console.log(`   📁 Output: ${outPath}`);

    const newCompliance = (((totalRows - (totalViolations - fixedCount)) / totalRows) * 100).toFixed(1);
    console.log(`   Temporal compliance: ${newCompliance}% (was ${complianceRate}%)`);
  } else if (options.dryRun) {
    console.log(`\n   ℹ️  Dry run — no changes made. Use --fix to apply repairs.`);
  } else {
    console.log(`\n   ℹ️  Use --dry-run to preview or --fix to repair.`);
  }

  console.log(`────────────────────────────────────────`);
}


// ── CLI Wiring (add to apps/cli/src/index.ts) ────────────────────────
//
// In the comply subcommand section of index.ts, add:
//
//   .command('temporal <file>')
//   .description('Detect and fix temporal ordering violations in generated SQL')
//   .option('--dry-run', 'Report violations without fixing')
//   .option('--fix', 'Apply temporal fixes')
//   .option('--pack <path>', 'Read pack JSON for dependsOn metadata')
//   .option('--verbose', 'Show every fix applied')
//   .option('-o, --output <path>', 'Output path (default: overwrite input)')
//   .action((file: string, opts: any) => {
//     runTemporalCompliance({
//       file,
//       dryRun: opts.dryRun,
//       fix: opts.fix,
//       pack: opts.pack,
//       verbose: opts.verbose,
//       output: opts.output,
//     });
//   });
//
// Import at top of index.ts:
//   import { runTemporalCompliance } from './commands/temporal.js';
// ─────────────────────────────────────────────────────────────────────
