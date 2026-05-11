// apps/cli/src/commands/scan-supabase.ts
// Infers a RealityDB pack JSON from a live Supabase schema
// Connects via connection string or Supabase URL + service role key
// Reuses all inference logic from scan-infer.ts

import * as fs from 'fs';
import * as path from 'path';

// ── Types (mirrored from scan-infer.ts) ──────────────────────

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

interface SchemaFK {
  column: string;
  refTable: string;
  refColumn: string;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreignKeys: SchemaFK[];
}

// ── Options ───────────────────────────────────────────────────

export interface ScanSupabaseOptions {
  connection?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  schema?: string;        // defaults to 'public'
  output?: string;        // pack JSON output path
  review?: string;        // review manifest output path
  exclude?: string;       // comma-separated table names to exclude
  json?: boolean;
}

// ── Connection string builder ─────────────────────────────────

function buildConnectionString(opts: ScanSupabaseOptions): string {
  if (opts.connection) return opts.connection;
  if (opts.supabaseUrl && opts.supabaseKey) {
    const ref = opts.supabaseUrl
      .replace('https://', '')
      .replace('.supabase.co', '')
      .trim();
    return `postgresql://postgres.${ref}:${opts.supabaseKey}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  }
  throw new Error('No connection method provided. Use --connection or --supabase-url + --supabase-key');
}

// ── Schema fetcher ────────────────────────────────────────────

async function fetchSchema(client: any, schema: string): Promise<SchemaTable[]> {

  // 1. Fetch all columns
  const colResult = await client.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.table_name, ku.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
    ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
    WHERE c.table_schema = $1
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE '_realitydb%'
    ORDER BY c.table_name, c.ordinal_position
  `, [schema]);

  // 2. Fetch all foreign keys
  const fkResult = await client.query(`
    SELECT
      kcu.table_name,
      kcu.column_name,
      ccu.table_name AS ref_table,
      ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = $1
    ORDER BY kcu.table_name, kcu.column_name
  `, [schema]);

  // 3. Build SchemaTable[]
  const tableMap = new Map<string, SchemaTable>();

  for (const row of colResult.rows) {
    if (!tableMap.has(row.table_name)) {
      tableMap.set(row.table_name, {
        name: row.table_name,
        columns: [],
        foreignKeys: [],
      });
    }
    const table = tableMap.get(row.table_name)!;

    // Normalize Postgres type to engine-compatible type
    const pgType = (row.udt_name || row.data_type || '').toUpperCase();
    let normalizedType = pgType;
    if (/^INT|^SERIAL|^BIGINT|^SMALLINT|^INT4|^INT8|^INT2/i.test(pgType)) normalizedType = 'INTEGER';
    if (/^UUID/i.test(pgType)) normalizedType = 'UUID';
    if (/^VARCHAR|^TEXT|^CHAR|^BPCHAR/i.test(pgType)) normalizedType = 'VARCHAR';
    if (/^NUMERIC|^DECIMAL|^FLOAT|^DOUBLE|^REAL|^FLOAT4|^FLOAT8/i.test(pgType)) normalizedType = 'NUMERIC';
    if (/^BOOL/i.test(pgType)) normalizedType = 'BOOLEAN';
    if (/^TIMESTAMP|^TIMESTAMPTZ/i.test(pgType)) normalizedType = 'TIMESTAMPTZ';
    if (/^DATE/i.test(pgType)) normalizedType = 'DATE';
    if (/^JSON|^JSONB/i.test(pgType)) normalizedType = 'JSONB';

    table.columns.push({
      name: row.column_name,
      type: normalizedType,
      nullable: row.is_nullable === 'YES',
      isPrimaryKey: row.is_primary_key === true,
      defaultValue: row.column_default || undefined,
    });
  }

  // Add foreign keys
  for (const row of fkResult.rows) {
    const table = tableMap.get(row.table_name);
    if (table) {
      table.foreignKeys.push({
        column: row.column_name,
        refTable: row.ref_table,
        refColumn: row.ref_column,
      });
    }
  }

  return Array.from(tableMap.values());
}

// ── Main command ──────────────────────────────────────────────

