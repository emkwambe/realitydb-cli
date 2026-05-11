// apps/cli/src/commands/examine-supabase.ts
// Assesses data quality of a live Supabase database
// Connects, dumps table data as SQL, runs examine assess pipeline
// Reuses all assess logic from assess.ts

import * as fs from 'fs';
import * as path from 'path';

export interface ExamineSupabaseOptions {
  connection?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  schema?: string;          // defaults to 'public'
  tables?: string;          // comma-separated subset of tables
  exclude?: string;         // comma-separated tables to exclude
  pack?: string;            // optional pack file for cardinality scoring
  output?: string;          // save report to file
  json?: boolean;           // output as JSON
  sampleRows?: string;      // rows per table to sample (default: 5000)
}

function buildConnectionString(opts: ExamineSupabaseOptions): string {
  if (opts.connection) return opts.connection;
  if (opts.supabaseUrl && opts.supabaseKey) {
    const ref = opts.supabaseUrl
      .replace('https://', '')
      .replace('.supabase.co', '')
      .trim();
    return `postgresql://postgres.${ref}:${opts.supabaseKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  }
  throw new Error('No connection method. Use --connection or --supabase-url + --supabase-key');
}

function maskConn(conn: string): string {
  return conn.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}

function valueToSQL(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v instanceof Date) return `'${v.toISOString()}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

export async function examineSupabaseCommand(opts: ExamineSupabaseOptions): Promise<void> {
  const schema = opts.schema || 'public';
  const sampleRows = opts.sampleRows ? parseInt(opts.sampleRows) : 5000;
  const includeTables = opts.tables
    ? opts.tables.split(',').map(t => t.trim().toLowerCase())
    : [];
  const excludeTables = opts.exclude
    ? opts.exclude.split(',').map(t => t.trim().toLowerCase())
    : [];

  console.log(`\n\u{1F50D} RealityDB Examine \u2192 Supabase`);
  console.log(`${'═'.repeat(52)}`);

  let connStr: string;
  try {
    connStr = buildConnectionString(opts);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}`);
    process.exit(1);
  }

  const masked = maskConn(connStr);
  console.log(`   Source:  ${masked}`);
  console.log(`   Schema:  ${schema}`);
  console.log(`   Sample:  ${sampleRows.toLocaleString()} rows per table`);
  if (includeTables.length > 0) console.log(`   Tables:  ${includeTables.join(', ')}`);
  if (excludeTables.length > 0) console.log(`   Exclude: ${excludeTables.join(', ')}`);
  if (opts.pack) console.log(`   Pack:    ${opts.pack}`);
  console.log(`${'═'.repeat(52)}`);

  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error(`\n\u274C PostgreSQL driver not found. Run: npm install pg`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: connStr });

  try {
    console.log(`   Connecting...`);
    await client.connect();
    console.log(`   \u2705 Connected`);

    // 1. Get table list
    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_realitydb%'
      ORDER BY table_name
    `, [schema]);

    let tableNames: string[] = tableResult.rows.map((r: any) => r.table_name);

    // Apply filters
    if (includeTables.length > 0) {
      tableNames = tableNames.filter(t => includeTables.includes(t.toLowerCase()));
    }
    if (excludeTables.length > 0) {
      tableNames = tableNames.filter(t => !excludeTables.includes(t.toLowerCase()));
    }

    // Filter Supabase internal
    const SUPABASE_INTERNAL = ['schema_migrations', 'ar_internal_metadata', 'spatial_ref_sys'];
    tableNames = tableNames.filter(t => !SUPABASE_INTERNAL.includes(t.toLowerCase()));

    if (tableNames.length === 0) {
      console.error(`\n\u274C No tables found in schema "${schema}".`);
      process.exit(1);
    }

    console.log(`\n   Found ${tableNames.length} tables:`);

    // 2. Get column definitions and sample data per table
    const sqlParts: string[] = [];
    sqlParts.push(`-- RealityDB examine:supabase snapshot`);
    sqlParts.push(`-- Source: ${masked}`);
    sqlParts.push(`-- Schema: ${schema}`);
    sqlParts.push(`-- Sampled: ${sampleRows} rows per table`);
    sqlParts.push(`-- Generated: ${new Date().toISOString()}`);
    sqlParts.push(``);

    let totalRows = 0;

    for (const tableName of tableNames) {
      // Get columns
      const colResult = await client.query(`
        SELECT column_name, data_type, udt_name, is_nullable,
               column_default,
               CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
        ) pk ON pk.column_name = c.column_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
      `, [schema, tableName]);

      const columns = colResult.rows;
      if (columns.length === 0) continue;

      // Build CREATE TABLE DDL for the assessor
      const colDefs = columns.map((c: any) => {
        let pgType = (c.udt_name || c.data_type || 'text').toUpperCase();
        if (/^INT4$|^INT8$|^INT2$/i.test(pgType)) pgType = 'INTEGER';
        if (/^UUID/i.test(pgType)) pgType = 'UUID';
        if (/^BPCHAR|^VARCHAR|^TEXT$/i.test(pgType)) pgType = 'VARCHAR(255)';
        if (/^NUMERIC|^FLOAT4|^FLOAT8$/i.test(pgType)) pgType = 'NUMERIC';
        if (/^BOOL$/i.test(pgType)) pgType = 'BOOLEAN';
        if (/^TIMESTAMPTZ|^TIMESTAMP$/i.test(pgType)) pgType = 'TIMESTAMPTZ';
        let def = `  "${c.column_name}" ${pgType}`;
        if (c.is_pk) def += ' PRIMARY KEY';
        else if (c.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      });

      sqlParts.push(`CREATE TABLE IF NOT EXISTS "${tableName}" (`);
      sqlParts.push(colDefs.join(',\n'));
      sqlParts.push(`);`);
      sqlParts.push(``);

      // Get count
      const countResult = await client.query(
        `SELECT COUNT(*) as cnt FROM "${schema}"."${tableName}"`
      );
      const totalCount = parseInt(countResult.rows[0].cnt);

      // Sample data
      const dataResult = await client.query(
        `SELECT * FROM "${schema}"."${tableName}" LIMIT $1`,
        [sampleRows]
      );

      const rows = dataResult.rows;
      const sampledCount = rows.length;
      totalRows += sampledCount;

      console.log(`   \u{1F4CB} ${tableName}: ${totalCount.toLocaleString()} total rows (sampling ${sampledCount.toLocaleString()})`);

      if (rows.length > 0) {
        const colNames = columns.map((c: any) => c.column_name);
        const quotedCols = colNames.map((c: string) => `"${c}"`).join(', ');

        // Batch inserts 500 rows at a time
        const BATCH = 500;
        for (let offset = 0; offset < rows.length; offset += BATCH) {
          const batch = rows.slice(offset, offset + BATCH);
          const valueRows = batch.map((row: any) => {
            const vals = colNames.map((col: string) => valueToSQL(row[col]));
            return `(${vals.join(', ')})`;
          });
          sqlParts.push(`INSERT INTO "${tableName}" (${quotedCols}) VALUES`);
          sqlParts.push(valueRows.join(',\n') + ';');
        }
        sqlParts.push(``);
      }
    }

    console.log(`${'─'.repeat(52)}`);
    console.log(`   Total sampled: ${totalRows.toLocaleString()} rows`);
    console.log(`   Running quality assessment...`);
    console.log(``);

    // 3. Write temp SQL file
    const tmpSQL = path.join(
      process.env.TEMP || process.env.TMPDIR || '/tmp',
      `realitydb-examine-supabase-${Date.now()}.sql`
    );
    fs.writeFileSync(tmpSQL, sqlParts.join('\n'), 'utf-8');

    // 4. Run examine assess on the temp file
    const { assessCommand } = await import('./assess.js');
    await assessCommand(tmpSQL, {
      pack: opts.pack,
      output: opts.output,
      json: opts.json,
    });

    // 5. Clean up
    try { fs.unlinkSync(tmpSQL); } catch {}

    if (!opts.json) {
      console.log(`${'─'.repeat(52)}`);
      console.log(`   Source: ${masked}`);
      if (opts.output) {
        console.log(`   Report saved: ${opts.output}`);
      }
      console.log(``);
      console.log(`   Next steps if score is low:`);
      console.log(`   1. realitydb scan:supabase --supabase-url [url] --supabase-key [key]`);
      console.log(`      → Generate a pack JSON from your schema`);
      console.log(`   2. realitydb seed:supabase --pack [pack] --rows 10000 --to-file supabase/seed.sql`);
      console.log(`      → Replace your seed data with quality-scored synthetic data`);
      console.log(``);
    }

  } catch (error: any) {
    console.error(`\n\u274C Examine failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your Supabase project running?`);
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.error(`   Hint: Use the service_role key, not the anon key`);
      console.error(`   Get it: Supabase Dashboard \u2192 Settings \u2192 API \u2192 service_role`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}