import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '@databox/config';
import { maskDatabase, formatAuditLog, serializeAuditLog } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '1.3.1';

export async function maskCommand(options: {
  mode?: string;
  seed?: string;
  dryRun?: boolean;
  output?: string;
  outputFormat?: string;
  auditLog?: string;
  confirm?: boolean;
  ci?: boolean;
  configPath?: string;
  tokenize?: boolean;
  tokenMap?: string;
  deepScan?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig(options.configPath);
    const mode = (options.mode ?? 'gdpr') as 'hipaa' | 'gdpr' | 'strict';
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const dryRun = options.dryRun ?? false;
    const outputFormat = (options.outputFormat ?? 'json') as 'json' | 'csv' | 'sql';
    const masked = maskConnectionString(config.database.connectionString);

    // Validate mode
    if (!['hipaa', 'gdpr', 'strict'].includes(mode)) {
      const msg = `Invalid compliance mode "${mode}". Use: hipaa, gdpr, strict`;
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'mask',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      process.exit(1);
    }

    // Require --confirm or --dry-run or --output for safety
    if (!dryRun && !options.output && !options.confirm) {
      const msg = 'Data masking modifies data in-place. Use --dry-run to preview, --output <dir> to export, or --confirm to write to database.';
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'mask',
          version: VERSION,
          timestamp: new Date().toISOString(),
          durationMs: Math.round(performance.now() - start),
          error: msg,
        }));
        process.exit(1);
      }
      console.error(`[realitydb] ${msg}`);
      process.exit(1);
    }

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Mask');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      console.log(`Compliance mode: ${mode}`);
      if (seed !== undefined) {
        console.log(`Seed: ${seed}`);
      }
      if (dryRun) {
        console.log('Mode: dry-run (no changes will be made)');
      } else if (options.output) {
        console.log(`Output: ${options.output} (${outputFormat})`);
      } else {
        console.log('Mode: write to database (--confirm)');
      }
      if (options.tokenize) {
        console.log('Masking: tokenization (reversible)');
        if (options.tokenMap) {
          console.log(`Token map: ${options.tokenMap}`);
        }
      }
      if (options.auditLog) {
        console.log(`Audit log: ${options.auditLog}`);
      }
      console.log('');
      console.log('Scanning for PII...');
    }

    const result = await maskDatabase(config, {
      mode,
      seed,
      dryRun,
      output: options.output,
      outputFormat,
      auditLog: options.auditLog,
      confirm: options.confirm,
      tokenize: options.tokenize,
      tokenMapOutput: options.tokenMap,
      deepScan: options.deepScan,
    });

    const durationMs = Math.round(performance.now() - start);

    // Write audit log file if requested
    if (options.auditLog) {
      const auditPath = resolve(options.auditLog);
      writeFileSync(auditPath, serializeAuditLog(result.auditLog) + '\n', 'utf-8');
    }

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'mask',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          complianceMode: mode,
          dryRun,
          tablesProcessed: result.tablesProcessed,
          totalRowsMasked: result.totalRowsMasked,
          summary: result.auditLog.summary,
          tables: result.auditLog.tables.map((t) => ({
            tableName: t.tableName,
            rowCount: t.rowCount,
            piiColumnsDetected: t.piiColumnsDetected,
            columnsMasked: t.columnsMasked,
          })),
          outputFiles: result.outputFiles ?? null,
          auditLogFile: options.auditLog ?? null,
        },
      }));
      return;
    }

    // Print audit report
    console.log(formatAuditLog(result.auditLog));

    if (result.outputFiles && result.outputFiles.length > 0) {
      console.log('Output files');
      console.log('───────────────────────────────────────');
      for (const filePath of result.outputFiles) {
        console.log(`  ${filePath}`);
      }
      console.log('');
    }

    if (options.auditLog) {
      console.log(`Audit log written to: ${resolve(options.auditLog)}`);
      console.log('');
    }

    if (options.tokenMap && result.tokenMap) {
      console.log(`Token map written to: ${resolve(options.tokenMap)}`);
      console.log(`  ${result.tokenMap.totalTokens} unique tokens generated`);
      console.log('  WARNING: Store this file securely — it enables re-identification');
      console.log('');
    }

    const totalTime = (durationMs / 1000).toFixed(1);
    if (dryRun) {
      console.log(`Dry run complete in ${totalTime}s. No data was modified.`);
    } else {
      console.log(`Mask complete. ${result.totalRowsMasked} rows masked in ${totalTime}s`);
    }
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'mask',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('Hint: Create a realitydb.config.json with your database connection');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Mask failed: ${message}`);
      console.error('Hint: Check that your database is running');
    } else {
      console.error(`[realitydb] Mask failed: ${message}`);
    }
    process.exit(1);
  }
}
