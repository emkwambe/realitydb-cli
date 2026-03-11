import { loadConfig } from '@databox/config';
import { seedDatabase, getDefaultScenarioRegistry } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';
import { resolveTemplate } from '../resolveTemplate.js';

const VERSION = '1.0.0';

export async function seedCommand(options: {
  records?: string;
  template?: string;
  seed?: string;
  timeline?: string;
  scenario?: string;
  scenarioIntensity?: string;
  scenarioSchedule?: string;
  lifecycle?: boolean;
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig();

    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const templateName = options.template ?? config.template;
    const timeline = options.timeline;
    const scenario = options.scenario;
    const scenarioIntensity = (options.scenarioIntensity ?? 'medium') as 'low' | 'medium' | 'high';
    const scenarioSchedule = options.scenarioSchedule;
    const lifecycle = options.lifecycle ?? false;

    // Validate: --scenario-schedule requires --timeline
    if (scenarioSchedule && !timeline) {
      const msg = '--scenario-schedule requires --timeline to be set';
      if (options.ci) {
        console.log(formatCIOutput({
          success: false,
          command: 'seed',
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

    // Validate template if specified (supports file paths, built-in, and user dir)
    if (templateName) {
      try {
        resolveTemplate(templateName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (options.ci) {
          console.log(formatCIOutput({
            success: false,
            command: 'seed',
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
    }

    // Validate scenario names if specified
    if (scenario) {
      const scenarioRegistry = getDefaultScenarioRegistry();
      const scenarioNames = scenario.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      for (const name of scenarioNames) {
        if (!scenarioRegistry.get(name)) {
          if (options.ci) {
            console.log(formatCIOutput({
              success: false,
              command: 'seed',
              version: VERSION,
              timestamp: new Date().toISOString(),
              durationMs: Math.round(performance.now() - start),
              error: `Scenario "${name}" not found`,
            }));
            process.exit(1);
          }
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

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Seed');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      if (templateName) {
        console.log(`Template: ${templateName}`);
      }
      if (timeline) {
        console.log(`Timeline: ${timeline}`);
        console.log(`Growth: s-curve`);
      }
      console.log(`Seed: ${effectiveSeed}`);
      console.log(`Records per table: ${effectiveRecords}`);
      if (lifecycle) {
        console.log('Lifecycle: enabled');
      }
      if (scenario) {
        const scenarioNames = scenario.split(',').map((s) => s.trim());
        const scenarioDisplay = scenarioNames.map((s) => `${s} (${scenarioIntensity})`).join(', ');
        console.log(`Scenarios: ${scenarioDisplay}`);
      }
      if (scenarioSchedule) {
        console.log(`Scenario schedule: ${scenarioSchedule}`);
      }
      console.log('');

      if (lifecycle) {
        console.log('Simulating lifecycles...');
      } else if (timeline) {
        console.log('Generating with timeline...');
      } else {
        console.log('Seeding...');
      }
    }

    const result = await seedDatabase(config, {
      records,
      seed,
      template: templateName,
      timeline,
      scenarios: scenario,
      scenarioIntensity,
      scenarioSchedule,
      lifecycle,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'seed',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          database: masked,
          template: templateName ?? null,
          seed: effectiveSeed,
          recordsPerTable: effectiveRecords,
          totalRows: result.totalRows,
          tables: result.insertResult.tables.map((t) => ({
            name: t.tableName,
            rowsInserted: t.rowsInserted,
            batchCount: t.batchCount,
            durationMs: t.durationMs,
          })),
          timelineUsed: !!timeline,
          lifecycleUsed: !!lifecycle,
          scenariosApplied: result.scenariosApplied ?? [],
          scenarioReport: result.scenarioReport ?? null,
        },
      }));
      return;
    }

    // Print scenario results if any
    if (result.scenariosApplied && result.scenariosApplied.length > 0) {
      console.log('');
      console.log('Scenario Report');
      console.log('───────────────────────────────────────');
      for (const sr of result.scenariosApplied) {
        console.log(`  ${sr.scenarioName}: ${sr.rowsAffected} rows affected`);
        for (const mod of sr.modifications) {
          console.log(`    ${mod}`);
        }
      }
    }

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
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'seed',
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
    } else if (message.includes('Invalid timeline format')) {
      console.error(`[realitydb] ${message}`);
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Seed failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Seed failed: ${message}`);
      console.error('Database was not modified (transaction rolled back).');
    }
    process.exit(1);
  }
}
