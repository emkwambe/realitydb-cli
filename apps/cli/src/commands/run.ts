import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedDatabase } from '@databox/core';
import { generateCreateTableDDL } from '@databox/schema';
import type { DatabaseSchema, TableSchema, ColumnSchema, ForeignKeySchema } from '@databox/schema';
import { assertValidTemplate } from '@databox/templates';
import type { TemplateJSON } from '@databox/templates';
import { createDatabaseClient, testConnection, closeConnection, withTransaction } from '@databox/db';
import type { DataboxConfig } from '@databox/config';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '1.0.0';

export interface RunOptions {
  pack: string;
  connection: string;
  records?: string;
  seed?: string;
  dropExisting?: boolean;
  dryRun?: boolean;
  ci?: boolean;
}

/**
 * Map a template column strategy to a SQL data type.
 */
function strategyToSqlType(strategy: string): { dataType: string; maxLength: number | null; numericPrecision: number | null; numericScale: number | null } {
  switch (strategy) {
    case 'uuid':
    case 'foreign_key':
      return { dataType: 'UUID', maxLength: null, numericPrecision: null, numericScale: null };
    case 'full_name':
    case 'first_name':
    case 'last_name':
    case 'email':
    case 'phone':
    case 'text':
    case 'company_name':
    case 'address':
    case 'custom':
      return { dataType: 'VARCHAR', maxLength: 255, numericPrecision: null, numericScale: null };
    case 'integer':
    case 'auto_increment':
      return { dataType: 'INTEGER', maxLength: null, numericPrecision: null, numericScale: null };
    case 'float':
    case 'money':
      return { dataType: 'NUMERIC', maxLength: null, numericPrecision: 12, numericScale: 2 };
    case 'boolean':
      return { dataType: 'BOOLEAN', maxLength: null, numericPrecision: null, numericScale: null };
    case 'timestamp':
      return { dataType: 'TIMESTAMPTZ', maxLength: null, numericPrecision: null, numericScale: null };
    case 'enum':
      return { dataType: 'VARCHAR', maxLength: 50, numericPrecision: null, numericScale: null };
    default:
      return { dataType: 'VARCHAR', maxLength: 255, numericPrecision: null, numericScale: null };
  }
}

/**
 * Collect all column names referenced in lifecycleRules nullFields across a table's columns.
 */
function collectNullableFromLifecycle(columns: Record<string, { strategy: string; options?: Record<string, unknown> }>): Set<string> {
  const nullableFields = new Set<string>();
  for (const col of Object.values(columns)) {
    const opts = col.options;
    if (opts?.lifecycleRules && Array.isArray(opts.lifecycleRules)) {
      for (const rule of opts.lifecycleRules) {
        const r = rule as { nullFields?: string[] };
        if (r.nullFields) {
          for (const f of r.nullFields) {
            nullableFields.add(f);
          }
        }
      }
    }
  }
  return nullableFields;
}

/**
 * Convert a Studio-exported template JSON into a DatabaseSchema
 * suitable for generateCreateTableDDL().
 */
export function extractSchemaFromTemplate(template: TemplateJSON): DatabaseSchema {
  const tables: TableSchema[] = [];
  const foreignKeys: ForeignKeySchema[] = [];

  for (const [tableName, tableJson] of Object.entries(template.tables)) {
    const lifecycleNullable = collectNullableFromLifecycle(tableJson.columns as Record<string, { strategy: string; options?: Record<string, unknown> }>);
    const columns: ColumnSchema[] = [];
    let ordinal = 1;

    for (const [colName, colJson] of Object.entries(tableJson.columns)) {
      const strategy = colJson.foreignKey ? 'foreign_key' : colJson.strategy;
      const typeInfo = strategyToSqlType(strategy);
      const isPK = strategy === 'uuid' && colName === 'id';
      const isNullable = lifecycleNullable.has(colName);

      columns.push({
        name: colName,
        dataType: typeInfo.dataType,
        udtName: typeInfo.dataType.toLowerCase(),
        isNullable: isPK ? false : isNullable,
        hasDefault: false,
        defaultValue: null,
        maxLength: typeInfo.maxLength,
        numericPrecision: typeInfo.numericPrecision,
        numericScale: typeInfo.numericScale,
        isPrimaryKey: isPK,
        isUnique: isPK,
        ordinalPosition: ordinal++,
      });

      // Extract foreign key constraints
      if (colJson.foreignKey) {
        foreignKeys.push({
          constraintName: `fk_${tableName}_${colName}`,
          sourceTable: tableName,
          sourceColumn: colName,
          targetTable: colJson.foreignKey.table,
          targetColumn: colJson.foreignKey.column,
        });
      }
    }

    tables.push({
      name: tableName,
      schema: 'public',
      columns,
      primaryKey: columns.find((c) => c.isPrimaryKey)
        ? { columnName: 'id', constraintName: `pk_${tableName}` }
        : null,
      estimatedRowCount: 0,
    });
  }

  return {
    tables,
    foreignKeys,
    tableCount: tables.length,
    foreignKeyCount: foreignKeys.length,
  };
}

