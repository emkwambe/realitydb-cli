import { loadLicense } from '../auth/license';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function enhancedStatusCommand(): Promise<void> {
  const license = loadLicense();
  const tier = license?.tier?.toLowerCase() || 'free';
  const email = license?.email || 'anonymous';

  const REALITYDB_DIR = path.join(os.homedir(), '.realitydb');
  const USAGE_FILE = path.join(REALITYDB_DIR, 'usage.json');

  let usage: any = { months: {}, complianceUsage: {}, operations: [] };
  if (fs.existsSync(USAGE_FILE)) {
    try { usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8')); } catch {}
  }
  if (!usage.operations) usage.operations = [];
  if (!usage.complianceUsage) usage.complianceUsage = {};

  const now = new Date();
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const rowsThisMonth = usage.months[currentMonth] || 0;

  // Tier limits
  const limits: Record<string, number> = { free: 50000, core: 500000, compliance: 2000000, enterprise: Infinity };
  const limit = limits[tier] || limits.free;

  // Filter operations to current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthOps = usage.operations.filter((op: any) => op.timestamp >= monthStart);

  // Command frequency
  const cmdCounts: Record<string, number> = {};
  for (const op of monthOps) {
    cmdCounts[op.command] = (cmdCounts[op.command] || 0) + 1;
  }
  const topCommands = Object.entries(cmdCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cmd, count]) => cmd + ' (' + count + ')')
    .join(', ');

  // Format frequency
  const formatCounts: Record<string, number> = {};
  for (const op of monthOps) {
    if (op.format) formatCounts[op.format] = (formatCounts[op.format] || 0) + 1;
  }
  const totalFormats = Object.values(formatCounts).reduce((a: number, b: number) => a + b, 0);
  const formatBreakdown = Object.entries(formatCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([fmt, count]) => fmt.toUpperCase() + ' (' + Math.round((count as number / totalFormats) * 100) + '%)')
    .join(', ');

  // Template frequency
  const packCounts: Record<string, number> = {};
  for (const op of monthOps) {
    if (op.pack) {
      const name = path.basename(op.pack).replace('.json', '');
      packCounts[name] = (packCounts[name] || 0) + 1;
    }
  }
  const topPacks = Object.entries(packCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => name + ' (' + count + ')')
    .join(', ');

  // Avg speed
  const runOps = monthOps.filter((op: any) => op.command === 'run' && op.rows && op.duration);
  const avgSpeed = runOps.length > 0
    ? Math.round(runOps.reduce((s: number, op: any) => s + (op.rows / (op.duration / 1000)), 0) / runOps.length)
    : 0;
  const avgDuration = runOps.length > 0
    ? (runOps.reduce((s: number, op: any) => s + op.duration, 0) / runOps.length / 1000).toFixed(2)
    : '0';

  // Compliance usage
  const compUsage = usage.complianceUsage[currentMonth] || { reports: 0, privacyAnalyses: 0, signedExports: 0 };
  const compLimits: Record<string, any> = {
    free: { reports: 0, privacyAnalyses: 0, signedExports: 0 },
    core: { reports: 0, privacyAnalyses: 0, signedExports: 3 },
    compliance: { reports: 10, privacyAnalyses: 5, signedExports: 50 },
    enterprise: { reports: '\u221E', privacyAnalyses: '\u221E', signedExports: '\u221E' },
  };
  const cl = compLimits[tier] || compLimits.free;

  // Usage bar
  const usagePct = limit === Infinity ? 0 : Math.min(100, Math.round((rowsThisMonth / limit) * 100));
  const barFull = Math.round(usagePct / 5);
  const barEmpty = 20 - barFull;
  const usageBar = '\u2588'.repeat(barFull) + '\u2591'.repeat(barEmpty);

  // Display
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const tierPrice: Record<string, string> = { free: 'Free', core: '$49/mo', compliance: '$199/mo', enterprise: 'Custom' };

  console.log('');
  console.log('   \u{1F464} ' + email);
  console.log('   Plan: ' + tierLabel + ' (' + (tierPrice[tier] || 'Free') + ')');
  console.log('');
  console.log('   \u{1F4CA} This Month (' + currentMonth + ')');
  console.log('   ' + '\u2500'.repeat(36));
  console.log('   Rows generated:  ' + rowsThisMonth.toLocaleString() + ' / ' + (limit === Infinity ? '\u221E' : limit.toLocaleString()));
  console.log('   Usage:           [' + usageBar + '] ' + usagePct + '%');
  console.log('   Commands run:    ' + monthOps.length);

  if (topCommands) console.log('   Top commands:    ' + topCommands);
  if (topPacks) console.log('   Templates used:  ' + topPacks);
  if (formatBreakdown) console.log('   Formats:         ' + formatBreakdown);
  if (avgSpeed > 0) console.log('   Avg speed:       ' + avgSpeed.toLocaleString() + ' rows/sec');
  if (runOps.length > 0) console.log('   Avg duration:    ' + avgDuration + 's');

  if (tier !== 'free') {
    console.log('');
    console.log('   \u{1F512} Compliance Usage');
    console.log('   ' + '\u2500'.repeat(36));
    console.log('   Reports:          ' + compUsage.reports + ' / ' + cl.reports);
    console.log('   Privacy analyses: ' + compUsage.privacyAnalyses + ' / ' + cl.privacyAnalyses);
    console.log('   Signed exports:   ' + compUsage.signedExports + ' / ' + cl.signedExports);
  }

  // All-time stats
  const allTimeRows = Object.values(usage.months as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  const allTimeOps = usage.operations.length;

  console.log('');
  console.log('   \u{1F4C8} All Time');
  console.log('   ' + '\u2500'.repeat(36));
  console.log('   Total rows:      ' + allTimeRows.toLocaleString());
  console.log('   Total operations: ' + allTimeOps);
  console.log('');
}
