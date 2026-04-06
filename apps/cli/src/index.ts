import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { seedCommand } from './commands/seed.js';
import { resetCommand } from './commands/reset.js';
import { scanCommand } from './commands/scan.js';
import { initCommand } from './commands/init.js';
import { maskCommand as maskCmd } from './commands/mask.js';
import { analyzeCommand } from './commands/analyze.js';
// import { templatesCommand, templatesInitCommand, templatesValidateCommand } from './commands/templates'; // TODO: re-enable after @databox/templates is wired
import { requireAuth, loadLicense } from './auth/license';
import * as fs from 'fs';
import * as path from 'path';

import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  generateData,
  generateCreateTable,
  generateInsertStatements,
  writeJsonOutput,
  writeCsvOutput,
} from '@realitydb/engine';

// Auto-read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

const program = new Command();

program
  .name('realitydb')
  .version(VERSION)
  .description('Developer Reality Platform - realistic database environments from your schema');

// ============================================
// PUBLIC COMMANDS (No authentication required)
// ============================================

program
  .command('login')
  .description('Authenticate with RealityDB using API key')
  .option('--api-key <key>', 'API key from realitydb.dev/dashboard')
  .action(loginCommand);

program
  .command('logout')
  .description('Clear authentication and remove local license')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('--clear-all', 'Remove all local data including cache')
  .action(logoutCommand);

program
  .command('status')
  .description('Show license status and plan details')
  .option('--json', 'Output in JSON format')
  .option('-v, --verbose', 'Show detailed information including local files')
  .action(statusCommand);

// ============================================
// TEMPLATES COMMANDS
// ============================================

// program
//   .command('templates')
//   .description('List available domain templates')
//   .action(templatesCommand);

// program
//   .command('templates init')
//   .description('Create a new template scaffold file')
//   .action(templatesInitCommand);

// program
//   .command('templates validate')
//   .description('Validate a template JSON file')
//   .argument('<file>', 'Path to template JSON file')
//   .option('--ci', 'CI mode: JSON output, proper exit codes')
//   .action(templatesValidateCommand);

// ============================================
// RUN COMMAND (Free tier allowed)
// ============================================


