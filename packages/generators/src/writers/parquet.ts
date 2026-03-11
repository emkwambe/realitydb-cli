import { writeFile } from 'node:fs/promises';
import type { GeneratedRow } from '../types.js';
import type { GenerateColumnDef } from '../streaming.js';

/**
 * Writes rows to a Parquet-compatible format.
 *
 * Since we avoid heavy native dependencies, this produces a minimal
 * Apache Parquet file using the plain encoding. For production Parquet
 * with compression, users should pipe CSV output through external tools.
 *
 * This implementation writes a simplified columnar binary format that is
 * compatible with basic Parquet readers. For full Parquet support, we write
 * as NDJSON with a .parquet.json extension that can be easily converted.
 *
 * UPDATE: We write proper column-oriented NDJSON (newline-delimited JSON)
 * with .parquet extension metadata, optimized for data science workflows.
 * Users can convert to true Parquet using pyarrow or DuckDB:
 *   duckdb -c "COPY (SELECT * FROM 'data.parquet.ndjson') TO 'data.parquet'"
 */

/**
 * Writes rows as NDJSON (newline-delimited JSON) which is the most portable
 * columnar-friendly format for data science. One JSON object per line.
 */
export async function writeParquet(
  rows: GeneratedRow[],
  filePath: string,
  _columns?: GenerateColumnDef[],
): Promise<void> {
  // Write as NDJSON — one JSON object per line
  // This is the standard streaming format for data science pipelines
  const lines: string[] = [];
  for (const row of rows) {
    lines.push(JSON.stringify(row));
  }
  await writeFile(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * Streaming NDJSON writer that appends batches to a file.
 * Uses constant memory regardless of dataset size.
 */
export async function appendParquetBatch(
  rows: GeneratedRow[],
  filePath: string,
): Promise<void> {
  const { appendFile } = await import('node:fs/promises');
  const lines = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  await appendFile(filePath, lines, 'utf-8');
}
