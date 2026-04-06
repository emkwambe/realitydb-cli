import { loadLicense } from './auth/license';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface GateResult {
  allowed: boolean;
  reason?: string;
  tier: 'free' | 'core' | 'team' | 'enterprise';
}

const CORE_COMMANDS = new Set([
  'mask', 'capture', 'audit', 'simulate', 'seed', 'reset', 'analyze', 'load',
]);

const FREE_MONTHLY_LIMIT = 50000;
const CORE_MONTHLY_LIMIT = 500000;

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

interface UsageData { clientId: string; months: Record<string, number>; }

function loadUsage(): UsageData {
  ensureDir();
  if (fs.existsSync(USAGE_FILE)) {
    try { return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')); } catch {}
  }
  return { clientId: getClientId(), months: {} };
}

function saveUsage(data: UsageData): void {
  ensureDir();
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getRowsUsedThisMonth(): number {
  return loadUsage().months[getCurrentMonth()] || 0;
}

export function recordRowUsage(rows: number): void {
  const data = loadUsage();
  const month = getCurrentMonth();
  data.months[month] = (data.months[month] || 0) + rows;
  const months = Object.keys(data.months).sort();
  while (months.length > 3) { delete data.months[months.shift()!]; }
  saveUsage(data);
}

export function gateCommand(command: string): GateResult {
  const license = loadLicense();
  const tier = license?.tier?.toLowerCase() || 'free';
  if (tier !== 'free') return { allowed: true, tier: tier as any };
  if (CORE_COMMANDS.has(command)) return { allowed: false, tier: 'free', reason: `"${command}" requires a Core plan ($49/mo).` };
  return { allowed: true, tier: 'free' };
}

export function gateRows(rows: number): GateResult {
  const license = loadLicense();
  const tier = license?.tier?.toLowerCase() || 'free';

  if (tier === 'free') {
    const used = getRowsUsedThisMonth();
    const wouldUse = used + rows;
    if (wouldUse > FREE_MONTHLY_LIMIT) {
      return { allowed: false, tier: 'free', reason: `Free tier: 50,000 rows/month. Used this month: ${used.toLocaleString()}. Requested: ${rows.toLocaleString()}. Would total: ${wouldUse.toLocaleString()}.` };
    }
  }

  if (tier === 'core') {
    const used = getRowsUsedThisMonth();
    const wouldUse = used + rows;
    if (wouldUse > CORE_MONTHLY_LIMIT) {
      return { allowed: false, tier: 'core', reason: `Core tier: 500,000 rows/month. Used: ${used.toLocaleString()}. Overage available at $20/1M rows.` };
    }
  }

  return { allowed: true, tier: tier as any };
}

export function gateLifecycleRules(): boolean {
  const license = loadLicense();
  return (license?.tier?.toLowerCase() || 'free') === 'free';
}

export function printUpgradePrompt(reason: string): void {
  console.error(`\n\u{1F512} ${reason}`);
  console.error(`${'\u2500'.repeat(40)}`);
  console.error(`   Core plan: $49/month`);
  console.error(`   Includes: lifecycle rules, mask, simulate,`);
  console.error(`   capture, seed, analyze, 500K rows/month`);
  console.error(`${'\u2500'.repeat(40)}`);
  console.error(`   Upgrade now: realitydb upgrade`);
  console.error(`   Or: https://realitydb.dev/pricing\n`);
}

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
