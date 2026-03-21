import { resolve } from 'node:path';
import { loadConfig } from '@databox/config';
import { exportDataset, getDefaultScenarioRegistry } from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';
import { resolveTemplate } from '../resolveTemplate.js';

const VERSION = '1.3.1';

export async function exportCommand(options: {
  format?: string;
  output?: string;
  records?: string;
  seed?: string;
  template?: string;
  timeline?: string;
  scenario?: string;
  scenarioIntensity?: string;
  scenarioSchedule?: string;
  batchSize?: string;
  ci?: boolean;
  configPath?: string;
}): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig(options.configPath);

    const format = (options.format ?? config.export?.defaultFormat ?? 'json') as 'json' | 'csv' | 'sql';
    const outputDir = options.output ?? config.export?.outputDir ?? './.realitydb';
    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const rawTemplateName = options.template ?? config.template;
    // Resolve file paths to absolute paths so downstream code can find the file
    const templateName = rawTemplateName && (rawTemplateName.includes('/') || rawTemplateName.includes('\\') || rawTemplateName.endsWith('.json'))
      ? resolve(rawTemplateName)
      : rawTemplateName;
    const timeline = options.timeline;
    const scenario = options.scenario;
    const scenarioIntensity = (options.scenarioIntensity ?? 'medium') as 'low' | 'medium' | 'high';
    const effectiveRecords = records ?? config.seed.defaultRecords;
    const masked = maskConnectionString(config.database.connectionString);

    // Validate template if specified (supports file paths, built-in, and user dir)
    if (templateName) {
      try {
        resolveTemplate(templateName);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (options.ci) {
          console.log(formatCIOutput({
            success: false,
            command: 'export',
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
              command: 'export',
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

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Export');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      if (templateName) {
        console.log(`Template: ${templateName}`);
      }
      if (timeline) {
        console.log(`Timeline: ${timeline}`);
        console.log(`Growth: s-curve`);
      }
      console.log(`Format: ${format}`);
      console.log(`Output: ${outputDir}`);
      console.log(`Records per table: ${effectiveRecords}`);
      if (scenario) {
        const scenarioNames = scenario.split(',').map((s) => s.trim());
        const scenarioDisplay = scenarioNames.map((s) => `${s} (${scenarioIntensity})`).join(', ');
        console.log(`Scenarios: ${scenarioDisplay}`);
      }
      console.log('');
      console.log('Generating dataset...');
    }

    const batchSize = options.batchSize ? parseInt(options.batchSize, 10) : undefined;

    const result = await exportDataset(config, {
      format,
      outputDir,
      records,
      seed,
      template: templateName,
      timeline,
      scenarios: scenario,
      scenarioIntensity,
      scenarioSchedule: options.scenarioSchedule,
      batchSize,
    });

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'export',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          format,
          outputDir,
          files: result.files,
          totalRows: result.totalRows,
          fileCount: result.files.length,
        },
      }));
      return;
    }

    // Print scenario results if any
    if (result.scenariosApplied && result.scenariosApplied.length > 0) {
      console.log('Applying scenarios...');
      for (const sr of result.scenariosApplied) {
        console.log(`  ${sr.scenarioName}: ${sr.rowsAffected} rows affected`);
      }
    }

    console.log('Exporting...');
    for (const filePath of result.files) {
      console.log(`  ${filePath}`);
    }

    console.log('');
    console.log(`Export complete. ${result.files.length} files written.`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'export',
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
      console.error(`[realitydb] Export failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[realitydb] Export failed: ${message}`);
    }
    process.exit(1);
  }
}
