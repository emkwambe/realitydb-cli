import { loadConfig } from '@databox/config';
import { exportDataset } from '@databox/core';
import { maskConnectionString } from '../utils.js';

export async function exportCommand(options: {
  format?: string;
  output?: string;
  records?: string;
  seed?: string;
}): Promise<void> {
  try {
    const config = await loadConfig();

    const format = (options.format ?? config.export?.defaultFormat ?? 'json') as 'json' | 'csv' | 'sql';
    const outputDir = options.output ?? config.export?.outputDir ?? './.databox';
    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const effectiveRecords = records ?? config.seed.defaultRecords;
    const masked = maskConnectionString(config.database.connectionString);

    console.log('');
    console.log('DataBox Export');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    console.log(`Format: ${format}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Records per table: ${effectiveRecords}`);
    console.log('');

    console.log('Generating dataset...');
    const result = await exportDataset(config, {
      format,
      outputDir,
      records,
      seed,
    });

    console.log('Exporting...');
    for (const filePath of result.files) {
      console.log(`  ${filePath}`);
    }

    console.log('');
    console.log(`Export complete. ${result.files.length} files written.`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Config file not found')) {
      console.error(`[databox] ${message}`);
      console.error('Hint: Copy databox.config.example.json to databox.config.json');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[databox] Export failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[databox] Export failed: ${message}`);
    }
    process.exit(1);
  }
}
