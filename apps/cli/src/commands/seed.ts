import { loadLicense } from '../auth/license';
import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  generateData,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function seedCommand(options: {
  pack: string;
  rows?: string;
  connection: string;
  seed?: string;
  createTables?: boolean;
  dropTables?: boolean;
  batchSize?: string;
}): Promise<void> {
  const license = loadLicense();
  const isLoggedIn = !!license;
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const batchSize = options.batchSize ? parseInt(options.batchSize) : 100;

  if (isNaN(rows) || rows < 1) {
    console.error(`\n\u274C Invalid row count: ${options.rows}`);
    process.exit(1);
  }

  if (!isLoggedIn && rows > 50000) {
    console.error(`\n\u274C Free tier limited to 50,000 rows.`);
    console.error(`   Requested: ${rows.toLocaleString()} rows`);
    console.error(`\n   Upgrade: realitydb login --api-key YOUR_KEY\n`);
    process.exit(1);
  }

  // Read pack file
  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  // Mask connection string for display
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  console.log(`\n\u{1F680} RealityDB Seed`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (isLoggedIn) {
    console.log(`   User: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
  } else {
    console.log(`   Mode: FREE TIER (50K rows max)`);
  }
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Database: ${masked}`);
  console.log(`   Template: ${templateName}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Batch size: ${batchSize}`);
  if (options.seed) console.log(`   Seed: ${options.seed}`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Show table plan
  for (const t of ordered) {
    const fkInfo = t.foreignKeys.length > 0
      ? ` (refs: ${t.foreignKeys.map(fk => fk.references.table).join(', ')})`
      : ' (root)';
    console.log(`   \u{1F4CA} ${t.name}: ${rowsPerTable[t.name].toLocaleString()} rows${fkInfo}`);
  }

  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Generating data...`);

  // Generate data using engine
  const { allData, actualTotal, elapsed } = generateData(ordered, rowsPerTable);

  console.log(`   Generated ${actualTotal.toLocaleString()} rows in ${elapsed}s`);
  console.log(`   Connecting to database...`);

  // Dynamic import of pg (only needed for seed)
  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error(`\n\u274C PostgreSQL driver not found.`);
    console.error(`   Run: npm install pg`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: options.connection });

  try {
    await client.connect();
    console.log(`   \u2705 Connected`);

    // Drop tables if requested (reverse order to respect FKs)
    if (options.dropTables) {
      console.log(`   Dropping existing tables...`);
      for (let i = ordered.length - 1; i >= 0; i--) {
        await client.query(`DROP TABLE IF EXISTS "${ordered[i].name}" CASCADE`);
      }
    }

    // Create tables if requested
    if (options.createTables || options.dropTables) {
      console.log(`   Creating tables...`);
      const { generateCreateTable } = await import('@realitydb/engine');
      for (const table of ordered) {
        const ddl = generateCreateTable(table);
        await client.query(ddl);
      }
      console.log(`   \u2705 ${ordered.length} tables created`);
    }

    // Insert data table by table in FK order
    console.log(`   Inserting data...`);
    const insertStart = Date.now();
    let totalInserted = 0;

    for (const table of ordered) {
      const tableData = allData[table.name];
      if (!tableData || tableData.length === 0) continue;

      const columns = Object.keys(tableData[0]);
      let tableInserted = 0;

      for (let offset = 0; offset < tableData.length; offset += batchSize) {
        const batch = tableData.slice(offset, offset + batchSize);
        const values: any[] = [];
        const rowPlaceholders: string[] = [];

        for (let rowIdx = 0; rowIdx < batch.length; rowIdx++) {
          const row = batch[rowIdx];
          const placeholders: string[] = [];
          for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            const paramIndex = rowIdx * columns.length + colIdx + 1;
            placeholders.push(`$${paramIndex}`);
            values.push(row[columns[colIdx]]);
          }
          rowPlaceholders.push(`(${placeholders.join(', ')})`);
        }

        const quotedCols = columns.map(c => `"${c}"`).join(', ');
        const sql = `INSERT INTO "${table.name}" (${quotedCols}) VALUES ${rowPlaceholders.join(', ')}`;
        await client.query(sql, values);
        tableInserted += batch.length;
      }

      totalInserted += tableInserted;
      console.log(`   \u{1F4CA} ${table.name}: ${tableInserted.toLocaleString()} rows inserted`);
    }

    const insertElapsed = ((Date.now() - insertStart) / 1000).toFixed(2);

    console.log(`\n\u2705 Seed complete!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4CA} Total rows: ${totalInserted.toLocaleString()}`);
    console.log(`   \u23F1\uFE0F  Generate: ${elapsed}s`);
    console.log(`   \u23F1\uFE0F  Insert: ${insertElapsed}s`);
    console.log(`   \u{1F4C8} Speed: ${Math.round(totalInserted / parseFloat(insertElapsed)).toLocaleString()} rows/sec`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Seed failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    } else if (error.message.includes('does not exist')) {
      console.error(`   Hint: Try adding --create-tables to create the schema first`);
    } else if (error.message.includes('already exists')) {
      console.error(`   Hint: Try adding --drop-tables to replace existing tables`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
