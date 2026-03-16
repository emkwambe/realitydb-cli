import type { Table, Column, Relationship, DataType } from '../types';

/** Reverse map: CLI strategy names back to Studio strategy names */
const REVERSE_STRATEGY_MAP: Record<string, { strategy: string; type: DataType }> = {
  uuid: { strategy: 'uuid', type: 'uuid' },
  person_name: { strategy: 'name', type: 'name' },
  company_name: { strategy: 'company_name', type: 'string' },
  email: { strategy: 'email', type: 'email' },
  phone: { strategy: 'phone', type: 'phone' },
  random_string: { strategy: 'random_string', type: 'string' },
  integer: { strategy: 'integer', type: 'integer' },
  float: { strategy: 'decimal', type: 'decimal' },
  boolean: { strategy: 'boolean', type: 'boolean' },
  timestamp: { strategy: 'timestamp', type: 'timestamp' },
  auto_increment: { strategy: 'auto_increment', type: 'integer' },
  enum: { strategy: 'enum', type: 'enum' },
  // Passthrough for studio-native strategies
  name: { strategy: 'name', type: 'name' },
  decimal: { strategy: 'decimal', type: 'decimal' },
  past_date: { strategy: 'past_date', type: 'timestamp' },
  future_date: { strategy: 'future_date', type: 'timestamp' },
};

interface CLIColumn {
  strategy: string;
  options?: Record<string, unknown>;
  foreignKey?: { table: string; column: string };
}

interface CLITable {
  columns: Record<string, CLIColumn>;
}

interface CLITemplate {
  tables: Record<string, CLITable>;
  simulation?: {
    seed?: number;
    timelineDays?: number;
    growthCurve?: string;
    anomalyRate?: number;
  };
  [key: string]: unknown;
}

interface StudioFormat {
  tables: Table[];
  relationships: Relationship[];
  version?: string;
  simulation?: unknown;
}

export type ImportFormat = 'studio' | 'cli';

export function detectFormat(data: unknown): ImportFormat {
  if (!data || typeof data !== 'object') return 'cli';
  const obj = data as Record<string, unknown>;

  // Studio format has tables as an array with id/position
  if (Array.isArray(obj.tables) && obj.tables.length > 0) {
    const first = obj.tables[0] as Record<string, unknown>;
    if (first.id && first.position && Array.isArray(first.columns)) {
      return 'studio';
    }
  }

  // CLI format has tables as an object keyed by table name
  if (obj.tables && typeof obj.tables === 'object' && !Array.isArray(obj.tables)) {
    return 'cli';
  }

  return 'cli';
}

export function importFromStudio(data: StudioFormat): { tables: Table[]; relationships: Relationship[] } {
  return {
    tables: data.tables || [],
    relationships: data.relationships || [],
  };
}

export function importFromCli(data: CLITemplate): { tables: Table[]; relationships: Relationship[] } {
  const tableNameToId = new Map<string, string>();
  const tables: Table[] = [];
  const relationships: Relationship[] = [];
  const pendingFKs: Array<{
    sourceTableId: string;
    sourceColumnId: string;
    targetTableName: string;
    targetColumnName: string;
  }> = [];

  const tableNames = Object.keys(data.tables);
  const GRID_COLS = 3;
  const COL_WIDTH = 320;
  const ROW_HEIGHT = 280;

  // First pass: create tables and columns
  tableNames.forEach((tableName, idx) => {
    const cliTable = data.tables[tableName];
    const tableId = crypto.randomUUID();
    tableNameToId.set(tableName, tableId);

    const columns: Column[] = [];
    const colNames = Object.keys(cliTable.columns);

    colNames.forEach((colName) => {
      const cliCol = cliTable.columns[colName];
      const mapping = REVERSE_STRATEGY_MAP[cliCol.strategy] || { strategy: 'random_string', type: 'string' as DataType };
      const colId = crypto.randomUUID();

      const isPK = colName === 'id' || cliCol.strategy === 'uuid';
      const isFK = !!cliCol.foreignKey;

      const options: Record<string, unknown> = {};
      if (cliCol.options) {
        if (cliCol.options.min !== undefined) options.min = cliCol.options.min;
        if (cliCol.options.max !== undefined) options.max = cliCol.options.max;
        if (cliCol.options.values) options.values = cliCol.options.values;
        if (cliCol.options.weights) options.weights = cliCol.options.weights;
        if (cliCol.options.lifecycleRules) options.lifecycleRules = cliCol.options.lifecycleRules;
        if (cliCol.options.dependsOn) options.dependsOn = cliCol.options.dependsOn;
        if (cliCol.options.dependencyRule) options.dependencyRule = cliCol.options.dependencyRule;
      }

      columns.push({
        id: colId,
        name: colName,
        type: mapping.type,
        isPK,
        isFK,
        nullable: isFK,
        strategy: mapping.strategy,
        options,
      });

      if (cliCol.foreignKey) {
        pendingFKs.push({
          sourceTableId: tableId,
          sourceColumnId: colId,
          targetTableName: cliCol.foreignKey.table,
          targetColumnName: cliCol.foreignKey.column,
        });
      }
    });

    tables.push({
      id: tableId,
      name: tableName,
      columns,
      position: {
        x: 80 + (idx % GRID_COLS) * COL_WIDTH,
        y: 80 + Math.floor(idx / GRID_COLS) * ROW_HEIGHT,
      },
    });
  });

  // Second pass: resolve FK targets and create relationships
  for (const fk of pendingFKs) {
    const targetTableId = tableNameToId.get(fk.targetTableName);
    if (!targetTableId) continue;

    const targetTable = tables.find(t => t.id === targetTableId);
    const targetCol = targetTable?.columns.find(c => c.name === fk.targetColumnName);
    if (!targetTable || !targetCol) continue;

    // Set fkTarget on the source column
    const sourceTable = tables.find(t => t.id === fk.sourceTableId);
    const sourceCol = sourceTable?.columns.find(c => c.id === fk.sourceColumnId);
    if (sourceCol) {
      sourceCol.fkTarget = { tableId: targetTableId, columnId: targetCol.id };
    }

    relationships.push({
      id: crypto.randomUUID(),
      sourceTableId: targetTableId,
      sourceColumnId: targetCol.id,
      targetTableId: fk.sourceTableId,
      targetColumnId: fk.sourceColumnId,
      type: 'one-to-many',
      semantic: 'connection',
    });
  }

  return { tables, relationships };
}

export function importSchema(raw: string): { tables: Table[]; relationships: Relationship[] } {
  const data = JSON.parse(raw);
  const format = detectFormat(data);

  if (format === 'studio') {
    return importFromStudio(data as StudioFormat);
  }
  return importFromCli(data as CLITemplate);
}
