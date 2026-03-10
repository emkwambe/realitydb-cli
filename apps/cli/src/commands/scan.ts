import { loadConfig } from '@databox/config';
import { scanDatabase } from '@databox/core';
import { maskConnectionString } from '../utils.js';

export async function scanCommand(): Promise<void> {
  try {
    const config = await loadConfig();

    const result = await scanDatabase(config);
    const { schema } = result;

    const masked = maskConnectionString(config.database.connectionString);

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
    console.error(`[realitydb] Scan failed: ${message}`);
    process.exit(1);
  }
}
