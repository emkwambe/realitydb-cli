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
    return { kind: 'money', options: { min: 100, max: 100000 } };
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

  // c. Data type fallbacks
  const dataType = column.udtName.toLowerCase();

  if (dataType === 'uuid') {
    return { kind: 'uuid' };
  }

  if ((dataType === 'varchar' || dataType === 'text') && column.maxLength !== null && column.maxLength <= 10) {
    return { kind: 'text', options: { mode: 'short' } };
  }

  if (dataType === 'varchar' || dataType === 'text') {
    return { kind: 'text', options: { mode: 'medium' } };
  }

  if (dataType === 'int4' || dataType === 'int8' || dataType === 'int2' || dataType === 'integer') {
    return { kind: 'integer', options: { min: 0, max: 10000 } };
  }

  if (dataType === 'numeric' || dataType === 'decimal' || dataType === 'float4' || dataType === 'float8' || dataType === 'float') {
    return { kind: 'float', options: { min: 0, max: 10000 } };
  }

  if (dataType === 'bool' || dataType === 'boolean') {
    return { kind: 'boolean', options: { trueWeight: 0.5 } };
  }

  if (dataType === 'timestamp' || dataType === 'timestamptz') {
    return { kind: 'timestamp', options: { mode: 'past' } };
  }

  if (dataType === 'date') {
    return { kind: 'timestamp', options: { mode: 'past' } };
  }

  // d. Ultimate fallback
  return { kind: 'text', options: { mode: 'short' } };
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
