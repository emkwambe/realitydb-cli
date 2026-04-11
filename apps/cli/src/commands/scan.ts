import { loadLicense } from '../auth/license';
import * as fs from 'fs';

interface ScannedColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPK: boolean;
  maxLength: number | null;
  numericPrecision: number | null;
}

interface ScannedFK {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

interface ScannedTable {
  name: string;
  columns: ScannedColumn[];
  estimatedRows: number;
}

function inferStrategy(col: ScannedColumn, tableName: string): { strategy: string; options?: any } {
  const name = col.name.toLowerCase();
  const type = col.dataType.toLowerCase();

  // UUID columns
  if (type === 'uuid') return { strategy: 'uuid' };

  // Timestamps
  if (type.includes('timestamp') || type === 'timestamptz') {
    return { strategy: 'timestamp' };
  }
  if (type === 'date') return { strategy: 'timestamp' };

  // Boolean
  if (type === 'boolean' || type === 'bool') return { strategy: 'boolean' };

  // Integers
  if (['integer', 'int', 'int4', 'smallint', 'int2', 'bigint', 'int8', 'serial', 'bigserial'].includes(type)) {
    if (name.includes('quantity') || name.includes('count') || name.includes('stock')) {
      return { strategy: 'integer', options: { min: 0, max: 10000 } };
    }
    if (name.includes('rating') || name.includes('score')) {
      return { strategy: 'integer', options: { min: 1, max: 5 } };
    }
    if (name.includes('age')) {
      return { strategy: 'integer', options: { min: 18, max: 85 } };
    }
    return { strategy: 'integer', options: { min: 1, max: 1000 } };
  }

  // Numeric/decimal
  if (['numeric', 'decimal', 'real', 'float4', 'double precision', 'float8', 'money'].includes(type)) {
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('total') || name.includes('fee')) {
      return { strategy: 'float', options: { min: 1, max: 999.99 } };
    }
    if (name.includes('rate') || name.includes('percent')) {
      return { strategy: 'float', options: { min: 0, max: 100 } };
    }
    if (name.includes('weight') || name.includes('kg')) {
      return { strategy: 'float', options: { min: 0.1, max: 500 } };
    }
    return { strategy: 'float', options: { min: 1, max: 999.99 } };
  }

