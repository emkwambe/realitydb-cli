import { resolve } from 'node:path';
import { loadConfig } from '@databox/config';
import { exportPack, importPack, loadRealityPack, getDefaultScenarioRegistry } from '@databox/core';
import { maskConnectionString } from '../utils.js';
import { resolveTemplate } from '../resolveTemplate.js';
import { stat } from 'node:fs/promises';

export async function packExportCommand(options: {
  name?: string;
  description?: string;
  output?: string;
  records?: string;
  seed?: string;
  template?: string;
  timeline?: string;
  scenario?: string;
  scenarioIntensity?: string;
}): Promise<void> {
  try {
    const config = await loadConfig();

    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const rawTemplateName = options.template ?? config.template;
    // Resolve file paths to absolute paths so downstream code can find the file
    const templateName = rawTemplateName && (rawTemplateName.includes('/') || rawTemplateName.includes('\\') || rawTemplateName.endsWith('.json'))
      ? resolve(rawTemplateName)
      : rawTemplateName;
    const outputDir = options.output ?? '.';
    const scenarioIntensity = (options.scenarioIntensity ?? 'medium') as 'low' | 'medium' | 'high';

    // Validate template if specified (supports file paths, built-in, and user dir)
    if (templateName) {
      try {
        resolveTemplate(templateName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[realitydb] ${msg}`);
        process.exit(1);
      }
    }

    // Validate scenario names if specified
    if (options.scenario) {
      const scenarioRegistry = getDefaultScenarioRegistry();
      const scenarioNames = options.scenario.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      for (const name of scenarioNames) {
        if (!scenarioRegistry.get(name)) {
          const available = scenarioRegistry.list();
          console.error(`[realitydb] Scenario "${name}" not found.`);
          console.error('');
          console.error('Available scenarios:');
          for (const s of available) {
            console.error(`  ${s.name} — ${s.description} (${s.supportedIntensities.join(', ')})`);
          }
          process.exit(1);
        }
      }
    }

    const effectiveSeed = seed ?? config.seed.randomSeed ?? 42;
    const effectiveRecords = records ?? config.seed.defaultRecords;
    const masked = maskConnectionString(config.database.connectionString);

    console.log('');
    console.log('Reality Pack Export');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    if (options.name) {
      console.log(`Name: ${options.name}`);
    }
    if (templateName) {
      console.log(`Template: ${templateName}`);
    }
    if (options.timeline) {
      console.log(`Timeline: ${options.timeline}`);
    }
    console.log(`Seed: ${effectiveSeed}`);
    console.log(`Records per table: ${effectiveRecords}`);
    if (options.scenario) {
      const scenarioNames = options.scenario.split(',').map((s) => s.trim());
      const scenarioDisplay = scenarioNames.map((s) => `${s} (${scenarioIntensity})`).join(', ');
      console.log(`Scenarios: ${scenarioDisplay}`);
    }
    console.log('');

    console.log('Generating dataset...');

    const result = await exportPack(config, {
      name: options.name,
      description: options.description,
      outputDir,
      records,
      seed,
      template: templateName,
      timeline: options.timeline,
      scenarios: options.scenario,
      scenarioIntensity,
    });

    const fileStat = await stat(result.filePath);
    const sizeKb = Math.round(fileStat.size / 1024);

    console.log('');
    console.log(`Tables: ${result.pack.metadata.tableCount}`);
    console.log(`Total rows: ${result.pack.metadata.totalRows}`);
    console.log('');
    console.log(`Exported: ${result.filePath} (${sizeKb} KB)`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('Hint: Copy realitydb.config.json to realitydb.config.json');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Pack export failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Pack export failed: ${message}`);
    }
    process.exit(1);
  }
}

export async function packImportCommand(
  filePath: string,
  options: { confirm?: boolean },
): Promise<void> {
  try {
    if (!options.confirm) {
      console.error('[realitydb] Import requires --confirm flag.');
      console.error('Hint: This will insert data into your database. Use --confirm to proceed.');
      process.exit(1);
    }

    if (!filePath) {
      console.error('[realitydb] Missing file path argument.');
      console.error('Usage: realitydb pack import <file> --confirm');
      process.exit(1);
    }

    const config = await loadConfig();
    const masked = maskConnectionString(config.database.connectionString);

    // Quick-validate by loading the pack first for display
    const pack = await loadRealityPack(filePath);

    console.log('');
    console.log('Reality Pack Import');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${masked}`);
    console.log(`Pack: ${pack.metadata.name} (v${pack.version})`);
    if (pack.metadata.templateName) {
      console.log(`Template: ${pack.metadata.templateName}`);
    }
    console.log(`Tables: ${pack.metadata.tableCount}`);
    console.log(`Total rows: ${pack.metadata.totalRows}`);
    console.log('');

    console.log('Importing...');
    const result = await importPack(config, filePath);

    for (const tableResult of result.insertResult.tables) {
      console.log(
        `  ${tableResult.tableName}: ${tableResult.rowsInserted} rows inserted`,
      );
    }

    const totalTime = (result.durationMs / 1000).toFixed(1);
    console.log('');
    console.log(`Import complete. ${result.totalRows} rows in ${totalTime}s`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Config file not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('Hint: Copy realitydb.config.json to realitydb.config.json');
    } else if (message.includes('Cannot import Reality Pack')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('Invalid Reality Pack')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('Failed to read Reality Pack')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Pack import failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Pack import failed: ${message}`);
    }
    process.exit(1);
  }
}
