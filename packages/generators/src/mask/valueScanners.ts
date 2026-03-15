import type { PIICategory, MaskStrategy } from './piiDetector.js';

/**
 * Result of scanning sample values from a column.
 */
export interface ValueScanResult {
  category: PIICategory;
  confidence: 'high' | 'medium' | 'low';
  hitRate: number;
  matchedPattern: string;
  suggestedStrategy: MaskStrategy;
}

/**
 * Regex patterns for detecting PII in actual cell values.
 * Each pattern maps to a PII category and suggested masking strategy.
 */
const VALUE_PATTERNS: {
  category: PIICategory;
  patterns: RegExp[];
  label: string;
  strategy: MaskStrategy;
  threshold: number;
}[] = [
  {
    category: 'email',
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
    label: 'email address',
    strategy: 'replace_email',
    threshold: 0.3,
  },
  {
    category: 'ssn',
    patterns: [/\b\d{3}-\d{2}-\d{4}\b/],
    label: 'SSN',
    strategy: 'replace_ssn',
    threshold: 0.1, // Lower threshold — even a few SSNs is critical
  },
  {
    category: 'phone',
    patterns: [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      /\+1\d{10}\b/,
      /\(\d{3}\)\s?\d{3}[-.]?\d{4}/,
    ],
    label: 'phone number',
    strategy: 'replace_phone',
    threshold: 0.2,
  },
  {
    category: 'ip_address',
    patterns: [/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/],
    label: 'IP address',
    strategy: 'replace_ip',
    threshold: 0.2,
  },
  {
    category: 'financial',
    patterns: [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]{0,16})?\b/, // IBAN
    ],
    label: 'financial identifier',
    strategy: 'replace_ssn',
    threshold: 0.1,
  },
  {
    category: 'url',
    patterns: [/https?:\/\/[^\s"'<>]+/],
    label: 'URL',
    strategy: 'replace_url',
    threshold: 0.3,
  },
];

/**
 * Scans a sample of string values from a column to detect embedded PII patterns.
 * This catches PII that schema-level detection misses (e.g., emails in a "notes" column).
 *
 * @param values - Sample of cell values (strings only; non-strings are skipped)
 * @param maxSampleSize - Maximum number of values to scan (default 100)
 * @returns Array of detected PII types with confidence and hit rate
 */
export function scanColumnValues(
  values: unknown[],
  maxSampleSize: number = 100,
): ValueScanResult[] {
  const stringValues = values
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, maxSampleSize);

  if (stringValues.length === 0) return [];

  const results: ValueScanResult[] = [];

  for (const check of VALUE_PATTERNS) {
    let matches = 0;

    for (const value of stringValues) {
      const hasMatch = check.patterns.some((pattern) => pattern.test(value));
      if (hasMatch) matches++;
    }

    const hitRate = matches / stringValues.length;

    if (hitRate >= check.threshold) {
      const confidence: 'high' | 'medium' | 'low' =
        hitRate >= 0.7 ? 'high' : hitRate >= 0.3 ? 'medium' : 'low';

      results.push({
        category: check.category,
        confidence,
        hitRate: Math.round(hitRate * 100) / 100,
        matchedPattern: check.label,
        suggestedStrategy: check.strategy,
      });
    }
  }

  return results;
}

/**
 * Checks if a single text value contains any PII patterns.
 * Useful for one-off checks without full sample scanning.
 */
export function containsPII(text: string): { hasPII: boolean; categories: PIICategory[] } {
  const categories: PIICategory[] = [];

  for (const check of VALUE_PATTERNS) {
    if (check.patterns.some((p) => p.test(text))) {
      categories.push(check.category);
    }
  }

  return { hasPII: categories.length > 0, categories };
}
