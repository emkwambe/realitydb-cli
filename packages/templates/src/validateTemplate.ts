import { VALID_STRATEGY_KINDS } from './templateSchema.js';
import type { TemplateJSON } from './templateSchema.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTemplateJSON(json: unknown): ValidationResult {
  const errors: string[] = [];

  if (json === null || json === undefined || typeof json !== 'object') {
    return { valid: false, errors: ['Template must be a JSON object'] };
  }

  const obj = json as Record<string, unknown>;

  // Required string fields
  if (!obj.name || typeof obj.name !== 'string') {
    errors.push('Missing or invalid "name" (must be a non-empty string)');
  }
  if (!obj.version || typeof obj.version !== 'string') {
    errors.push('Missing or invalid "version" (must be a non-empty string)');
  }
  if (!obj.description || typeof obj.description !== 'string') {
    errors.push('Missing or invalid "description" (must be a non-empty string)');
  }

  // Tables
  if (!obj.tables || typeof obj.tables !== 'object' || Array.isArray(obj.tables)) {
    errors.push('Missing or invalid "tables" (must be an object)');
    return { valid: errors.length === 0, errors };
  }

  const tables = obj.tables as Record<string, unknown>;
  const tableNames = Object.keys(tables);

  if (tableNames.length === 0) {
    errors.push('Template must define at least one table');
  }

  for (const tableName of tableNames) {
    const table = tables[tableName];
    if (!table || typeof table !== 'object' || Array.isArray(table)) {
      errors.push(`Table "${tableName}": must be an object`);
      continue;
    }

    const t = table as Record<string, unknown>;

    // match is required
    if (!t.match) {
      errors.push(`Table "${tableName}": missing "match" (table name pattern)`);
    } else if (typeof t.match !== 'string' && !Array.isArray(t.match)) {
      errors.push(`Table "${tableName}": "match" must be a string or array of strings`);
    }

    // rowCountMultiplier is optional but must be a number
    if (t.rowCountMultiplier !== undefined && typeof t.rowCountMultiplier !== 'number') {
      errors.push(`Table "${tableName}": "rowCountMultiplier" must be a number`);
    }

    // columns is required
    if (!t.columns || typeof t.columns !== 'object' || Array.isArray(t.columns)) {
      errors.push(`Table "${tableName}": missing or invalid "columns" (must be an object)`);
      continue;
    }

    const columns = t.columns as Record<string, unknown>;
    const columnNames = Object.keys(columns);

    if (columnNames.length === 0) {
      errors.push(`Table "${tableName}": must define at least one column`);
    }

    for (const colName of columnNames) {
      const col = columns[colName];
      if (!col || typeof col !== 'object' || Array.isArray(col)) {
        errors.push(`Table "${tableName}".columns."${colName}": must be an object`);
        continue;
      }

      const c = col as Record<string, unknown>;

      if (!c.strategy || typeof c.strategy !== 'string') {
        errors.push(`Table "${tableName}".columns."${colName}": missing or invalid "strategy"`);
      } else if (!VALID_STRATEGY_KINDS.includes(c.strategy as never)) {
        errors.push(
          `Table "${tableName}".columns."${colName}": unknown strategy "${c.strategy}". ` +
          `Valid strategies: ${VALID_STRATEGY_KINDS.join(', ')}`
        );
      }

      // match is optional
      if (c.match !== undefined && typeof c.match !== 'string' && !Array.isArray(c.match)) {
        errors.push(`Table "${tableName}".columns."${colName}": "match" must be a string or array of strings`);
      }

      // options is optional
      if (c.options !== undefined && (typeof c.options !== 'object' || Array.isArray(c.options))) {
        errors.push(`Table "${tableName}".columns."${colName}": "options" must be an object`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Type guard: returns the validated TemplateJSON if valid, throws otherwise.
 */
export function assertValidTemplate(json: unknown): TemplateJSON {
  const result = validateTemplateJSON(json);
  if (!result.valid) {
    throw new Error(`Invalid template:\n  ${result.errors.join('\n  ')}`);
  }
  return json as TemplateJSON;
}
