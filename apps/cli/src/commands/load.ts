import { loadLicense } from '../auth/license';
import * as fs from 'fs';
import * as path from 'path';

export async function loadCommand(options: {
  file: string;
  connection: string;
  confirm?: boolean;
  dropTables?: boolean;
}): Promise<void> {
  const license = loadLicense();
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  const startTime = Date.now();

  const filePath = path.resolve(options.file);
  if (!fs.existsSync(filePath)) {
    console.error(`\n\u274C File not found: ${filePath}`);
    process.exit(1);
  }

  let pack: any;
  try {
    pack = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    console.error(`\n\u274C Invalid JSON in ${filePath}`);
    process.exit(1);
  }

  const tableNames = Object.keys(pack.data || {});
  const totalRows = tableNames.reduce((sum, t) => sum + (pack.data[t]?.length || 0), 0);

  console.log(`\n\u{1F4E5} RealityDB Load`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`   File: ${options.file}`);
  console.log(`   Pack: ${pack.name || 'unnamed'}`);
  if (pack.capturedAt) console.log(`   Captured: ${pack.capturedAt}`);
  if (pack.safeMode) console.log(`   \u{1F512} PII was masked in this capture`);
  console.log(`   Database: ${masked}`);
  console.log(`   Tables: ${tableNames.length}`);
  console.log(`   Total rows: ${totalRows.toLocaleString()}`);
  console.log(`${'\u2500'.repeat(40)}`);

  if (!options.confirm) {
    console.log(`\n\u26A0\uFE0F  This will INSERT ${totalRows.toLocaleString()} rows into ${tableNames.length} tables.`);
    if (options.dropTables) console.log(`   Tables will be DROPPED and recreated.`);
    console.log(`   Add --confirm to proceed.\n`);
    process.exit(0);
  }

  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error(`\n\u274C PostgreSQL driver not found. Run: npm install pg`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: options.connection });

  try {
    await client.connect();
    console.log(`   \u2705 Connected`);

    // Drop tables if requested (reverse order)
    if (options.dropTables) {
      console.log(`   Dropping tables...`);
      for (let i = tableNames.length - 1; i >= 0; i--) {
        await client.query(`DROP TABLE IF EXISTS "${tableNames[i]}" CASCADE`);
      }
    }

    // Create tables if schema info exists
    if (pack.schema && options.dropTables) {
      console.log(`   Creating tables...`);
      for (const tableName of tableNames) {
        const tableSchema = pack.schema[tableName];
        if (!tableSchema) continue;

        const colDefs = tableSchema.columns.map((col: any) => {
          let type = col.type || 'text';
          if (type === 'uuid') type = 'UUID';
          else if (type === 'int4' || type === 'integer') type = 'INTEGER';
          else if (type === 'int8' || type === 'bigint') type = 'BIGINT';
          else if (type === 'float8' || type === 'numeric') type = 'NUMERIC';
          else if (type === 'bool') type = 'BOOLEAN';
          else if (type === 'timestamptz') type = 'TIMESTAMPTZ';
          else if (type === 'timestamp') type = 'TIMESTAMP';
          else type = 'TEXT';

          const pk = col.isPK ? ' PRIMARY KEY' : '';
          return `"${col.name}" ${type}${pk}`;
        }).join(',\n  ');

        await client.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs}\n)`);
      }
      console.log(`   \u2705 ${tableNames.length} tables created`);
    }

    // Insert data
    console.log(`   Loading data...`);
    let totalLoaded = 0;

    for (const tableName of tableNames) {
      const rows = pack.data[tableName];
      if (!rows || rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const batchSize = 100;

      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const values: any[] = [];
        const rowPlaceholders: string[] = [];

        for (let rowIdx = 0; rowIdx < batch.length; rowIdx++) {
          const row = batch[rowIdx];
          const placeholders: string[] = [];
          for (let colIdx = 0; colIdx < columns.length; colIdx++) {
            placeholders.push(`$${rowIdx * columns.length + colIdx + 1}`);
            values.push(row[columns[colIdx]]);
          }
          rowPlaceholders.push(`(${placeholders.join(', ')})`);
        }

        const quotedCols = columns.map(c => `"${c}"`).join(', ');
        await client.query(
          `INSERT INTO "${tableName}" (${quotedCols}) VALUES ${rowPlaceholders.join(', ')}`,
          values
        );
      }

      totalLoaded += rows.length;
      console.log(`   \u{1F4CB} ${tableName}: ${rows.length} rows loaded`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n\u2705 Load complete!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4CA} ${totalLoaded.toLocaleString()} rows loaded across ${tableNames.length} tables`);
    console.log(`   \u23F1\uFE0F  Time: ${elapsed}s`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Load failed: ${error.message}`);
    if (error.message.includes('already exists')) {
      console.error(`   Hint: Add --drop-tables to replace existing tables`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