/**
 * Order tables so parents come before children (reverse of dependency for DROP).
 */
function getDropOrder(schema: DatabaseSchema): string[] {
  // For DROP, we need children first, then parents — reverse of create order
  const createOrder = getCreateOrder(schema);
  return [...createOrder].reverse();
}

function getCreateOrder(schema: DatabaseSchema): string[] {
  const tableNames = new Set(schema.tables.map((t) => t.name));
  const deps = new Map<string, Set<string>>();
  for (const name of tableNames) {
    deps.set(name, new Set());
  }
  for (const fk of schema.foreignKeys) {
    if (fk.sourceTable !== fk.targetTable && tableNames.has(fk.targetTable)) {
      deps.get(fk.sourceTable)!.add(fk.targetTable);
    }
  }
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) return;
    visiting.add(name);
    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    result.push(name);
  }
  for (const name of tableNames) {
    visit(name);
  }
  return result;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const start = performance.now();

  // ── Resolve built-in templates ──
  const BUILT_IN_PACKS: Record<string, string> = {
    universal: 'Universal Starter — 6 cross-industry tables (users, transactions, audit_logs, api_requests, errors, addresses)',
    banking: 'Retail Banking — 16 tables (accounts, transactions, loans, compliance)',
    healthcare: 'Healthcare Analytics — 14 tables (patients, billing, insurance, labs)',
    oncology: 'Oncology Research — 20 tables (patients, treatments, clinical trials)',
    'supply-chain': 'Supply Chain — 24 tables (suppliers, shipments, warehouses)',
    telecom: 'Telecom & Network — 21 tables (subscribers, towers, billing, churn)',
    fintech: 'FinTech Platform — 9 tables (customers, accounts, transactions, fraud)',
    'eu-banking': 'EU Banking — 11 tables (SEPA, PSD2, MiFID II, KYC, AML/SAR)',
    'eu-healthcare': 'EU Healthcare — 14 tables (ICD-10, EHDS, GDPR Art.9)',
    'eu-telecom': 'EU Telecom — 12 tables (BEREC, EECC, GDPR consent)',
    'us-healthcare': 'US Healthcare — 14 tables (ICD-10-CM, MS-DRG, HIPAA)',
    'us-telecom': 'US Telecom — 12 tables (FCC, CCPA/TCPA, CTIA)',
  };

  // If pack is a built-in name (no slashes, no .json extension), try bundled pack
  if (!options.pack.includes('/') && !options.pack.includes('\\') && !options.pack.endsWith('.json')) {
    if (options.pack === '--list' || options.pack === 'list') {
      console.log('\nAvailable built-in templates:\n');
      for (const [name, desc] of Object.entries(BUILT_IN_PACKS)) {
        console.log(`  \x1b[36m${name}\x1b[0m — ${desc}`);
      }
      console.log('\nUsage: realitydb run --pack <template-name> --rows 5000 --format sql');
      console.log('   or: realitydb run --pack ./path/to/custom-pack.json');
      process.exit(0);
    }

    // Try to resolve from bundled packs directory
    const packDir = resolve(__dirname, '..', 'packs');
    const bundledPath = resolve(packDir, options.pack + '.json');
    if (existsSync(bundledPath)) {
      options.pack = bundledPath;
      console.log(`   Using built-in template: ${Object.keys(BUILT_IN_PACKS).includes(options.pack.replace(/.*[\\\/]/, '').replace('.json', '')) ? options.pack.replace(/.*[\\\/]/, '').replace('.json', '') : 'custom'}\n`);
    } else if (BUILT_IN_PACKS[options.pack]) {
      // Name is known but pack file not bundled — try user directory
      const userPackDir = resolve(process.env.HOME || process.env.USERPROFILE || '.', '.realitydb', 'templates');
      const userPath = resolve(userPackDir, options.pack + '.json');
      if (existsSync(userPath)) {
        options.pack = userPath;
      } else {
        console.error(`\n   Template "${options.pack}" is available but not installed locally.`);
        console.error(`   Download from: https://realitydb-lab-api.eddy-078.workers.dev/v1/store/${options.pack}`);
        console.error(`   Or install: realitydb store download ${options.pack}\n`);
        process.exit(1);
      }
    }
  }

  const packPath = resolve(options.pack);
  const masked = maskConnectionString(options.connection);
  const records = options.records ? parseInt(options.records, 10) : undefined;
  const seed = options.seed ? parseInt(options.seed, 10) : undefined;

  // ── Validate pack file ──
  if (!existsSync(packPath)) {
    const msg = `Pack file not found: ${packPath}`;
    if (options.ci) {
      console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: 0, error: msg }));
      process.exit(1);
    }
    console.error(`[realitydb] ${msg}`);
    console.error('Hint: Provide the path to a Studio-exported template JSON file.');
    process.exit(1);
  }

  let raw: string;
  try {
    raw = readFileSync(packPath, 'utf-8');
  } catch (err: unknown) {
    const msg = `Cannot read pack file: ${err instanceof Error ? err.message : String(err)}`;
    if (options.ci) {
      console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: 0, error: msg }));
      process.exit(1);
    }
    console.error(`[realitydb] ${msg}`);
    process.exit(1);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    const msg = `Pack file is not valid JSON: ${packPath}`;
    if (options.ci) {
      console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: 0, error: msg }));
      process.exit(1);
    }
    console.error(`[realitydb] ${msg}`);
    console.error('Hint: Ensure the file is a valid Studio-exported template JSON.');
    process.exit(1);
  }

  let template: TemplateJSON;
  try {
    template = assertValidTemplate(json);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: 0, error: msg }));
      process.exit(1);
    }
    console.error(`[realitydb] ${msg}`);
    process.exit(1);
  }

  // ── Extract schema ──
  const schema = extractSchemaFromTemplate(template);
  const ddl = generateCreateTableDDL(schema);

  // ── Resolve effective config values ──
  const effectiveRecords = records ?? template.generationConfig?.seed?.defaultRecords ?? 1000;
  const effectiveSeed = seed ?? template.generationConfig?.seed?.randomSeed ?? 42;

  // ── Header ──
  if (!options.ci) {
    console.log('');
    console.log('RealityDB Run');
    console.log('═══════════════════════════════════════');
    console.log(`Pack: ${packPath}`);
    console.log(`Database: ${masked}`);
    console.log(`Records per table: ${effectiveRecords}`);
    console.log(`Seed: ${effectiveSeed}`);
    if (options.dropExisting) console.log('Drop existing: yes');
    if (options.dryRun) console.log('Mode: dry run');
    console.log('');
  }

  // ── Dry run mode ──
  if (options.dryRun) {
    if (options.ci) {
      const tableNames = Object.keys(template.tables);
      const planSummary = tableNames.map((name) => ({
        table: name,
        columns: Object.keys(template.tables[name].columns).length,
        records: effectiveRecords,
      }));
      console.log(formatCIOutput({
        success: true,
        command: 'run',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        data: { dryRun: true, ddl, plan: planSummary },
      }));
      return;
    }

    console.log('DDL that would be executed:');
    console.log('───────────────────────────────────────');
    if (options.dropExisting) {
      const dropOrder = getDropOrder(schema);
      for (const tableName of dropOrder) {
        console.log(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
      }
      console.log('');
    }
    console.log(ddl);

    console.log('Generation Plan:');
    console.log('───────────────────────────────────────');
    for (const [tableName, tableJson] of Object.entries(template.tables)) {
      const colCount = Object.keys(tableJson.columns).length;
      const strategies = Object.values(tableJson.columns).map((c) => c.strategy);
      const uniqueStrategies = [...new Set(strategies)].join(', ');
      console.log(`  ${tableName}: ${effectiveRecords} rows, ${colCount} columns [${uniqueStrategies}]`);
    }

    console.log('');
    console.log('Dry run complete. No changes were made.');
    return;
  }

  // ── Connect to database ──
  const clientType = (template.generationConfig?.database?.client ?? 'postgres') as 'postgres' | 'mysql';
  const pool = createDatabaseClient(clientType, options.connection);

  try {
    try {
      await testConnection(pool);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.ci) {
        console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: Math.round(performance.now() - start), error: msg }));
        process.exit(1);
      }
      console.error(`[realitydb] Cannot connect to database: ${msg}`);
      console.error('Hint: Check your connection string and ensure the database is running.');
      process.exit(1);
    }

    // ── Check for existing tables ──
    if (!options.dropExisting) {
      const existingTables: string[] = [];
      for (const table of schema.tables) {
        try {
          const client = await pool.connect();
          try {
            const result = await client.query(
              `SELECT to_regclass('"${table.name}"') AS exists_check`,
            );
            if (result.rows[0]?.exists_check) {
              existingTables.push(table.name);
            }
          } finally {
            client.release();
          }
        } catch {
          // Ignore — table doesn't exist
        }
      }
      if (existingTables.length > 0) {
        const msg = `Tables already exist: ${existingTables.join(', ')}. Use --drop-existing to recreate them.`;
        if (options.ci) {
          console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: Math.round(performance.now() - start), error: msg }));
          process.exit(1);
        }
        console.error(`[realitydb] ${msg}`);
        process.exit(1);
      }
    }

    // ── Execute DDL ──
    if (!options.ci) {
      console.log('Creating schema...');
    }

    try {
      await withTransaction(pool, async (client) => {
        // Drop existing tables if requested
        if (options.dropExisting) {
          const dropOrder = getDropOrder(schema);
          for (const tableName of dropOrder) {
            await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          }
        }

        // Create tables using DDL
        const statements = ddl.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
        for (const stmt of statements) {
          await client.query(stmt + ';');
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.ci) {
        console.log(formatCIOutput({ success: false, command: 'run', version: VERSION, timestamp: new Date().toISOString(), durationMs: Math.round(performance.now() - start), error: `DDL failed: ${msg}` }));
        process.exit(1);
      }
      console.error(`[realitydb] DDL failed: ${msg}`);
      console.error('Database was not modified (transaction rolled back).');
      process.exit(1);
    }

    if (!options.ci) {
      for (const table of schema.tables) {
        console.log(`  Created table: ${table.name} (${table.columns.length} columns)`);
      }
      console.log('');
    }

    // ── Seed data ──
    if (!options.ci) {
      console.log('Seeding data...');
    }

    const config: DataboxConfig = {
      database: {
        client: clientType,
        connectionString: options.connection,
      },
      seed: {
        defaultRecords: effectiveRecords,
        batchSize: 500,
        environment: 'development',
        randomSeed: effectiveSeed,
      },
      template: packPath,
    };

    const result = await seedDatabase(config, {
      records: effectiveRecords,
      seed: effectiveSeed,
      template: packPath,
    });

    const durationMs = Math.round(performance.now() - start);
    const totalTime = (durationMs / 1000).toFixed(1);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'run',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          tablesCreated: schema.tables.length,
          totalRows: result.totalRows,
          pack: packPath,
          database: masked,
          tables: result.insertResult.tables.map((t) => ({
            name: t.tableName,
            rowsInserted: t.rowsInserted,
            batchCount: t.batchCount,
            durationMs: t.durationMs,
          })),
        },
      }));
      return;
    }

    // Print per-table seed results
    for (const tableResult of result.insertResult.tables) {
      console.log(
        `  ${tableResult.tableName}: ${tableResult.rowsInserted} rows inserted (${tableResult.batchCount} batches, ${tableResult.durationMs}ms)`,
      );
    }

    console.log('');
    console.log('RealityDB Run Complete');
    console.log('═══════════════════════════════════════');
    console.log(`Schema: ${schema.tables.length} tables created`);
    console.log(`Data: ${result.totalRows} total rows in ${totalTime}s`);
    console.log(`Pack: ${packPath}`);
    console.log(`Database: ${masked}`);
    console.log('');
  } finally {
    await closeConnection(pool);
  }
}
