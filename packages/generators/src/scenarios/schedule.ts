import type { ScenarioConfig, ScenarioResult, SeededRandom, TimelineConfig } from '@databox/shared';
import type { GeneratedDataset, GeneratedTable } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { getDefaultScenarioRegistry } from '../scenarioEngine.js';

/**
 * A scheduled scenario targets a specific period in a timeline.
 * Format: "scenario-name:month-6" or "scenario-name:month-3-5"
 */
export interface ScheduledScenario {
  config: ScenarioConfig;
  /** Start month (1-based) */
  startMonth: number;
  /** End month (1-based, inclusive). Same as startMonth for single-month targeting. */
  endMonth: number;
}

/**
 * Parses a schedule string like "fraud-spike:month-6,churn-spike:month-9"
 * into ScheduledScenario objects.
 *
 * Supported formats:
 *   scenario-name:month-N        → targets month N
 *   scenario-name:month-N-M      → targets months N through M
 */
export function parseScheduleString(
  schedule: string,
  intensity: 'low' | 'medium' | 'high',
): ScheduledScenario[] {
  return schedule
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((entry) => {
      const colonIdx = entry.indexOf(':');
      if (colonIdx === -1) {
        throw new Error(
          `Invalid schedule entry "${entry}". Expected format: "scenario-name:month-N" or "scenario-name:month-N-M"`,
        );
      }

      const name = entry.slice(0, colonIdx).trim();
      const timePart = entry.slice(colonIdx + 1).trim();

      const rangeMatch = timePart.match(/^month-(\d+)-(\d+)$/);
      const singleMatch = timePart.match(/^month-(\d+)$/);

      if (rangeMatch) {
        const startMonth = parseInt(rangeMatch[1], 10);
        const endMonth = parseInt(rangeMatch[2], 10);
        if (startMonth < 1 || endMonth < startMonth) {
          throw new Error(`Invalid month range in "${entry}": month-${startMonth}-${endMonth}`);
        }
        return {
          config: { name, intensity },
          startMonth,
          endMonth,
        };
      } else if (singleMatch) {
        const month = parseInt(singleMatch[1], 10);
        if (month < 1) {
          throw new Error(`Invalid month in "${entry}": month-${month}`);
        }
        return {
          config: { name, intensity },
          startMonth: month,
          endMonth: month,
        };
      } else {
        throw new Error(
          `Invalid time specifier "${timePart}" in "${entry}". Expected "month-N" or "month-N-M"`,
        );
      }
    });
}

/**
 * Applies scheduled scenarios to a dataset. Each scenario only affects rows
 * whose timestamp falls within the scheduled month range.
 *
 * The timeline's total months determines how timestamps map to months.
 */
export function applyScheduledScenarios(
  dataset: GeneratedDataset,
  scheduled: ScheduledScenario[],
  random: SeededRandom,
  totalMonths: number,
  customScenarios?: ScenarioDefinition[],
): { dataset: GeneratedDataset; results: ScenarioResult[] } {
  const registry = getDefaultScenarioRegistry();

  if (customScenarios) {
    for (const cs of customScenarios) {
      registry.register(cs);
    }
  }

  const results: ScenarioResult[] = [];

  for (const scheduled_item of scheduled) {
    const definition = registry.get(scheduled_item.config.name);
    if (!definition) {
      console.warn(`[databox] Scheduled scenario "${scheduled_item.config.name}" not found, skipping.`);
      continue;
    }

    // Extract a sub-dataset with only rows in the target time window
    const { subset, complementTables } = extractTimeWindow(
      dataset,
      scheduled_item.startMonth,
      scheduled_item.endMonth,
      totalMonths,
    );

    if (countRows(subset) === 0) {
      results.push({
        scenarioName: scheduled_item.config.name,
        rowsAffected: 0,
        modifications: [`Skipped ${scheduled_item.config.name}: no rows in month ${scheduled_item.startMonth}-${scheduled_item.endMonth}`],
      });
      continue;
    }

    // Apply the scenario to just the subset
    const beforeRows = countRows(subset);
    const modifiedSubset = definition.apply(subset, scheduled_item.config, random);
    const afterRows = countRows(modifiedSubset);

    // Merge modified subset back into the full dataset
    dataset = mergeDatasets(complementTables, modifiedSubset);

    results.push({
      scenarioName: scheduled_item.config.name,
      rowsAffected: Math.abs(afterRows - beforeRows) || beforeRows,
      modifications: [
        `Applied ${scheduled_item.config.name} at ${scheduled_item.config.intensity} intensity (month ${scheduled_item.startMonth}${scheduled_item.endMonth !== scheduled_item.startMonth ? `-${scheduled_item.endMonth}` : ''})`,
      ],
    });
  }

  return { dataset, results };
}

