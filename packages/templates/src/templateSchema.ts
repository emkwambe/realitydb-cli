import type { ColumnStrategyKind } from '@databox/shared';

/**
 * JSON schema for custom template files.
 * This is the public API — the shape of a .json template file.
 */

export interface TemplateColumnJSON {
  match?: string | string[];
  strategy: ColumnStrategyKind;
  options?: Record<string, unknown>;
  description?: string;
}

export interface TemplateTableJSON {
  match: string | string[];
  rowCountMultiplier?: number;
  columns: Record<string, TemplateColumnJSON>;
}

export interface TemplateJSON {
  name: string;
  version: string;
  description: string;
  tables: Record<string, TemplateTableJSON>;
}

/** All valid strategy kinds for validation */
export const VALID_STRATEGY_KINDS: readonly ColumnStrategyKind[] = [
  'uuid', 'email', 'first_name', 'last_name', 'full_name',
  'phone', 'address', 'company_name', 'money', 'integer',
  'float', 'boolean', 'timestamp', 'enum', 'text',
  'foreign_key', 'custom',
] as const;
