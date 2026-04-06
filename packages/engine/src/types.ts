export interface NormalizedTable {
  name: string;
  columns: Record<string, any>;
  foreignKeys: Array<{ column: string; references: { table: string; column: string } }>;
}

export interface GenerationResult {
  allData: Record<string, any[]>;
  actualTotal: number;
  elapsed: string;
}

export interface GenerationMeta {
  generator: string;
  version: string;
  generated_at: string;
  template: string;
  total_rows: number;
  elapsed_seconds: number;
  seed: number | null;
}
