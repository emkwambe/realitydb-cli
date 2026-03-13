import { writeFile, appendFile } from 'node:fs/promises';
import type { GeneratedRow } from '../types.js';

/**
 * Streaming JSON writer — uses NDJSON (newline-delimited JSON) for streaming.
 * For small datasets, writes a proper JSON array.
 */

export async function writeJsonHeader(filePath: string): Promise<void> {
  await writeFile(filePath, '', 'utf-8');
}

export async function appendJsonBatch(
  rows: GeneratedRow[],
  filePath: string,
): Promise<void> {
  const lines = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  await appendFile(filePath, lines, 'utf-8');
}

/**
 * Write a complete JSON array (non-streaming, for small datasets).
 */
export async function writeJsonArray(
  rows: GeneratedRow[],
  filePath: string,
): Promise<void> {
  await writeFile(filePath, JSON.stringify(rows, null, 2), 'utf-8');
}
