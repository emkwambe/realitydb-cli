import type { PIICategory, MaskStrategy } from './piiDetector.js';

/**
 * Per-pattern action mode:
 * - block: Irreversible removal (highest sensitivity)
 * - tokenize: Reversible replacement with token
 * - mask: Partial reveal or noise injection
 */
export type PatternAction = 'block' | 'tokenize' | 'mask';

/**
 * Result of scanning sample values from a column.
 */
export interface ValueScanResult {
  category: PIICategory;
  confidence: 'high' | 'medium' | 'low';
  hitRate: number;
  matchedPattern: string;
  suggestedStrategy: MaskStrategy;
  action: PatternAction;
  isFreeTextField: boolean;
}

/**
 * Regex patterns for detecting PII in actual cell values.
 * Each pattern maps to a PII category, masking strategy, and action mode.
 * 16+ categories covering direct identifiers, contact info, financial,
 * medical, education, legal, and automotive verticals.
 */
const VALUE_PATTERNS: {
  category: PIICategory;
  patterns: RegExp[];
  label: string;
  strategy: MaskStrategy;
  threshold: number;
  action: PatternAction;
}[] = [
  // === Direct identifiers ===
  {
    category: 'email',
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
    label: 'email address',
    strategy: 'replace_email',
    threshold: 0.3,
    action: 'tokenize',
  },
  {
    category: 'ssn',
    patterns: [/\b\d{3}-\d{2}-\d{4}\b/],
    label: 'SSN',
    strategy: 'replace_ssn',
    threshold: 0.1,
    action: 'block',
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
    action: 'tokenize',
  },
  {
    category: 'ip_address',
    patterns: [/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/],
    label: 'IP address',
    strategy: 'replace_ip',
    threshold: 0.2,
    action: 'mask',
  },
  {
    category: 'name',
    patterns: [
      /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/,
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,
    ],
    label: 'person name',
    strategy: 'replace_name',
    threshold: 0.3,
    action: 'tokenize',
  },
  {
    category: 'address',
    patterns: [
      /\b\d{1,5}\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Ter|Cir|Pike|Highway|Hwy)\b/i,
    ],
    label: 'street address',
    strategy: 'replace_address',
    threshold: 0.2,
    action: 'tokenize',
  },
  // === Financial ===
  {
    category: 'financial',
    patterns: [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]{0,16})?\b/,
    ],
    label: 'financial identifier',
    strategy: 'replace_ssn',
    threshold: 0.1,
    action: 'block',
  },
  {
    category: 'bank_routing',
    patterns: [
      /\b0[0-9]\d{7}\b/,
      /\b1[0-2]\d{7}\b/,
      /\b[2-3][0-9]\d{7}\b/,
    ],
    label: 'bank routing number',
    strategy: 'replace_ssn',
    threshold: 0.1,
    action: 'mask',
  },
  // === Dates ===
  {
    category: 'date_of_birth',
    patterns: [
      /\b(0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/,
      /\b(19|20)\d{2}[/-](0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])\b/,
    ],
    label: 'date of birth',
    strategy: 'shift_date',
    threshold: 0.15,
    action: 'mask',
  },
  // === Government IDs ===
  {
    category: 'drivers_license',
    patterns: [
      /\b[A-Z]\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/,
    ],
    label: 'drivers license',
    strategy: 'replace_ssn',
    threshold: 0.1,
    action: 'block',
  },
  {
    category: 'passport',
    patterns: [
      /\b[A-Z]\d{8}\b/,
    ],
    label: 'passport number',
    strategy: 'replace_ssn',
    threshold: 0.1,
    action: 'block',
  },
  // === URLs ===
  {
    category: 'url',
    patterns: [/https?:\/\/[^\s"'<>]+/],
    label: 'URL',
    strategy: 'replace_url',
    threshold: 0.3,
    action: 'tokenize',
  },
  // === Healthcare vertical ===
  {
    category: 'medical',
    patterns: [
      /\bMRN[-:\s]?\d{6,10}\b/i,
      /\bNPI[-:\s]?\d{10}\b/i,
    ],
    label: 'medical record number',
    strategy: 'redact',
    threshold: 0.1,
    action: 'tokenize',
  },
  // === Education vertical ===
  {
    category: 'student_id',
    patterns: [
      /\b(SID|STU|STUDENT)[-:\s]?\d{5,10}\b/i,
    ],
    label: 'student ID',
    strategy: 'replace_ssn',
    threshold: 0.15,
    action: 'tokenize',
  },
  // === Legal vertical ===
  {
    category: 'case_number',
    patterns: [
      /\b\d{2,4}[-]?[A-Z]{2,4}[-]?\d{3,8}\b/i,
    ],
    label: 'case number',
    strategy: 'redact',
    threshold: 0.1,
    action: 'tokenize',
  },
  // === Automotive ===
  {
    category: 'vin',
    patterns: [
      /\b[A-HJ-NPR-Z0-9]{17}\b/,
    ],
    label: 'VIN',
    strategy: 'redact',
    threshold: 0.1,
    action: 'block',
  },
];

// === Free-text column detection (Task 3) ===

const FREE_TEXT_NAME_PATTERNS = /^(notes|bio|biography|description|comments|remarks|narrative|summary|details|message|body|content|text|memo|reason|observation|feedback|review)$/i;

const FREE_TEXT_TYPE_PATTERNS = ['text', 'mediumtext', 'longtext'];

/**
 * Detects whether a column is a free-text field based on name, data type, or max length.
 */
export function isFreeTextColumn(columnName: string, dataType: string, maxLength: number | null): boolean {
  if (FREE_TEXT_NAME_PATTERNS.test(columnName)) return true;
  if (FREE_TEXT_TYPE_PATTERNS.includes(dataType.toLowerCase())) return true;
  if (maxLength !== null && maxLength > 500) return true;
  return false;
}

/**
 * Options for scanColumnValues.
 */
export interface ScanColumnOptions {
  maxSampleSize?: number;
  isFreeText?: boolean;
}

/**
 * Scans a sample of string values from a column to detect embedded PII patterns.
 * This catches PII that schema-level detection misses (e.g., emails in a "notes" column).
 *
 * When isFreeText is true, uses 3x sample size and lowers thresholds by 50%
 * to catch sparse PII in long text fields.
 *
 * @param values - Sample of cell values (strings only; non-strings are skipped)
 * @param optionsOrMaxSampleSize - Options object or legacy maxSampleSize number
 * @returns Array of detected PII types with confidence, hit rate, and action mode
 */
export function scanColumnValues(
  values: unknown[],
  optionsOrMaxSampleSize?: ScanColumnOptions | number,
): ValueScanResult[] {
  // Support both legacy number signature and new options object
  let maxSampleSize = 100;
  let isFreeText = false;

  if (typeof optionsOrMaxSampleSize === 'number') {
    maxSampleSize = optionsOrMaxSampleSize;
  } else if (optionsOrMaxSampleSize) {
    maxSampleSize = optionsOrMaxSampleSize.maxSampleSize ?? 100;
    isFreeText = optionsOrMaxSampleSize.isFreeText ?? false;
  }

  if (isFreeText) {
    maxSampleSize = Math.min(300, Math.max(maxSampleSize * 3, values.length));
  }

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
    const effectiveThreshold = isFreeText ? check.threshold * 0.5 : check.threshold;

    if (hitRate >= effectiveThreshold) {
      const confidence: 'high' | 'medium' | 'low' =
        hitRate >= 0.7 ? 'high' : hitRate >= 0.3 ? 'medium' : 'low';

      results.push({
        category: check.category,
        confidence,
        hitRate: Math.round(hitRate * 100) / 100,
        matchedPattern: check.label,
        suggestedStrategy: check.strategy,
        action: check.action,
        isFreeTextField: isFreeText,
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
