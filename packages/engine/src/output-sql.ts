import type { NormalizedTable } from './types';

export function inferSqlType(colName: string, colDef: any): string {
  const strategy = typeof colDef === 'string' ? colDef : colDef?.strategy || 'text';

  switch (strategy) {
    case 'uuid':
      return 'UUID';
    case 'integer':
    case 'int':
      return 'INTEGER';
    case 'float':
    case 'decimal':
    case 'money':
      return 'NUMERIC(12,2)';
    case 'boolean':
      return 'BOOLEAN';
    case 'timestamp':
      return 'TIMESTAMPTZ';
    case 'text':
      return 'TEXT';
    case 'email':
    case 'company_name':
    case 'name':
    case 'full_name':
    case 'address':
      return 'VARCHAR(255)';
    case 'enum':
      return 'VARCHAR(50)';
    case 'phone':
      return 'VARCHAR(20)';
    case 'string':
    default:
      return 'VARCHAR(255)';
  }
}

export function isNullableColumn(colName: string, colDef: any, tableColumns: Record<string, any>): boolean {
  for (const [_, sibDef] of Object.entries(tableColumns)) {
    const sib = sibDef as any;
    if (sib?.options?.lifecycleRules) {
      for (const rule of sib.options.lifecycleRules) {
        if (rule.nullFields && rule.nullFields.includes(colName)) {
          return true;
        }
      }
    }
  }
  if (colDef?.options?.dependsOn) {
    return true;
  }
  return false;
}

export function generateCreateTable(table: NormalizedTable): string {
  const lines: string[] = [];
  const constraints: string[] = [];

  for (const [colName, colDef] of Object.entries(table.columns)) {
    const sqlType = inferSqlType(colName, colDef);
    const nullable = isNullableColumn(colName, colDef, table.columns);
    const isPK = colName === 'id';

    let line = `  "${colName}" ${sqlType}`;
    if (!nullable) line += ' NOT NULL';
    if (isPK) line += ' PRIMARY KEY';
    if (isPK && sqlType === 'UUID') line += ' DEFAULT gen_random_uuid()';

    lines.push(line);
  }

  for (const fk of table.foreignKeys) {
    const constraintName = `fk_${table.name}_${fk.column}`;
    constraints.push(
      `  CONSTRAINT "${constraintName}" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.references.table}"("${fk.references.column}")`
    );
  }

  const allLines = [...lines, ...constraints].join(',\n');
  return `CREATE TABLE "${table.name}" (\n${allLines}\n);\n`;
}

export function escapeSqlValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

export function generateInsertStatements(tableName: string, rows: any[], batchSize: number = 100): string {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const colList = columns.map(c => `"${c}"`).join(', ');
  const parts: string[] = [];

  parts.push(`-- ${tableName}: ${rows.length} rows`);

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valueRows = batch.map(row => {
      const vals = columns.map(col => escapeSqlValue(row[col]));
      return `  (${vals.join(', ')})`;
    });
    parts.push(`INSERT INTO "${tableName}" (${colList}) VALUES\n${valueRows.join(',\n')};\n`);
  }

  return parts.join('\n');
}
