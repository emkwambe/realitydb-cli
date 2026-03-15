import { createHash, randomBytes } from 'node:crypto';
import type { PIIDetection } from './piiDetector.js';

/**
 * A single mapping from original value to token.
 */
export interface TokenEntry {
  token: string;
  originalValue: unknown;
  columnName: string;
  tableName: string;
  piiCategory: string;
}

/**
 * Complete token map for a masking session.
 * This is the "key" that enables detokenization.
 * Must be stored securely — anyone with this map can reverse the masking.
 */
export interface TokenMap {
  version: string;
  createdAt: string;
  tokenPrefix: string;
  totalTokens: number;
  entries: TokenEntry[];
}

/**
 * Result of tokenizing a table's rows.
 */
export interface TokenizeTableResult {
  tokenizedRows: Record<string, unknown>[];
  entries: TokenEntry[];
}

/**
 * Tokenizes rows by replacing PII values with deterministic tokens.
 * Same input value in the same column always produces the same token,
 * preserving referential consistency across rows.
 */
export function tokenizeTableRows(
  rows: Record<string, unknown>[],
  detections: PIIDetection[],
  tableName: string,
  tokenPrefix: string = 'TOK',
): TokenizeTableResult {
  const columnsToMask = detections.filter((d) => d.shouldMask);
  const entries: TokenEntry[] = [];

  // Cache: column+value → token (ensures same value always gets same token)
  const tokenCache = new Map<string, string>();

  const tokenizedRows = rows.map((row) => {
    const newRow = { ...row };

    for (const detection of columnsToMask) {
      const originalValue = row[detection.columnName];

      // Preserve nulls
      if (originalValue === null || originalValue === undefined) continue;

      const cacheKey = `${detection.columnName}:${String(originalValue)}`;

      let token = tokenCache.get(cacheKey);
      if (!token) {
        // Generate deterministic token from content hash
        const hash = createHash('sha256')
          .update(`${tableName}:${cacheKey}`, 'utf8')
          .digest('hex')
          .substring(0, 12);
        token = `${tokenPrefix}-${hash}`;
        tokenCache.set(cacheKey, token);

        entries.push({
          token,
          originalValue,
          columnName: detection.columnName,
          tableName,
          piiCategory: detection.category,
        });
      }

      newRow[detection.columnName] = token;
    }

    return newRow;
  });

  return { tokenizedRows, entries };
}

/**
 * Detokenizes rows using a token map, restoring original values.
 */
export function detokenizeRows(
  rows: Record<string, unknown>[],
  tokenMap: TokenMap,
  tableName: string,
): Record<string, unknown>[] {
  // Build lookup: token → original value (for this table)
  const lookup = new Map<string, unknown>();
  for (const entry of tokenMap.entries) {
    if (entry.tableName === tableName) {
      lookup.set(entry.token, entry.originalValue);
    }
  }

  return rows.map((row) => {
    const restored = { ...row };
    for (const [key, value] of Object.entries(restored)) {
      if (typeof value === 'string' && lookup.has(value)) {
        restored[key] = lookup.get(value);
      }
    }
    return restored;
  });
}

/**
 * Builds a complete token map from collected entries.
 */
export function buildTokenMap(
  entries: TokenEntry[],
  tokenPrefix: string = 'TOK',
): TokenMap {
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    tokenPrefix,
    totalTokens: entries.length,
    entries,
  };
}

/**
 * Serializes a token map to JSON. This output must be stored securely.
 */
export function serializeTokenMap(tokenMap: TokenMap): string {
  return JSON.stringify(tokenMap, null, 2);
}

/**
 * Generates a random token prefix for a session.
 */
export function generateTokenPrefix(): string {
  return `TOK-${randomBytes(3).toString('hex').toUpperCase()}`;
}
