import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { formatCIOutput } from '@databox/shared';
import { parseSQLSchema } from '@databox/schema';
import {
  streamingGenerate,
  databaseSchemaToGenerateSchema,
  applyColumnCorrelations,
  writeCsvHeader,
  appendCsvBatch,
  appendParquetBatch,
  writeJsonHeader,
  appendJsonBatch,
} from '@databox/generators';
import { createSeededRandom } from '@databox/shared';
import type { GenerateSchema, GenerateTableDef, ColumnCorrelation } from '@databox/generators';

const VERSION = '0.10.0';

export async function generateCommand(options: {
  records?: string;
  schema?: string;
  format?: string;
  output?: string;
  seed?: string;
  table?: string;
  distribution?: string;
  correlations?: boolean;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const records = parseInt(options.records ?? '1000', 10);
    const format = (options.format ?? 'json') as 'json' | 'csv' | 'parquet';
    const outputDir = options.output ?? './.realitydb/generated';
    const seed = options.seed ? parseInt(options.seed, 10) : 42;
    const tableName = options.table;

    // Resolve schema
    let generateSchema: GenerateSchema;

    if (options.schema) {
      const schemaPath = resolve(options.schema);
      const content = await readFile(schemaPath, 'utf-8');

      if (schemaPath.endsWith('.sql')) {
        // Parse SQL DDL
        const dbSchema = parseSQLSchema(content);
        generateSchema = databaseSchemaToGenerateSchema(dbSchema);
      } else if (schemaPath.endsWith('.json')) {
        // Direct schema JSON
        generateSchema = JSON.parse(content) as GenerateSchema;
      } else {
        throw new Error('Schema file must be .sql or .json');
      }
    } else {
      // Default demo schema
      generateSchema = getDefaultSchema();
    }

    // Filter to specific table if requested
    if (tableName) {
      const table = generateSchema.tables.find((t) => t.name === tableName);
      if (!table) {
        const available = generateSchema.tables.map((t) => t.name).join(', ');
        throw new Error(`Table "${tableName}" not found. Available: ${available}`);
      }
      generateSchema = { tables: [table] };
    }

    // Parse correlations from schema JSON
    const correlations: ColumnCorrelation[] = [];
    if (options.correlations) {
      // Look for correlations in the schema JSON
      const schemaWithCorr = generateSchema as GenerateSchema & { correlations?: ColumnCorrelation[] };
      if (schemaWithCorr.correlations) {
        correlations.push(...schemaWithCorr.correlations);
      }
    }

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Generate');
      console.log('═══════════════════════════════════════');
      console.log(`Records: ${records.toLocaleString()}`);
      console.log(`Format: ${format}`);
      console.log(`Output: ${outputDir}`);
      console.log(`Seed: ${seed}`);
      console.log(`Tables: ${generateSchema.tables.map((t) => t.name).join(', ')}`);
      if (correlations.length > 0) {
        console.log(`Correlations: ${correlations.length} defined`);
      }
      console.log('');
      console.log('Generating...');
    }

    await mkdir(outputDir, { recursive: true });

    const files: string[] = [];
    let totalRows = 0;

    for (const tableDef of generateSchema.tables) {
      const ext = format === 'parquet' ? 'parquet.ndjson' : format;
      const filePath = join(outputDir, `${tableDef.name}.${ext}`);

      // Initialize file
      if (format === 'csv') {
        const columns = tableDef.columns.map((c) => c.name);
        await writeCsvHeader(columns, filePath);
      } else {
        await writeJsonHeader(filePath);
      }

      // Stream batches
      let tableRows = 0;
      const random = createSeededRandom(seed);

      for (const batch of streamingGenerate(tableDef, records, seed, correlations)) {
        // Apply post-generation correlations
        let processedBatch = batch;
        if (correlations.length > 0) {
          processedBatch = applyColumnCorrelations(batch, correlations, random);
        }

        if (format === 'csv') {
          const columns = tableDef.columns.map((c) => c.name);
          await appendCsvBatch(processedBatch, columns, filePath);
        } else if (format === 'parquet') {
          await appendParquetBatch(processedBatch, filePath);
        } else {
          await appendJsonBatch(processedBatch, filePath);
        }

        tableRows += processedBatch.length;

        // Progress update for large datasets
        if (!options.ci && records >= 100_000 && tableRows % 100_000 === 0) {
          const pct = Math.round((tableRows / records) * 100);
          process.stdout.write(`\r  ${tableDef.name}: ${tableRows.toLocaleString()} rows (${pct}%)`);
        }
      }

      if (!options.ci && records >= 100_000) {
        process.stdout.write('\r');
      }

      if (!options.ci) {
        console.log(`  ${tableDef.name}: ${tableRows.toLocaleString()} rows → ${filePath}`);
      }

      files.push(filePath);
      totalRows += tableRows;
    }

    const durationMs = Math.round(performance.now() - start);
    const durationSec = (durationMs / 1000).toFixed(1);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'generate',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          format,
          outputDir,
          files,
          totalRows,
          recordsPerTable: records,
          seed,
          tables: generateSchema.tables.map((t) => t.name),
          correlationsApplied: correlations.length,
        },
      }));
      return;
    }

    console.log('');
    console.log(`Generate complete. ${totalRows.toLocaleString()} rows in ${durationSec}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'generate',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] Generate failed: ${message}`);
    process.exit(1);
  }
}

/**
 * Default demo schema for quick generation without a SQL file.
 */
function getDefaultSchema(): GenerateSchema {
  return {
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid' },
          { name: 'email', type: 'varchar' },
          { name: 'first_name', type: 'varchar' },
          { name: 'last_name', type: 'varchar' },
          { name: 'age', type: 'integer', distribution: { type: 'normal', mean: 35, stddev: 12, min: 18, max: 85 } },
          { name: 'income', type: 'numeric', distribution: { type: 'log-normal', mu: 10.5, sigma: 0.8, min: 15000, max: 500000 } },
          { name: 'signup_source', type: 'varchar', values: ['organic', 'referral', 'paid_search', 'social', 'direct'] },
          { name: 'is_active', type: 'boolean' },
          { name: 'created_at', type: 'timestamp' },
        ],
      },
      {
        name: 'transactions',
        columns: [
          { name: 'id', type: 'uuid' },
          { name: 'amount', type: 'numeric', distribution: { type: 'log-normal', mu: 3.5, sigma: 1.2, min: 1, max: 10000 } },
          { name: 'currency', type: 'varchar', values: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'] },
          { name: 'status', type: 'varchar', values: ['completed', 'pending', 'failed', 'refunded'] },
          { name: 'category', type: 'varchar', values: ['food', 'transport', 'entertainment', 'utilities', 'shopping', 'health', 'education'] },
          { name: 'created_at', type: 'timestamp' },
        ],
      },
    ],
  };
}
