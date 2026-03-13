import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_CONFIG: Record<string, { gapHours: number; burstMultiplier: number; errorRate: number }> = {
  low: { gapHours: 2, burstMultiplier: 1.5, errorRate: 0.05 },
  medium: { gapHours: 8, burstMultiplier: 2.5, errorRate: 0.15 },
  high: { gapHours: 24, burstMultiplier: 4.0, errorRate: 0.30 },
};

const TARGET_PATTERNS = ['*'];

export const systemOutageScenario: ScenarioDefinition = {
  name: 'system-outage',
  description: 'Simulate system outage: data gap followed by recovery burst',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const cfg = INTENSITY_CONFIG[config.intensity] ?? INTENSITY_CONFIG.medium;

    for (const [_tableName, table] of dataset.tables) {
      const timestampCol = table.columns.find(
        (c) => c.includes('created_at') || c.includes('timestamp') || c.includes('date'),
      );

      if (!timestampCol) continue;

      // Find the time range of this table
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

      if (!isFinite(minTime) || !isFinite(maxTime)) continue;

      const timeRange = maxTime - minTime;
      if (timeRange <= 0) continue;

      // Place outage somewhere in the middle 60% of the time range
      const outageStart = minTime + timeRange * (0.2 + random.next() * 0.4);
      const outageEnd = outageStart + cfg.gapHours * 3600 * 1000;
      const burstEnd = outageEnd + cfg.gapHours * 1800 * 1000; // Recovery period = half the outage duration

      const gapRows: typeof table.rows = [];
      const burstCandidates: typeof table.rows = [];
      const normalRows: typeof table.rows = [];

      for (const row of table.rows) {
        const val = row[timestampCol];
        if (typeof val !== 'string') {
          normalRows.push(row);
          continue;
        }
        const t = new Date(val).getTime();
        if (isNaN(t)) {
          normalRows.push(row);
          continue;
        }

        if (t >= outageStart && t < outageEnd) {
          // During outage: remove most rows (gap in data)
          if (random.next() < 0.05) {
            // 5% trickle through — partial writes during outage
            if (table.columns.includes('status')) {
              row['status'] = 'error';
            }
            normalRows.push(row);
          }
          // else: row is dropped (outage gap)
          gapRows.push(row);
        } else if (t >= outageEnd && t < burstEnd) {
          // Recovery period: keep and mark for burst duplication
          burstCandidates.push(row);
          normalRows.push(row);
        } else {
          normalRows.push(row);
        }
      }

      // Generate recovery burst: duplicate some post-outage rows
      const burstDuplicates: typeof table.rows = [];
      const burstCount = Math.floor(burstCandidates.length * (cfg.burstMultiplier - 1));
      for (let i = 0; i < burstCount; i++) {
        if (burstCandidates.length === 0) break;
        const srcIdx = random.nextInt(0, burstCandidates.length - 1);
        const clone = { ...burstCandidates[srcIdx] };

        // Jitter timestamp within recovery window
        if (typeof clone[timestampCol] === 'string') {
          const d = new Date(clone[timestampCol] as string);
          d.setSeconds(d.getSeconds() + random.nextInt(-300, 300));
          clone[timestampCol] = d.toISOString();
        }

        // Some recovery rows have error markers
        if (table.columns.includes('status') && random.next() < cfg.errorRate) {
          clone['status'] = random.next() < 0.5 ? 'retry' : 'recovered';
        }

        burstDuplicates.push(clone);
      }

      const finalRows = [...normalRows, ...burstDuplicates];
      table.rows = finalRows;
      table.rowCount = finalRows.length;
    }

    // Recalculate total
    let totalRows = 0;
    for (const t of dataset.tables.values()) {
      totalRows += t.rowCount;
    }
    dataset.totalRows = totalRows;

    return dataset;
  },
};
