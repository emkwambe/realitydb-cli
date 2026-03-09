import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';

const INTENSITY_CONFIG: Record<string, { nullRate: number; duplicateRate: number; formatIssues: boolean }> = {
  low: { nullRate: 0.01, duplicateRate: 0.005, formatIssues: false },
  medium: { nullRate: 0.03, duplicateRate: 0.01, formatIssues: true },
  high: { nullRate: 0.05, duplicateRate: 0.02, formatIssues: true },
};

// Columns that should never be nullified (primary keys, foreign keys, required identifiers)
const PROTECTED_COLUMN_PATTERNS = ['id', '_id'];

function isProtectedColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase();
  return lower === 'id' || lower.endsWith('_id');
}

export const dataQualityScenario: ScenarioDefinition = {
  name: 'data-quality',
  description: 'Inject data quality issues for testing',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: ['*'], // all tables

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const intensityCfg = INTENSITY_CONFIG[config.intensity] ?? INTENSITY_CONFIG.medium;

    for (const [_tableName, table] of dataset.tables) {
      // Identify nullable columns (not protected)
      const nullableColumns = table.columns.filter((col) => !isProtectedColumn(col));

      for (const row of table.rows) {
        // Inject null values in nullable columns
        for (const col of nullableColumns) {
          if (random.next() < intensityCfg.nullRate) {
            row[col] = null;
          }
        }

        // Inject format issues at medium/high intensity
        if (intensityCfg.formatIssues) {
          for (const col of nullableColumns) {
            const value = row[col];
            if (typeof value !== 'string' || value === null) continue;

            const roll = random.next();
            if (roll < 0.005) {
              // Mixed case issue
              row[col] = value.toUpperCase();
            } else if (roll < 0.01) {
              // Leading/trailing whitespace
              row[col] = `  ${value}  `;
            }
          }
        }
      }

      // Inject duplicate-looking records
      if (table.rows.length > 2) {
        const duplicateCount = Math.floor(table.rows.length * intensityCfg.duplicateRate);
        for (let i = 0; i < duplicateCount; i++) {
          const sourceIndex = random.nextInt(0, table.rows.length - 1);
          const targetIndex = random.nextInt(0, table.rows.length - 1);
          if (sourceIndex === targetIndex) continue;

          const sourceRow = table.rows[sourceIndex];
          const targetRow = table.rows[targetIndex];

          // Copy non-protected column values to create a near-duplicate
          for (const col of nullableColumns) {
            if (sourceRow[col] !== undefined) {
              targetRow[col] = sourceRow[col];
            }
          }
        }
      }
    }

    return dataset;
  },
};
