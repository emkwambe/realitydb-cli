/**
 * Reality Pack — portable, self-contained environment package.
 * Includes schema, plan, and generated data for sharing/replaying.
 */

export interface RealityPack {
  format: 'databox-reality-pack';
  version: '1.0';
  metadata: PackMetadata;
  schema: PackSchema;
  plan: import('./planTypes.js').GenerationPlan;
  dataset: PackDataset;
}

export interface PackMetadata {
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  templateName?: string;
  seed: number;
  totalRows: number;
  tableCount: number;
}

export interface PackSchema {
  tables: PackTableSchema[];
  foreignKeys: PackForeignKey[];
}

export interface PackTableSchema {
  name: string;
  columns: PackColumnSchema[];
  primaryKey?: string;
}

export interface PackColumnSchema {
  name: string;
  dataType: string;
  nullable: boolean;
  maxLength?: number | null;
}

export interface PackForeignKey {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}

export interface PackDataset {
  tables: Record<string, PackTableData>;
}

export interface PackTableData {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}
