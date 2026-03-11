import { writeFile, appendFile } from 'node:fs/promises';
import type { GeneratedRow } from '../types.js';

/**
 * Streaming CSV writer — writes header once, appends batches.
 */
export async function writeCsvHeader(
  columns: string[],
  filePath: string,
): Promise<void> {
  const header = columns.map(escapeCsvField).join(',') + '\n';
  await writeFile(filePath, header, 'utf-8');
}

export async function appendCsvBatch(
  rows: GeneratedRow[],
  columns: string[],
  filePath: string,
): Promise<void> {
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvField(String(row[col] ?? ''))).join(','),
  ).join('\n') + '\n';
  await appendFile(filePath, lines, 'utf-8');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
