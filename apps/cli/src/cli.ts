import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { seedCommand } from './commands/seed.js';
import { resetCommand } from './commands/reset.js';
import { exportCommand } from './commands/export.js';
import { templatesCommand } from './commands/templates.js';
import { scenariosCommand } from './commands/scenarios.js';

export function run(argv: string[]): void {
  const program = new Command();

  program
    .name('databox')
    .description('DataBox — Developer Reality Platform')
    .version('0.1.0')
    .option('--config <path>', 'Path to config file', './databox.config.json')
    .option('--verbose', 'Enable verbose output', false);

  program
    .command('scan')
    .description('Scan database schema')
    .action(scanCommand);

  program
    .command('seed')
    .description('Seed database with generated data')
    .option('--records <count>', 'Number of records per table')
    .option('--template <name>', 'Template to use')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
    .action(seedCommand);

  program
    .command('reset')
    .description('Reset seeded data')
    .option('--confirm', 'Confirm destructive operation')
    .action(resetCommand);

  program
    .command('export')
    .description('Export generated data')
    .option('--format <format>', 'Output format (json|csv|sql)', 'json')
    .option('--output <dir>', 'Output directory', './.databox')
    .option('--records <count>', 'Number of records per table')
    .option('--seed <number>', 'Random seed for reproducibility')
    .option('--template <name>', 'Template to use')
    .option('--timeline <duration>', 'Timeline duration (e.g., "12-months", "1-year")')
    .option('--scenario <names>', 'Scenarios to apply (comma-separated)')
    .option('--scenario-intensity <level>', 'Scenario intensity (low|medium|high)', 'medium')
    .action(exportCommand);

  program
    .command('templates')
    .description('List available domain templates')
    .action(templatesCommand);

  program
    .command('scenarios')
    .description('List available scenarios')
    .action(scenariosCommand);

  program.parse(argv);
}
