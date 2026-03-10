import { loadConfig } from '@databox/config';
import { resetDatabase } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '0.3.0';

export async function resetCommand(options: {
  confirm?: boolean;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();

  // CI mode skips --confirm (non-interactive)
  if (!options.ci && !options.confirm) {
    console.log('');
    console.log('This will delete ALL seeded data. Run with --confirm to proceed.');
    console.log('');
    process.exit(0);
  }

  try {
    const config = await loadConfig();
    const masked = maskConnectionString(config.database.connectionString);

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Reset');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      console.log('');
      console.log('Clearing tables...');
    }

    const result = await resetDatabase(config);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'reset',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          tablesCleared: result.tablesCleared,
          tableCount: result.tablesCleared.length,
        },
      }));
      return;
    }

    for (const tableName of result.tablesCleared) {
      console.log(`  ${tableName}: cleared`);
    }

    console.log('');
    console.log(`Reset complete. ${result.tablesCleared.length} tables cleared in ${result.durationMs}ms`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'reset',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('Hint: Copy realitydb.config.json to realitydb.config.json');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Reset failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Reset failed: ${message}`);
    }
    process.exit(1);
  }
}
