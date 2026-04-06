import type { Table, Relationship, SimulationConfig } from '../types';

/** Maps Studio strategy names to RealityDB CLI strategy names */
const STRATEGY_MAP: Record<string, string> = {
  uuid: 'uuid',
  name: 'full_name',
  company_name: 'company_name',
  email: 'email',
  phone: 'phone',
  random_string: 'text',
  integer: 'integer',
  decimal: 'float',
  boolean: 'boolean',
  timestamp: 'timestamp',
  past_date: 'timestamp',
  future_date: 'timestamp',
  auto_increment: 'auto_increment',
  enum: 'enum',
};

interface CLIColumnDef {
  strategy: string;
  options?: Record<string, unknown>;
  foreignKey?: { table: string; column: string };
}

interface CLITableDef {
  columns: Record<string, CLIColumnDef>;
}

interface CLITemplate {
  name: string;
  version: string;
  description: string;
  tables: Record<string, CLITableDef>;
  simulation?: {
    seed: number;
    timelineDays: number;
    growthCurve: string;
    anomalyRate: number;
  };
  generationConfig: {
    database: { client: string };
    seed: { defaultRecords: number; randomSeed: number };
  };
}

interface CLIConfig {
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
}

export interface ExportValidationIssue {
  type: 'error' | 'warning';
  message: string;
  tableId?: string;
  columnId?: string;
}

export function validateForExport(
  tables: Table[],
  relationships: Relationship[]
): ExportValidationIssue[] {
  const issues: ExportValidationIssue[] = [];

  for (const table of tables) {
    const hasPK = table.columns.some(c => c.isPK);
    if (!hasPK) {
      issues.push({
        type: 'error',
        message: `Table "${table.name}" has no primary key column.`,
        tableId: table.id,
      });
    }

    for (const col of table.columns) {
      if (col.isFK && !col.fkTarget) {
        issues.push({
          type: 'error',
          message: `Column "${col.name}" in "${table.name}" is marked FK but has no target.`,
          tableId: table.id,
          columnId: col.id,
        });
      }

      if (col.isFK && col.fkTarget) {
        const targetTable = tables.find(t => t.id === col.fkTarget?.tableId);
        if (!targetTable) {
          issues.push({
            type: 'error',
            message: `FK "${col.name}" in "${table.name}" references a non-existent table.`,
            tableId: table.id,
            columnId: col.id,
          });
        }
      }

      if (col.nullable && col.isFK) {
        issues.push({
          type: 'warning',
          message: `FK "${col.name}" in "${table.name}" is nullable -- may produce orphan references.`,
          tableId: table.id,
          columnId: col.id,
        });
      }
    }

    const hasTimestamp = table.columns.some(
      c => c.strategy === 'timestamp' || c.strategy === 'past_date' || c.strategy === 'future_date'
    );
    if (!hasTimestamp) {
      issues.push({
        type: 'warning',
        message: `Table "${table.name}" has no timestamp column.`,
        tableId: table.id,
      });
    }
  }

  return issues;
}

function buildColumnOptions(col: Table['columns'][0]): Record<string, unknown> | undefined {
  const opts: Record<string, unknown> = {};

  if (col.strategy === 'integer' || col.strategy === 'decimal') {
    if (col.options.min !== undefined) opts.min = col.options.min;
    if (col.options.max !== undefined) opts.max = col.options.max;
  }

  if (col.strategy === 'enum') {
    if (col.options.values?.length) opts.values = col.options.values;
    if (col.options.weights?.length) opts.weights = col.options.weights;
  }

  // Lifecycle rules
  if (col.options.lifecycleRules?.length) {
    opts.lifecycleRules = col.options.lifecycleRules;
  }

  // Temporal dependency
  if (col.options.dependsOn) {
    opts.dependsOn = col.options.dependsOn;
    if (col.options.dependencyRule) opts.dependencyRule = col.options.dependencyRule;
  }

  return Object.keys(opts).length > 0 ? opts : undefined;
}

