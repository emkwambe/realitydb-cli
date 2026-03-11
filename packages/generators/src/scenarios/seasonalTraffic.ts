import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_MULTIPLIERS: Record<string, { peak: number; trough: number }> = {
  low: { peak: 1.3, trough: 0.85 },
  medium: { peak: 2.0, trough: 0.6 },
  high: { peak: 3.5, trough: 0.4 },
};

const TARGET_PATTERNS = ['*order*', '*session*', '*visit*', '*request*', '*event*', '*transaction*', '*user*'];

export const seasonalTrafficScenario: ScenarioDefinition = {
  name: 'seasonal-traffic',
  description: 'Simulate holiday/weekend traffic patterns with peaks and troughs',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const multipliers = INTENSITY_MULTIPLIERS[config.intensity] ?? INTENSITY_MULTIPLIERS.medium;

    for (const [tableName, table] of dataset.tables) {
      if (!matchesAnyPattern(tableName, TARGET_PATTERNS)) continue;

      const timestampCol = table.columns.find(
        (c) => c.includes('created_at') || c.includes('timestamp') || c.includes('date'),
      );

      if (!timestampCol) continue;

      // Sort rows by timestamp to apply seasonal pattern
      const rowsWithDates = table.rows.map((row, idx) => ({
        row,
        idx,
        date: typeof row[timestampCol] === 'string' ? new Date(row[timestampCol] as string) : null,
      }));

      for (const entry of rowsWithDates) {
        if (!entry.date || isNaN(entry.date.getTime())) continue;

        const month = entry.date.getMonth(); // 0-11
        const dayOfWeek = entry.date.getDay(); // 0=Sun, 6=Sat

        // Holiday months (Nov, Dec) = peak traffic
        const isHolidaySeason = month === 10 || month === 11;
        // Summer (Jun, Jul, Aug) = moderate bump
        const isSummer = month >= 5 && month <= 7;
        // Weekends = traffic spike
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let keepProbability = 1.0;

        if (isHolidaySeason) {
          // Peak: duplicate rows later, but first ensure these survive
          keepProbability = 1.0;
        } else if (isSummer) {
          keepProbability = 0.9;
        } else {
          // Off-season: thin out rows
          keepProbability = multipliers.trough;
        }

        if (isWeekend) {
          keepProbability = Math.min(keepProbability * 1.2, 1.0);
        }

        // Mark low-traffic rows for removal by setting a sentinel
        if (random.next() > keepProbability) {
          entry.row['__seasonal_remove'] = true;
        }
      }

      // Remove marked rows
      const survivingRows = table.rows.filter((r) => !r['__seasonal_remove']);
      // Clean up sentinel
      for (const row of survivingRows) {
        delete row['__seasonal_remove'];
      }

      // Duplicate some holiday-season rows to simulate peak traffic
      const holidayRows = survivingRows.filter((r) => {
        const val = r[timestampCol];
        if (typeof val !== 'string') return false;
        const d = new Date(val);
        const m = d.getMonth();
        return m === 10 || m === 11;
      });

      const duplicateCount = Math.floor(holidayRows.length * (multipliers.peak - 1));
      const duplicates = [];
      for (let i = 0; i < duplicateCount; i++) {
        const sourceIdx = random.nextInt(0, Math.max(holidayRows.length - 1, 0));
        const source = holidayRows[sourceIdx];
        if (!source) break;
        const clone = { ...source };
        // Jitter the timestamp slightly
        if (typeof clone[timestampCol] === 'string') {
          const d = new Date(clone[timestampCol] as string);
          d.setMinutes(d.getMinutes() + random.nextInt(-120, 120));
          clone[timestampCol] = d.toISOString();
        }
        duplicates.push(clone);
      }

      const finalRows = [...survivingRows, ...duplicates];
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
