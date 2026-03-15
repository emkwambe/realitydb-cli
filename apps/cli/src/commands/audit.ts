import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { verifyAuditLogIntegrity, formatAuditLog, decryptTokenMap } from '@databox/core';
import type { MaskAuditLog } from '@databox/core';

/**
 * Prompts for a passphrase with masked input (callback-based readline for Windows compatibility).
 */
function askPassphrase(prompt: string): Promise<string> {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: stdin, output: stdout });
    const originalWrite = stdout.write.bind(stdout);
    let muted = false;
    stdout.write = ((chunk: string | Uint8Array, ...args: unknown[]) => {
      if (muted && typeof chunk === 'string' && !chunk.includes(prompt)) {
        return originalWrite('*');
      }
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof stdout.write;

    rl.question(prompt, (answer) => {
      muted = false;
      stdout.write = originalWrite;
      console.log('');
      rl.close();
      resolvePromise(answer);
    });
    muted = true;
  });
}

/**
 * realitydb audit verify <log-file>
 */
export async function auditVerifyCommand(logFile: string, options: { ci?: boolean }): Promise<void> {
  try {
    const filePath = resolve(logFile);
    const raw = readFileSync(filePath, 'utf-8');
    const log: MaskAuditLog = JSON.parse(raw);

    const result = verifyAuditLogIntegrity(log);
    const entryCount = log.tables?.length ?? 0;

    if (options.ci) {
      console.log(JSON.stringify({
        file: filePath,
        entries: entryCount,
        valid: result.valid,
        brokenAt: result.brokenAt ?? null,
      }));
      process.exit(result.valid ? 0 : 1);
    }

    console.log('');
    console.log('Audit Chain Verification');
    console.log('═══════════════════════════════════════');
    console.log(`File: ${logFile}`);
    console.log(`Entries: ${entryCount}`);

    if (result.valid) {
      console.log('Chain integrity: VERIFIED (all hashes valid)');
    } else {
      console.log(`Chain integrity: BROKEN at table "${result.brokenAt}"`);
      console.log('The audit log has been tampered with.');
    }
    console.log('');

    process.exit(result.valid ? 0 : 1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[realitydb] Audit verify failed: ${message}`);
    process.exit(1);
  }
}

/**
 * realitydb audit summary <log-file>
 */
export async function auditSummaryCommand(logFile: string, options: { ci?: boolean }): Promise<void> {
  try {
    const filePath = resolve(logFile);
    const raw = readFileSync(filePath, 'utf-8');
    const log: MaskAuditLog = JSON.parse(raw);

    if (options.ci) {
      console.log(JSON.stringify({
        file: filePath,
        complianceMode: log.complianceMode,
        summary: log.summary,
        tables: log.tables.map((t) => ({
          tableName: t.tableName,
          rowCount: t.rowCount,
          piiColumnsDetected: t.piiColumnsDetected,
          columnsMasked: t.columnsMasked,
        })),
      }));
      return;
    }

    console.log('');
    console.log(formatAuditLog(log));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[realitydb] Audit summary failed: ${message}`);
    process.exit(1);
  }
}

/**
 * realitydb audit re-identify --token-map <file>
 */
export async function auditReIdentifyCommand(options: { tokenMap?: string; ci?: boolean }): Promise<void> {
  try {
    if (!options.tokenMap) {
      console.error('[realitydb] --token-map <file> is required for re-identify');
      process.exit(1);
    }

    const filePath = resolve(options.tokenMap);
    const encryptedData = readFileSync(filePath, 'utf-8').trim();

    const passphrase = await askPassphrase('Enter passphrase to decrypt token map: ');
    if (!passphrase) {
      console.error('[realitydb] Passphrase cannot be empty.');
      process.exit(1);
    }

    const tokenMap = decryptTokenMap(encryptedData, passphrase);

    if (options.ci) {
      console.log(JSON.stringify({
        totalTokens: tokenMap.totalTokens,
        tokenPrefix: tokenMap.tokenPrefix,
        createdAt: tokenMap.createdAt,
        entries: tokenMap.entries.length,
      }));
      return;
    }

    console.log('');
    console.log('Token Map Re-Identification');
    console.log('═══════════════════════════════════════');
    console.log(`Token prefix: ${tokenMap.tokenPrefix}`);
    console.log(`Created: ${tokenMap.createdAt}`);
    console.log('');

    // Group by table
    const byTable = new Map<string, typeof tokenMap.entries>();
    for (const entry of tokenMap.entries) {
      const existing = byTable.get(entry.tableName) ?? [];
      existing.push(entry);
      byTable.set(entry.tableName, existing);
    }

    for (const [tableName, entries] of byTable) {
      console.log(`Table: ${tableName}`);
      console.log('───────────────────────────────────────');
      for (const entry of entries) {
        console.log(`  ${entry.token} → ${String(entry.originalValue)} (${entry.columnName}, ${entry.piiCategory})`);
      }
      console.log('');
    }

    console.log(`Restored ${tokenMap.totalTokens} token mappings`);
    console.log('');
    console.log('These are real PII values. Handle according to your data policy.');
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Decryption failed')) {
      console.error(message);
    } else {
      console.error(`[realitydb] Re-identify failed: ${message}`);
    }
    process.exit(1);
  }
}