/**
 * Splits dataset into rows within the time window and rows outside it.
 */
function extractTimeWindow(
  dataset: GeneratedDataset,
  startMonth: number,
  endMonth: number,
  totalMonths: number,
): { subset: GeneratedDataset; complementTables: Map<string, { inside: Record<string, unknown>[]; outside: Record<string, unknown>[]; table: GeneratedTable }> } {
  type RowType = Record<string, unknown>;
  const subsetTables = new Map<string, GeneratedTable>();
  const complementTables = new Map<string, { inside: RowType[]; outside: RowType[]; table: GeneratedTable }>();

  for (const [tableName, table] of dataset.tables) {
    const timestampCol = table.columns.find(
      (c) => c.includes('created_at') || c.includes('timestamp') || c.includes('date'),
    );

    if (!timestampCol) {
      // No timestamp column: include all rows in subset (scenario can decide)
      subsetTables.set(tableName, { ...table, rows: [...table.rows] });
      complementTables.set(tableName, { inside: [...table.rows], outside: [], table });
      continue;
    }

    // Find the overall time range
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const row of table.rows) {
      const val = row[timestampCol];
      if (typeof val !== 'string') continue;
      const t = new Date(val).getTime();
      if (!isNaN(t)) {
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }
    }

    if (!isFinite(minTime) || !isFinite(maxTime)) {
      subsetTables.set(tableName, { ...table, rows: [...table.rows] });
      complementTables.set(tableName, { inside: [...table.rows], outside: [], table });
      continue;
    }

    const timeRange = maxTime - minTime;
    const msPerMonth = timeRange / totalMonths;

    // Calculate window boundaries
    const windowStart = minTime + (startMonth - 1) * msPerMonth;
    const windowEnd = minTime + endMonth * msPerMonth;

    const insideRows: RowType[] = [];
    const outsideRows: RowType[] = [];

    for (const row of table.rows) {
      const val = row[timestampCol];
      if (typeof val !== 'string') {
        outsideRows.push(row);
        continue;
      }
      const t = new Date(val).getTime();
      if (isNaN(t)) {
        outsideRows.push(row);
        continue;
      }

      if (t >= windowStart && t < windowEnd) {
        insideRows.push(row);
      } else {
        outsideRows.push(row);
      }
    }

    subsetTables.set(tableName, {
      tableName,
      columns: [...table.columns],
      rows: insideRows,
      rowCount: insideRows.length,
    });

    complementTables.set(tableName, { inside: insideRows, outside: outsideRows, table });
  }

  let totalRows = 0;
  for (const t of subsetTables.values()) totalRows += t.rowCount;

  return {
    subset: {
      tables: subsetTables,
      generatedAt: dataset.generatedAt,
      seed: dataset.seed,
      totalRows,
    },
    complementTables,
  };
}

/**
 * Merges modified subset rows back with the complement (outside) rows.
 */
function mergeDatasets(
  complementTables: Map<string, { inside: Record<string, unknown>[]; outside: Record<string, unknown>[]; table: GeneratedTable }>,
  modifiedSubset: GeneratedDataset,
): GeneratedDataset {
  const mergedTables = new Map<string, GeneratedTable>();
  let totalRows = 0;

  for (const [tableName, comp] of complementTables) {
    const modifiedTable = modifiedSubset.tables.get(tableName);
    const modifiedRows = modifiedTable ? modifiedTable.rows : comp.inside;
    const allRows = [...comp.outside, ...modifiedRows];

    mergedTables.set(tableName, {
      tableName,
      columns: [...comp.table.columns],
      rows: allRows,
      rowCount: allRows.length,
    });
    totalRows += allRows.length;
  }

  return {
    tables: mergedTables,
    generatedAt: modifiedSubset.generatedAt,
    seed: modifiedSubset.seed,
    totalRows,
  };
}

function countRows(dataset: GeneratedDataset): number {
  let count = 0;
  for (const t of dataset.tables.values()) count += t.rowCount;
  return count;
}
