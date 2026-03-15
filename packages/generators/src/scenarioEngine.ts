import type { ScenarioConfig, ScenarioResult, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from './types.js';
import { paymentFailuresScenario } from './scenarios/paymentFailures.js';
import { churnSpikeScenario } from './scenarios/churnSpike.js';
import { fraudSpikeScenario } from './scenarios/fraudSpike.js';
import { dataQualityScenario } from './scenarios/dataQuality.js';
import { seasonalTrafficScenario } from './scenarios/seasonalTraffic.js';
import { dataMigrationScenario } from './scenarios/dataMigration.js';
import { systemOutageScenario } from './scenarios/systemOutage.js';

/**
 * Function that applies a scenario to a generated dataset.
 */
export type ScenarioApplyFn = (
  dataset: GeneratedDataset,
  config: ScenarioConfig,
  random: SeededRandom,
) => GeneratedDataset;

/**
 * Full definition of a scenario including its apply function.
 */
export interface ScenarioDefinition {
  name: string;
  description: string;
  version: string;
  supportedIntensities: ('low' | 'medium' | 'high')[];
  targetTablePatterns: string[];
  apply: ScenarioApplyFn;
}

/**
 * Registry for scenario definitions.
 */
export class ScenarioRegistry {
  private scenarios = new Map<string, ScenarioDefinition>();

  register(scenario: ScenarioDefinition): void {
    this.scenarios.set(scenario.name, scenario);
  }

  get(name: string): ScenarioDefinition | undefined {
    return this.scenarios.get(name);
  }

  list(): ScenarioDefinition[] {
    return [...this.scenarios.values()];
  }
}

/**
 * Creates an empty scenario registry.
 */
export function createScenarioRegistry(): ScenarioRegistry {
  return new ScenarioRegistry();
}

/**
 * Creates a scenario registry pre-loaded with all built-in scenarios.
 */
export function getDefaultScenarioRegistry(): ScenarioRegistry {
  const registry = new ScenarioRegistry();
  registry.register(paymentFailuresScenario);
  registry.register(churnSpikeScenario);
  registry.register(fraudSpikeScenario);
  registry.register(dataQualityScenario);
  registry.register(seasonalTrafficScenario);
  registry.register(dataMigrationScenario);
  registry.register(systemOutageScenario);
  return registry;
}

/**
 * Applies multiple scenarios sequentially to a dataset.
 * Each scenario modifies the dataset in place (overlay, not replace).
 * Returns the modified dataset and a summary of changes per scenario.
 */
export function applyScenarios(
  dataset: GeneratedDataset,
  scenarios: ScenarioConfig[],
  random: SeededRandom,
): { dataset: GeneratedDataset; results: ScenarioResult[] } {
  const registry = getDefaultScenarioRegistry();
  const results: ScenarioResult[] = [];

  for (const config of scenarios) {
    const definition = registry.get(config.name);
    if (!definition) {
      console.warn(
        `Scenario "${config.name}" not found. Available: ${registry.list().map((s) => s.name).join(', ')}`,
      );
      continue;
    }

    const beforeTotalRows = countTotalValues(dataset);
    dataset = definition.apply(dataset, config, random);
    const afterTotalRows = countTotalValues(dataset);

    // The scenario apply function should return its own result info,
    // but we compute a basic result here as fallback
    results.push({
      scenarioName: config.name,
      rowsAffected: Math.abs(afterTotalRows - beforeTotalRows) || estimateAffectedRows(dataset, definition),
      modifications: [`Applied ${config.name} at ${config.intensity} intensity`],
    });
  }

  return { dataset, results };
}

function countTotalValues(dataset: GeneratedDataset): number {
  let count = 0;
  for (const table of dataset.tables.values()) {
    for (const row of table.rows) {
      count += Object.keys(row).length;
    }
  }
  return count;
}

function estimateAffectedRows(dataset: GeneratedDataset, definition: ScenarioDefinition): number {
  let total = 0;
  for (const table of dataset.tables.values()) {
    if (matchesAnyPattern(table.tableName, definition.targetTablePatterns)) {
      total += table.rowCount;
    }
  }
  return total;
}

/**
 * Checks if a table name matches any of the target patterns.
 * Patterns use simple substring matching (e.g., "*payment*" matches "payments").
 */
export function matchesAnyPattern(tableName: string, patterns: string[]): boolean {
  const lower = tableName.toLowerCase();
  return patterns.some((pattern) => {
    const cleaned = pattern.replace(/\*/g, '').toLowerCase();
    return lower.includes(cleaned);
  });
}
