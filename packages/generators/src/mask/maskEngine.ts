import type { SeededRandom } from '@databox/shared';
import type { PIIDetection, MaskStrategy } from './piiDetector.js';

/**
 * Result of masking a table.
 */
export interface MaskTableResult {
  tableName: string;
  rowCount: number;
  columnsMatched: number;
  columnsMasked: number;
  maskedColumns: { columnName: string; strategy: MaskStrategy; rowsMasked: number }[];
}

// Synthetic name pools for deterministic replacement
const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Parker', 'Blake', 'Drew', 'Sage', 'Rowan', 'Skyler', 'Finley', 'Charlie', 'Emery', 'Phoenix', 'River', 'Dakota'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris'];
const EMAIL_DOMAINS = ['example.com', 'test.org', 'masked.dev', 'synth.io', 'demo.net'];
const STREETS = ['123 Main St', '456 Oak Ave', '789 Elm Blvd', '321 Pine Rd', '654 Maple Dr', '987 Cedar Ln', '147 Birch Way', '258 Walnut Ct', '369 Cherry Pl', '741 Spruce Ter'];
const CITIES = ['Springfield', 'Riverside', 'Fairview', 'Greenville', 'Madison', 'Georgetown', 'Franklin', 'Clinton', 'Salem', 'Bristol'];

/**
 * Masks all rows in a table based on PII detections.
 * Returns new masked rows (does not modify originals).
 */
export function maskTableRows(
  rows: Record<string, unknown>[],
  detections: PIIDetection[],
  random: SeededRandom,
  tableName: string,
): { maskedRows: Record<string, unknown>[]; result: MaskTableResult } {
  const columnsToMask = detections.filter((d) => d.shouldMask);

  const columnResults: MaskTableResult['maskedColumns'] = [];
  const maskedRows = rows.map((row) => ({ ...row }));

  for (const detection of columnsToMask) {
    let rowsMasked = 0;

    for (const row of maskedRows) {
      const originalValue = row[detection.columnName];

      // Preserve nulls
      if (originalValue === null || originalValue === undefined) continue;

      row[detection.columnName] = applyMaskStrategy(detection.maskStrategy, originalValue, random);
      rowsMasked++;
    }

    columnResults.push({
      columnName: detection.columnName,
      strategy: detection.maskStrategy,
      rowsMasked,
    });
  }

  return {
    maskedRows,
    result: {
      tableName,
      rowCount: rows.length,
      columnsMatched: detections.length,
      columnsMasked: columnsToMask.length,
      maskedColumns: columnResults,
    },
  };
}

/**
 * Applies a specific masking strategy to a value.
 */
function applyMaskStrategy(
  strategy: MaskStrategy,
  value: unknown,
  random: SeededRandom,
): unknown {
  switch (strategy) {
    case 'replace_name':
      return replaceName(random);
    case 'replace_email':
      return replaceEmail(value, random);
    case 'replace_phone':
      return replacePhone(random);
    case 'replace_address':
      return replaceAddress(random);
    case 'replace_username':
      return replaceUsername(random);
    case 'replace_ip':
      return replaceIP(random);
    case 'replace_url':
      return replaceURL(random);
    case 'replace_ssn':
      return replaceSSN(random);
    case 'shift_date':
      return shiftDate(value, random);
    case 'generalize_numeric':
      return generalizeNumeric(value, random);
    case 'replace_text':
      return replaceText(random);
    case 'redact':
      return '[REDACTED]';
    case 'preserve':
      return value;
    default:
      return value;
  }
}

function replaceName(random: SeededRandom): string {
  const first = FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length - 1)];
  const last = LAST_NAMES[random.nextInt(0, LAST_NAMES.length - 1)];
  return `${first} ${last}`;
}

function replaceEmail(original: unknown, random: SeededRandom): string {
  const first = FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length - 1)].toLowerCase();
  const last = LAST_NAMES[random.nextInt(0, LAST_NAMES.length - 1)].toLowerCase();
  const num = random.nextInt(1, 999);

  // Try to preserve the domain pattern
  if (typeof original === 'string' && original.includes('@')) {
    const domain = original.split('@')[1];
    // Keep corporate domains but replace personal ones
    if (domain && !domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('hotmail') && !domain.includes('outlook')) {
      return `${first}.${last}${num}@${domain}`;
    }
  }

  const domain = EMAIL_DOMAINS[random.nextInt(0, EMAIL_DOMAINS.length - 1)];
  return `${first}.${last}${num}@${domain}`;
}

function replacePhone(random: SeededRandom): string {
  const area = random.nextInt(200, 999);
  const prefix = random.nextInt(200, 999);
  const line = random.nextInt(1000, 9999);
  return `+1${area}${prefix}${line}`;
}

function replaceAddress(random: SeededRandom): string {
  const street = STREETS[random.nextInt(0, STREETS.length - 1)];
  const city = CITIES[random.nextInt(0, CITIES.length - 1)];
  const state = ['CA', 'TX', 'NY', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'][random.nextInt(0, 9)];
  const zip = random.nextInt(10000, 99999);
  return `${street}, ${city}, ${state} ${zip}`;
}

function replaceUsername(random: SeededRandom): string {
  const first = FIRST_NAMES[random.nextInt(0, FIRST_NAMES.length - 1)].toLowerCase();
  const num = random.nextInt(1, 9999);
  return `${first}${num}`;
}

function replaceIP(random: SeededRandom): string {
  return `${random.nextInt(10, 223)}.${random.nextInt(0, 255)}.${random.nextInt(0, 255)}.${random.nextInt(1, 254)}`;
}

function replaceURL(random: SeededRandom): string {
  const domain = EMAIL_DOMAINS[random.nextInt(0, EMAIL_DOMAINS.length - 1)];
  const path = ['profile', 'user', 'page', 'item', 'resource'][random.nextInt(0, 4)];
  const id = random.nextInt(1000, 99999);
  return `https://${domain}/${path}/${id}`;
}

function replaceSSN(random: SeededRandom): string {
  const a = random.nextInt(100, 999);
  const b = random.nextInt(10, 99);
  const c = random.nextInt(1000, 9999);
  return `${a}-${b}-${c}`;
}

function shiftDate(value: unknown, random: SeededRandom): unknown {
  if (typeof value === 'string' || value instanceof Date) {
    const d = new Date(typeof value === 'string' ? value : value.toISOString());
    if (isNaN(d.getTime())) return value;

    // Shift by random offset (±30 to ±365 days), preserving day-of-week
    const offsetDays = random.nextInt(30, 365) * (random.next() < 0.5 ? -1 : 1);
    // Round to nearest week to preserve day-of-week patterns
    const offsetWeeks = Math.round(offsetDays / 7);
    d.setDate(d.getDate() + offsetWeeks * 7);
    return d.toISOString();
  }
  return value;
}

function generalizeNumeric(value: unknown, random: SeededRandom): unknown {
  if (typeof value === 'number') {
    // Add noise: ±10% of value
    const noise = value * (random.next() * 0.2 - 0.1);
    return Math.round((value + noise) * 100) / 100;
  }
  return value;
}

function replaceText(random: SeededRandom): string {
  const templates = [
    'This content has been masked for privacy compliance.',
    'Masked text content for data protection.',
    'Synthetic replacement text for compliance.',
    'Privacy-masked content.',
    'Redacted for data protection compliance.',
  ];
  return templates[random.nextInt(0, templates.length - 1)];
}
