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

export async function scanCommand(options: {
  connection: string;
  output?: string;
  schema?: string;
  format?: string;
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
        estimatedRows: parseInt(tableRow?.estimated_rows) || 0,
      });
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
          const inferred = inferStrategy(col, table.name);
          colDef.strategy = inferred.strategy;
          if (inferred.options) colDef.options = inferred.options;
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
            relationships.push({
              id: `rel-${String(relIdx).padStart(2, '0')}`,
              sourceTableId: targetTableId,
              sourceColumnId: targetColId,
              targetTableId: table.id,
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