async function runHandler(options: any) {
    const license = loadLicense();
    const isLoggedIn = !!license;
    const rows = parseInt(options.rows);
    const format = options.format?.toLowerCase() || 'json';

    if (isNaN(rows) || rows < 1) {
      console.error(`\nâŒ Invalid row count: ${options.rows}`);
      process.exit(1);
    }

    if (!['json', 'sql', 'csv'].includes(format)) {
      console.error(`\nâŒ Unsupported format: ${format}`);
      console.error(`   Supported: json, sql, csv`);
      process.exit(1);
    }

    if (!isLoggedIn && rows > 50000) {
      console.error(`\nâŒ Free tier limited to 50,000 rows.`);
      console.error(`   Requested: ${rows.toLocaleString()} rows`);
      console.error(`\n   Upgrade: realitydb login --api-key YOUR_KEY\n`);
      process.exit(1);
    }

    console.log(`\n\u{1F680} RealityDB Data Generator`);
    console.log(`${'\u2500'.repeat(40)}`);
    if (isLoggedIn) {
      console.log(`   User: ${license.email}`);
      console.log(`   Plan: ${license.tier.toUpperCase()}`);
    } else {
      console.log(`   Mode: FREE TIER (50K rows max)`);
    }
    console.log(`   Pack: ${options.pack}`);
    console.log(`   Format: ${format.toUpperCase()}`);
    if (options.seed) console.log(`   Seed: ${options.seed}`);

    try {
      const packPath = path.resolve(options.pack);
      if (!fs.existsSync(packPath)) {
        console.error(`\nâŒ Pack file not found: ${packPath}`);
        process.exit(1);
      }

      const packContent = fs.readFileSync(packPath, 'utf-8');
      const pack = JSON.parse(packContent);

      // Normalize tables from any format
      const { tables, templateName } = normalizeTables(pack);

      if (tables.length === 0) {
        console.error(`\nâŒ No tables found in pack file.`);
        console.error(`   File keys: ${Object.keys(pack).join(', ')}`);
        if (pack.tables) {
          console.error(`   pack.tables type: ${typeof pack.tables}`);
          console.error(`   pack.tables is array: ${Array.isArray(pack.tables)}`);
          if (typeof pack.tables === 'object' && !Array.isArray(pack.tables)) {
            console.error(`   pack.tables keys: ${Object.keys(pack.tables).join(', ')}`);
          }
        }
        console.error(`\n   Supported formats:`);
        console.error(`   â€¢ { tables: { tableName: { columns: {...} } } }  (Studio export)`);
        console.error(`   â€¢ { tables: [ { name: "...", columns: {...} } ] }  (Array format)`);
        process.exit(1);
      }

      console.log(`   Template: ${templateName}`);
      console.log(`   Tables: ${tables.length}`);
      console.log(`${'\u2500'.repeat(40)}`);

      // Determine generation order (respect foreign keys)
      const ordered = topologicalSort(tables);

      // Distribute rows
      const rowsPerTable = distributeRows(ordered, rows);

      // Show table plan
      for (const t of ordered) {
        const fkInfo = t.foreignKeys.length > 0
          ? ` (refs: ${t.foreignKeys.map(fk => fk.references.table).join(', ')})`
          : ' (root)';
        console.log(`   \u{1F4CA} ${t.name}: ${rowsPerTable[t.name].toLocaleString()} rows${fkInfo}`);
      }

      console.log(`${'\u2500'.repeat(40)}`);

      // Schema-only mode (SQL)
      if (options.schemaOnly && format === 'sql') {
        console.log(`   Generating schema only...`);
        const schemaParts: string[] = [];
        schemaParts.push(`-- Generated by RealityDB CLI v${VERSION}`);
        schemaParts.push(`-- Template: ${templateName}`);
        schemaParts.push(`-- Generated at: ${new Date().toISOString()}\n`);

        for (const table of ordered) {
          if (options.dropTables) {
            schemaParts.push(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
          }
          schemaParts.push(generateCreateTable(table));
        }

        const outputFile = options.output || `./realitydb_schema_${Date.now()}.sql`;
        fs.writeFileSync(outputFile, schemaParts.join('\n'));

        console.log(`\n\u2705 Schema generated!`);
        console.log(`   \u{1F4C1} Output: ${outputFile}`);
        console.log(`   \u{1F4CA} Tables: ${ordered.length}`);
        console.log(``);
        return;
      }

      console.log(`   Generating data...`);

      // Generate data
      const { allData, actualTotal, elapsed } = generateData(ordered, rowsPerTable, pack);

      if (format === 'sql') {
        const outputFile = options.output || `./realitydb_output_${Date.now()}.sql`;
        const sqlParts: string[] = [];
        sqlParts.push(`-- ============================================`);
        sqlParts.push(`-- Generated by RealityDB CLI v${VERSION}`);
        sqlParts.push(`-- Template: ${templateName}`);
        sqlParts.push(`-- Total rows: ${actualTotal.toLocaleString()}`);
        sqlParts.push(`-- Generated at: ${new Date().toISOString()}`);
        sqlParts.push(`-- ============================================\n`);

        if (!options.dataOnly) {
          sqlParts.push(`-- ============================================`);
          sqlParts.push(`-- SCHEMA`);
          sqlParts.push(`-- ============================================\n`);
          for (const table of ordered) {
            if (options.dropTables) {
              sqlParts.push(`DROP TABLE IF EXISTS "${table.name}" CASCADE;`);
            }
            sqlParts.push(generateCreateTable(table));
          }
        }

        sqlParts.push(`-- ============================================`);
        sqlParts.push(`-- DATA`);
        sqlParts.push(`-- ============================================\n`);
        for (const table of ordered) {
          const tableData = allData[table.name];
          if (tableData && tableData.length > 0) {
            sqlParts.push(generateInsertStatements(table.name, tableData));
          }
        }

        fs.writeFileSync(outputFile, sqlParts.join('\n'));
        printSummary(outputFile, actualTotal, elapsed);

      } else if (format === 'csv') {
        const outputDir = options.output || `./realitydb_csv_${Date.now()}`;
        fs.mkdirSync(outputDir, { recursive: true });

        writeCsvOutput(allData, (table, csv) => {
          const filePath = path.join(outputDir, `${table}.csv`);
          fs.writeFileSync(filePath, csv);
        });

        console.log(`\n\u2705 Generation complete!`);
        console.log(`${'\u2500'.repeat(40)}`);
        console.log(`   \u{1F4C1} Output: ${outputDir}/`);
        for (const tableName of Object.keys(allData)) {
          console.log(`        \u2022 ${tableName}.csv (${allData[tableName].length} rows)`);
        }
        console.log(`   \u{1F4CA} Total rows: ${actualTotal.toLocaleString()}`);
        console.log(`   \u23F1\uFE0F Time: ${elapsed}s`);
        console.log(`   \u{1F4C8} Speed: ${Math.round(actualTotal / parseFloat(elapsed)).toLocaleString()} rows/sec`);
        console.log(``);

      } else {
        // JSON output â€” streaming write
        const outputFile = options.output || `./realitydb_output_${Date.now()}.json`;
        const fd = fs.openSync(outputFile, 'w');

        writeJsonOutput(allData, {
          generator: 'realitydb-cli',
          version: VERSION,
          generated_at: new Date().toISOString(),
          template: templateName,
          total_rows: actualTotal,
          elapsed_seconds: parseFloat(elapsed),
          seed: options.seed ? parseInt(options.seed) : null,
        }, (chunk) => fs.writeSync(fd, chunk));

        fs.closeSync(fd);
        printSummary(outputFile, actualTotal, elapsed);
      }

    } catch (error: any) {
      console.error(`\nâŒ Generation failed: ${error.message}`);
      process.exit(1);
    }
}

program
  .command('run')
  .description('Generate synthetic data from a RealityPack')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-r, --rows <number>', 'Number of rows to generate', '10000')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <type>', 'Output format: json, sql, csv', 'json')
  .option('-c, --connection <string>', 'Database connection string')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .option('--schema-only', 'Output only CREATE TABLE statements (sql format)')
  .option('--data-only', 'Output only INSERT statements, no CREATE TABLE (sql format)')
  .option('--drop-tables', 'Include DROP TABLE IF EXISTS before CREATE (sql format)')
  .action(runHandler);

