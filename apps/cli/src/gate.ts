import { loadLicense } from './auth/license';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface GateResult {
  allowed: boolean;
  reason?: string;
  tier: 'free' | 'core' | 'compliance' | 'enterprise';
}

// ============================================================
// TIER DEFINITIONS
// ============================================================

// Free: scan, run, split, explain, validate, benchmark, convert, init, pack, menu
// Core: All Free + seed, reset, mask, simulate, anomaly, tune, add, ci, audit, capture, load, analyze
// Compliance: All Core + compliance report, analyze privacy, audit:export --sign, mask report
// Enterprise: All Compliance + unlimited everything + certification

const CORE_COMMANDS = new Set([
  'mask', 'capture', 'audit', 'simulate', 'seed', 'reset', 'analyze', 'load',
  'anomaly', 'tune', 'add', 'ci',
]);

const COMPLIANCE_COMMANDS = new Set([
  'compliance', // future: compliance report, compliance assess
  // audit:export with --sign is compliance tier
  // analyze privacy is compliance tier
]);

// Row limits per tier per month
const TIER_LIMITS: Record<string, number> = {
  free: 50_000,
  core: 500_000,
  compliance: 2_000_000,
  enterprise: Infinity,
};

// Compliance feature limits per month
const COMPLIANCE_FEATURE_LIMITS: Record<string, { reports: number; privacyAnalyses: number; signedExports: number }> = {
  free: { reports: 0, privacyAnalyses: 0, signedExports: 0 },
  core: { reports: 0, privacyAnalyses: 0, signedExports: 3 },
  compliance: { reports: 10, privacyAnalyses: 5, signedExports: 50 },
  enterprise: { reports: Infinity, privacyAnalyses: Infinity, signedExports: Infinity },
};

// ============================================================
// USAGE TRACKING
// ============================================================

const REALITYDB_DIR = path.join(os.homedir(), '.realitydb');
const USAGE_FILE = path.join(REALITYDB_DIR, 'usage.json');
const CLIENT_ID_FILE = path.join(REALITYDB_DIR, 'client_id');

function ensureDir(): void {
  if (!fs.existsSync(REALITYDB_DIR)) fs.mkdirSync(REALITYDB_DIR, { recursive: true });
}

