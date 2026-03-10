import { loadConfig } from '@databox/config';
import { captureDatabase } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';
import { stat } from 'node:fs/promises';

const VERSION = '0.4.0';

export async function captureCommand(options: {
  name: string;
  description?: string;
  tables?: string;
  output?: string;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    if (!options.name) {
      const msg = 'Missing required --name flag.';
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'capture',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: 0,
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      console.error('Usage: realitydb capture --name <name>');
      process.exit(1);
    }

    const config = await loadConfig();
    const masked = maskConnectionString(config.database.connectionString);

    const tables = options.tables
      ? options.tables.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : undefined;

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Capture');
      console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
      console.log(`Database: ${masked}`);
      console.log(`Name: ${options.name}`);
      if (tables) {
        console.log(`Tables: ${tables.join(', ')}`);
      }
      console.log('');
      console.log('Capturing...');
    }

    const result = await captureDatabase(config, {
      name: options.name,
      description: options.description,
      tables,
      outputDir: options.output,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'capture',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          name: options.name,
          filePath: result.filePath,
          tableCount: result.tableCount,
          totalRows: result.totalRows,
          tables: result.tableDetails.map((t) => ({
            name: t.name,
            rowCount: t.rowCount,
          })),
          ddlIncluded: true,
        },
      }));
      return;
    }

    for (const table of result.tableDetails) {
      console.log(`  ${table.name}: ${table.rowCount} rows`);
    }

    const fileStat = await stat(result.filePath);
    const sizeKb = Math.round(fileStat.size / 1024);

    console.log('');
    console.log(`Captured: ${result.filePath} (${sizeKb} KB)`);
    console.log('Schema DDL included. Share this file to reproduce the environment.');
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'capture',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Capture failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Capture failed: ${message}`);
    }
    process.exit(1);
  }
}
