import type { ColumnStrategy } from '@databox/shared';
import type { TableTemplateConfig } from './types.js';
import type { TemplateRegistry } from './registry.js';

/**
 * Looks up the template, finds the table config, finds the column override.
 * Returns the overridden strategy or null if no override exists.
 */
export function resolveColumnOverride(
  templateName: string,
  tableName: string,
  columnName: string,
  registry: TemplateRegistry,
): ColumnStrategy | null {
  const tableConfig = resolveTableConfig(templateName, tableName, registry);
  if (!tableConfig) {
    return null;
  }

  const lowerColumnName = columnName.toLowerCase();

  for (const override of tableConfig.columnOverrides) {
    // Check column match pattern if provided
    if (override.matchPattern) {
      const patterns = Array.isArray(override.matchPattern)
        ? override.matchPattern
        : [override.matchPattern];

      for (const pattern of patterns) {
        const lowerPattern = pattern.toLowerCase();

        // Exact match
        if (lowerColumnName === lowerPattern) {
          return override.strategy;
        }

        // Wildcard match
        if (lowerPattern.includes('*')) {
          const regex = new RegExp(
            '^' + lowerPattern.replace(/\*/g, '.*') + '$',
          );
          if (regex.test(lowerColumnName)) {
            return override.strategy;
          }
        }
      }
    }

    // Direct column name match
    if (override.columnName.toLowerCase() === lowerColumnName) {
      return override.strategy;
    }
  }

  return null;
}

/**
 * Matches tableName against the template's table configs using matchPattern.
 * Exact match takes priority over pattern match.
 */
export function resolveTableConfig(
  templateName: string,
  tableName: string,
  registry: TemplateRegistry,
): TableTemplateConfig | null {
  return registry.matchTable(templateName, tableName);
}
