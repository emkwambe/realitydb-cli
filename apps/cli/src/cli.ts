import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { seedCommand } from './commands/seed.js';
import { resetCommand } from './commands/reset.js';
import { exportCommand } from './commands/export.js';
import { templatesCommand, templatesInitCommand, templatesValidateCommand } from './commands/templates.js';
import { scenariosCommand, scenariosCreateCommand } from './commands/scenarios.js';
import { packExportCommand, packImportCommand } from './commands/pack.js';
import { captureCommand } from './commands/capture.js';
import { shareCommand } from './commands/share.js';
import { loadCommand } from './commands/load.js';
import { packsListCommand } from './commands/packs.js';
import { generateCommand } from './commands/generate.js';
import { analyzeCommand } from './commands/analyze.js';
import { maskCommand } from './commands/mask.js';

const VERSION = '1.1.0';

export function run(argv: string[]): void {
  const program = new Command();

  program
    .name('realitydb')
    .description('RealityDB — Developer Reality Platform')
    .version(VERSION)
    .option('--config <path>', 'Path to config file')
    .option('--ci', 'CI mode: JSON output, no prompts, proper exit codes', false)
    .option('--verbose', 'Enable verbose output', false);

  program
    .command('scan')
    .description('Scan database schema')
    .action(async () => {
      const opts = program.opts();
      await scanCommand({ ci: opts.ci });
    });

  program
    .command('analyze')
    .description('Analyze database schema and suggest column strategies')
    .option('--output <file>', 'Generate a template JSON file from analysis')
    .option('--sample-size <count>', 'Number of rows to sample per table', '1000')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await analyzeCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('seed')
    .description('Seed database with generated data')
    .option('--records <count>', 'Number of records per table')
    .option('--template <name|path>', 'Template name or path to custom .json file')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
    .option('--scenario-schedule <schedule>', 'Timeline-scheduled scenarios (e.g., "fraud-spike:month-6,churn-spike:month-9")')
    .option('--lifecycle', 'Enable lifecycle simulation for causally-connected data')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await seedCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('reset')
    .description('Reset seeded data')
    .option('--confirm', 'Confirm destructive operation')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await resetCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('export')
    .description('Export generated data')
    .option('--format <format>', 'Output format (json|csv|sql)', 'json')
    .option('--output <dir>', 'Output directory', './.realitydb')
    .option('--records <count>', 'Number of records per table')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--template <name>', 'Template to use')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
    .option('--scenario-schedule <schedule>', 'Timeline-scheduled scenarios (e.g., "fraud-spike:month-6,churn-spike:month-9")')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await exportCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('generate')
    .description('Generate large-scale datasets for data science (no database required)')
    .option('--records <count>', 'Number of records to generate', '1000')
    .option('--schema <file>', 'Schema definition file (.sql or .json)')
    .option('--format <format>', 'Output format (json|csv|parquet)', 'json')
    .option('--output <dir>', 'Output directory', './.realitydb/generated')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--table <name>', 'Generate only a specific table')
    .option('--correlations', 'Enable cross-column correlations from schema')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await generateCommand({ ...cmdOpts, ci: opts.ci });
    });

  const templates = program
    .command('templates')
    .description('Template management');

  templates
    .command('list', { isDefault: true })
    .description('List available domain templates')
    .action(templatesCommand);

  templates
    .command('init')
    .description('Scaffold a new custom template JSON file')
    .action(templatesInitCommand);

  templates
    .command('validate <file>')
    .description('Validate a custom template JSON file')
    .action((filePath: string) => {
      const opts = program.opts();
      templatesValidateCommand(filePath, { ci: opts.ci });
    });

  const scenarios = program
    .command('scenarios')
    .description('Scenario management');

  scenarios
    .command('list', { isDefault: true })
    .description('List available scenarios')
    .action(scenariosCommand);

  scenarios
    .command('create <name>')
    .description('Scaffold a custom scenario JSON file')
    .action((name: string) => {
      scenariosCreateCommand(name);
    });

  program
    .command('mask')
    .description('Detect and mask PII in your database')
    .option('--mode <mode>', 'Compliance mode (hipaa|gdpr|strict)', 'gdpr')
    .option('--seed <number>', 'Random seed for deterministic masking')
    .option('--dry-run', 'Preview PII detection without modifying data')
    .option('--output <dir>', 'Export masked data to files instead of writing to DB')
    .option('--output-format <format>', 'Output format (json|csv|sql)', 'json')
    .option('--audit-log <file>', 'Write audit log to file')
    .option('--confirm', 'Confirm writing masked data back to database')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await maskCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('capture')
    .description('Capture live database state into a Reality Pack')
    .requiredOption('--name <name>', 'Name for the captured pack')
    .option('--description <desc>', 'Pack description')
    .option('--tables <tables>', 'Comma-separated list of tables to capture')
    .option('--output <dir>', 'Output directory', '.')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await captureCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('share <file>')
    .description('Share a Reality Pack file')
    .option('--gist', 'Upload to GitHub Gist')
    .option('--description <desc>', 'Gist description')
    .action(async (filePath, cmdOpts) => {
      const opts = program.opts();
      await shareCommand(filePath, { ...cmdOpts, ci: opts.ci });
    });

  program
    .command('load <file>')
    .description('Load a Reality Pack into the database (file path or URL)')
    .option('--confirm', 'Confirm import operation')
    .option('--show-ddl', 'Show schema DDL without importing')
    .action(async (filePath, cmdOpts) => {
      const opts = program.opts();
      await loadCommand(filePath, { ...cmdOpts, ci: opts.ci });
    });

  const pack = program
    .command('pack')
    .description('Reality Pack operations');

  pack
    .command('export')
    .description('Export environment as Reality Pack')
    .option('--name <name>', 'Pack name')
    .option('--description <desc>', 'Pack description')
    .option('--output <dir>', 'Output directory', '.')
    .option('--records <count>', 'Number of records per table')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--template <name>', 'Template to use')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
    .option('--scenario-schedule <schedule>', 'Timeline-scheduled scenarios (e.g., "fraud-spike:month-6,churn-spike:month-9")')
    .action(packExportCommand);

  pack
    .command('import <file>')
    .description('Import Reality Pack into database')
    .option('--confirm', 'Confirm import operation')
    .action(packImportCommand);

  const packs = program
    .command('packs')
    .description('Browse available Reality Packs');

  packs
    .command('list', { isDefault: true })
    .description('List available demo packs')
    .action(() => {
      const opts = program.opts();
      packsListCommand({ ci: opts.ci });
    });

  // Print version banner when no command is given
  program.action(() => {
    const opts = program.opts();
    if (opts.ci) {
      console.log(JSON.stringify({ name: 'realitydb', version: VERSION }));
    } else {
      console.log('');
      console.log(`RealityDB v${VERSION} — Developer Reality Platform`);
      console.log('Run `realitydb --help` for available commands.');
      console.log('');
    }
  });

  program.parse(argv);
}
