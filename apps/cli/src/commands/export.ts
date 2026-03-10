import { loadConfig } from '@databox/config';
import { exportDataset, getDefaultScenarioRegistry } from '@databox/core';
import { getDefaultRegistry } from '@databox/templates';
import { maskConnectionString } from '../utils.js';

export async function exportCommand(options: {
  format?: string;
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

    const format = (options.format ?? config.export?.defaultFormat ?? 'json') as 'json' | 'csv' | 'sql';
    const outputDir = options.output ?? config.export?.outputDir ?? './.seedforge';
    const records = options.records ? parseInt(options.records, 10) : undefined;
    const seed = options.seed ? parseInt(options.seed, 10) : undefined;
    const templateName = options.template ?? config.template;
    const timeline = options.timeline;
    const scenario = options.scenario;
    const scenarioIntensity = (options.scenarioIntensity ?? 'medium') as 'low' | 'medium' | 'high';
    const effectiveRecords = records ?? config.seed.defaultRecords;
    const masked = maskConnectionString(config.database.connectionString);

    // Validate template if specified
    if (templateName) {
      const registry = getDefaultRegistry();
      const template = registry.get(templateName);
      if (!template) {
        const available = registry.list();
        console.error(`[seedforge] Template "${templateName}" not found.`);
        console.error('');
        if (available.length > 0) {
          console.error('Available templates:');
          for (const t of available) {
            console.error(`  ${t.name} (v${t.version}) — ${t.description}`);
          }
        } else {
          console.error('No templates registered.');
        }
        process.exit(1);
      }
    }

    // Validate scenario names if specified
    if (scenario) {
      const scenarioRegistry = getDefaultScenarioRegistry();
      const scenarioNames = scenario.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      for (const name of scenarioNames) {
        if (!scenarioRegistry.get(name)) {
          const available = scenarioRegistry.list();
          console.error(`[seedforge] Scenario "${name}" not found.`);
          console.error('');
          console.error('Available scenarios:');
          for (const s of available) {
            console.error(`  ${s.name} — ${s.description} (${s.supportedIntensities.join(', ')})`);
          }
          process.exit(1);
        }
      }
    }

    console.log('');
    console.log('SeedForge Export');
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
    const result = await exportDataset(config, {
      format,
      outputDir,
      records,
      seed,
      template: templateName,
      timeline,
      scenarios: scenario,
      scenarioIntensity,
    });

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
    if (message.includes('Config file not found')) {
      console.error(`[seedforge] ${message}`);
      console.error('Hint: Copy seedforge.config.json to seedforge.config.json');
    } else if (message.includes('Invalid timeline format')) {
      console.error(`[seedforge] ${message}`);
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[seedforge] Export failed: ${message}`);
      console.error('Hint: Check that your database is running (e.g. Docker)');
    } else {
      console.error(`[seedforge] Export failed: ${message}`);
    }
    process.exit(1);
  }
}
