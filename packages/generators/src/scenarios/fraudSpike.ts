import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_RATES: Record<string, number> = {
  low: 0.02,
  medium: 0.05,
  high: 0.10,
};

const TARGET_PATTERNS = ['*payment*', '*order*', '*transaction*'];

export const fraudSpikeScenario: ScenarioDefinition = {
  name: 'fraud-spike',
  description: 'Inject suspicious transaction patterns',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const suspiciousRate = INTENSITY_RATES[config.intensity] ?? INTENSITY_RATES.medium;

    for (const [tableName, table] of dataset.tables) {
      if (!matchesAnyPattern(tableName, TARGET_PATTERNS)) continue;

      const hasAmount = table.columns.includes('amount');
      const hasTimestamp = table.columns.some(
        (c) => c.includes('created_at') || c.includes('paid_at') || c.includes('timestamp'),
      );

      // Find the timestamp column name
      const timestampCol = table.columns.find(
        (c) => c.includes('created_at') || c.includes('paid_at') || c.includes('timestamp'),
      );

      for (let i = 0; i < table.rows.length; i++) {
        if (random.next() >= suspiciousRate) continue;

        const row = table.rows[i];

        // Create rapid duplicate pattern: copy amount from a nearby row
        // and set timestamp very close to it
        if (hasAmount && i > 0) {
          const sourceRow = table.rows[i - 1];
          row['amount'] = sourceRow['amount']; // Identical amount (suspicious)
        }

        if (hasTimestamp && timestampCol && i > 0) {
          const prevRow = table.rows[i - 1];
          const prevTimestamp = prevRow[timestampCol];
          if (typeof prevTimestamp === 'string') {
            // Set timestamp within seconds of previous row
            const prevDate = new Date(prevTimestamp);
            const offsetSeconds = random.nextInt(1, 30);
            const closeDate = new Date(prevDate.getTime() + offsetSeconds * 1000);
            row[timestampCol] = closeDate.toISOString();
          }
        }

        // Mark status as suspicious if status column exists
        if (table.columns.includes('status') && random.next() < 0.5) {
          row['status'] = 'fraudulent';
        }
      }
    }

    return dataset;
  },
};
