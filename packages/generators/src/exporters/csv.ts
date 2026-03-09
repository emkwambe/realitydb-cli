import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedDataset } from '../types.js';

export async function exportToCsv(
  dataset: GeneratedDataset,
  outputDir: string,
): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });

  const files: string[] = [];

  for (const [tableName, table] of dataset.tables) {
    const filePath = join(outputDir, `${tableName}.csv`);
    const header = table.columns.map(escapeCsvField).join(',');
    const rows = table.rows.map((row) =>
      table.columns.map((col) => escapeCsvField(String(row[col] ?? ''))).join(',')
    );
    const content = [header, ...rows].join('\n');
    await writeFile(filePath, content, 'utf-8');
    files.push(filePath);
  }

  return files;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
