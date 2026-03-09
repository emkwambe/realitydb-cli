import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_RATES: Record<string, number> = {
  low: 0.10,
  medium: 0.25,
  high: 0.40,
};

const TARGET_PATTERNS = ['*subscription*'];

export const churnSpikeScenario: ScenarioDefinition = {
  name: 'churn-spike',
  description: 'Inject subscription cancellation surge',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const cancellationRate = INTENSITY_RATES[config.intensity] ?? INTENSITY_RATES.medium;

    for (const [tableName, table] of dataset.tables) {
      if (!matchesAnyPattern(tableName, TARGET_PATTERNS)) continue;

      const hasStatus = table.columns.includes('status');
      if (!hasStatus) continue;

      // Ensure canceled_at column exists in column list
      if (!table.columns.includes('canceled_at')) {
        table.columns.push('canceled_at');
      }

      for (const row of table.rows) {
        // Only cancel non-canceled subscriptions
        if (row['status'] === 'canceled') continue;

        if (random.next() < cancellationRate) {
          row['status'] = 'canceled';

          // Generate a canceled_at timestamp
          // Use started_at or created_at as base, add some days
          const baseTimestamp = row['started_at'] ?? row['created_at'];
          if (typeof baseTimestamp === 'string') {
            const baseDate = new Date(baseTimestamp);
            const daysAfter = random.nextInt(1, 90);
            const cancelDate = new Date(baseDate.getTime() + daysAfter * 86400000);
            row['canceled_at'] = cancelDate.toISOString();
          } else {
            // Fallback: use a reasonable date
            row['canceled_at'] = new Date().toISOString();
          }
        }
      }
    }

    return dataset;
  },
};
