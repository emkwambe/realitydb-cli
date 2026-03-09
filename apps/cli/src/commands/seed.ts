import { loadConfig } from '@databox/config';
import { seedDatabase } from '@databox/core';
import { maskConnectionString } from '../utils.js';

export async function seedCommand(options: {
  records?: string;
  template?: string;
  seed?: string;
}): Promise<void> {
  try {
    const config = await loadConfig();

    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;

    const effectiveSeed = seed ?? config.seed.randomSeed ?? 42;
    const effectiveRecords = records ?? config.seed.defaultRecords;
    const masked = maskConnectionString(config.database.connectionString);

    console.log('');
    console.log('DataBox Seed');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    if (config.template) {
      console.log(`Template: ${config.template}`);
    }
    console.log(`Seed: ${effectiveSeed}`);
    console.log(`Records per table: ${effectiveRecords}`);
    console.log('');

    console.log('Seeding...');
    const result = await seedDatabase(config, {
      records,
      seed,
      template: options.template,
    });

    console.log('');
    console.log('Writing to database...');
    for (const tableResult of result.insertResult.tables) {
      console.log(
        `  ${tableResult.tableName}: ${tableResult.rowsInserted} rows inserted (${tableResult.batchCount} batches, ${tableResult.durationMs}ms)`,
      );
    }

    const totalTime = (result.durationMs / 1000).toFixed(1);
    console.log('');
    console.log(`Seed complete. ${result.totalRows} rows in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Config file not found')) {
      console.error(`[databox] ${message}`);
      console.error('Hint: Copy databox.config.example.json to databox.config.json');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[databox] Seed failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[databox] Seed failed: ${message}`);
      console.error('Database was not modified (transaction rolled back).');
    }
    process.exit(1);
  }
}
