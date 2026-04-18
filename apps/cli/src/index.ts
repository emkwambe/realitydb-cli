import { Command } from 'commander';
import { sendTelemetry } from './telemetry.js';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { statusCommand } from './commands/status';
import { seedCommand } from './commands/seed.js';
import { labCreateCommand, labListCommand, labConnectCommand, labExtendCommand, labDeleteCommand, labSnapshotCommand, labPublishCommand, labForkCommand, labGalleryCommand, labSnapshotListCommand, labQuerySaveCommand, labQueryListCommand, labQueryRunCommand, labShareCommand } from './commands/lab';
import { resetCommand } from './commands/reset.js';
import { scanCommand } from './commands/scan.js';
import { initCommand } from './commands/init.js';
import { maskCommand as maskCmd } from './commands/mask.js';
import { analyzeCommand } from './commands/analyze.js';
import { packListCommand, packInfoCommand, packValidateCommand } from './commands/pack.js';
import { upgradeCommand } from './commands/upgrade.js';
import { auditCommand } from './commands/audit.js';
import { simulateCommand } from './commands/simulate.js';
import { splitCommand } from './commands/split.js';
import { convertCommand } from './commands/convert.js';
import { explainCommand } from './commands/explain.js';
import { benchmarkCommand } from './commands/benchmark.js';
import { anomalyCommand } from './commands/anomaly.js';
import { ciStartCommand } from './commands/ci.js';
import { ruleListCommand } from './commands/rule.js';
import { weightTuneCommand, ruleAddCommand } from './commands/tune.js';
import { validateCommand } from './commands/validate.js';
import { certifyCommand } from './commands/certify';
import { verifyCommand } from './commands/verify';
import { buildClaims, signClaims, generateEmbeddedWatermark } from './crypto/cert';
import { createHash } from 'crypto';
import { piiScanCommand } from './commands/pii-scan';
import { profileCommand } from './commands/profile';
import { diffCommand } from './commands/diff';
import { assessCommand } from './commands/assess';
import { complyReportCommand } from './commands/comply-report';
import { enhancedStatusCommand } from './commands/enhanced-status.js';
import { menuCommand } from './commands/menu.js';
import { auditExportCommand } from './commands/audit-export.js';
import { generateTemplateCommand } from './commands/generate-template.js';
import { captureCommand } from './commands/capture.js';
import { loadCommand } from './commands/load.js';
import { doctorCommand } from './commands/doctor.js';
// import { templatesCommand, templatesInitCommand, templatesValidateCommand } from './commands/templates'; // TODO: re-enable after @databox/templates is wired
import { requireAuth, loadLicense } from './auth/license';
import { gateCommand, gateRows, gateLifecycleRules, printUpgradePrompt, stripLifecycleRules, printLifecycleWarning, recordRowUsage, recordOperation } from './gate.js';
import * as fs from 'fs';
import * as path from 'path';

