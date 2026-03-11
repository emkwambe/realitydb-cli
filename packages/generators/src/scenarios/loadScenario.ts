import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

/**
 * JSON schema for custom scenario files.
 */
export interface CustomScenarioJSON {
  name: string;
  description: string;
  version?: string;
  targetTablePatterns: string[];
  supportedIntensities?: ('low' | 'medium' | 'high')[];
  rules: CustomScenarioRule[];
}

/**
 * A rule defines what modifications to apply.
 */
export interface CustomScenarioRule {
  /** Column to modify. Use "*" for any string column. */
  column: string;
  /** Action to perform. */
  action: 'set_null' | 'set_value' | 'inject_error' | 'duplicate_row';
  /** Value to set (for set_value action). */
  value?: unknown;
  /** Error values to choose from (for inject_error action). */
  errorValues?: unknown[];
  /** Rate at which to apply this rule (0-1). Defaults differ by intensity. */
  rates?: { low?: number; medium?: number; high?: number };
}

/**
 * Loads a custom scenario from a JSON file and returns a ScenarioDefinition.
 */
export function loadCustomScenario(filePath: string): ScenarioDefinition {
  const resolved = resolve(filePath);

  if (!existsSync(resolved)) {
    throw new Error(`Custom scenario file not found: ${resolved}`);
  }

  const ext = extname(resolved).toLowerCase();
  if (ext !== '.json') {
    throw new Error(`Custom scenario file must be .json, got "${ext}"`);
  }

  const raw = readFileSync(resolved, 'utf-8');
  let json: CustomScenarioJSON;

  try {
    json = JSON.parse(raw) as CustomScenarioJSON;
  } catch {
    throw new Error(`Failed to parse custom scenario JSON: ${resolved}`);
  }

  return validateAndBuild(json, resolved);
}

/**
 * Validates a custom scenario JSON object and builds a ScenarioDefinition.
 */
function validateAndBuild(json: CustomScenarioJSON, filePath: string): ScenarioDefinition {
  if (!json.name || typeof json.name !== 'string') {
    throw new Error(`Custom scenario in ${filePath} missing required "name" field`);
  }
  if (!json.description || typeof json.description !== 'string') {
    throw new Error(`Custom scenario in ${filePath} missing required "description" field`);
  }
  if (!Array.isArray(json.targetTablePatterns) || json.targetTablePatterns.length === 0) {
    throw new Error(`Custom scenario in ${filePath} missing required "targetTablePatterns" array`);
  }
  if (!Array.isArray(json.rules) || json.rules.length === 0) {
    throw new Error(`Custom scenario in ${filePath} must have at least one rule`);
  }

  const intensities = json.supportedIntensities ?? ['low', 'medium', 'high'];

  return {
    name: json.name,
    description: json.description,
    version: json.version ?? '1.0',
    supportedIntensities: intensities,
    targetTablePatterns: json.targetTablePatterns,

    apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
      for (const [tableName, table] of dataset.tables) {
        if (!matchesAnyPattern(tableName, json.targetTablePatterns)) continue;

        for (const rule of json.rules) {
          const rate = resolveRate(rule, config.intensity);

          for (const row of table.rows) {
            if (random.next() >= rate) continue;

            const targetColumns = rule.column === '*'
              ? table.columns.filter((c) => c !== 'id' && !c.endsWith('_id'))
              : [rule.column];

            for (const col of targetColumns) {
              if (!table.columns.includes(col) && rule.column !== '*') continue;

              switch (rule.action) {
                case 'set_null':
                  row[col] = null;
                  break;
                case 'set_value':
                  row[col] = rule.value ?? null;
                  break;
                case 'inject_error':
                  if (rule.errorValues && rule.errorValues.length > 0) {
                    const idx = random.nextInt(0, rule.errorValues.length - 1);
                    row[col] = rule.errorValues[idx];
                  }
                  break;
                case 'duplicate_row':
                  // Handled below at table level
                  break;
              }
            }

            // Handle duplicate_row at row level
            if (rule.action === 'duplicate_row') {
              table.rows.push({ ...row });
              table.rowCount++;
            }
          }
        }
      }

      // Recalculate total
      let totalRows = 0;
      for (const t of dataset.tables.values()) totalRows += t.rowCount;
      dataset.totalRows = totalRows;

      return dataset;
    },
  };
}

function resolveRate(rule: CustomScenarioRule, intensity: string): number {
  const defaults: Record<string, number> = { low: 0.02, medium: 0.05, high: 0.10 };
  if (rule.rates) {
    return (rule.rates as Record<string, number>)[intensity] ?? defaults[intensity] ?? 0.05;
  }
  return defaults[intensity] ?? 0.05;
}

/**
 * Scaffolds a custom scenario JSON template.
 */
export function scaffoldCustomScenario(name: string): CustomScenarioJSON {
  return {
    name,
    description: `Custom scenario: ${name}`,
    version: '1.0',
    targetTablePatterns: ['*'],
    supportedIntensities: ['low', 'medium', 'high'],
    rules: [
      {
        column: 'status',
        action: 'set_value',
        value: 'error',
        rates: { low: 0.02, medium: 0.05, high: 0.10 },
      },
      {
        column: '*',
        action: 'set_null',
        rates: { low: 0.01, medium: 0.03, high: 0.05 },
      },
    ],
  };
}
