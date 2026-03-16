export type DataType = 'uuid' | 'string' | 'integer' | 'decimal' | 'boolean' | 'timestamp' | 'email' | 'name' | 'phone' | 'enum';
export type GrowthCurve = 'linear' | 'exponential' | 'logarithmic' | 's-curve';

export interface Column {
  id: string;
  name: string;
  type: DataType;
  isPK: boolean;
  isFK: boolean;
  fkTarget?: { tableId: string; columnId: string };
  nullable: boolean;
  strategy: string;
  options: {
    min?: number;
    max?: number;
    values?: string[];
    weights?: number[];
    dependsOn?: string; // ID of another column in the same table
    dependencyRule?: 'after' | 'before' | 'match';
    lifecycleRules?: {
      value: string;
      requiredFields?: string[];
      nullFields?: string[];
    }[];
    [key: string]: any;
  };
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  position: { x: number; y: number };
}

export type RelationshipSemantic = 'connection' | 'trigger' | 'temporal' | 'lifecycle' | 'risk' | 'activity';

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: 'one-to-many' | 'one-to-one';
  semantic?: RelationshipSemantic;
}

export const SEMANTIC_COLORS: Record<RelationshipSemantic, string> = {
  connection: '#3b82f6', // Blue
  trigger: '#a855f7',    // Purple
  temporal: '#f97316',   // Orange
  lifecycle: '#22c55e',  // Green
  risk: '#ef4444',       // Red
  activity: '#eab308',   // Yellow
};

export const SEMANTIC_LABELS: Record<RelationshipSemantic, string> = {
  connection: 'Connected to',
  trigger: 'Triggers',
  temporal: 'Happens after',
  lifecycle: 'Creates / Updates',
  risk: 'Problem / Risk',
  activity: 'User activity',
};

export interface SimulationConfig {
  seed: number;
  timelineDays: number;
  growthCurve: GrowthCurve;
  anomalyRate: number;
}

export interface RealityTemplate {
  name: string;
  description: string;
  category: 'Startup' | 'Commerce' | 'Finance' | 'Operations' | 'Public Sector' | 'Security' | 'AI';
  tables: Table[];
  relationships: Relationship[];
  simulation: SimulationConfig;
}
