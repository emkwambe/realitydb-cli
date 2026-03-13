import { readFileSync } from 'node:fs';
import type { DomainTemplate, TableTemplateConfig, ColumnTemplateOverride } from './types.js';
import type { TemplateJSON, TemplateColumnJSON } from './templateSchema.js';
import { assertValidTemplate } from './validateTemplate.js';

/**
 * Load a custom template from a JSON file path.
 * Reads the file, validates structure, and converts to DomainTemplate.
 */
export function loadTemplateFromJSON(filePath: string): DomainTemplate {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read template file "${filePath}": ${msg}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Template file "${filePath}" is not valid JSON`);
  }

  const template = assertValidTemplate(json);
  return convertToDomainTemplate(template);
}

/**
 * Convert a validated TemplateJSON to a DomainTemplate.
 */
export function convertToDomainTemplate(json: TemplateJSON): DomainTemplate {
  const tableConfigs = new Map<string, TableTemplateConfig>();
  const targetTables: string[] = [];

  for (const [tableName, tableJson] of Object.entries(json.tables)) {
    targetTables.push(tableName);

    const columnOverrides: ColumnTemplateOverride[] = [];
    for (const [colName, colJson] of Object.entries(tableJson.columns)) {
      const col = colJson as TemplateColumnJSON;
      columnOverrides.push({
        columnName: colName,
        matchPattern: col.match,
        strategy: {
          kind: col.strategy,
          options: col.options,
        },
        description: col.description,
      });
    }

    tableConfigs.set(tableName, {
      tableName,
      matchPattern: tableJson.match,
      rowCountMultiplier: tableJson.rowCountMultiplier,
      columnOverrides,
    });
  }

  return {
    name: json.name,
    version: json.version,
    description: json.description,
    targetTables,
    tableConfigs,
  };
}
