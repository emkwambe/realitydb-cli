import type { ScenarioConfig, ScenarioResult, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { getDefaultScenarioRegistry, matchesAnyPattern } from '../scenarioEngine.js';

/**
 * Result of composing multiple scenarios.
 */
export interface CompositionResult {
  dataset: GeneratedDataset;
  results: ScenarioResult[];
  conflicts: ScenarioConflict[];
}

/**
 * Detected conflict between two composed scenarios.
 */
export interface ScenarioConflict {
  scenario1: string;
  scenario2: string;
  table: string;
  reason: string;
}

/**
 * Composes multiple scenarios in sequence with conflict detection.
 * Scenarios are applied in the order provided. If two scenarios target
 * the same table, a conflict warning is recorded but both still apply.
 */
export function composeScenarios(
  dataset: GeneratedDataset,
  configs: ScenarioConfig[],
  random: SeededRandom,
  customScenarios?: ScenarioDefinition[],
): CompositionResult {
  const registry = getDefaultScenarioRegistry();

  // Register any custom scenarios
  if (customScenarios) {
    for (const cs of customScenarios) {
      registry.register(cs);
    }
  }

  const results: ScenarioResult[] = [];
  const conflicts: ScenarioConflict[] = [];

  // Detect conflicts: scenarios targeting overlapping tables
  const scenarioTableMap = new Map<string, Set<string>>();
  for (const config of configs) {
    const def = registry.get(config.name);
    if (!def) continue;

    const targetedTables = new Set<string>();
    for (const [tableName] of dataset.tables) {
      if (matchesAnyPattern(tableName, def.targetTablePatterns)) {
        targetedTables.add(tableName);
      }
    }
    scenarioTableMap.set(config.name, targetedTables);
  }

  // Check pairwise overlaps
  const configNames = configs.map((c) => c.name);
  for (let i = 0; i < configNames.length; i++) {
    for (let j = i + 1; j < configNames.length; j++) {
      const tables1 = scenarioTableMap.get(configNames[i]);
      const tables2 = scenarioTableMap.get(configNames[j]);
      if (!tables1 || !tables2) continue;

      for (const t of tables1) {
        if (tables2.has(t)) {
          conflicts.push({
            scenario1: configNames[i],
            scenario2: configNames[j],
            table: t,
            reason: `Both scenarios target table "${t}"`,
          });
        }
      }
    }
  }

  // Apply scenarios in order — deterministic with seed
  for (const config of configs) {
    const definition = registry.get(config.name);
    if (!definition) {
      console.warn(
        `Scenario "${config.name}" not found, skipping.`,
      );
      continue;
    }

    const beforeRows = countRows(dataset);
    dataset = definition.apply(dataset, config, random);
    const afterRows = countRows(dataset);

    results.push({
      scenarioName: config.name,
      rowsAffected: Math.abs(afterRows - beforeRows) || estimateAffected(dataset, definition),
      modifications: [`Applied ${config.name} at ${config.intensity} intensity`],
    });
  }

  return { dataset, results, conflicts };
}

function countRows(dataset: GeneratedDataset): number {
  let count = 0;
  for (const table of dataset.tables.values()) {
    count += table.rowCount;
  }
  return count;
}

function estimateAffected(dataset: GeneratedDataset, definition: ScenarioDefinition): number {
  let total = 0;
  for (const table of dataset.tables.values()) {
    if (matchesAnyPattern(table.tableName, definition.targetTablePatterns)) {
      total += table.rowCount;
    }
  }
  return total;
}