function printSummary(outputFile: string, actualTotal: number, elapsed: string) {
  console.log(`\n\u2705 Generation complete!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} Output: ${outputFile}`);
  console.log(`   \u{1F4CA} Total rows: ${actualTotal.toLocaleString()}`);
  console.log(`   \u23F1\uFE0F Time: ${elapsed}s`);
  console.log(`   \u{1F4C8} Speed: ${Math.round(actualTotal / parseFloat(elapsed)).toLocaleString()} rows/sec`);
  console.log(``);
}

// ============================================
// GENERATE COMMAND (alias for run — no DB required)
// ============================================

program
  .command('generate')
  .description('Generate large-scale datasets (alias for run)')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-r, --rows <number>', 'Number of rows to generate', '10000')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <type>', 'Output format: json, sql, csv', 'json')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .option('--drop-tables', 'Include DROP TABLE IF EXISTS (SQL)')
  .option('--schema-only', 'Output only CREATE TABLE (SQL)')
  .option('--data-only', 'Output only INSERT statements (SQL)')
  .action(runHandler);

// ============================================
// EXPORT COMMAND (alias for run with required output)
// ============================================

program
  .command('export')
  .description('Export data to file (alias for run)')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .requiredOption('-o, --output <file>', 'Output file path')
  .option('-r, --rows <number>', 'Number of rows to generate', '10000')
  .option('-f, --format <type>', 'Output format: json, sql, csv', 'json')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .option('--drop-tables', 'Include DROP TABLE IF EXISTS (SQL)')
  .option('--schema-only', 'Output only CREATE TABLE (SQL)')
  .option('--data-only', 'Output only INSERT statements (SQL)')
  .action(runHandler);

