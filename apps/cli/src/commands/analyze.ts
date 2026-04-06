import { loadLicense } from '../auth/license';
import * as fs from 'fs';

interface ColumnAnalysis {
  table: string;
  column: string;
  dataType: string;
  nullRate: number;
  distinctCount: number;
  totalCount: number;
  suggestedStrategy: string;
  suggestedOptions?: any;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function analyzeCommand(options: {
  connection: string;
  output?: string;
  schema?: string;
  sample?: string;
  table?: string;
}): Promise<void> {
  const license = loadLicense();
  const schemaName = options.schema || 'public';
  const sampleSize = options.sample ? parseInt(options.sample) : 100;
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  const startTime = Date.now();

  console.log(`\n\u{1F9EA} RealityDB Analyze`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`   Database: ${masked}`);
  console.log(`   Schema: ${schemaName}`);
  console.log(`   Sample size: ${sampleSize} rows per table`);
  if (options.table) console.log(`   Table filter: ${options.table}`);
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
    console.log(`   Analyzing data patterns...`);

    // Get tables
    let tableFilter = '';
    const params: any[] = [schemaName];
    if (options.table) {
      tableFilter = ' AND table_name = $2';
      params.push(options.table);
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
      `SELECT table_name, column_name, data_type, udt_name, is_nullable,
              character_maximum_length, numeric_precision
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = ANY($2)
       ORDER BY table_name, ordinal_position`,
      [schemaName, tableNames]
    );

    // Get PKs
    const pkResult = await client.query(
      `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1`, [schemaName]
    );
    const pkSet = new Set(pkResult.rows.map((r: any) => `${r.table_name}.${r.column_name}`));

    // Get FKs
    const fkResult = await client.query(
      `SELECT kcu.table_name, kcu.column_name, ccu.table_name as target_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1`, [schemaName]
    );
    const fkMap = new Map<string, string>();
    for (const r of fkResult.rows) {
      fkMap.set(`${r.table_name}.${r.column_name}`, r.target_table);
    }

    // Analyze each column
    const analyses: ColumnAnalysis[] = [];

    for (const tableName of tableNames) {
      const tableCols = columnsResult.rows.filter((r: any) => r.table_name === tableName);

      // Get row count
      let rowCount = 0;
      try {
        const cnt = await client.query(`SELECT COUNT(*)::int as cnt FROM "${tableName}"`);
        rowCount = cnt.rows[0].cnt;
      } catch { continue; }

      if (rowCount === 0) continue;

      for (const col of tableCols) {
        const key = `${tableName}.${col.column_name}`;

        // Skip PKs and FKs — we already know what they are
        if (pkSet.has(key)) {
          analyses.push({
            table: tableName, column: col.column_name, dataType: col.udt_name,
            nullRate: 0, distinctCount: rowCount, totalCount: rowCount,
            suggestedStrategy: 'uuid', confidence: 'high', reason: 'Primary key',
          });
          continue;
        }

        if (fkMap.has(key)) {
          analyses.push({
            table: tableName, column: col.column_name, dataType: col.udt_name,
            nullRate: 0, distinctCount: 0, totalCount: rowCount,
            suggestedStrategy: 'fk', confidence: 'high',
            reason: `Foreign key → ${fkMap.get(key)}`,
            suggestedOptions: { references: fkMap.get(key) },
          });
          continue;
        }

        // Sample distinct values
        try {
          const stats = await client.query(`
            SELECT 
              COUNT(*)::int as total,
              COUNT(DISTINCT "${col.column_name}")::int as distinct_count,
              COUNT(*) FILTER (WHERE "${col.column_name}" IS NULL)::int as null_count
            FROM (SELECT "${col.column_name}" FROM "${tableName}" LIMIT ${sampleSize}) sub
          `);

          const total = stats.rows[0].total;
          const distinctCount = stats.rows[0].distinct_count;
          const nullCount = stats.rows[0].null_count;
          const nullRate = total > 0 ? nullCount / total : 0;
          const uniqueRatio = total > 0 ? distinctCount / total : 0;

          // Get top values for enum detection
          const topValues = await client.query(`
            SELECT "${col.column_name}"::text as val, COUNT(*)::int as cnt
            FROM "${tableName}"
            WHERE "${col.column_name}" IS NOT NULL
            GROUP BY "${col.column_name}"
            ORDER BY cnt DESC
            LIMIT 20
          `);

          const analysis: ColumnAnalysis = {
            table: tableName, column: col.column_name, dataType: col.udt_name,
            nullRate, distinctCount, totalCount: total,
            suggestedStrategy: 'text', confidence: 'low', reason: '',
          };

          // Enum detection: low cardinality with repeated values
          if (distinctCount <= 15 && distinctCount > 1 && uniqueRatio < 0.5 && total >= 5) {
            const values = topValues.rows.map((r: any) => r.val);
            const counts = topValues.rows.map((r: any) => r.cnt);
            const totalNonNull = counts.reduce((a: number, b: number) => a + b, 0);
            const weights = counts.map((c: number) => Math.round((c / totalNonNull) * 100));

            analysis.suggestedStrategy = 'enum';
            analysis.suggestedOptions = { values, weights };
            analysis.confidence = distinctCount <= 8 ? 'high' : 'medium';
            analysis.reason = `${distinctCount} distinct values, distribution detected`;
          }
          // Boolean detection
          else if (col.udt_name === 'bool' || (distinctCount === 2 && topValues.rows.every((r: any) => ['true', 'false', 't', 'f', '0', '1'].includes(String(r.val).toLowerCase())))) {
            analysis.suggestedStrategy = 'boolean';
            analysis.confidence = 'high';
            analysis.reason = 'Boolean values detected';
          }
          // UUID detection
          else if (col.udt_name === 'uuid' || (uniqueRatio > 0.95 && topValues.rows[0]?.val?.match(/^[0-9a-f]{8}-/))) {
            analysis.suggestedStrategy = 'uuid';
            analysis.confidence = 'high';
            analysis.reason = 'UUID pattern detected';
          }
          // Email detection
          else if (topValues.rows.some((r: any) => r.val && r.val.includes('@') && r.val.includes('.'))) {
            analysis.suggestedStrategy = 'email';
            analysis.confidence = 'high';
            analysis.reason = 'Email pattern detected';
          }
          // Phone detection
          else if (topValues.rows.some((r: any) => r.val && /^\+?\d[\d\s\-()]{7,}$/.test(r.val))) {
            analysis.suggestedStrategy = 'phone';
            analysis.confidence = 'high';
            analysis.reason = 'Phone pattern detected';
          }
          // Timestamp
          else if (['timestamp', 'timestamptz', 'date'].includes(col.udt_name)) {
            analysis.suggestedStrategy = 'timestamp';
            analysis.confidence = 'high';
            analysis.reason = 'Timestamp type';
          }
          // Integer with range
          else if (['int4', 'int2', 'int8', 'integer', 'smallint', 'bigint'].includes(col.udt_name)) {
            const range = await client.query(
              `SELECT MIN("${col.column_name}")::int as min_val, MAX("${col.column_name}")::int as max_val FROM "${tableName}" WHERE "${col.column_name}" IS NOT NULL`
            );
            analysis.suggestedStrategy = 'integer';
            analysis.suggestedOptions = { min: range.rows[0].min_val || 0, max: range.rows[0].max_val || 1000 };
            analysis.confidence = 'high';
            analysis.reason = `Range: ${range.rows[0].min_val} to ${range.rows[0].max_val}`;
          }
          // Float with range
          else if (['numeric', 'decimal', 'float4', 'float8', 'real', 'double precision'].includes(col.udt_name)) {
            const range = await client.query(
              `SELECT MIN("${col.column_name}")::float as min_val, MAX("${col.column_name}")::float as max_val FROM "${tableName}" WHERE "${col.column_name}" IS NOT NULL`
            );
            analysis.suggestedStrategy = 'float';
            analysis.suggestedOptions = {
              min: Math.floor((range.rows[0].min_val || 0) * 100) / 100,
              max: Math.ceil((range.rows[0].max_val || 1000) * 100) / 100,
            };
            analysis.confidence = 'high';
            analysis.reason = `Range: ${analysis.suggestedOptions.min} to ${analysis.suggestedOptions.max}`;
          }
          // High cardinality text — name patterns
          else if (uniqueRatio > 0.8 && ['varchar', 'text'].includes(col.udt_name)) {
            const colName = col.column_name.toLowerCase();
            if (colName.includes('name') && (tableName.includes('user') || tableName.includes('customer') || tableName.includes('person') || tableName.includes('employee') || tableName.includes('student'))) {
              analysis.suggestedStrategy = 'full_name';
              analysis.confidence = 'medium';
              analysis.reason = 'High cardinality name column on person table';
            } else if (colName.includes('company') || colName.includes('org')) {
              analysis.suggestedStrategy = 'company_name';
              analysis.confidence = 'medium';
              analysis.reason = 'Company/org name pattern';
            } else {
              analysis.suggestedStrategy = 'text';
              analysis.confidence = 'low';
              analysis.reason = `High cardinality text (${distinctCount} unique in ${total} rows)`;
            }
          }
          // Default text
          else {
            analysis.reason = `${distinctCount} distinct values in ${total} rows`;
          }

          analyses.push(analysis);
        } catch { continue; }
      }
    }

    // Display results grouped by table
    console.log(`\n   Analysis Results`);
    console.log(`${'\u2500'.repeat(40)}`);

    const tableGrouped = new Map<string, ColumnAnalysis[]>();
    for (const a of analyses) {
      if (!tableGrouped.has(a.table)) tableGrouped.set(a.table, []);
      tableGrouped.get(a.table)!.push(a);
    }

    let enumCount = 0;
    let highConfidence = 0;

    for (const [table, cols] of tableGrouped) {
      console.log(`\n   \u{1F4CB} ${table}`);
      for (const col of cols) {
        const conf = col.confidence === 'high' ? '\u2705' : col.confidence === 'medium' ? '\u{1F7E1}' : '\u26AA';
        const opts = col.suggestedOptions ? ` ${JSON.stringify(col.suggestedOptions).substring(0, 60)}` : '';
        console.log(`      ${conf} ${col.column}: ${col.suggestedStrategy}${opts}`);
        console.log(`         ${col.reason}${col.nullRate > 0 ? ` | ${Math.round(col.nullRate * 100)}% null` : ''}`);
        if (col.suggestedStrategy === 'enum') enumCount++;
        if (col.confidence === 'high') highConfidence++;
      }
    }

    console.log(`\n${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4CA} ${analyses.length} columns analyzed across ${tableGrouped.size} tables`);
    console.log(`   \u2705 ${highConfidence} high confidence suggestions`);
    console.log(`   \u{1F3AF} ${enumCount} enum distributions detected from data`);
    console.log(`   \u23F1\uFE0F  Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    // Save enriched pack if output specified
    if (options.output) {
      // Build a strategy map
      const strategyMap: Record<string, Record<string, any>> = {};
      for (const a of analyses) {
        if (!strategyMap[a.table]) strategyMap[a.table] = {};
        strategyMap[a.table][a.column] = {
          strategy: a.suggestedStrategy,
          options: a.suggestedOptions,
          confidence: a.confidence,
        };
      }

      fs.writeFileSync(options.output, JSON.stringify({
        generatedAt: new Date().toISOString(),
        database: masked,
        sampleSize,
        tables: tableGrouped.size,
        columns: analyses.length,
        strategies: strategyMap,
      }, null, 2), 'utf-8');

      console.log(`   \u{1F4C1} Strategy report: ${options.output}`);
      console.log(`\n   Use this to enrich a scanned pack with data-driven strategies.`);
    }

    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Analyze failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
