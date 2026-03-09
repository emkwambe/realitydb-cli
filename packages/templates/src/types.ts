import type { ColumnStrategy } from '@databox/shared';

export interface DomainTemplate {
  name: string;
  version: string;
  description: string;
  targetTables: string[];
  tableConfigs: Map<string, TableTemplateConfig>;
}

export interface TableTemplateConfig {
  tableName: string;
  matchPattern: string | string[];
  rowCountMultiplier?: number;
  columnOverrides: ColumnTemplateOverride[];
}

export interface ColumnTemplateOverride {
  columnName: string;
  matchPattern?: string | string[];
  strategy: ColumnStrategy;
  description?: string;
}

export interface TemplateMatchResult {
  matched: boolean;
  template: DomainTemplate;
  tableConfig: TableTemplateConfig | null;
  confidence: 'exact' | 'pattern' | 'none';
}
