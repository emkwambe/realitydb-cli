import { loadConfig } from '@databox/config';
import { resetDatabase } from '@databox/core';
import { maskConnectionString } from '../utils.js';

export async function resetCommand(options: {
  confirm?: boolean;
}): Promise<void> {
  if (!options.confirm) {
    console.log('');
    console.log('This will delete ALL seeded data. Run with --confirm to proceed.');
    console.log('');
    process.exit(0);
  }

  try {
    const config = await loadConfig();
    const masked = maskConnectionString(config.database.connectionString);

    console.log('');
    console.log('DataBox Reset');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    console.log('');

    console.log('Clearing tables...');
    const result = await resetDatabase(config);

    for (const tableName of result.tablesCleared) {
      console.log(`  ${tableName}: cleared`);
    }

    console.log('');
    console.log(`Reset complete. ${result.tablesCleared.length} tables cleared in ${result.durationMs}ms`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Config file not found')) {
      console.error(`[databox] ${message}`);
      console.error('Hint: Copy databox.config.example.json to databox.config.json');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[databox] Reset failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[databox] Reset failed: ${message}`);
    }
    process.exit(1);
  }
}
