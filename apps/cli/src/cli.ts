import { Command } from 'commander';
import { initCommand } from './commands/init.js';
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
import {
  classroomListCommand,
  classroomStartCommand,
  classroomStatusCommand,
  classroomCompleteCommand,
  classroomResetCommand,
  classroomCreateCommand,
} from './commands/classroom.js';
import {
  simulateRunCommand,
  simulateProfilesCommand,
  simulateWebhooksCommand,
} from './commands/simulate.js';

const VERSION = '1.6.0';

export function run(argv: string[]): void {
  const program = new Command();

  program
    .name('realitydb')
    .description('RealityDB â€” Developer Reality Platform')
    .version(VERSION)
    .option('--config <path>', 'Path to config file')
    .option('--ci', 'CI mode: JSON output, no prompts, proper exit codes', false)
    .option('--verbose', 'Enable verbose output', false);

  program
    .command('init')
    .description('Interactive setup wizard â€” connect, scan, and seed in one step')
    .action(async () => {
      await initCommand();
    });

  program
    .command('scan')
    .description('Scan database schema')
    .action(async () => {
      const opts = program.opts();
      await scanCommand({ ci: opts.ci, configPath: opts.config });
    });

  program
    .command('analyze')
    .description('Analyze database schema and suggest column strategies')
    .option('--output <file>', 'Generate a template JSON file from analysis')
    .option('--sample-size <count>', 'Number of rows to sample per table', '1000')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await analyzeCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
      await seedCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
    });

  program
    .command('reset')
    .description('Reset seeded data')
    .option('--confirm', 'Confirm destructive operation')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await resetCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
      await exportCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
      await generateCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
      await maskCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
    });

  const classroom = program
    .command('classroom')
    .description('Education and classroom mode');

  classroom
    .command('list', { isDefault: true })
    .description('List available courses')
    .action(async () => {
      const opts = program.opts();
      await classroomListCommand({ ci: opts.ci, configPath: opts.config });
    });

  classroom
    .command('start <course>')
    .description('Load a course into your database')
    .action(async (course: string) => {
      const opts = program.opts();
      await classroomStartCommand(course, { ci: opts.ci, configPath: opts.config });
    });

  classroom
    .command('status [course]')
    .description('Show progress for all courses or a specific course')
    .action(async (course?: string) => {
      const opts = program.opts();
      await classroomStatusCommand(course, { ci: opts.ci, configPath: opts.config });
    });

  classroom
    .command('complete <course> <exercise>')
    .description('Mark an exercise as completed')
    .action(async (course: string, exercise: string) => {
      const opts = program.opts();
      await classroomCompleteCommand(course, exercise, { ci: opts.ci, configPath: opts.config });
    });

  classroom
    .command('reset <course>')
    .description('Reset progress for a course')
    .action(async (course: string) => {
      const opts = program.opts();
      await classroomResetCommand(course, { ci: opts.ci, configPath: opts.config });
    });

  classroom
    .command('create <name>')
    .description('Scaffold a custom course JSON file')
    .action(async (name: string) => {
      const opts = program.opts();
      await classroomCreateCommand(name, { ci: opts.ci, configPath: opts.config });
    });

  const simulate = program
    .command('simulate')
    .description('System behavior simulation');

  simulate
    .command('run', { isDefault: true })
    .description('Run a simulation with a profile')
    .option('--profile <name>', 'Simulation profile (saas-startup|ecommerce-peak|api-service)', 'saas-startup')
    .option('--duration <duration>', 'Override profile duration (e.g., 1-hour, 1-day, 1-week)')
    .option('--events <count>', 'Number of events to generate', '1000')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Output format (json|ndjson)', 'json')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await simulateRunCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
    });

  simulate
    .command('profiles')
    .description('List available simulation profiles')
    .action(async () => {
      const opts = program.opts();
      await simulateProfilesCommand({ ci: opts.ci, configPath: opts.config });
    });

  simulate
    .command('webhooks')
    .description('Generate webhook events from a specific source')
    .option('--source <source>', 'Webhook source (stripe|github)', 'stripe')
    .option('--events <count>', 'Number of events to generate', '100')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Output format (json|ndjson)', 'json')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await simulateWebhooksCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
      await captureCommand({ ...cmdOpts, ci: opts.ci, configPath: opts.config });
    });

  program
    .command('share <file>')
    .description('Share a Reality Pack file')
    .option('--gist', 'Upload to GitHub Gist')
    .option('--description <desc>', 'Gist description')
    .action(async (filePath, cmdOpts) => {
      const opts = program.opts();
      await shareCommand(filePath, { ...cmdOpts, ci: opts.ci, configPath: opts.config });
    });

  program
    .command('load <file>')
    .description('Load a Reality Pack into the database (file path or URL)')
    .option('--confirm', 'Confirm import operation')
    .option('--show-ddl', 'Show schema DDL without importing')
    .action(async (filePath, cmdOpts) => {
      const opts = program.opts();
      await loadCommand(filePath, { ...cmdOpts, ci: opts.ci, configPath: opts.config });
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
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await packExportCommand({ ...cmdOpts, configPath: opts.config });
    });

  pack
    .command('import <file>')
    .description('Import Reality Pack into database')
    .option('--confirm', 'Confirm import operation')
    .action(async (filePath: string, cmdOpts) => {
      const opts = program.opts();
      await packImportCommand(filePath, { ...cmdOpts, configPath: opts.config });
    });

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
      console.log(`RealityDB v${VERSION} â€” Developer Reality Platform`);
      console.log('Run `realitydb --help` for available commands.');
      console.log('');
    }
  });

  program.parse(argv);
}
