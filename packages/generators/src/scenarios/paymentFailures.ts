import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_RATES: Record<string, { failed: number; declined: number; error: number; timeout: number }> = {
  low: { failed: 0.05, declined: 0, error: 0, timeout: 0 },
  medium: { failed: 0.10, declined: 0.05, error: 0, timeout: 0 },
  high: { failed: 0.15, declined: 0.08, error: 0.04, timeout: 0.03 },
};

const TARGET_PATTERNS = ['*payment*', '*charge*', '*invoice*'];

export const paymentFailuresScenario: ScenarioDefinition = {
  name: 'payment-failures',
  description: 'Inject payment failure patterns',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const rates = INTENSITY_RATES[config.intensity] ?? INTENSITY_RATES.medium;
    const totalFailureRate = rates.failed + rates.declined + rates.error + rates.timeout;

    for (const [tableName, table] of dataset.tables) {
      if (!matchesAnyPattern(tableName, TARGET_PATTERNS)) continue;

      // Find status column
      const hasStatus = table.columns.includes('status');
      if (!hasStatus) continue;

      for (const row of table.rows) {
        const roll = random.next();
        if (roll < totalFailureRate) {
          // Determine failure type
          let cumulative = 0;
          cumulative += rates.failed;
          if (roll < cumulative) {
            row['status'] = 'failed';
          } else {
            cumulative += rates.declined;
            if (roll < cumulative) {
              row['status'] = 'declined';
            } else {
              cumulative += rates.error;
              if (roll < cumulative) {
                row['status'] = 'error';
              } else {
                row['status'] = 'timeout';
              }
            }
          }

          // Zero out amount for some failed payments
          if (table.columns.includes('amount') && random.next() < 0.3) {
            row['amount'] = 0;
          }
        }
      }
    }

    return dataset;
  },
};
