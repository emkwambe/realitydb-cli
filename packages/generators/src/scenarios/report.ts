import type { ScenarioResult } from '@databox/shared';
import type { ScenarioConflict } from './compose.js';

/**
 * Detailed scenario injection report.
 */
export interface ScenarioReport {
  totalScenariosApplied: number;
  totalRowsAffected: number;
  scenarios: ScenarioReportEntry[];
  conflicts: ScenarioConflict[];
  scheduled: boolean;
}

export interface ScenarioReportEntry {
  name: string;
  rowsAffected: number;
  modifications: string[];
  tablesTargeted: string[];
}

/**
 * Builds a detailed report from scenario results.
 */
export function buildScenarioReport(
  results: ScenarioResult[],
  conflicts?: ScenarioConflict[],
  scheduled?: boolean,
): ScenarioReport {
  const totalRowsAffected = results.reduce((sum, r) => sum + r.rowsAffected, 0);

  const entries: ScenarioReportEntry[] = results.map((r) => ({
    name: r.scenarioName,
    rowsAffected: r.rowsAffected,
    modifications: r.modifications,
    tablesTargeted: extractTablesFromModifications(r.modifications),
  }));

  return {
    totalScenariosApplied: results.length,
    totalRowsAffected,
    scenarios: entries,
    conflicts: conflicts ?? [],
    scheduled: scheduled ?? false,
  };
}

/**
 * Formats the scenario report for interactive CLI output.
 */
export function formatScenarioReport(report: ScenarioReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('Scenario Report');
  lines.push('═══════════════════════════════════════');

  if (report.scheduled) {
    lines.push('Mode: Timeline-scheduled');
  } else {
    lines.push('Mode: Sequential composition');
  }

  lines.push(`Scenarios applied: ${report.totalScenariosApplied}`);
  lines.push(`Total rows affected: ${report.totalRowsAffected}`);
  lines.push('');

  for (const entry of report.scenarios) {
    lines.push(`  ${entry.name}`);
    lines.push(`    Rows affected: ${entry.rowsAffected}`);
    for (const mod of entry.modifications) {
      lines.push(`    ${mod}`);
    }
  }

  if (report.conflicts.length > 0) {
    lines.push('');
    lines.push('Conflicts detected:');
    for (const c of report.conflicts) {
      lines.push(`  ${c.scenario1} + ${c.scenario2} → ${c.table}: ${c.reason}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Formats the scenario report for CI JSON output.
 */
export function formatScenarioReportCI(report: ScenarioReport): Record<string, unknown> {
  return {
    totalScenariosApplied: report.totalScenariosApplied,
    totalRowsAffected: report.totalRowsAffected,
    scheduled: report.scheduled,
    scenarios: report.scenarios.map((s) => ({
      name: s.name,
      rowsAffected: s.rowsAffected,
      modifications: s.modifications,
    })),
    conflicts: report.conflicts.map((c) => ({
      scenario1: c.scenario1,
      scenario2: c.scenario2,
      table: c.table,
      reason: c.reason,
    })),
  };
}

function extractTablesFromModifications(modifications: string[]): string[] {
  // Modifications contain descriptive strings; extract table references if present
  const tables: string[] = [];
  for (const mod of modifications) {
    const match = mod.match(/table "([^"]+)"/);
    if (match) {
      tables.push(match[1]);
    }
  }
  return tables;
}