import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  distributeRowsVariable,
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

    // Tier gating: row limits
    const rowGate = gateRows(rows);
    if (!rowGate.allowed) {
      printUpgradePrompt(rowGate.reason!);
      process.exit(1);
    }
    const format = options.format?.toLowerCase() || 'json';

    if (isNaN(rows) || rows < 1) {
      console.error(`\nâŒ Invalid row count: ${options.rows}`);
      process.exit(1);
    }

    if (!['json', 'sql', 'csv', 'parquet'].includes(format)) {
      console.error(`\nâŒ Unsupported format: ${format}`);
      console.error(`   Supported: json, sql, csv, parquet`);
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

    // Tier gating: strip lifecycle rules on free tier
    if (gateLifecycleRules()) {
      const stripped = stripLifecycleRules(tables);
      if (stripped > 0) printLifecycleWarning(stripped);
    }

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
      // Use variable cardinality if pack has relationship configs
    const rowsPerTable = pack?.relationships?.some((r: any) => r.cardinality)
      ? distributeRowsVariable(ordered, rows, pack)
      : distributeRows(ordered, rows);

    // Apply cardinality scale factor
    const cardScale = options.cardinalityScale ? parseFloat(options.cardinalityScale) : 1.0;
    if (cardScale !== 1.0 && pack?.relationships?.some((r: any) => r.cardinality)) {
      const rootNames = new Set(ordered.filter(t => t.foreignKeys.length === 0).map(t => t.name));
      for (const name of Object.keys(rowsPerTable)) {
        if (!rootNames.has(name)) {
          rowsPerTable[name] = Math.max(1, Math.round(rowsPerTable[name] * cardScale));
        }
      }
      // Recalculate total
      const newTotal = Object.values(rowsPerTable).reduce((a, b) => a + b, 0);
      console.log(`   \u{1F4CF} Cardinality scale: ${cardScale}x (adjusted total: ${newTotal.toLocaleString()} rows)`);
    }

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

    // Record operation for analytics
    recordOperation({
      command: 'run',
      pack: options.pack,
      rows: actualTotal,
      format: format,
      duration: parseFloat(elapsed) * 1000,
    });

    // Send anonymous telemetry (fire-and-forget)
    sendTelemetry({
      command: 'run',
      rows: actualTotal,
      tables: ordered.length,
      format: format,
      durationMs: Math.round(parseFloat(elapsed) * 1000),
      features: [
        options.maskPii ? 'mask-pii' : '',
        options.cardinalityScale !== '1.0' ? 'cardinality-scale' : '',
      ].filter(Boolean),
    }).catch(() => {});

    // PII Auto-Masking
    if (options.maskPii) {
      const tables = pack?.tables || [];
      let maskedCount = 0;
      for (const table of tables) {
        const cols = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
        for (const col of cols as any[]) {
          if (col.pii && allData[table.name]) {
            const category = col.pii.category;
            for (const row of allData[table.name]) {
              if (row[col.name] !== null && row[col.name] !== undefined) {
                if (category === 'email') row[col.name] = 'masked_' + Math.random().toString(36).substring(2, 8) + '@example.com';
                else if (category === 'name') row[col.name] = 'REDACTED';
                else if (category === 'phone') row[col.name] = '555-000-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
                else if (category === 'date_of_birth') row[col.name] = '1990-01-01';
                else if (category === 'address') row[col.name] = '123 Masked St';
                else if (category === 'ssn') row[col.name] = '***-**-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');
                else if (category === 'ip_address') row[col.name] = '10.0.0.' + Math.floor(Math.random() * 255);
                else row[col.name] = 'MASKED';
                maskedCount++;
              }
            }
          }
        }
      }
      if (maskedCount > 0) {
        console.log(`   \u{1F512} PII masked: ${maskedCount.toLocaleString()} values across detected PII columns`);
      }
    }
    recordRowUsage(actualTotal); // Track monthly usage

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


        // Auto-watermark: embed _realitydb_meta in every SQL output
        const sqlContent = sqlParts.join('\n');
        let finalSql = sqlContent;
        try {
          const packContent = fs.readFileSync(packPath, 'utf-8');
          const claims = buildClaims({
            version: VERSION,
            templateName: templateName,
            packContent,
            tables: ordered.length,
            totalRows: actualTotal,
            seed: options.seed || 'random',
            tier: license?.plan || 'free',
            userId: license?.email || 'anonymous',
            sqlContent,
          });
          const privKey = process.env.REALITYDB_SIGNING_KEY;
          if (privKey) {
            const cert = signClaims(claims, privKey);
            const watermark = generateEmbeddedWatermark(cert);
            finalSql = sqlContent + watermark;
            const certPath = outputFile.replace(/\.sql$/, '.realitydb-cert.json');
            fs.writeFileSync(certPath, JSON.stringify(cert, null, 2));
            console.log(`   \u{1F510} Certified: ${certPath}`);
          } else {
            const basicMeta = [
              '', '-- ============================================',
              '-- REALITYDB DATASET WATERMARK (unsigned)',
              '-- Certify: realitydb certify <file> --pack <pack>',
              '-- ============================================',
              'CREATE TABLE IF NOT EXISTS "_realitydb_meta" (',
              '  "key" TEXT PRIMARY KEY,',
              '  "value" TEXT NOT NULL',
              ');', '',
              'INSERT INTO "_realitydb_meta" ("key", "value") VALUES',
              "  ('generator', 'realitydb-cli'),",
              "  ('version', '" + VERSION + "'),",
              "  ('template', '" + templateName.replace(/'/g, "''") + "'),",
              "  ('template_hash', '" + claims.template_hash + "'),",
              "  ('tables', '" + ordered.length + "'),",
              "  ('total_rows', '" + actualTotal + "'),",
              "  ('seed', '" + (options.seed || 'random') + "'),",
              "  ('generated_at', '" + claims.generated_at + "'),",
              "  ('content_hash', '" + claims.content_hash + "');",
              '',
            ].join('\n');
            finalSql = sqlContent + basicMeta;
          }
          console.log(`   \u{1F3F7}\uFE0F  Watermark: _realitydb_meta table embedded`);
        } catch (wmErr) {
          console.log(`   \u26A0\uFE0F  Watermark skipped: ${wmErr.message}`);
        }
        fs.writeFileSync(outputFile, finalSql);
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

      } else if (format === 'parquet') {
        // Parquet output: CSV files + DuckDB conversion script
        const parquetDir = options.output || ('./realitydb_parquet_' + Date.now());
        fs.mkdirSync(parquetDir, { recursive: true });
        
        const tableNames = Object.keys(allData);
        for (const tn of tableNames) {
          const tRows = allData[tn];
          if (!tRows || tRows.length === 0) continue;
          const tCols = Object.keys(tRows[0]);
          const csvLines = [tCols.join(',')];
          for (const row of tRows) {
            csvLines.push(tCols.map(c => {
              const v = row[c];
              if (v === null || v === undefined) return '';
              if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
              if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
              return String(v);
            }).join(','));
          }
          fs.writeFileSync(path.join(parquetDir, tn + '.csv'), csvLines.join('\n'), 'utf-8');
        }
        
        // DuckDB conversion script
        const activeTableNames = tableNames.filter(t => allData[t] && allData[t].length > 0);
        const convScript = [
          '-- RealityDB \u2192 Parquet Conversion',
          '-- Install DuckDB: https://duckdb.org/docs/installation',
          '-- Run: duckdb < convert.sql',
          '',
          ...activeTableNames.map(t => "COPY (SELECT * FROM read_csv_auto('" + t + ".csv', header=true)) TO '" + t + ".parquet' (FORMAT PARQUET);"),
          '',
          '-- After conversion, delete CSV files:',
          ...activeTableNames.map(t => '-- DELETE: ' + t + '.csv'),
        ];
        fs.writeFileSync(path.join(parquetDir, 'convert.sql'), convScript.join('\n'), 'utf-8');
        
        console.log('\n\u2705 Generation complete!');
        console.log('\u2500'.repeat(40));
        console.log('   \u{1F4C1} Output: ' + parquetDir + '/');
        for (const tn of activeTableNames) {
          console.log('        \u2022 ' + tn + '.csv (' + allData[tn].length + ' rows)');
        }
        console.log('        \u2022 convert.sql (DuckDB script)');
        console.log('   \u{1F4CA} Total rows: ' + actualTotal.toLocaleString());
        console.log('   \u23F1\uFE0F  Time: ' + elapsed + 's');
        console.log('');
        console.log('   Convert to Parquet:');
        console.log('   cd "' + parquetDir + '" && duckdb < convert.sql');
        console.log('');
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
  .option('-f, --format <type>', 'Output format: json, sql, csv, parquet', 'json')
  .option('-c, --connection <string>', 'Database connection string')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .option('--schema-only', 'Output only CREATE TABLE statements (sql format)')
  .option('--data-only', 'Output only INSERT statements, no CREATE TABLE (sql format)')
  .option('--drop-tables', 'Include DROP TABLE IF EXISTS before CREATE (sql format)')
  .option('--mask-pii', 'Auto-mask PII columns detected during scan')
  .option('--cardinality-scale <n>', 'Scale cardinality multipliers (0.5 halves, 2.0 doubles)', '1.0')
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
  .option('--dry-run', 'Simulate seeding without executing — show what would be inserted')
  .action(async (...args: any[]) => { const _g = gateCommand('seed'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await seedCommand(...args); })

// ============================================
// INIT COMMAND (Setup wizard)

program
  .command('init')
  .description('Create a new RealityDB template (interactive or quick mode)')
  .option('-d, --domain <type>', 'Domain preset: saas, ecommerce, healthcare, education')
  .option('-o, --output <file>', 'Output file path')
  .option('--quick', 'Skip interactive prompts, use defaults')
  .action(initCommand);

// SIMULATE COMMAND (Timeline + scenario injection)

program
  .command('simulate')
  .description('Generate data across a timeline with scenario injection')
  .option('-p, --pack <file>', 'RealityPack JSON file')
  .option('--scenario <names>', 'Comma-separated scenarios (fraud-spike, churn-wave, etc.)')
  .option('--timeline <duration>', 'Timeline duration (e.g. 12-months, 4-weeks)', '12-months')
  .option('-r, --rows <number>', 'Number of rows to generate', '10000')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <type>', 'Output format: json, sql', 'json')
  .option('--intensity <level>', 'Scenario intensity: low, medium, high', 'medium')
  .option('-s, --seed <number>', 'Deterministic seed')
  .option('--list-scenarios', 'List all available scenarios')
  .action(async (...args: any[]) => { const _g = gateCommand('simulate'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await simulateCommand(...args); })

// SPLIT COMMAND (ML train/test/validation splits)

program
  .command('split')
  .description('Generate ML train/test/validation splits with FK integrity')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-r, --rows <number>', 'Total rows to generate', '10000')
  .option('-o, --output <dir>', 'Output directory')
  .option('-f, --format <type>', 'Output format: csv, json, sql', 'csv')
  .option('-s, --seed <number>', 'Deterministic seed', '42')
  .option('--train <ratio>', 'Train split ratio', '0.7')
  .option('--test <ratio>', 'Test split ratio', '0.2')
  .option('--validation <ratio>', 'Validation split ratio', '0.1')
  .option('--strategy <type>', 'Split strategy: random, temporal, stratified', 'random')
  .option('--stratify-column <col>', 'Column to stratify on (for stratified strategy)')
  .option('--time-column <col>', 'Timestamp column (for temporal strategy)', 'created_at')
  .option('--no-validation', 'Skip validation split (80/20 train/test only)')
  .action((options) => splitCommand({
    pack: options.pack,
    rows: options.rows,
    output: options.output,
    format: options.format,
    seed: options.seed,
    trainRatio: options.train,
    testRatio: options.test,
    validationRatio: options.validation,
    strategy: options.strategy,
    stratifyColumn: options.stratifyColumn,
    timeColumn: options.timeColumn,
    noValidation: options.noValidation,
  }));

// CONVERT COMMAND

program
  .command('convert')
  .description('Convert between data formats (JSON, CSV, SQL)')
  .requiredOption('-i, --input <file>', 'Input file path')
  .requiredOption('-f, --format <type>', 'Target format: json, csv, sql')
  .option('-o, --output <file>', 'Output file path')
  .action(convertCommand);

// EXPLAIN COMMAND

program
  .command('explain')
  .description('Show row distribution plan without generating data')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-r, --rows <number>', 'Total rows to plan', '10000')
  .action(explainCommand);

// BENCHMARK COMMAND

program
  .command('benchmark')
  .description('Measure generation speed for a template')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-r, --rows <number>', 'Rows per iteration', '10000')
  .option('-n, --iterations <number>', 'Number of iterations', '3')
  .option('--json', 'Machine-readable JSON output for CI')
  .option('--tables', 'Show per-table breakdown')
  .action(benchmarkCommand);

// ANOMALY COMMAND (Inject controlled anomalies for ML training)

program
  .command('anomaly')
  .description('Inject controlled, labeled anomalies into generated data')
  .option('-p, --pack <file>', 'RealityPack JSON file')
  .option('--inject <types>', 'Comma-separated anomaly types', 'extreme-value')
  .option('--frequency <percent>', 'Percentage of rows to inject anomalies', '2')
  .option('-r, --rows <number>', 'Total rows to generate', '10000')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <type>', 'Output format: json, csv, sql', 'json')
  .option('--intensity <level>', 'Anomaly intensity: 1 (subtle) to 5 (extreme)', '2')
  .option('-s, --seed <number>', 'Deterministic seed')
  .option('--label-column <name>', 'Name of the anomaly label column', '_anomaly_label')
  .option('--list-types', 'List all available anomaly types')
  .action(anomalyCommand);

// CI/CD COMMANDS

program
  .command('ci')
  .description('Generate CI/CD configuration for ephemeral test databases')
  .option('--platform <type>', 'CI platform: github, gitlab, circleci', 'github')
  .option('-p, --pack <file>', 'RealityPack template path (relative to repo root)', 'template.json')
  .option('-r, --rows <number>', 'Rows to generate per CI run', '5000')
  .option('-s, --seed <number>', 'Deterministic seed', '42')
  .option('-f, --format <type>', 'Output format: sql, json, csv', 'sql')
  .option('-o, --output <file>', 'Output file path (default: platform-specific)')
  .option('--connection-var <name>', 'Environment variable name for DB connection', 'DATABASE_URL')
  .action(ciStartCommand);

// AI TEMPLATE GENERATION

program
  .command('generate:template')
  .description('AI-generate a research-based template with confidence scoring')
  .option('-d, --domain <type>', 'Domain: oncology, banking, cybersecurity, etc.')
  .option('--prompt <text>', 'Specific requirements for the template')
  .option('-t, --tables <number>', 'Approximate number of tables', '14')
  .option('--research-based', 'Include citations and confidence levels (default: true)')
  .option('--no-research-based', 'Skip research-based annotations')
  .option('-o, --output <file>', 'Output file path')
  .option('--model <name>', 'Claude model to use', 'claude-sonnet-4-20250514')
  .action(generateTemplateCommand);

// RULE COMMANDS

program
  .command('rule:list')
  .description('Show all lifecycle rules, temporal rules, and weighted enums in a pack')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('--table <n>', 'Filter by table name')
  .option('--json', 'Machine-readable JSON output')
  .action(ruleListCommand);

// TUNE COMMAND (adjust enum weights)

program
  .command('tune')
  .description('Tune enum weights — list, preview, or apply distribution changes')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('-t, --table <n>', 'Table name')
  .option('-c, --column <n>', 'Column name')
  .option('--values <pairs>', 'Value:weight pairs (e.g., "active:85,suspended:10,closed:5")')
  .option('--preset <type>', 'Apply preset: uniform, pareto, exponential, normal')
  .option('--preview', 'Show distribution without saving')
  .action(weightTuneCommand);

// ADD COMMAND (add lifecycle or temporal rules)

program
  .command('add')
  .description('Add lifecycle or temporal rules to a template pack')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .requiredOption('-t, --table <n>', 'Table name')
  .requiredOption('-c, --column <n>', 'Column name')
  .option('--trigger <value>', 'Enum value that triggers the rule (lifecycle)')
  .option('--nullify <fields>', 'Comma-separated fields to NULL when triggered')
  .option('--temporal', 'Add a temporal dependency instead of lifecycle')
  .option('--depends-on <col>', 'Column this timestamp depends on (temporal)')
  .action(ruleAddCommand);

// VALIDATE COMMAND

program
  .command('validate')
  .description('Validate a template pack for schema integrity, FK references, and rule consistency')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .option('--level <type>', 'Validation level: standard, strict', 'standard')
  .action(validateCommand);

// AUDIT EXPORT COMMAND

program
  .command('audit:export')
  .description('Export audit log for compliance reporting')
  .option('-f, --format <type>', 'Export format: json, csv', 'json')
  .option('--since <date>', 'Filter entries after date (YYYY-MM-DD)')
  .option('--sign', 'Add SHA-256 cryptographic signature')
  .option('-o, --output <file>', 'Output file path')
  .option('--limit <n>', 'Max entries to export', '1000')
  .action(auditExportCommand);



// PACK COMMANDS (Template management)

program
  .command('pack')
  .description('List RealityDB packs in current directory')
  .action(packListCommand);

program
  .command('pack:info')
  .description('Show detailed info about a RealityDB pack')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .action(packInfoCommand);

program
  .command('pack:validate')
  .description('Validate a RealityDB pack file')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .action(packValidateCommand);

// UPGRADE COMMAND

program
  .command('upgrade')
  .description('Upgrade your RealityDB plan')
  .option('--plan <type>', 'Plan to upgrade to: pro, team, enterprise', 'pro')
  .action(upgradeCommand);

// AUDIT COMMAND

program
  .command('audit')
  .description('View operation history')
  .option('--since <date>', 'Show entries since date (YYYY-MM-DD)')
  .option('--command <cmd>', 'Filter by command name')
  .option('--limit <n>', 'Max entries to show', '50')
  .option('--clear', 'Clear the audit log')
  .action(async (...args: any[]) => { const _g = gateCommand('audit'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await auditCommand(...args); })

// ANALYZE COMMAND (Data-driven strategy suggestions)

program
  .command('analyze')
  .description('Analyze live data to suggest optimal generation strategies')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('-o, --output <file>', 'Save strategy report to file')
  .option('--schema <n>', 'PostgreSQL schema', 'public')
  .option('--sample <n>', 'Sample size per table', '100')
  .option('--table <name>', 'Analyze a single table')
  .action(async (...args: any[]) => { const _g = gateCommand('analyze'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await analyzeCommand(...args); })

// SCAN COMMAND (Database introspection)

program
  .command('scan')
  .description('Scan a PostgreSQL database and generate a RealityPack template')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('-o, --output <file>', 'Output file path')
  .option('--schema <name>', 'PostgreSQL schema to scan', 'public')
  .option('--infer-enums', 'Sample data to discover enum values and weights')
  .option('--detect-pii', 'Detect PII columns by name and data patterns')
  .option('--estimate-cardinality', 'Estimate child-per-parent row distributions')
  .option('--sample-size <n>', 'Rows to sample per table', '1000')
  .action(scanCommand);

// RESET COMMAND (Drop seeded tables)

program
  .command('reset')
  .description('Drop tables created by seed (requires --confirm)')
  .requiredOption('-p, --pack <file>', 'RealityPack JSON file')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--confirm', 'Confirm destructive operation')
  .action(async (...args: any[]) => { const _g = gateCommand('reset'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await resetCommand(...args); })

// MASK COMMAND (PII detection & masking)

program
  .command('mask')
  .description('Scan and mask PII in a PostgreSQL database')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--mode <type>', 'Compliance mode: gdpr, hipaa, strict', 'gdpr')
  .option('--dry-run', 'Scan only, show what would be masked')
  .option('--confirm', 'Apply masking to database')
  .option('-o, --output <file>', 'Save audit log to file')
  .option('--schema <n>', 'PostgreSQL schema', 'public')
  .option('-s, --seed <number>', 'Deterministic seed for reproducibility')
  .action(async (...args: any[]) => { const _g = gateCommand('mask'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await maskCmd(...args); })

// CAPTURE COMMAND (Bug reproduction)

program
  .command('capture')
  .description('Capture database state for bug reproduction')
  .requiredOption('-n, --name <name>', 'Bug identifier (e.g. bug-4821)')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--safe', 'Automatically mask PII in captured data')
  .option('--schema <n>', 'PostgreSQL schema', 'public')
  .option('--tables <list>', 'Comma-separated table names to capture')
  .option('--limit <n>', 'Max rows per table', '1000')
  .action(async (...args: any[]) => { const _g = gateCommand('capture'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await captureCommand(...args); })

// LOAD COMMAND (Restore captured pack)

program
  .command('load')
  .description('Load a captured RealityDB pack into a database')
  .argument('<file>', 'RealityDB pack file to load')
  .requiredOption('-c, --connection <string>', 'Database connection string')
  .option('--confirm', 'Confirm data insertion')
  .option('--drop-tables', 'Drop and recreate tables before loading')
  .action(async (file: string, options: any) => { const _g = gateCommand('load'); if (!_g.allowed) { printUpgradePrompt(_g.reason!); process.exit(1); } await loadCommand({ file, ...options }); })

// Parse command line arguments
// ============================================

if (process.argv.length <= 2) {
  program.help();
}


program
  


// DOCTOR command
program
  .command('doctor')
  .description('Diagnose and auto-fix pack format issues')
  .requiredOption('--pack <file>', 'Path to pack file')
  .option('--fix', 'Auto-fix detected issues')
  .option('-o, --output <file>', 'Write fixed pack to new file (default: overwrite)')
  .action(async (opts) => {
    await doctorCommand(opts);
  });
// LAB COMMANDS (Simulation Lab — disposable PostgreSQL databases)

// COMPLY COMMAND GROUP
const comply = program.command('comply').description('Compliance tools — reports, inspection, and auditing');

comply
  .command('report')
  .description('Generate a compliance report (HTML) against a regulatory framework')
  .requiredOption('--file <file>', 'Dataset to assess (SQL or CSV)')
  .requiredOption('--framework <name>', 'Regulatory framework: hipaa, gdpr, pci, soc2')
  .option('--output <file>', 'Output path (default: <input>-<framework>-report.html)')
  .option('--json', 'Output as JSON instead of HTML')
  .action(complyReportCommand);

// ASSESS COMMAND
program
  .command('assess <file>')
  .description('Assess synthetic data quality — fidelity, structure, and privacy metrics')
  .option('--standard <name>', 'Assessment standard: generic, hipaa, gdpr, pci', 'generic')
  .option('--json', 'Output as JSON')
  .option('--output <file>', 'Save JSON report to file')
  .action(assessCommand);

// DIFF COMMAND
program
  .command('diff <left> <right>')
  .description('Compare two SQL datasets — schema, row counts, distributions, FK changes')
  .option('--json', 'Output as JSON')
  .action(diffCommand);

// PROFILE COMMAND
program
  .command('profile <file>')
  .description('Statistical profiling of a SQL or CSV dataset')
  .option('--json', 'Output as JSON')
  .option('--table <name>', 'Profile a specific table only')
  .option('--no-columns', 'Show table summary only, skip column details')
  .action(profileCommand);

// PII SCAN COMMAND
program
  .command('pii-scan <file>')
  .description('Scan a SQL or CSV file for PII patterns (SSN, email, phone, credit card, etc.)')
  .option('--json', 'Output results as JSON')
  .option('--hipaa', 'Check against HIPAA Safe Harbor 18 identifiers (requires --tier full)')
  .option('--tier <tier>', 'Pattern tier: free (10 patterns) or full (50+ patterns)', 'free')
  .action(piiScanCommand);

// CERTIFICATION COMMANDS
program
  .command('certify <file>')
  .description('Generate a cryptographic certificate for a dataset (Ed25519)')
  .option('--pack <file>', 'Template pack used to generate the dataset')
  .option('--output <file>', 'Certificate output path (.realitydb-cert.json)')
  .option('--embed', 'Also embed watermark as _realitydb_meta in SQL file')
  .action(certifyCommand);

program
  .command('verify <file>')
  .description('Verify a dataset certificate (Ed25519 signature + content integrity)')
  .option('--cert <file>', 'Path to detached certificate')
  .option('--public-key <hex>', 'Custom public key for verification')
  .option('--json', 'Output result as JSON')
  .action(verifyCommand);

const lab = program.command('lab').description('Simulation Lab — disposable PostgreSQL databases');

lab
  .command('create <template>')
  .description('Create a disposable database from a template')
  .option('-r, --rows <n>', 'Row count (5000, 10000, 50000, 100000)', '5000')
  .option('--ttl <duration>', 'Time to live (4h, 24h, 72h, 7d)', '4h')
  .option('--name <alias>', 'Custom name for the lab')
  .action(labCreateCommand);

lab
  .command('list')
  .description('List active labs')
  .option('--all', 'Include expired labs')
  .action(labListCommand);

lab
  .command('connect <n>')
  .description('Show connection string for a lab')
  .action(labConnectCommand);

lab
  .command('extend <n>')
  .description('Extend a lab\'s TTL')
  .requiredOption('--ttl <duration>', 'Additional time (e.g., 24h, 48h, 7d)')
  .action(labExtendCommand);

lab
  .command('delete <n>')
  .description('Destroy a lab and its database')
  .action(labDeleteCommand);

lab
  .command('snapshot <n>')
  .description('Create an immutable snapshot of a lab')
  .requiredOption('--name <snapshot-name>', 'Name for the snapshot')
  .option('--description <text>', 'Description of this snapshot')
  .action(labSnapshotCommand);

lab
  .command('publish')
  .description('Publish a snapshot to the public gallery')
  .requiredOption('--snapshot <id>', 'Snapshot ID to publish')
  .requiredOption('--title <text>', 'Title for the publication')
  .option('--authors <names>', 'Author names')
  .option('--description <text>', 'Description')
  .option('--tags <csv>', 'Comma-separated tags')
  .option('--license <type>', 'License (default: CC-BY-4.0)', 'CC-BY-4.0')
  .action(labPublishCommand);

lab
  .command('fork <slug>')
  .description('Fork a published lab from the gallery')
  .option('--name <alias>', 'Custom name for the fork')
  .action(labForkCommand);

lab
  .command('gallery')
  .description('Browse published labs')
  .option('--tag <tag>', 'Filter by tag')
  .option('--template <n>', 'Filter by template')
  .option('-q, --search <text>', 'Search by title or description')
  .action(labGalleryCommand);

lab
  .command('snapshots <n>')
  .description('List snapshots for a lab')
  .action(labSnapshotListCommand);

lab
  .command('query:save <n>')
  .description('Save a SQL query to a lab session')
  .requiredOption('--name <query-name>', 'Name for the saved query')
  .requiredOption('--sql <query>', 'SQL query text')
  .action(labQuerySaveCommand);

lab
  .command('query:list <n>')
  .description('List saved queries for a lab')
  .action(labQueryListCommand);

lab
  .command('query:run <n>')
  .description('Execute a SQL query against a live lab')
  .requiredOption('--sql <query>', 'SQL query to execute')
  .option('--save <name>', 'Save the query with this name')
  .action(labQueryRunCommand);

lab
  .command('share <n>')
  .description('Generate a shareable connection string')
  .action(labShareCommand);

program
  .command('analytics')
  .description('Show detailed usage analytics, command frequency, and compliance limits')
  .action(enhancedStatusCommand);

program
.command('menu')
  .description('Interactive command menu — guided navigation for all features')
  .action(menuCommand);

program.parse();