import type { DatabaseSchema, ForeignKeySchema } from '@databox/schema';
import type { DataboxConfig } from '@databox/config';
import { inferColumnStrategy } from '@databox/generators';
import { buildDependencyGraph } from './dependencyGraph.js';
import { topologicalSort } from './topologicalSort.js';
import type {
  GenerationPlan,
  TableGenerationPlan,
  ColumnGenerationPlan,
  ForeignKeyReferencePlan,
} from './types.js';

export function buildGenerationPlan(
  schema: DatabaseSchema,
  config: DataboxConfig,
): GenerationPlan {
  const defaultRowCount = config.seed.defaultRecords;
  const batchSize = config.seed.batchSize;
  const environment = (config.seed.environment ?? 'dev') as 'dev' | 'staging' | 'test';
  const randomSeed = config.seed.randomSeed ?? 42;

  // Build dependency graph and get topological order
  const graph = buildDependencyGraph(schema.foreignKeys);

  // Include all tables (some may not appear in FK graph)
  const allTableNames = schema.tables.map((t) => t.name);
  for (const name of allTableNames) {
    if (!graph.nodes.includes(name)) {
      graph.nodes.push(name);
    }
  }
  graph.nodes.sort();

  const sortResult = topologicalSort(graph);
  // Add any tables not in the sort result (tables with no FK relationships)
  const tableOrder = [...sortResult.order];
  for (const name of allTableNames) {
    if (!tableOrder.includes(name)) {
      tableOrder.push(name);
    }
  }

  // Build FK lookup: sourceTable.sourceColumn → ForeignKeySchema
  const fkBySource = new Map<string, ForeignKeySchema>();
  for (const fk of schema.foreignKeys) {
    fkBySource.set(`${fk.sourceTable}.${fk.sourceColumn}`, fk);
  }

  // Build table plans
  const tables: TableGenerationPlan[] = schema.tables.map((table) => {
    const tableForeignKeys = schema.foreignKeys.filter(
      (fk) => fk.sourceTable === table.name,
    );

    const dependencies = tableForeignKeys.map((fk) => fk.targetTable);
    const uniqueDeps = [...new Set(dependencies)];

    const columns: ColumnGenerationPlan[] = table.columns.map((column) => {
      const strategy = inferColumnStrategy(column, tableForeignKeys, table.name);

      const columnPlan: ColumnGenerationPlan = {
        columnName: column.name,
        dataType: column.udtName,
        nullable: column.isNullable,
        required: !column.isNullable && !column.hasDefault,
        strategy,
        defaultValueMode: 'generated',
      };

      // If this column is a FK source, populate foreignKeyRef
      const fk = fkBySource.get(`${table.name}.${column.name}`);
      if (fk) {
        const ref: ForeignKeyReferencePlan = {
          referencedTable: fk.targetTable,
          referencedColumn: fk.targetColumn,
          selectionMode: 'uniform',
        };
        columnPlan.foreignKeyRef = ref;
      }

      return columnPlan;
    });

    return {
      tableName: table.name,
      rowCount: defaultRowCount,
      dependencies: uniqueDeps,
      columns,
      enabled: true,
    };
  });

  // Compute deterministic planId from schema + config
  const planId = computePlanId(schema, config);

  return {
    version: '1.0',
    planId,
    config: {
      targetDatabase: 'postgres',
      defaultRowCount,
      batchSize,
      environment,
      templateName: config.template,
    },
    tableOrder,
    tables,
    reproducibility: {
      randomSeed,
      strategyVersion: '1.0',
    },
  };
}

function computePlanId(schema: DatabaseSchema, config: DataboxConfig): string {
  // Deterministic hash from table names + column names + config seed
  const parts: string[] = [];
  for (const table of schema.tables) {
    parts.push(table.name);
    for (const col of table.columns) {
      parts.push(`${table.name}.${col.name}.${col.udtName}`);
    }
  }
  parts.push(String(config.seed.defaultRecords));
  parts.push(String(config.seed.randomSeed ?? 42));

  // Simple djb2 hash
  const input = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `plan-${hex}`;
}
