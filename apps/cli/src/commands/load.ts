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

export async function loadCommand(
  filePath: string,
  options: { confirm?: boolean; showDdl?: boolean; ci?: boolean; configPath?: string },
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
      console.log('');
    }

    if (!options.ci && !options.confirm) {
      console.error('[realitydb] Load requires --confirm flag.');
      console.error('Hint: This will insert data into your database. Use --confirm to proceed.');
      console.error('');
      console.error('To view the schema DDL first:');
      console.error(`  realitydb load ${filePath} --show-ddl`);
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
    console.log(`Load complete. ${result.totalRows} rows in ${totalTime}s`);
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