export async function scanSupabaseCommand(opts: ScanSupabaseOptions): Promise<void> {
  const schema = opts.schema || 'public';
  const excludeTables = opts.exclude
    ? opts.exclude.split(',').map(t => t.trim().toLowerCase())
    : [];

  console.log(`\n\u{1F50D} RealityDB \u2192 Supabase Schema Scanner`);
  console.log(`${'═'.repeat(52)}`);

  // Build connection string
  let connStr: string;
  try {
    connStr = buildConnectionString(opts);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}`);
    console.error(`   Use one of:`);
    console.error(`   --connection postgresql://...`);
    console.error(`   --supabase-url https://[ref].supabase.co --supabase-key [service_role_key]`);
    process.exit(1);
  }

  // Mask for display
  const masked = connStr.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`   Source:  ${masked}`);
  console.log(`   Schema:  ${schema}`);
  if (excludeTables.length > 0) {
    console.log(`   Exclude: ${excludeTables.join(', ')}`);
  }
  console.log(`${'═'.repeat(52)}`);

  // Connect
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
    console.log(`   \u2705 Connected to Supabase`);

    const startTime = Date.now();

    console.log(`   Fetching schema from "${schema}"...`);
    let schemaTables = await fetchSchema(client, schema);

    // Apply exclusions
    if (excludeTables.length > 0) {
      schemaTables = schemaTables.filter(
        t => !excludeTables.includes(t.name.toLowerCase())
      );
    }

    // Filter out Supabase internal tables
    const SUPABASE_INTERNAL = [
      'schema_migrations', 'ar_internal_metadata',
      'spatial_ref_sys', 'geography_columns', 'geometry_columns',
    ];
    schemaTables = schemaTables.filter(
      t => !SUPABASE_INTERNAL.includes(t.name.toLowerCase())
    );

    if (schemaTables.length === 0) {
      console.error(`\n\u274C No tables found in schema "${schema}".`);
      console.error(`   Have you created any tables in your Supabase project?`);
      process.exit(1);
    }

    const totalCols = schemaTables.reduce((s, t) => s + t.columns.length, 0);
    const totalFKs = schemaTables.reduce((s, t) => s + t.foreignKeys.length, 0);

    console.log(`\n   Tables:  ${schemaTables.length}`);
    console.log(`   Columns: ${totalCols}`);
    console.log(`   FKs:     ${totalFKs}`);
    console.log(`${'─'.repeat(52)}`);

    // Show discovered tables
    for (const t of schemaTables) {
      const fkInfo = t.foreignKeys.length > 0
        ? ` \u2192 refs: ${[...new Set(t.foreignKeys.map(fk => fk.refTable))].join(', ')}`
        : ' (root)';
      console.log(`   \u{1F4CB} ${t.name} (${t.columns.length} cols)${fkInfo}`);
    }
    console.log(`${'─'.repeat(52)}`);

    // Run inference (reuse scan-infer logic)
    console.log(`   Running inference...`);
    const { scanInferFromTables } = await import('./scan-infer-core.js').catch(async () => {
      // Fallback: inline the inference by importing scanInferCommand internals
      // We call the exported helper directly
      return { scanInferFromTables: null };
    });

    // Since scan-infer.ts doesn't export the inference functions directly,
    // we write the pack JSON by re-using the DDL approach:
    // Generate a DDL string from the live schema and pass it through parseDDL
    const ddl = schemaTables.map(t => {
      const colDefs = t.columns.map(c => {
        let def = `  "${c.name}" ${c.type}`;
        if (c.isPrimaryKey) def += ' PRIMARY KEY';
        if (!c.nullable && !c.isPrimaryKey) def += ' NOT NULL';
        if (c.defaultValue) def += ` DEFAULT ${c.defaultValue}`;
        return def;
      });
      const fkDefs = t.foreignKeys.map(fk =>
        `  FOREIGN KEY ("${fk.column}") REFERENCES "${fk.refTable}"("${fk.refColumn}")`
      );
      return `CREATE TABLE IF NOT EXISTS "${t.name}" (\n${[...colDefs, ...fkDefs].join(',\n')}\n);`;
    }).join('\n\n');

    // Write temp DDL file and run scan-infer on it
    const tmpDDL = path.join(process.env.TEMP || '/tmp', `realitydb-scan-${Date.now()}.sql`);
    fs.writeFileSync(tmpDDL, ddl, 'utf-8');

    const elapsed = Date.now() - startTime;

    // Determine output paths
    const defaultBase = opts.supabaseUrl
      ? opts.supabaseUrl.replace('https://', '').replace('.supabase.co', '')
      : 'supabase-schema';
    const outputPack = opts.output || `${defaultBase}-pack.json`;
    const outputReview = opts.review || `${defaultBase}-pack.REVIEW.md`;

    // Import and run scanInferCommand on the temp DDL
    const { scanInferCommand } = await import('./scan-infer.js');
    await scanInferCommand(tmpDDL, {
      output: path.resolve(outputPack),
      review: path.resolve(outputReview),
      json: opts.json,
    });

    // Clean up temp file
    try { fs.unlinkSync(tmpDDL); } catch {}

    console.log(`\n\u2705 Scan complete! (${elapsed}ms)`);
    console.log(`${'─'.repeat(52)}`);
    console.log(`   \u{1F4E6} Pack JSON: ${outputPack}`);
    console.log(`   \u{1F4CB} Review:    ${outputReview}`);
    console.log(``);
    console.log(`   Next steps:`);
    console.log(`   1. Review ${outputReview} for Tier 2/3 columns`);
    console.log(`   2. Edit ${outputPack} to tune enum values`);
    console.log(`   3. Seed your local Supabase:`);
    console.log(`      realitydb seed:supabase --pack ${outputPack} --rows 10000 --to-file supabase/seed.sql`);
    console.log(`   4. supabase db reset`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Scan failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your Supabase project running?`);
    } else if (error.message.includes('authentication') || error.message.includes('password')) {
      console.error(`   Hint: Use the service_role key, not the anon key`);
      console.error(`   Get it: Supabase Dashboard \u2192 Settings \u2192 API \u2192 service_role`);
    } else if (error.message.includes('does not exist')) {
      console.error(`   Hint: Schema "${schema}" not found. Try --schema public`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}