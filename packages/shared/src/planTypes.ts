export type ColumnStrategyKind =
  | 'uuid'
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'phone'
  | 'address'
  | 'company_name'
  | 'money'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'timestamp'
  | 'enum'
  | 'text'
  | 'foreign_key'
  | 'custom';

export interface ColumnStrategy {
  kind: ColumnStrategyKind;
  options?: Record<string, unknown>;
}

export interface ForeignKeyReferencePlan {
  referencedTable: string;
  referencedColumn: string;
  selectionMode: 'uniform' | 'weighted' | 'parent-linked';
}

export interface ColumnGenerationPlan {
  columnName: string;
  dataType: string;
  nullable: boolean;
  required: boolean;
  strategy: ColumnStrategy;
  foreignKeyRef?: ForeignKeyReferencePlan;
  defaultValueMode?: 'generated' | 'db_default' | 'fixed';
  fixedValue?: string | number | boolean | null;
  maxLength?: number | null;
  isUnique?: boolean;
}

export interface TableGenerationPlan {
  tableName: string;
  rowCount: number;
  dependencies: string[];
  columns: ColumnGenerationPlan[];
  enabled: boolean;
  temporalConstraints?: import('./timelineTypes.js').TemporalConstraint[];
}

export interface GenerationPlanConfig {
  targetDatabase: 'postgres';
  defaultRowCount: number;
  batchSize: number;
  environment: 'dev' | 'staging' | 'test';
  templateName?: string;
}

export interface ReproducibilityPlan {
  randomSeed: number;
  strategyVersion: string;
  templateVersion?: string;
}

export interface TemplateOverride {
  tableName: string;
  columnName?: string;
  override: Partial<ColumnGenerationPlan>;
}

export interface TemplatePlan {
  name: string;
  version: string;
  overrides?: TemplateOverride[];
}

export interface GenerationPlan {
  version: string;
  planId: string;
  config: GenerationPlanConfig;
  tableOrder: string[];
  tables: TableGenerationPlan[];
  reproducibility: ReproducibilityPlan;
  template?: TemplatePlan;
  timeline?: import('./timelineTypes.js').TimelineConfig;
  scenarios?: import('./scenarioTypes.js').ScenarioConfig[];
}
