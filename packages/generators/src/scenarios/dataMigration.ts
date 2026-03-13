import type { ScenarioConfig, SeededRandom } from '@databox/shared';
import type { GeneratedDataset } from '../types.js';
import type { ScenarioDefinition } from '../scenarioEngine.js';
import { matchesAnyPattern } from '../scenarioEngine.js';

const INTENSITY_RATES: Record<string, { nullRate: number; encodingRate: number; formatChangeRate: number }> = {
  low: { nullRate: 0.02, encodingRate: 0.01, formatChangeRate: 0.005 },
  medium: { nullRate: 0.05, encodingRate: 0.03, formatChangeRate: 0.02 },
  high: { nullRate: 0.10, encodingRate: 0.06, formatChangeRate: 0.05 },
};

const TARGET_PATTERNS = ['*'];

const PROTECTED_COLUMNS = ['id', '_id'];

const ENCODING_ARTIFACTS = [
  '\u00c3\u00a9', // Mojibake for é
  '\u00c3\u00b1', // Mojibake for ñ
  '\u00e2\u0080\u0099', // Smart quote artifact
  '\ufffd', // Replacement character
  '\\u0000', // Null byte string
];

const OLD_DATE_FORMATS = [
  'MM/DD/YYYY',
  'DD-MM-YYYY',
  'YYYY.MM.DD',
];

export const dataMigrationScenario: ScenarioDefinition = {
  name: 'data-migration',
  description: 'Simulate data migration artifacts: encoding issues, format changes, null spikes',
  version: '1.0',
  supportedIntensities: ['low', 'medium', 'high'],
  targetTablePatterns: TARGET_PATTERNS,

  apply(dataset: GeneratedDataset, config: ScenarioConfig, random: SeededRandom): GeneratedDataset {
    const rates = INTENSITY_RATES[config.intensity] ?? INTENSITY_RATES.medium;

    for (const [_tableName, table] of dataset.tables) {
      for (const row of table.rows) {
        for (const col of table.columns) {
          // Protect ID columns
          if (PROTECTED_COLUMNS.some((p) => col === p || col.endsWith(p))) continue;

          const val = row[col];

          // Null spike: set value to null
          if (random.next() < rates.nullRate) {
            row[col] = null;
            continue;
          }

          // Encoding issues on string columns
          if (typeof val === 'string' && val.length > 0 && random.next() < rates.encodingRate) {
            const artifact = ENCODING_ARTIFACTS[random.nextInt(0, ENCODING_ARTIFACTS.length - 1)];
            // Insert encoding artifact at a random position
            const pos = random.nextInt(0, Math.max(val.length - 1, 0));
            row[col] = val.slice(0, pos) + artifact + val.slice(pos);
            continue;
          }

          // Format changes on date columns
          if (typeof val === 'string' && (col.includes('date') || col.includes('_at')) && random.next() < rates.formatChangeRate) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
              const fmt = OLD_DATE_FORMATS[random.nextInt(0, OLD_DATE_FORMATS.length - 1)];
              row[col] = formatDateAs(d, fmt);
            }
            continue;
          }
        }
      }
    }

    return dataset;
  },
};

function formatDateAs(d: Date, format: string): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());

  switch (format) {
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${yyyy}`;
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${yyyy}`;
    case 'YYYY.MM.DD':
      return `${yyyy}.${mm}.${dd}`;
    default:
      return d.toISOString();
  }
}
