import type { DatabaseSchema } from './types.js';

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateSchema(schema: DatabaseSchema): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const tableNames = schema.tables.map((t) => t.name);
  const tableSet = new Set<string>();

  // Check for duplicate table names
  for (const name of tableNames) {
    if (tableSet.has(name)) {
      errors.push(`Duplicate table name: "${name}"`);
    }
    tableSet.add(name);
  }

  // Build column lookup: tableName -> Set of column names
  const columnLookup = new Map<string, Set<string>>();
  for (const table of schema.tables) {
    columnLookup.set(
      table.name,
      new Set(table.columns.map((c) => c.name)),
    );
  }

  // Validate tables have at least one column
  for (const table of schema.tables) {
    if (table.columns.length === 0) {
      errors.push(`Table "${table.name}" has no columns`);
    }
  }

  // Warn on tables with no primary key
  for (const table of schema.tables) {
    if (table.primaryKey === null) {
      warnings.push(`Table "${table.name}" has no primary key`);
    }
  }

  // Validate foreign keys
  for (const fk of schema.foreignKeys) {
    if (!tableSet.has(fk.sourceTable)) {
      errors.push(
        `FK "${fk.constraintName}": source table "${fk.sourceTable}" not found in schema`,
      );
    } else {
      const cols = columnLookup.get(fk.sourceTable);
      if (cols && !cols.has(fk.sourceColumn)) {
        errors.push(
          `FK "${fk.constraintName}": source column "${fk.sourceColumn}" not found in table "${fk.sourceTable}"`,
        );
      }
    }

    if (!tableSet.has(fk.targetTable)) {
      errors.push(
        `FK "${fk.constraintName}": target table "${fk.targetTable}" not found in schema`,
      );
    } else {
      const cols = columnLookup.get(fk.targetTable);
      if (cols && !cols.has(fk.targetColumn)) {
        errors.push(
          `FK "${fk.constraintName}": target column "${fk.targetColumn}" not found in table "${fk.targetTable}"`,
        );
      }
    }

    // Warn on nullable FK columns
    if (tableSet.has(fk.sourceTable)) {
      const table = schema.tables.find((t) => t.name === fk.sourceTable);
      const col = table?.columns.find((c) => c.name === fk.sourceColumn);
      if (col && col.isNullable) {
        warnings.push(
          `FK "${fk.constraintName}": source column "${fk.sourceTable}.${fk.sourceColumn}" is nullable`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
