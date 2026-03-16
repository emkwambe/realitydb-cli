import { loadConfig } from '@databox/config';
import { importPack, loadRealityPack, downloadPack } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maskConnectionString } from '../utils.js';

const VERSION = '0.10.0';

function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

function displaySafeModeStatus(safeMode: string | undefined): void {
  if (!safeMode) {
    console.warn('Note: This pack was captured before privacy-safe mode was available');
  } else if (safeMode === 'raw') {
    console.log('WARNING: This pack contains raw (unsanitized) data');
  } else if (safeMode === 'masked') {
    console.log('This pack was captured with PII masking');
  } else if (safeMode === 'tokenized') {
    console.log('This pack was captured with PII tokenization');
  } else if (safeMode === 'redacted') {
    console.log('This pack was captured with PII redaction');
  }
}

export async function loadCommand(
  filePath: string,
  options: { confirm?: boolean; showDdl?: boolean; preview?: boolean; ci?: boolean; configPath?: string },
): Promise<void> {
  const start = performance.now();
  try {
    if (!filePath) {
      const msg = 'Missing file path or URL argument.';
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'load',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: 0,
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      console.error('Usage: realitydb load <file|url> --confirm');
      process.exit(1);
    }

    let localPath = filePath;

    // Download from URL if needed
    if (isUrl(filePath)) {
      if (!options.ci) {
        console.log('');
        console.log(`Downloading pack from ${filePath}...`);
      }
      const content = await downloadPack(filePath);
      const tempPath = join(tmpdir(), `realitydb-download-${Date.now()}.realitydb-pack.json`);
      await writeFile(tempPath, content, 'utf-8');
      localPath = tempPath;
      if (!options.ci) {
        console.log('Download complete.');
      }
    }

    // Load and validate the pack for display
    const pack = await loadRealityPack(localPath);

    // --preview: show pack contents without importing
    if (options.preview) {
      const meta = pack.metadata as Record<string, unknown>;
      const safeMode = meta.safeMode as string | undefined;
      const piiSummary = meta.piiSummary as { columnsDetected: number; tablesAffected: number; categoriesFound: string[] } | undefined;

      if (options.ci) {
        const tableNames = Object.keys(pack.dataset.tables);
        const tableInfo = tableNames.map((name) => ({
          name,
          rowCount: pack.dataset.tables[name].rowCount,
        }));
        console.log(formatCIOutput({
          success: true,
          command: 'load',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          data: {
            packName: pack.metadata.name,
            safeMode: safeMode ?? null,
            piiSummary: piiSummary ?? null,
            tableCount: pack.metadata.tableCount,
            totalRows: pack.metadata.totalRows,
            tables: tableInfo,
          },
        }));
        return;
      }

      console.log('');
      console.log('Reality Pack Preview');
      console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
      console.log(`Name: ${pack.metadata.name}`);
      if (pack.metadata.description) {
        console.log(`Description: ${pack.metadata.description}`);
      }
      console.log(`Tables: ${pack.metadata.tableCount}`);
      console.log(`Total rows: ${pack.metadata.totalRows}`);
      console.log('');
      displaySafeModeStatus(safeMode);

      if (piiSummary) {
        console.log(`  PII columns detected: ${piiSummary.columnsDetected}`);
        console.log(`  Tables affected: ${piiSummary.tablesAffected}`);
        console.log(`  Categories: ${piiSummary.categoriesFound.join(', ')}`);
      }

      console.log('');
      console.log('Tables:');
      for (const [name, tableData] of Object.entries(pack.dataset.tables)) {
        console.log(`  ${name}: ${tableData.rowCount} rows`);
      }
      console.log('');
      return;
    }

    // --show-ddl: just print the DDL and exit
    if (options.showDdl) {
      const ddl = (pack.metadata as Record<string, unknown>).ddl as string | undefined;
      if (options.ci) {
        console.log(formatCIOutput({
          success: true,
          command: 'load',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          data: {
            packName: pack.metadata.name,
            ddlAvailable: !!ddl,
            ddl: ddl ?? null,
          },
        }));
        return;
      }
      if (ddl) {
        console.log('');
        console.log('Schema DDL (run this SQL to create tables):');
        console.log('');
        console.log(ddl);
      } else {
        console.log('');
        console.log('No DDL available in this Reality Pack.');
        console.log('This pack was created with pack export (generated data), not capture.');
        console.log('');
      }
      return;
    }

    const config = await loadConfig(options.configPath);
    const masked = maskConnectionString(config.database.connectionString);

    const meta = pack.metadata as Record<string, unknown>;
    const safeMode = meta.safeMode as string | undefined;

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Load');
      console.log('\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550');
      console.log(`Database: ${masked}`);
      console.log(`Pack: ${pack.metadata.name} (v${pack.version})`);
      if (pack.metadata.templateName) {
        console.log(`Template: ${pack.metadata.templateName}`);
      }
      console.log(`Tables: ${pack.metadata.tableCount}`);
      console.log(`Total rows: ${pack.metadata.totalRows}`);
      if (isUrl(filePath)) {
        console.log(`Source: ${filePath}`);
      }

      const ddl = (pack.metadata as Record<string, unknown>).ddl as string | undefined;
      if (ddl) {
        console.log('Schema DDL: included');
      }

      // Display safe mode status prominently
      console.log('');
      displaySafeModeStatus(safeMode);
      console.log('');
    }

    if (!options.ci && !options.confirm) {
      console.error('[realitydb] Load requires --confirm flag.');
      console.error('Hint: This will insert data into your database. Use --confirm to proceed.');
      console.error('');
      console.error('To view the schema DDL first:');
      console.error(`  realitydb load ${filePath} --show-ddl`);
      console.error('');
      console.error('To preview pack contents:');
      console.error(`  realitydb load ${filePath} --preview`);
      process.exit(1);
    }

    if (!options.ci) {
      console.log('Loading...');
    }

    const result = await importPack(config, localPath);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'load',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          packName: pack.metadata.name,
          totalRows: result.totalRows,
          safeMode: safeMode ?? null,
          source: isUrl(filePath) ? filePath : undefined,
          tables: result.insertResult.tables.map((t) => ({
            name: t.tableName,
            rowsInserted: t.rowsInserted,
            durationMs: t.durationMs,
          })),
        },
      }));
      return;
    }

    for (const tableResult of result.insertResult.tables) {
      console.log(
        `  ${tableResult.tableName}: ${tableResult.rowsInserted} rows loaded`,
      );
    }

    const totalTime = (result.durationMs / 1000).toFixed(1);
    console.log('');
    console.log(`Bug reproduction environment ready. ${result.insertResult.tables.length} tables, ${result.totalRows} rows loaded.`);
    console.log(`Load complete in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'load',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('Cannot import Reality Pack')) {
      console.error(`[realitydb] ${message}`);
      const ddlHint = 'Tip: Use --show-ddl to get the schema creation SQL.';
      console.error(ddlHint);
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Load failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Load failed: ${message}`);
    }
    process.exit(1);
  }
}
