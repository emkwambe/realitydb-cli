import { loadLicense } from '../auth/license';
import * as fs from 'fs';

export async function captureCommand(options: {
  name: string;
  connection: string;
  schema?: string;
  safe?: boolean;
  tables?: string;
  limit?: string;
}): Promise<void> {
  const license = loadLicense();
  const schemaName = options.schema || 'public';
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  const rowLimit = options.limit ? parseInt(options.limit) : 1000;
  const startTime = Date.now();

  console.log(`\n\u{1F6E1} RealityDB Capture`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
  }
  console.log(`   Database: ${masked}`);
  console.log(`   Bug ID: ${options.name}`);
  console.log(`   Safe mode: ${options.safe ? 'ON (PII masked)' : 'OFF'}`);
  console.log(`   Row limit: ${rowLimit} per table`);
  console.log(`${'\u2500'.repeat(40)}`);

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
    console.log(`   Capturing state...`);

    // Get tables
    let tableFilter = '';
    const params: any[] = [schemaName];
    if (options.tables) {
      const tableList = options.tables.split(',').map(t => t.trim());
      tableFilter = ' AND table_name = ANY($2)';
      params.push(tableList);
    }

    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'${tableFilter}
       ORDER BY table_name`, params
    );

    const tableNames: string[] = tablesResult.rows.map((r: any) => r.table_name);

    if (tableNames.length === 0) {
      console.log(`\n\u26A0\uFE0F  No tables found.`);
      process.exit(0);
    }

    // Get columns
    const columnsResult = await client.query(
      `SELECT table_name, column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2)
       ORDER BY table_name, ordinal_position`,
      [schemaName, tableNames]
    );

    // Get FKs
    const fkResult = await client.query(
      `SELECT kcu.table_name, kcu.column_name, ccu.table_name as target_table, ccu.column_name as target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1`, [schemaName]
    );

    // Get PKs
    const pkResult = await client.query(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1`, [schemaName]
    );
    const pkSet = new Set(pkResult.rows.map((r: any) => `${r.table_name}.${r.column_name}`));

    // PII column patterns for safe mode
    const piiPatterns = [
      /^(email|email_?address)$/i,
      /^(phone|phone_?number|mobile)$/i,
      /^(ssn|social_?security)$/i,
      /^(first_?name|last_?name|full_?name|name)$/i,
      /^(address|street|street_?address)$/i,
      /^(dob|date_?of_?birth|birth_?date)$/i,
      /^(card_?number|credit_?card|cc_?number)$/i,
      /^(password|password_?hash|secret|token|api_?key)$/i,
      /^(ip|ip_?address)$/i,
    ];

    // Capture data from each table
    const capturedData: Record<string, any[]> = {};
    const schema: Record<string, any> = {};
    let totalRows = 0;
    let maskedColumns = 0;

    for (const tableName of tableNames) {
      const cols = columnsResult.rows.filter((r: any) => r.table_name === tableName);
      const colNames = cols.map((c: any) => c.column_name);

      // Read rows
      const dataResult = await client.query(
        `SELECT * FROM "${tableName}" LIMIT ${rowLimit}`
      );

      let rows = dataResult.rows;

      // Safe mode: mask PII columns
      if (options.safe) {
        for (const col of colNames) {
          const isPii = piiPatterns.some(p => p.test(col));
          if (isPii) {
            maskedColumns++;
            rows = rows.map((row: any, i: number) => {
              const masked = { ...row };
              if (col.match(/email/i)) masked[col] = `user${i}@redacted.example`;
              else if (col.match(/phone|mobile/i)) masked[col] = `+10000000${String(i).padStart(3, '0')}`;
              else if (col.match(/name/i)) masked[col] = `Person_${i}`;
              else if (col.match(/ssn|social/i)) masked[col] = `***-**-${String(1000 + i).slice(-4)}`;
              else if (col.match(/address|street/i)) masked[col] = `${100 + i} Redacted St`;
              else if (col.match(/card|credit/i)) masked[col] = `****-****-****-${String(1000 + i).slice(-4)}`;
              else if (col.match(/password|secret|token|api_?key/i)) masked[col] = '[REDACTED]';
              else if (col.match(/ip/i)) masked[col] = `10.0.0.${i % 256}`;
              else masked[col] = `[MASKED_${i}]`;
              return masked;
            });
          }
        }
      }

      capturedData[tableName] = rows;
      totalRows += rows.length;

      // Build schema info
      schema[tableName] = {
        columns: cols.map((c: any) => ({
          name: c.column_name,
          type: c.udt_name,
          isPK: pkSet.has(`${tableName}.${c.column_name}`),
        })),
        fks: fkResult.rows
          .filter((r: any) => r.table_name === tableName)
          .map((r: any) => ({
            column: r.column_name,
            references: { table: r.target_table, column: r.target_column },
          })),
      };

      console.log(`   \u{1F4CB} ${tableName}: ${rows.length} rows captured`);
    }

    // Build the Reality Pack
    const pack = {
      type: 'realitydb-capture',
      version: '1.0.0',
      name: options.name,
      description: `Bug reproduction capture: ${options.name}`,
      capturedAt: new Date().toISOString(),
      database: masked,
      safeMode: !!options.safe,
      schema,
      data: capturedData,
      metadata: {
        tables: tableNames.length,
        totalRows,
        maskedColumns: options.safe ? maskedColumns : 0,
        rowLimitPerTable: rowLimit,
      },
    };

    const outputFile = `${options.name}.realitydb-pack.json`;
    fs.writeFileSync(outputFile, JSON.stringify(pack, null, 2), 'utf-8');

    const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n\u2705 Capture complete!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4C1} Output: ${outputFile} (${fileSize} KB)`);
    console.log(`   \u{1F4CA} Tables: ${tableNames.length}`);
    console.log(`   \u{1F4CA} Total rows: ${totalRows.toLocaleString()}`);
    if (options.safe) console.log(`   \u{1F512} PII columns masked: ${maskedColumns}`);
    console.log(`   \u23F1\uFE0F  Time: ${elapsed}s`);
    console.log(`\n   Share this file for bug reproduction:`);
    console.log(`   realitydb load ${outputFile} --connection <url> --confirm`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Capture failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
