import type { ColumnStrategy } from '@databox/shared';

export interface DomainTemplate {
  name: string;
  version: string;
  description: string;
  targetTables: string[];
  tableConfigs: Map<string, TableTemplateConfig>;
  simulation?: {
    seed?: number;
    timelineDays?: number;
    growthCurve?: string;
    anomalyRate?: number;
  };
  generationConfig?: {
    database?: { client?: string };
    seed?: { defaultRecords?: number; randomSeed?: number };
  };
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
