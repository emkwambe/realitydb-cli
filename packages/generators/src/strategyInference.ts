import type { ColumnSchema, ForeignKeySchema, TableSchema } from '@databox/schema';
import type { ColumnStrategy } from '@databox/shared';

const PERSON_LIKE_TABLES = ['users', 'user', 'people', 'person', 'contacts', 'contact', 'members', 'member', 'employees', 'employee', 'customers', 'customer'];

export function inferColumnStrategy(
  column: ColumnSchema,
  tableForeignKeys: ForeignKeySchema[],
  tableName?: string
): ColumnStrategy {
  // a. FK source check (highest priority)
  const fk = tableForeignKeys.find(
    (fk) => fk.sourceColumn === column.name
  );
  if (fk) {
    return { kind: 'foreign_key' };
  }

  // b. Column name heuristics
  const name = column.name.toLowerCase();

  if (name.includes('email')) {
    return { kind: 'email' };
  }

  if (name === 'first_name' || name === 'fname') {
    return { kind: 'first_name' };
  }

  if (name === 'last_name' || name === 'lname') {
    return { kind: 'last_name' };
  }

  if (name === 'full_name' || (name === 'name' && isPersonLikeTable(tableName))) {
    return { kind: 'full_name' };
  }

  if (name.includes('phone')) {
    return { kind: 'phone' };
  }

  if (name.includes('address') || name.includes('street')) {
    return { kind: 'address' };
  }

  if (name.includes('company') || name.includes('organization')) {
    return { kind: 'company_name' };
  }

  if (name.includes('amount') || name.includes('price') || name.includes('cost') || name.includes('total')) {
    let min = 100;
    let max = 100000;
    if (column.numericPrecision !== null && column.numericScale !== null) {
      const columnMax = Math.pow(10, column.numericPrecision - column.numericScale) - Math.pow(10, -column.numericScale);
      if (max > columnMax) max = columnMax;
      if (min > max) min = 0;
    }
    return { kind: 'money', options: { min, max } };
  }

  if (name.includes('status')) {
    return {
      kind: 'enum',
      options: {
        values: ['active', 'inactive', 'pending'],
        weights: [0.7, 0.15, 0.15],
      },
    };
  }

  if (name === 'currency') {
    return {
      kind: 'enum',
      options: {
        values: ['USD', 'EUR', 'GBP'],
        weights: [0.7, 0.2, 0.1],
      },
    };
  }

  if (name === 'interval') {
    return {
      kind: 'enum',
      options: {
        values: ['monthly', 'yearly', 'weekly'],
        weights: [0.6, 0.3, 0.1],
      },
    };
  }

  // c. MySQL ENUM type: parse allowed values from udtName
  const udtLower = column.udtName.toLowerCase();
  if (column.dataType === 'enum' || udtLower.startsWith('enum(')) {
    const enumValues = parseMySQLEnumValues(column.udtName);
    if (enumValues.length > 0) {
      return { kind: 'enum', options: { values: enumValues } };
    }
  }

  // c2. MySQL SET type: parse allowed values from udtName
  if (column.dataType === 'set' || udtLower.startsWith('set(')) {
    const setValues = parseMySQLEnumValues(column.udtName.replace(/^set/i, 'enum'));
    if (setValues.length > 0) {
      // SET allows multiple values; generate a single random value for simplicity
      return { kind: 'enum', options: { values: setValues } };
    }
  }

  // d. Data type fallbacks
  // Use both udtName and dataType for matching — MySQL's udtName includes length
  // (e.g. "varchar(255)") while dataType is the base type (e.g. "varchar")
  const dataType = udtLower;
  const baseType = column.dataType.toLowerCase();

  if (dataType === 'uuid' || baseType === 'char' && column.maxLength === 36) {
    return { kind: 'uuid' };
  }

  // JSON/JSONB columns — generate a small object
  if (baseType === 'json' || baseType === 'jsonb') {
    return { kind: 'text', options: { mode: 'short' } };
  }

  // MySQL YEAR type
  if (baseType === 'year') {
    return { kind: 'integer', options: { min: 2000, max: 2030 } };
  }

  // Text variants: TINYTEXT, MEDIUMTEXT, LONGTEXT
  if (baseType === 'tinytext') {
    return { kind: 'text', options: { mode: 'short' } };
  }

  if (baseType === 'mediumtext' || baseType === 'longtext') {
    return { kind: 'text', options: { mode: 'long' } };
  }

  if ((dataType === 'varchar' || dataType === 'text' || baseType === 'varchar' || baseType === 'text') && column.maxLength !== null && column.maxLength <= 10) {
    return { kind: 'text', options: { mode: 'short' } };
  }

  if (dataType === 'varchar' || dataType === 'text' || baseType === 'varchar' || baseType === 'text') {
    return { kind: 'text', options: { mode: 'medium' } };
  }

  // MySQL TINYINT(1) is conventionally boolean — must check before integer
  if (baseType === 'tinyint' && /tinyint\(1\)/i.test(column.udtName)) {
    return { kind: 'boolean', options: { trueWeight: 0.5 } };
  }

  if (dataType === 'int4' || dataType === 'int8' || dataType === 'int2' || dataType === 'integer' || dataType === 'int' ||
      baseType === 'int' || baseType === 'bigint' || baseType === 'smallint' || baseType === 'mediumint' || baseType === 'tinyint') {
    return { kind: 'integer', options: { min: 0, max: 10000 } };
  }

  if (dataType === 'numeric' || dataType === 'decimal' || dataType === 'float4' || dataType === 'float8' || dataType === 'float' ||
      baseType === 'decimal' || baseType === 'double' || baseType === 'float') {
    let max = 10000;
    if (column.numericPrecision !== null && column.numericScale !== null) {
      max = Math.pow(10, column.numericPrecision - column.numericScale) - Math.pow(10, -column.numericScale);
    }
    return { kind: 'float', options: { min: 0, max } };
  }

  if (dataType === 'bool' || dataType === 'boolean') {
    return { kind: 'boolean', options: { trueWeight: 0.5 } };
  }

  if (dataType === 'timestamp' || dataType === 'timestamptz' || baseType === 'datetime' || baseType === 'timestamp') {
    return { kind: 'timestamp', options: { mode: 'past' } };
  }

  if (dataType === 'date' || baseType === 'date') {
    return { kind: 'timestamp', options: { mode: 'past' } };
  }

  // e. Ultimate fallback
  return { kind: 'text', options: { mode: 'short' } };
}

/**
 * Parse MySQL ENUM values from COLUMN_TYPE like "enum('admin','member','viewer')".
 */
export function parseMySQLEnumValues(udtName: string): string[] {
  const match = udtName.match(/^enum\((.+)\)$/i);
  if (!match) return [];
  // Split on commas between quoted values: 'val1','val2'
  const values: string[] = [];
  const raw = match[1];
  const re = /'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    values.push(m[1]);
  }
  return values;
}

export function inferTableStrategies(
  table: TableSchema,
  foreignKeys: ForeignKeySchema[]
): ColumnStrategy[] {
  const tableForeignKeys = foreignKeys.filter(
    (fk) => fk.sourceTable === table.name
  );
  return table.columns.map((column) =>
    inferColumnStrategy(column, tableForeignKeys, table.name)
  );
}

function isPersonLikeTable(tableName?: string): boolean {
  if (!tableName) return false;
  return PERSON_LIKE_TABLES.includes(tableName.toLowerCase());
}