function getClientId(): string {
  ensureDir();
  if (fs.existsSync(CLIENT_ID_FILE)) return fs.readFileSync(CLIENT_ID_FILE, 'utf-8').trim();
  const id = crypto.randomUUID();
  fs.writeFileSync(CLIENT_ID_FILE, id, 'utf-8');
  return id;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface UsageData {
  clientId: string;
  months: Record<string, number>;
  complianceUsage: Record<string, { reports: number; privacyAnalyses: number; signedExports: number }>;
  operations: Array<{
    timestamp: string;
    command: string;
    pack?: string;
    rows?: number;
    format?: string;
    duration?: number;
  }>;
}

function loadUsage(): UsageData {
  ensureDir();
  if (fs.existsSync(USAGE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
      // Ensure new fields exist (backward compat)
      if (!data.complianceUsage) data.complianceUsage = {};
      if (!data.operations) data.operations = [];
      return data;
    } catch {}
  }
  return { clientId: getClientId(), months: {}, complianceUsage: {}, operations: [] };
}

function saveUsage(data: UsageData): void {
  ensureDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getRowsUsedThisMonth(): number {
  return loadUsage().months[getCurrentMonth()] || 0;
}

function getComplianceUsage(): { reports: number; privacyAnalyses: number; signedExports: number } {
  const data = loadUsage();
  const month = getCurrentMonth();
  return data.complianceUsage[month] || { reports: 0, privacyAnalyses: 0, signedExports: 0 };
}

// ============================================================
// PUBLIC API
// ============================================================

export function recordRowUsage(rows: number): void {
  const data = loadUsage();
  const month = getCurrentMonth();
  data.months[month] = (data.months[month] || 0) + rows;
  // Keep only last 3 months
  const months = Object.keys(data.months).sort();
  while (months.length > 3) { delete data.months[months.shift()!]; }
  saveUsage(data);
}

export function recordOperation(op: { command: string; pack?: string; rows?: number; format?: string; duration?: number }): void {
  const data = loadUsage();
  data.operations.push({
    timestamp: new Date().toISOString(),
    ...op,
  });
  // Keep last 500 operations
  if (data.operations.length > 500) {
    data.operations = data.operations.slice(-500);
  }
  saveUsage(data);
}

export function recordComplianceUsage(type: 'reports' | 'privacyAnalyses' | 'signedExports'): void {
  const data = loadUsage();
  const month = getCurrentMonth();
  if (!data.complianceUsage[month]) {
    data.complianceUsage[month] = { reports: 0, privacyAnalyses: 0, signedExports: 0 };
  }
  data.complianceUsage[month][type]++;
  saveUsage(data);
}

export function getTier(): string {
  const license = loadLicense();
  return license?.tier?.toLowerCase() || 'free';
}

export function gateCommand(command: string): GateResult {
  const tier = getTier();

  // Enterprise: everything allowed
  if (tier === 'enterprise') return { allowed: true, tier: 'enterprise' };

  // Compliance: everything except enterprise-only (none yet)
  if (tier === 'compliance') return { allowed: true, tier: 'compliance' };

  // Core: core commands allowed, compliance commands blocked
  if (tier === 'core') {
    if (COMPLIANCE_COMMANDS.has(command)) {
      return { allowed: false, tier: 'core', reason: `"${command}" requires a Compliance Suite plan ($199/mo).` };
    }
    return { allowed: true, tier: 'core' };
  }

  // Free: only free commands
  if (CORE_COMMANDS.has(command)) {
    return { allowed: false, tier: 'free', reason: `"${command}" requires a Core plan ($49/mo).` };
  }
  if (COMPLIANCE_COMMANDS.has(command)) {
    return { allowed: false, tier: 'free', reason: `"${command}" requires a Compliance Suite plan ($199/mo).` };
  }
  return { allowed: true, tier: 'free' };
}

export function gateRows(rows: number): GateResult {
  const tier = getTier();
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const used = getRowsUsedThisMonth();
  const wouldUse = used + rows;

  if (tier === 'free' && wouldUse > limit) {
    return {
      allowed: false,
      tier: 'free',
      reason: `Free tier: ${limit.toLocaleString()} rows/month. Used: ${used.toLocaleString()}. Requested: ${rows.toLocaleString()}.`,
    };
  }

  if (tier === 'core' && wouldUse > limit) {
    // Soft warning — paying customer
    console.log(`\n   \u26A0\uFE0F  Monthly usage: ${wouldUse.toLocaleString()} / ${limit.toLocaleString()} rows. Overage may apply.\n`);
  }

  if (tier === 'compliance' && wouldUse > limit) {
    console.log(`\n   \u26A0\uFE0F  Monthly usage: ${wouldUse.toLocaleString()} / ${limit.toLocaleString()} rows. Overage may apply.\n`);
  }

  return { allowed: true, tier: tier as any };
}

export function gateComplianceFeature(type: 'reports' | 'privacyAnalyses' | 'signedExports'): GateResult {
  const tier = getTier();
  const limits = COMPLIANCE_FEATURE_LIMITS[tier] || COMPLIANCE_FEATURE_LIMITS.free;
  const usage = getComplianceUsage();
  const used = usage[type];
  const limit = limits[type];

  if (used >= limit) {
    const featureNames = { reports: 'compliance reports', privacyAnalyses: 'privacy analyses', signedExports: 'signed audit exports' };
    if (limit === 0) {
      return {
        allowed: false,
        tier: tier as any,
        reason: `${featureNames[type]} require ${tier === 'free' ? 'a Compliance Suite plan ($199/mo)' : tier === 'core' ? 'a Compliance Suite plan ($199/mo)' : 'an Enterprise plan'}.`,
      };
    }
    return {
      allowed: false,
      tier: tier as any,
      reason: `${featureNames[type]} limit reached: ${used}/${limit} this month. Upgrade for more.`,
    };
  }

  return { allowed: true, tier: tier as any };
}

export function gateLifecycleRules(): boolean {
  const tier = getTier();
  return tier === 'free';
}

// ============================================================
// UPGRADE PROMPTS
// ============================================================

export function printUpgradePrompt(reason: string): void {
  const tier = getTier();
  console.error(`\n\u{1F512} ${reason}`);
  console.error(`${'\u2500'.repeat(40)}`);

  if (tier === 'free') {
    console.error(`   Core plan: $49/month`);
    console.error(`   Includes: seed, mask, simulate, anomaly,`);
    console.error(`   tune, add, ci, audit, capture, load`);
    console.error(`   500,000 rows/month`);
  } else if (tier === 'core') {
    console.error(`   Compliance Suite: $199/month`);
    console.error(`   Includes: compliance reports (10/mo),`);
    console.error(`   privacy analysis (5/mo), signed audit exports,`);
    console.error(`   framework assessment, 2M rows/month`);
  } else {
    console.error(`   Enterprise: custom pricing`);
    console.error(`   Includes: unlimited reports, certification,`);
    console.error(`   dedicated support, private deployment`);
  }

  console.error(`${'\u2500'.repeat(40)}`);
  console.error(`   Upgrade: realitydb upgrade`);
  console.error(`   Pricing: https://realitydb.dev/pricing\n`);
}

export function printComplianceLimitPrompt(type: string): void {
  const tier = getTier();
  const usage = getComplianceUsage();
  const limits = COMPLIANCE_FEATURE_LIMITS[tier] || COMPLIANCE_FEATURE_LIMITS.free;

  console.error(`\n\u{1F4CA} Compliance Usage This Month`);
  console.error(`${'\u2500'.repeat(40)}`);
  console.error(`   Reports:          ${usage.reports}/${limits.reports === Infinity ? '\u221E' : limits.reports}`);
  console.error(`   Privacy analyses: ${usage.privacyAnalyses}/${limits.privacyAnalyses === Infinity ? '\u221E' : limits.privacyAnalyses}`);
  console.error(`   Signed exports:   ${usage.signedExports}/${limits.signedExports === Infinity ? '\u221E' : limits.signedExports}`);
  console.error(`${'\u2500'.repeat(40)}\n`);
}

// ============================================================
// LIFECYCLE RULES (existing — unchanged)
// ============================================================

export function stripLifecycleRules(tables: any[]): number {
  let stripped = 0;
  for (const table of tables) {
    const columns = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
    for (const col of columns) {
      if ((col as any).options?.lifecycleRules?.length > 0) {
        stripped += (col as any).options.lifecycleRules.length;
        (col as any).options.lifecycleRules = [];
      }
    }
  }
  return stripped;
}

export function printLifecycleWarning(strippedCount: number): void {
  if (strippedCount > 0) {
    console.log(`\n   \u26A0\uFE0F  ${strippedCount} lifecycle rule(s) skipped (Core feature)`);
    console.log(`   Cancelled orders may have shipped_at values.`);
    console.log(`   Upgrade to Core for state-machine enforcement.`);
    console.log(`   Run: realitydb upgrade\n`);
  }
}
