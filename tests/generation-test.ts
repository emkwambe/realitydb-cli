import { loadConfig } from '@databox/config';
import { createDatabaseClient, testConnection, closeConnection } from '@databox/db';
import { introspectDatabase } from '@databox/schema';
import { buildGenerationPlan, validateGenerationPlan } from '@databox/core';
import { generateDataset } from '@databox/generators';
import type { GeneratedDataset } from '@databox/generators';

async function main() {
  console.log('DataBox Generation Test');
  console.log('═══════════════════════════════════════\n');

  // 1. Load config
  const config = loadConfig();
  console.log(`Config loaded: ${config.seed.defaultRecords} records, seed=${config.seed.randomSeed ?? 42}`);

  // 2. Connect to DB
  const pool = createDatabaseClient(config.database.client, config.database.connectionString);
  const connected = await testConnection(pool);
  if (!connected) {
    console.error('Failed to connect to database');
    process.exit(1);
  }
  console.log('Database connected.\n');

  // 3. Introspect schema
  const schema = await introspectDatabase(pool);
  console.log(`Schema: ${schema.tableCount} tables, ${schema.foreignKeyCount} foreign keys\n`);

  // 4. Build generation plan
  const plan = buildGenerationPlan(schema, config);
  console.log('Generation Plan:');
  console.log(`  Plan ID: ${plan.planId}`);
  console.log(`  Version: ${plan.version}`);
  console.log(`  Table Order: ${plan.tableOrder.join(' → ')}`);
  console.log(`  Tables:`);
  for (const table of plan.tables) {
    console.log(`    ${table.tableName}: ${table.rowCount} rows, ${table.columns.length} columns, deps=[${table.dependencies.join(', ')}]`);
  }

  // 4b. Validate plan
  const validation = validateGenerationPlan(plan);
  console.log(`  Plan valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log(`  Errors: ${validation.errors.join('; ')}`);
  }
  console.log();

  // 5. Generate dataset (run 1)
  console.log('Generating dataset (run 1, seed=42)...');
  const dataset1 = generateDataset(plan);
  printDatasetSummary(dataset1);

  // 6. Generate dataset (run 2) — determinism check
  console.log('\nGenerating dataset (run 2, seed=42)...');
  const dataset2 = generateDataset(plan);
  printDatasetSummary(dataset2);

  // 7. Determinism check
  console.log('\n═══════════════════════════════════════');
  console.log('Determinism Check:');
  const identical = datasetsAreIdentical(dataset1, dataset2);
  console.log(`  Datasets identical: ${identical ? 'PASS ✅' : 'FAIL ❌'}`);

  // 8. Close connection
  await closeConnection(pool);
  console.log('\nDone.');
}

function printDatasetSummary(dataset: GeneratedDataset) {
  console.log(`  Total rows: ${dataset.totalRows}`);
  console.log(`  Seed: ${dataset.seed}`);
  console.log(`  Tables:`);
  for (const [name, table] of dataset.tables) {
    console.log(`    ${name}: ${table.rowCount} rows, columns=[${table.columns.join(', ')}]`);
    if (table.rows.length > 0) {
      console.log(`      Sample row:`, JSON.stringify(table.rows[0], null, 2).split('\n').map((l, i) => i === 0 ? l : '      ' + l).join('\n'));
    }
  }
}

function datasetsAreIdentical(a: GeneratedDataset, b: GeneratedDataset): boolean {
  if (a.totalRows !== b.totalRows) return false;
  if (a.seed !== b.seed) return false;

  for (const [tableName, tableA] of a.tables) {
    const tableB = b.tables.get(tableName);
    if (!tableB) return false;
    if (tableA.rowCount !== tableB.rowCount) return false;

    for (let i = 0; i < tableA.rows.length; i++) {
      const rowA = JSON.stringify(tableA.rows[i]);
      const rowB = JSON.stringify(tableB.rows[i]);
      if (rowA !== rowB) {
        console.log(`  Mismatch at ${tableName} row ${i}:`);
        console.log(`    Run 1: ${rowA}`);
        console.log(`    Run 2: ${rowB}`);
        return false;
      }
    }
  }

  return true;
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
