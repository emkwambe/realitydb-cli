import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratedDataset } from '../types.js';

export async function exportToJson(
  dataset: GeneratedDataset,
  outputDir: string,
): Promise<string[]> {
  await mkdir(outputDir, { recursive: true });

  const files: string[] = [];

  for (const [tableName, table] of dataset.tables) {
    const filePath = join(outputDir, `${tableName}.json`);
    const content = JSON.stringify(table.rows, null, 2);
    await writeFile(filePath, content, 'utf-8');
    files.push(filePath);
  }

  return files;
}
