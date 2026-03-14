import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { writeFileSync, existsSync } from 'node:fs';
import { scanDatabase, seedDatabase } from '@databox/core';
import { getDefaultRegistry } from '@databox/templates';
import type { DataboxConfig } from '@databox/config';
import { maskConnectionString } from '../utils.js';

const CONFIG_FILE = 'realitydb.config.json';
const DEFAULT_CONNECTION = 'postgres://postgres:postgres@localhost:5432/myapp_dev';

export async function initCommand(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  // Handle Ctrl+C gracefully
  rl.on('close', () => {
    if (!wizardComplete) {
      console.log('');
      console.log('');
      console.log('Init cancelled.');
      console.log('');
      process.exit(0);
    }
  });

  let wizardComplete = false;

  try {
    // ── Step 1: Welcome ──────────────────────────────────────────────
    console.log('');
    console.log('Welcome to RealityDB');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log("Let's connect to your database and fill it with realistic data.");
    console.log('');

    // ── Step 2: Check for existing config ────────────────────────────
    if (existsSync(CONFIG_FILE)) {
      const overwrite = await rl.question(`${CONFIG_FILE} already exists. Overwrite? (y/N) `);
      if (overwrite.toLowerCase() !== 'y') {
        wizardComplete = true;
        console.log('');
        console.log('Init cancelled. Existing config preserved.');
        console.log('');
        return;
      }
      console.log('');
    }

    // ── Step 3: Database connection ──────────────────────────────────
    console.log('Step 1: Database Connection');
    console.log('───────────────────────────────────────');
    const connectionString = await promptWithDefault(
      rl,
      'PostgreSQL connection string',
      DEFAULT_CONNECTION,
    );
    console.log('');

    // ── Step 4: Test connection + scan schema ────────────────────────
    console.log('Step 2: Connecting & Scanning');
    console.log('───────────────────────────────────────');
    const masked = maskConnectionString(connectionString);
    console.log(`  Connecting to ${masked}...`);

    const scanConfig: DataboxConfig = {
      database: { client: 'postgres', connectionString },
      seed: { defaultRecords: 50, batchSize: 1000, environment: 'dev' },
    };

    let scanResult;
    try {
      scanResult = await scanDatabase(scanConfig);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      wizardComplete = true;
      console.error('');
      console.error(`  Connection failed: ${msg}`);
      console.error('');
      console.error('Hints:');
      console.error('  - Is PostgreSQL running? (docker ps, pg_isready)');
      console.error('  - Check host, port, username, password, and database name');
      console.error('  - Ensure the database exists (createdb myapp_dev)');
      console.error('');
      process.exit(1);
    }

    const { schema } = scanResult;
    console.log('  Connected successfully.');
    console.log('');

    // ── Step 5: Schema summary ───────────────────────────────────────
    if (schema.tables.length === 0) {
      wizardComplete = true;
      console.log('  No tables found in the public schema.');
      console.log('');
      console.log('  Run your migrations first, then try again:');
      console.log('    npx prisma migrate dev');
      console.log('    npx knex migrate:latest');
      console.log('    rails db:migrate');
      console.log('');
      process.exit(1);
    }

    console.log('Step 3: Schema');
    console.log('───────────────────────────────────────');
    console.log(`  Found ${schema.tables.length} tables, ${schema.foreignKeys.length} foreign keys`);
    console.log('');
    console.log('  Tables:');
    for (const table of schema.tables) {
      const colCount = table.columns.length;
      const pkLabel = table.primaryKey ? ` PK: ${table.primaryKey.columnName}` : '';
      console.log(`    ${table.name} (${colCount} cols${pkLabel})`);
    }
    console.log('');

    // ── Step 6: Template detection ───────────────────────────────────
    console.log('Step 4: Template Selection');
    console.log('───────────────────────────────────────');

    const registry = getDefaultRegistry();
    const allTemplates = registry.list();
    const detected = detectTemplate(schema.tables.map((t) => t.name), allTemplates);

    let templateName: string | undefined;

    if (detected) {
      console.log(`  Auto-detected domain: ${detected.name}`);
      console.log(`  ${detected.description}`);
      console.log('');
      const useDetected = await rl.question(`  Use "${detected.name}" template? (Y/n) `);
      if (useDetected.toLowerCase() !== 'n') {
        templateName = detected.name;
      }
    }

    if (!templateName) {
      console.log('');
      console.log('  Available templates:');
      for (let i = 0; i < allTemplates.length; i++) {
        console.log(`    ${i + 1}. ${allTemplates[i].name} — ${allTemplates[i].description}`);
      }
      console.log(`    ${allTemplates.length + 1}. none — use schema-only generation`);
      console.log('');

      const choice = await rl.question(`  Choose template (1-${allTemplates.length + 1}): `);
      const choiceNum = parseInt(choice, 10);
      if (choiceNum >= 1 && choiceNum <= allTemplates.length) {
        templateName = allTemplates[choiceNum - 1].name;
      }
    }

    console.log('');

    // ── Step 7: Record count ─────────────────────────────────────────
    console.log('Step 5: Configuration');
    console.log('───────────────────────────────────────');
    const recordsStr = await promptWithDefault(rl, 'Records per table', '50');
    const records = parseInt(recordsStr, 10) || 50;
    console.log('');

    // ── Step 8: Write config ─────────────────────────────────────────
    console.log('Step 6: Writing Config');
    console.log('───────────────────────────────────────');

    const config: DataboxConfig = {
      database: {
        client: 'postgres',
        connectionString,
      },
      seed: {
        defaultRecords: records,
        batchSize: 1000,
        environment: 'dev',
        randomSeed: 42,
      },
      ...(templateName ? { template: templateName } : {}),
    };

    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
    console.log(`  Created ${CONFIG_FILE}`);
    console.log('');

    // ── Step 9: First seed ───────────────────────────────────────────
    const runSeed = await rl.question('Run initial seed now? (Y/n) ');

    if (runSeed.toLowerCase() !== 'n') {
      console.log('');
      console.log('Seeding...');

      try {
        const result = await seedDatabase(config, {
          records,
          seed: 42,
          template: templateName,
        });

        console.log('');
        for (const tableResult of result.insertResult.tables) {
          console.log(
            `  ${tableResult.tableName}: ${tableResult.rowsInserted} rows`,
          );
        }

        const totalTime = (result.durationMs / 1000).toFixed(1);
        console.log('');
        console.log(`  Seed complete. ${result.totalRows} rows in ${totalTime}s`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('');
        console.error(`  Seed failed: ${msg}`);
        console.error('  You can retry later with: realitydb seed');
      }
    }

    // ── Step 10: Success ─────────────────────────────────────────────
    wizardComplete = true;

    console.log('');
    console.log('RealityDB initialized!');
    console.log('═══════════════════════════════════════');
    console.log(`  Config:   ./${CONFIG_FILE}`);
    console.log(`  Database: ${masked}`);
    if (templateName) {
      console.log(`  Template: ${templateName}`);
    }
    console.log(`  Records:  ${records} per table`);
    console.log('');
    console.log('Next steps:');
    console.log('  realitydb scan      Inspect your schema');
    console.log('  realitydb seed      Generate data');
    console.log('  realitydb export    Export without writing to DB');
    console.log('  realitydb analyze   Generate a custom template');
    console.log('  realitydb --help    See all commands');
    console.log('');
  } finally {
    rl.close();
  }
}

async function promptWithDefault(
  rl: ReturnType<typeof createInterface>,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = await rl.question(`  ${label} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

interface TemplateInfo {
  name: string;
  description: string;
  targetTables: string[];
}

function detectTemplate(
  tableNames: string[],
  templates: TemplateInfo[],
): TemplateInfo | null {
  const lower = new Set(tableNames.map((t) => t.toLowerCase()));
  let bestMatch: TemplateInfo | null = null;
  let bestScore = 0;

  for (const template of templates) {
    let matches = 0;
    for (const target of template.targetTables) {
      if (lower.has(target.toLowerCase())) {
        matches++;
      }
    }
    if (matches >= 2 && matches > bestScore) {
      bestScore = matches;
      bestMatch = template;
    }
  }

  return bestMatch;
}
