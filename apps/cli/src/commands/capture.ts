import { loadConfig } from '@databox/config';
import { captureDatabase } from '@databox/core';
import type { SafeMode } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';
import { stat } from 'node:fs/promises';

const VERSION = '0.10.0';

export async function captureCommand(options: {
  name: string;
  description?: string;
  tables?: string;
  output?: string;
  ci?: boolean;
  configPath?: string;
  safe?: boolean;
  safeMode?: string;
  maxRows?: string;
  around?: string;
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

    const config = await loadConfig(options.configPath);
    const masked = maskConnectionString(config.database.connectionString);

    const tables = options.tables
      ? options.tables.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : undefined;

    // Parse --safe-mode
    const safeMode: SafeMode | undefined = options.safe
      ? ((['mask', 'tokenize', 'redact'].includes(options.safeMode ?? '')
        ? options.safeMode
        : 'mask') as SafeMode)
      : undefined;

    // Parse --max-rows
    const maxRows = options.maxRows ? parseInt(options.maxRows, 10) : undefined;

    // Parse --around (format: column=value)
    let around: { column: string; value: string } | undefined;
    if (options.around) {
      const eqIdx = options.around.indexOf('=');
      if (eqIdx > 0) {
        around = {
          column: options.around.substring(0, eqIdx),
          value: options.around.substring(eqIdx + 1),
        };
      }
    }

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Capture');
      console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
      console.log(`Database: ${masked}`);
      console.log(`Name: ${options.name}`);
      if (tables) {
        console.log(`Tables: ${tables.join(', ')}`);
      }
      if (options.safe) {
        console.log(`Safe mode: ${safeMode} (PII will be sanitized)`);
      }
      if (maxRows !== undefined) {
        console.log(`Max rows per table: ${maxRows}`);
      }
      if (around) {
        console.log('');
      }
      console.log('');
      console.log('Capturing...');
    }

    const result = await captureDatabase(config, {
      name: options.name,
      description: options.description,
      tables,
      outputDir: options.output,
      safe: options.safe,
      safeMode,
      maxRows,
      around,
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
          safeMode: result.pack.metadata.safeMode,
          piiSummary: result.piiSummary,
          tables: result.tableDetails.map((t) => ({
            name: t.name,
            rowCount: t.rowCount,
          })),
          ddlIncluded: true,
        },
      }));
      return;
    }

    // Print PII detection summary if --safe
    if (options.safe && result.piiSummary) {
      const { columnsDetected, tablesAffected, categoriesFound } = result.piiSummary;
      if (columnsDetected > 0) {
        console.log(`PII detected: ${columnsDetected} columns across ${tablesAffected} tables. Sanitizing...`);
        console.log(`  Categories: ${categoriesFound.join(', ')}`);
        console.log('');
      } else {
        console.log('No PII detected — data captured as-is.');
        console.log('');
      }
    }

    // Print --around message
    if (around) {
      console.log(`Capturing rows related to ${around.column}=${around.value} across ${result.tableCount} tables`);
      console.log('');
    }

    for (const table of result.tableDetails) {
      console.log(`  ${table.name}: ${table.rowCount} rows`);
    }

    const fileStat = await stat(result.filePath);
    const sizeKb = Math.round(fileStat.size / 1024);

    console.log('');
    console.log(`Captured: ${result.filePath} (${sizeKb} KB)`);
    if (options.safe) {
      console.log(`Privacy: PII sanitized (${safeMode} mode). Safe to share.`);
    }
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
