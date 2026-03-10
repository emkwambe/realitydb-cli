import { loadConfig } from '@databox/config';
import { scanDatabase } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '0.4.0';

export async function scanCommand(options: {
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig();
    const result = await scanDatabase(config);
    const { schema } = result;
    const masked = maskConnectionString(config.database.connectionString);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'scan',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          tableCount: schema.tableCount,
          foreignKeyCount: schema.foreignKeyCount,
          tables: schema.tables.map((t) => ({
            name: t.name,
            columnCount: t.columns.length,
            primaryKey: t.primaryKey?.columnName ?? null,
          })),
          foreignKeys: schema.foreignKeys.map((fk) => ({
            source: `${fk.sourceTable}.${fk.sourceColumn}`,
            target: `${fk.targetTable}.${fk.targetColumn}`,
          })),
          insertionOrder: result.insertionOrder,
        },
      }));
      return;
    }

    console.log('');
    console.log('RealityDB Schema Scan');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    console.log(`Tables: ${schema.tableCount}`);
    console.log(`Foreign Keys: ${schema.foreignKeyCount}`);
    console.log('');

    console.log('Tables:');
    for (const table of schema.tables) {
      const pkLabel = table.primaryKey ? `, PK: ${table.primaryKey.columnName}` : '';
      console.log(`  ${table.name} (${table.columns.length} columns${pkLabel})`);
    }
    console.log('');

    if (schema.foreignKeys.length > 0) {
      console.log('Foreign Key Relationships:');
      for (const fk of schema.foreignKeys) {
        console.log(`  ${fk.sourceTable}.${fk.sourceColumn} → ${fk.targetTable}.${fk.targetColumn}`);
      }
      console.log('');
    }

    if (result.hasCycles && result.cycleNodes) {
      console.log('⚠ Circular Dependencies Detected:');
      console.log(`  Tables involved: ${result.cycleNodes.join(', ')}`);
      console.log('');
    }

    console.log('Safe Insertion Order:');
    for (let i = 0; i < result.insertionOrder.length; i++) {
      console.log(`  ${i + 1}. ${result.insertionOrder[i]}`);
    }
    console.log('');

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(`⚠ ${warning}`);
      }
      console.log('');
    }

    console.log('Scan complete. Ready for seed.');
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'scan',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] Scan failed: ${message}`);
    process.exit(1);
  }
}