export function convertToCliTemplate(
  tables: Table[],
  relationships: Relationship[],
  simulation: SimulationConfig,
  name = 'studio-export'
): CLITemplate {
  const tableMap = new Map(tables.map(t => [t.id, t]));
  const cliTables: Record<string, CLITableDef> = {};

  for (const table of tables) {
    const columns: Record<string, CLIColumnDef> = {};

    for (const col of table.columns) {
      const cliStrategy = STRATEGY_MAP[col.strategy] || col.strategy;
      const def: CLIColumnDef = { strategy: cliStrategy };

      const opts = buildColumnOptions(col);
      if (opts) def.options = opts;

      // FK reference
      if (col.isFK && col.fkTarget) {
        const targetTable = tableMap.get(col.fkTarget.tableId);
        const targetCol = targetTable?.columns.find(c => c.id === col.fkTarget?.columnId);
        if (targetTable && targetCol) {
          def.foreignKey = { table: targetTable.name.trim(), column: targetCol.name.trim() };
        }
      }

      columns[col.name.trim()] = def;
    }

    cliTables[table.name.trim()] = { match: table.name.trim(), columns };
  }

  return {
    name,
    version: '1.0.0',
    description: `Exported from RealityDB Studio`,
    tables: cliTables,
    simulation: {
      seed: simulation.seed,
      timelineDays: simulation.timelineDays,
      growthCurve: simulation.growthCurve,
      anomalyRate: simulation.anomalyRate,
    },
    generationConfig: {
      database: { client: 'postgres' },
      seed: { defaultRecords: 1000, randomSeed: simulation.seed },
    },
  };
}

export function generateConfigSkeleton(): CLIConfig {
  return {
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'your_database',
      user: 'postgres',
      password: '',
    },
  };
}

/** Generate PostgreSQL DDL from Studio schema */
export function generateSQLDDL(tables: Table[], relationships: Relationship[]): string {
  const tableMap = new Map(tables.map(t => [t.id, t]));
  const lines: string[] = [];

  const typeMap: Record<string, string> = {
    uuid: 'UUID',
    string: 'VARCHAR(255)',
    integer: 'INTEGER',
    decimal: 'NUMERIC(12,2)',
    boolean: 'BOOLEAN',
    timestamp: 'TIMESTAMPTZ',
    email: 'VARCHAR(255)',
    name: 'VARCHAR(255)',
    phone: 'VARCHAR(50)',
    enum: 'VARCHAR(50)',
  };

  for (const table of tables) {
    const tableName = table.name.trim();
    const colDefs: string[] = [];
    const constraints: string[] = [];

    for (const col of table.columns) {
      const colName = col.name.trim();
      let sqlType = typeMap[col.type] || 'VARCHAR(255)';
      let colLine = `  "${colName}" ${sqlType}`;
      if (!col.nullable) colLine += ' NOT NULL';
      if (col.isPK) colLine += ' PRIMARY KEY';
      if (col.isPK && col.type === 'uuid') colLine += ' DEFAULT gen_random_uuid()';
      colDefs.push(colLine);

      if (col.isFK && col.fkTarget) {
        const targetTable = tableMap.get(col.fkTarget.tableId);
        const targetCol = targetTable?.columns.find(c => c.id === col.fkTarget?.columnId);
        if (targetTable && targetCol) {
          constraints.push(
            `  CONSTRAINT "fk_${tableName}_${colName}" FOREIGN KEY ("${colName}") REFERENCES "${targetTable.name.trim()}"("${targetCol.name.trim()}")`
          );
        }
      }
    }

    const allDefs = [...colDefs, ...constraints].join(',\n');
    lines.push(`CREATE TABLE "${tableName}" (\n${allDefs}\n);\n`);
  }

  return lines.join('\n');
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
