import type { SeededRandom } from '@databox/shared';

export interface GeneratedDataset {
  tables: Map<string, GeneratedTable>;
  generatedAt: string;
  seed: number;
  totalRows: number;
}

export interface GeneratedTable {
  tableName: string;
  columns: string[];
  rows: GeneratedRow[];
  rowCount: number;
}

export type GeneratedRow = Record<string, unknown>;

export type GeneratorFunction = (ctx: GeneratorContext) => unknown;

export interface GeneratorContext {
  seed: SeededRandom;
  rowIndex: number;
  tableName: string;
  columnName: string;
  allGeneratedTables: Map<string, GeneratedTable>;
  maxLength?: number | null;
  isUnique?: boolean;
  currentTableRows?: GeneratedRow[];
}