  // String types — infer from column name
  if (['varchar', 'character varying', 'text', 'char', 'character', 'name'].includes(type)) {
    if (name === 'email' || name.includes('email')) return { strategy: 'email' };
    if (name === 'phone' || name.includes('phone') || name.includes('mobile')) return { strategy: 'phone' };
    if (name === 'name' && tableName.includes('user') || tableName.includes('customer') || tableName.includes('person') || tableName.includes('employee') || tableName.includes('contact')) {
      return { strategy: 'full_name' };
    }
    if (name === 'name' || name.includes('company') || name.includes('org')) return { strategy: 'company_name' };
    if (name === 'status') {
      return { strategy: 'enum', options: { values: ['active', 'inactive', 'pending'], weights: [60, 25, 15] } };
    }
    if (name === 'type' || name === 'category' || name === 'role' || name === 'tier' || name === 'level' || name === 'priority') {
      return { strategy: 'enum', options: { values: ['type_a', 'type_b', 'type_c'], weights: [50, 30, 20] } };
    }
    if (name.includes('address') || name.includes('street')) return { strategy: 'address' };
    if (name.includes('city')) {
      return { strategy: 'enum', options: { values: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Charlotte', 'Atlanta', 'Miami', 'Denver', 'Seattle'] } };
    }
    if (name.includes('country')) {
      return { strategy: 'enum', options: { values: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia', 'Brazil', 'India', 'Mexico'], weights: [30, 10, 10, 8, 8, 7, 7, 7, 7, 6] } };
    }
    if (name === 'sku' || name === 'code' || name === 'ref') return { strategy: 'random_string' };
    return { strategy: 'text' };
  }

  // JSON
  if (type === 'json' || type === 'jsonb') return { strategy: 'text' };

  return { strategy: 'text' };
}


// --- Enhanced Scan: PII Detection Patterns ---
const PII_PATTERNS: Record<string, RegExp> = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\+]?[\d\s\-\(\)]{7,15}$/,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  credit_card: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  ip_address: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  date_of_birth: /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

const PII_COLUMN_NAMES: Record<string, string> = {
  email: 'email',
  phone: 'phone',
  mobile: 'phone',
  ssn: 'ssn',
  social_security: 'ssn',
  credit_card: 'credit_card',
  card_number: 'credit_card',
  ip: 'ip_address',
  ip_address: 'ip_address',
  dob: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  birth_date: 'date_of_birth',
  first_name: 'name',
  last_name: 'name',
  full_name: 'name',
  address: 'address',
  street: 'address',
  zip: 'address',
  zipcode: 'address',
  postal_code: 'address',
};

export async function scanCommand(options: {
  connection: string;
  output?: string;
  schema?: string;
  format?: string;
  inferEnums?: boolean;
  detectPii?: boolean;
  estimateCardinality?: boolean;
  sampleSize?: string;
}): Promise<void> {
  const license = loadLicense();
  const schemaName = options.schema || 'public';
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  console.log(`\n\u{1F50D} RealityDB Scan`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`   Database: ${masked}`);
  console.log(`   Schema: ${schemaName}`);
  if (options.inferEnums) console.log(`   Enum inference: ON`);
  if (options.detectPii) console.log(`   PII detection: ON`);
  if (options.estimateCardinality) console.log(`   Cardinality estimation: ON`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Connecting...`);

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
    console.log(`   Scanning schema...`);

    // Get tables
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT reltuples::bigint FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = table_name AND n.nspname = table_schema LIMIT 1) AS estimated_rows
      FROM information_schema.tables 
      WHERE table_schema = $1 AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [schemaName]);

    const tableNames: string[] = tablesResult.rows.map((r: any) => r.table_name);
    console.log(`   Found ${tableNames.length} tables`);

    if (tableNames.length === 0) {
      console.log(`\n\u26A0\uFE0F  No tables found in schema "${schemaName}".`);
      process.exit(0);
    }

    // Get columns for all tables
    const columnsResult = await client.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable,
             column_default, character_maximum_length, numeric_precision, numeric_scale,
             ordinal_position
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = ANY($2)
      ORDER BY table_name, ordinal_position
    `, [schemaName, tableNames]);

    // Get primary keys
    const pkResult = await client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = $1
    `, [schemaName]);

    const pkMap = new Map<string, Set<string>>();
    for (const row of pkResult.rows) {
      if (!pkMap.has(row.table_name)) pkMap.set(row.table_name, new Set());
      pkMap.get(row.table_name)!.add(row.column_name);
    }

    // Get foreign keys
    const fkResult = await client.query(`
      SELECT 
        kcu.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1
    `, [schemaName]);

    const fks: ScannedFK[] = fkResult.rows.map((r: any) => ({
      sourceTable: r.source_table,
      sourceColumn: r.source_column,
      targetTable: r.target_table,
      targetColumn: r.target_column,
    }));


        // Build scanned tables
    const scannedTables: ScannedTable[] = [];
    for (const tableName of tableNames) {
      const cols = columnsResult.rows
        .filter((r: any) => r.table_name === tableName)
        .map((r: any) => ({
          name: r.column_name,
          dataType: r.udt_name || r.data_type,
          isNullable: r.is_nullable === 'YES',
          isPK: pkMap.get(tableName)?.has(r.column_name) || false,
          maxLength: r.character_maximum_length,
          numericPrecision: r.numeric_precision,
        }));

      const tableRow = tablesResult.rows.find((r: any) => r.table_name === tableName);
      scannedTables.push({
        name: tableName,
        columns: cols,
        estimatedRows: Math.max(0, parseInt(tableRow?.estimated_rows) || 0),
      });
    }

    // === ENHANCED SCAN: Data Sampling ===
    const sampleSize = options.sampleSize ? parseInt(options.sampleSize) : 1000;
    const inferredEnums: Record<string, { values: string[]; weights: number[] }> = {};
    const detectedPII: { table: string; column: string; category: string; confidence: string }[] = [];
    const cardinalityStats: Record<string, { mean: number; min: number; max: number; strategy: string }> = {};

    if (options.inferEnums || options.detectPii || options.estimateCardinality) {
      console.log(`   Sampling data (${sampleSize} rows per table)...`);
    }

    // ENUM INFERENCE: discover actual values and frequencies
    if (options.inferEnums) {
      console.log(`   Inferring enum distributions...`);
      for (const table of scannedTables) {
        for (const col of table.columns) {
          // Skip PKs, FKs, timestamps, booleans, numeric types
          if (col.isPK) continue;
          const isFk = fks.some(f => f.sourceTable === table.name && f.sourceColumn === col.name);
          if (isFk) continue;
          if (['uuid', 'timestamp', 'timestamptz', 'date', 'boolean', 'bool', 'integer', 'int', 'int4', 'int8', 'bigint', 'smallint', 'serial', 'bigserial', 'numeric', 'decimal', 'real', 'float4', 'float8', 'double precision', 'money'].includes(col.dataType.toLowerCase())) continue;

          try {
            const distinctResult = await client.query(`
              SELECT ${col.name}::text AS val, COUNT(*) AS cnt
              FROM ${schemaName}.${table.name}
              WHERE ${col.name} IS NOT NULL
              GROUP BY ${col.name}
              ORDER BY cnt DESC
              LIMIT 30
            `);

            const rows = distinctResult.rows;
            if (rows.length >= 2 && rows.length <= 25) {
              // This looks like an enum — limited distinct values
              const total = rows.reduce((s: number, r: any) => s + parseInt(r.cnt), 0);
              const values = rows.map((r: any) => r.val);
              const weights = rows.map((r: any) => Math.round((parseInt(r.cnt) / total) * 100));

              // Normalize weights to sum to 100
              const weightSum = weights.reduce((a: number, b: number) => a + b, 0);
              if (weightSum > 0 && weightSum !== 100) {
                const scale = 100 / weightSum;
                for (let i = 0; i < weights.length; i++) {
                  weights[i] = Math.round(weights[i] * scale);
                }
              }

              inferredEnums[`${table.name}.${col.name}`] = { values, weights };
            }
          } catch (e) {
            // Skip columns that error (e.g., complex types)
          }
        }
      }
      console.log(`   \u{1F3AF} Discovered ${Object.keys(inferredEnums).length} enum distributions`);
    }

    // PII DETECTION: sample rows and check patterns
    if (options.detectPii) {
      console.log(`   Detecting PII columns...`);
      for (const table of scannedTables) {
        for (const col of table.columns) {
          if (col.isPK) continue;
          const colNameLower = col.name.toLowerCase();

          // Check by column name first (fast)
          if (PII_COLUMN_NAMES[colNameLower]) {
            detectedPII.push({
              table: table.name,
              column: col.name,
              category: PII_COLUMN_NAMES[colNameLower],
              confidence: 'high',
            });
            continue;
          }

          // Skip known non-PII column name patterns
          const piiExclusions = ['stripe_', 'subscription_', 'multiplier', 'records_', 'notifications', 'tier', 'status', 'description', 'recipients', 'skipped', 'charge_id', 'payment_intent', 'invoice_id', 'customer_id'];
          const isExcluded = piiExclusions.some(ex => colNameLower.includes(ex));
          
          // Check by partial name match
          for (const [keyword, category] of Object.entries(PII_COLUMN_NAMES)) {
            if (colNameLower.includes(keyword) && !isExcluded && !detectedPII.some(p => p.table === table.name && p.column === col.name)) {
              detectedPII.push({
                table: table.name,
                column: col.name,
                category,
                confidence: 'medium',
              });
              break;
            }
          }

          // Check by data pattern (sample a few rows) — skip excluded columns
          if (!isExcluded && !detectedPII.some(p => p.table === table.name && p.column === col.name)) {
            if (['varchar', 'character varying', 'text', 'char'].includes(col.dataType.toLowerCase())) {
              try {
                const sampleResult = await client.query(`
                  SELECT ${col.name}::text AS val
                  FROM ${schemaName}.${table.name}
                  WHERE ${col.name} IS NOT NULL
                  LIMIT 20
                `);

                for (const [patternName, pattern] of Object.entries(PII_PATTERNS)) {
                  const matches = sampleResult.rows.filter((r: any) => r.val && pattern.test(r.val.trim()));
                  if (matches.length >= sampleResult.rows.length * 0.8 && sampleResult.rows.length >= 5) {
                    detectedPII.push({
                      table: table.name,
                      column: col.name,
                      category: patternName,
                      confidence: 'pattern',
                    });
                    break;
                  }
                }
              } catch (e) {
                // Skip
              }
            }
          }
        }
      }
      if (detectedPII.length > 0) {
        console.log(`   \u{1F6A8} Found ${detectedPII.length} PII columns:`);
        for (const pii of detectedPII) {
          console.log(`      \u{1F534} ${pii.table}.${pii.column} \u2192 ${pii.category} (confidence: ${pii.confidence})`);
        }
      } else {
        console.log(`   \u{1F7E2} No PII detected`);
      }
    }

    // CARDINALITY ESTIMATION: count child rows per parent
    if (options.estimateCardinality) {
      console.log(`   Estimating cardinality...`);
      for (const fk of fks) {
        try {
          const cardResult = await client.query(`
            SELECT
              AVG(cnt) AS mean_count,
              MIN(cnt) AS min_count,
              MAX(cnt) AS max_count,
              STDDEV(cnt) AS std_count
            FROM (
              SELECT ${fk.sourceColumn}, COUNT(*) AS cnt
              FROM ${schemaName}.${fk.sourceTable}
              GROUP BY ${fk.sourceColumn}
            ) sub
          `);

          const r = cardResult.rows[0];
          if (r && r.mean_count) {
            const mean = parseFloat(parseFloat(r.mean_count).toFixed(1));
            const min = parseInt(r.min_count) || 0;
            const max = parseInt(r.max_count) || 1;
            const std = parseFloat(r.std_count || '0');

            // Choose strategy based on distribution shape
            let strategy = 'poisson';
            if (std < 0.5) strategy = 'fixed';
            if (min === max) strategy = 'fixed';
            if (min === 0) strategy = 'poisson'; // zero-inflated possibility

            cardinalityStats[`${fk.sourceTable}.${fk.sourceColumn}`] = { mean, min, max, strategy };
            console.log(`      ${fk.sourceTable} → ${fk.targetTable}: mean=${mean}, range=[${min},${max}], strategy=${strategy}`);
          }
        } catch (e) {
          // Skip
        }
      }
    }


    // Display scan results
    console.log(`\n   Scan Results`);
    console.log(`${'\u2500'.repeat(40)}`);

    for (const table of scannedTables) {
      const tableFKs = fks.filter(f => f.sourceTable === table.name);
      const fkInfo = tableFKs.length > 0 ? ` (refs: ${tableFKs.map(f => f.targetTable).join(', ')})` : ' (root)';
      console.log(`   \u{1F4CA} ${table.name}: ${table.columns.length} cols, ~${table.estimatedRows} rows${fkInfo}`);
    }

    console.log(`\n   \u{1F517} ${fks.length} foreign key relationships`);

    // Enhanced scan summary
    if (options.inferEnums) {
      console.log(`   \u{1F3AF} ${Object.keys(inferredEnums).length} enum distributions inferred from live data`);
    }
    if (options.detectPii) {
      console.log(`   \u{1F6A8} ${detectedPII.length} PII columns detected`);
    }
    if (options.estimateCardinality) {
      console.log(`   \u{1F4CA} ${Object.keys(cardinalityStats).length} cardinality distributions estimated`);
    }

    // Generate Studio v4.3.0 pack
    const tableIdMap = new Map<string, string>();
    const columnIdMap = new Map<string, string>();

    const packTables = scannedTables.map((table, tableIdx) => {
      const tableId = `tbl-${String(tableIdx + 1).padStart(2, '0')}`;
      tableIdMap.set(table.name, tableId);

      const columns = table.columns.map((col, colIdx) => {
        const colId = `${tableId}-c${colIdx + 1}`;
        columnIdMap.set(`${table.name}.${col.name}`, colId);

        const colDef: any = {
          id: colId,
          name: col.name,
          type: col.dataType,
        };

        if (col.isPK) {
          colDef.isPK = true;
          colDef.strategy = 'uuid';
        }

        // Check if this column is a FK
        const fk = fks.find(f => f.sourceTable === table.name && f.sourceColumn === col.name);
        if (fk) {
          colDef.isFK = true;
          // We'll resolve fkTarget after all tables are processed
          colDef._fkTarget = { table: fk.targetTable, column: fk.targetColumn };
        }

        // Infer strategy if not PK and not FK
        if (!col.isPK && !fk) {
          // Check if we have real enum data from sampling
          const enumKey = `${table.name}.${col.name}`;
          if (options.inferEnums && inferredEnums[enumKey]) {
            colDef.strategy = 'enum';
            colDef.options = {
              values: inferredEnums[enumKey].values,
              weights: inferredEnums[enumKey].weights,
              inferred: true,
            };
          } else {
            const inferred = inferStrategy(col, table.name);
            colDef.strategy = inferred.strategy;
            if (inferred.options) colDef.options = inferred.options;
          }

          // Mark PII columns
          const piiHit = detectedPII.find(p => p.table === table.name && p.column === col.name);
          if (piiHit) {
            colDef.pii = { category: piiHit.category, confidence: piiHit.confidence };
          }
        }

        return colDef;
      });

      return {
        id: tableId,
        name: table.name,
        columns,
        position: { x: (tableIdx % 4) * 350, y: Math.floor(tableIdx / 4) * 250 },
      };
    });

    // Resolve FK targets to IDs
    const relationships: any[] = [];
    let relIdx = 0;
    for (const table of packTables) {
      for (const col of table.columns) {
        if (col._fkTarget) {
          const targetTableId = tableIdMap.get(col._fkTarget.table);
          const targetColId = columnIdMap.get(`${col._fkTarget.table}.${col._fkTarget.column}`);
          if (targetTableId && targetColId) {
            col.fkTarget = { tableId: targetTableId, columnId: targetColId };
            relIdx++;
            // Add cardinality if estimated
            const cardKey = `${table.name}.${col.name}`;
            const card = options.estimateCardinality && cardinalityStats[cardKey] ? {
              strategy: cardinalityStats[cardKey].strategy,
              mean: cardinalityStats[cardKey].mean,
              min: cardinalityStats[cardKey].min,
              max: cardinalityStats[cardKey].max,
            } : undefined;

            relationships.push({
              id: `rel-${String(relIdx).padStart(2, '0')}`,
              sourceTableId: targetTableId,
              sourceColumnId: targetColId,
              targetTableId: table.id,
              ...(card ? { cardinality: card } : {}),
              targetColumnId: col.id,
              type: 'one-to-many',
            });
          }
          delete col._fkTarget;
        }
      }
    }

    const pack = {
      version: '4.3.0',
      name: `scanned-${schemaName}`,
      description: `Schema scanned from ${masked}`,
      tables: packTables,
      relationships,
    };

    // Output
    const outputFile = options.output || `./scanned-${schemaName}-${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(pack, null, 2), 'utf-8');

    console.log(`\n\u2705 Scan complete!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4C1} Output: ${outputFile}`);
    console.log(`   \u{1F4CA} Tables: ${scannedTables.length}`);
    console.log(`   \u{1F517} Relationships: ${relationships.length}`);
    console.log(`   Format: Studio v4.3.0 (compatible with CLI + Studio)`);
    console.log(`\n   Next steps:`);
    console.log(`   \u2022 Open in Studio: import the JSON file`);
    console.log(`   \u2022 Generate data:  realitydb run --pack ${outputFile} --rows 5000`);
    console.log(`   \u2022 Seed database:  realitydb seed --pack ${outputFile} --rows 5000 --connection <url>`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Scan failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
