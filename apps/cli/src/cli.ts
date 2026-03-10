import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { seedCommand } from './commands/seed.js';
import { resetCommand } from './commands/reset.js';
import { exportCommand } from './commands/export.js';
import { templatesCommand } from './commands/templates.js';
import { scenariosCommand } from './commands/scenarios.js';
import { packExportCommand, packImportCommand } from './commands/pack.js';
import { captureCommand } from './commands/capture.js';
import { shareCommand } from './commands/share.js';
import { loadCommand } from './commands/load.js';

const VERSION = '0.3.0';

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
    .command('seed')
    .description('Seed database with generated data')
    .option('--records <count>', 'Number of records per table')
    .option('--template <name>', 'Template to use')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
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
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await exportCommand({ ...cmdOpts, ci: opts.ci });
    });

  program
    .command('templates')
    .description('List available domain templates')
    .action(templatesCommand);

  program
    .command('scenarios')
    .description('List available scenarios')
    .action(scenariosCommand);

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
    .action(async (filePath) => {
      const opts = program.opts();
      await shareCommand(filePath, { ci: opts.ci });
    });

  program
    .command('load <file>')
    .description('Load a Reality Pack into the database')
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
    .action(packExportCommand);

  pack
    .command('import <file>')
    .description('Import Reality Pack into database')
    .option('--confirm', 'Confirm import operation')
    .action(packImportCommand);

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