// ============================================
// // SEED COMMAND (Direct database insertion)
// ============================================

program
  .command('seed')
  .description('Generate and insert synthetic data directly into a database')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .requiredOption('-c, --connection <string>', 'Database connection string (postgresql://...)')
  .option('-r, --rows <number>', 'Number of rows to generate', '10000')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .option('--create-tables', 'Create tables from pack schema before inserting')
  .option('--drop-tables', 'Drop and recreate tables before inserting')
  .option('--batch-size <number>', 'Rows per INSERT batch', '100')
  .action(seedCommand);

// ============================================
// INIT COMMAND (Setup wizard)

program
  .command('init')
  .description('Create a new RealityDB template (interactive or quick mode)')
  .option('-d, --domain <type>', 'Domain preset: saas, ecommerce, healthcare, education')
  .option('-o, --output <file>', 'Output file path')
  .option('--quick', 'Skip interactive prompts, use defaults')
  .action(initCommand);

// ANALYZE COMMAND (Data-driven strategy suggestions)

program
  .command('analyze')
  .description('Analyze live data to suggest optimal generation strategies')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('-o, --output <file>', 'Save strategy report to file')
  .option('--schema <n>', 'PostgreSQL schema', 'public')
  .option('--sample <n>', 'Sample size per table', '100')
  .option('--table <name>', 'Analyze a single table')
  .action(analyzeCommand);

// SCAN COMMAND (Database introspection)

program
  .command('scan')
  .description('Scan a PostgreSQL database and generate a RealityPack template')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('-o, --output <file>', 'Output file path')
  .option('--schema <name>', 'PostgreSQL schema to scan', 'public')
  .action(scanCommand);

// RESET COMMAND (Drop seeded tables)

program
  .command('reset')
  .description('Drop tables created by seed (requires --confirm)')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--confirm', 'Confirm destructive operation')
  .action(resetCommand);

// CAPTURE COMMAND (Requires authentication + Team plan)
// ============================================

program
  .command('capture')
  .description('Capture bug reproduction environment (Team plan required)')
  .requiredOption('-n, --name <name>', 'Bug identifier')
  .option('--safe', 'Automatically mask PII')
  .option('-c, --connection <string>', 'Database connection string')
  .action(async (options) => {
    const license = requireAuth('bug-capture');
    console.log(`\n\u{1F6E1} Capturing bug reproduction environment...`);
    console.log(`   User: ${license?.email}`);
    console.log(`   Bug: ${options.name}`);
    console.log(`   Safe mode: ${options.safe ? 'ON' : 'OFF'}`);
    console.log(`\n\u2714 Bug captured to: ${options.name}.realitydb-pack.json\n`);
  });

// ============================================
// MASK COMMAND (Requires authentication + Team plan)
// ============================================

program
  .command('mask')
  .description('Scan and mask PII in a PostgreSQL database')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--mode <type>', 'Compliance mode: gdpr, hipaa, strict', 'gdpr')
  .option('--dry-run', 'Scan only, show what would be masked')
  .option('--confirm', 'Apply masking to database')
  .option('-o, --output <file>', 'Save audit log to file')
  .option('--schema <name>', 'PostgreSQL schema', 'public')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .action(maskCmd);

// ============================================
// Parse command line arguments
// ============================================

if (process.argv.length <= 2) {
  program.help();
}

program.parse();