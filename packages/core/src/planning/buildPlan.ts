import type { DatabaseSchema, ForeignKeySchema } from '@databox/schema';
import type { DataboxConfig } from '@databox/config';
import type { TimelineConfig } from '@databox/shared';
import { inferColumnStrategy, resolveTemporalConstraints, parseMySQLEnumValues } from '@databox/generators';
import { getDefaultRegistry, resolveColumnOverride, loadTemplateFromJSON, createTemplateRegistry } from '@databox/templates';
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
  timelineConfig?: TimelineConfig,
): GenerationPlan {
  const defaultRowCount = config.seed.defaultRecords;
  const batchSize = config.seed.batchSize;
  const environment = (config.seed.environment ?? 'dev') as 'dev' | 'staging' | 'test';
  const randomSeed = config.seed.randomSeed ?? 42;

  // Load template if specified
  const isFilePath = config.template
    ? config.template.includes('/') || config.template.includes('\\') || config.template.endsWith('.json')
    : false;
  let registry: import('@databox/templates').TemplateRegistry | null = null;
  let template: import('@databox/templates').DomainTemplate | null = null;
  let templateLookupName: string | undefined = config.template;

  if (config.template) {
    if (isFilePath) {
      template = loadTemplateFromJSON(config.template);
      registry = createTemplateRegistry();
      registry.register(template);
      templateLookupName = template.name;
    } else {
      registry = getDefaultRegistry();
      template = registry.get(config.template) ?? null;
    }
  }

  if (config.template && !template) {
    const available = getDefaultRegistry().list().map(t => t.name).join(', ');
    console.warn(
      `Template "${config.template}" not found. Available: ${available || 'none'}`,
    );
  }

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

    // Check for template table config
    const tableConfig = template && registry && templateLookupName
      ? registry.matchTable(templateLookupName, table.name)
      : null;

    // Filter out generated columns (MySQL VIRTUAL/STORED GENERATED) — they cannot be inserted
    const insertableColumns = table.columns.filter((col) => !col.isGenerated);

    const columns: ColumnGenerationPlan[] = insertableColumns.map((column) => {
      // Try template override first, fall back to inference
      let strategy;
      if (template && registry && templateLookupName) {
        let override = resolveColumnOverride(
          templateLookupName,
          table.name,
          column.name,
          registry,
        );
        // Skip placeholder enum overrides (values: ["default"]) — fall back to inference
        if (
          override?.kind === 'enum' &&
          override.options?.['values'] &&
          Array.isArray(override.options['values'])
        ) {
          const vals = override.options['values'] as string[];
          if (vals.length === 1 && vals[0] === 'default') {
            override = null;
          }
        }
        strategy = override ?? inferColumnStrategy(column, tableForeignKeys, table.name);
      } else {
        strategy = inferColumnStrategy(column, tableForeignKeys, table.name);
      }

      // If the column is a MySQL ENUM, constrain template enum values
      // to only those allowed by the column definition
      if (
        strategy.kind === 'enum' &&
        strategy.options?.['values'] &&
        (column.dataType === 'enum' || column.udtName.toLowerCase().startsWith('enum('))
      ) {
        const allowedValues = parseMySQLEnumValues(column.udtName);
        if (allowedValues.length > 0) {
          const templateValues = strategy.options['values'] as string[];
          const filtered = templateValues.filter((v) => allowedValues.includes(v));
          // Use filtered values if any match, otherwise use the column's ENUM values
          const finalValues = filtered.length > 0 ? filtered : allowedValues;
          // Rebuild weights proportionally for remaining values
          const templateWeights = strategy.options['weights'] as number[] | undefined;
          let finalWeights: number[] | undefined;
          if (templateWeights && filtered.length > 0) {
            finalWeights = [];
            for (let i = 0; i < templateValues.length; i++) {
              if (allowedValues.includes(templateValues[i])) {
                finalWeights.push(templateWeights[i]);
              }
            }
            // Normalize weights to sum to 1
            const sum = finalWeights.reduce((a, b) => a + b, 0);
            if (sum > 0) {
              finalWeights = finalWeights.map((w) => w / sum);
            }
          }
          strategy = {
            kind: 'enum' as const,
            options: {
              values: finalValues,
              ...(finalWeights ? { weights: finalWeights } : {}),
            },
          };
        }
      }

      const columnPlan: ColumnGenerationPlan = {
        columnName: column.name,
        dataType: column.udtName,
        nullable: column.isNullable,
        required: !column.isNullable && !column.hasDefault,
        strategy,
        defaultValueMode: 'generated',
        maxLength: column.maxLength,
        isUnique: column.isUnique,
      };

      // If this column is a FK source, populate foreignKeyRef
      // FK strategy always takes priority over template overrides
      const fk = fkBySource.get(`${table.name}.${column.name}`);
      if (fk) {
        columnPlan.strategy = { kind: 'foreign_key' };
        const ref: ForeignKeyReferencePlan = {
          referencedTable: fk.targetTable,
          referencedColumn: fk.targetColumn,
          selectionMode: 'uniform',
        };
        columnPlan.foreignKeyRef = ref;
      }

      return columnPlan;
    });

    // Apply rowCountMultiplier from template if defined
    const rowCount = tableConfig?.rowCountMultiplier
      ? Math.round(defaultRowCount * tableConfig.rowCountMultiplier)
      : defaultRowCount;

    // When a template is active, only enable tables matched by the template
    const enabled = template ? tableConfig !== null : true;

    return {
      tableName: table.name,
      rowCount,
      dependencies: uniqueDeps,
      columns,
      enabled,
    };
  });

  // When a template is active, also enable any disabled tables that are
  // FK dependencies of enabled tables (transitive closure).
  if (template) {
    const enabledSet = new Set(
      tables.filter((t) => t.enabled).map((t) => t.tableName),
    );

    let changed = true;
    while (changed) {
      changed = false;
      for (const tablePlan of tables) {
        if (tablePlan.enabled) {
          for (const dep of tablePlan.dependencies) {
            if (!enabledSet.has(dep)) {
              enabledSet.add(dep);
              const depPlan = tables.find((t) => t.tableName === dep);
              if (depPlan && !depPlan.enabled) {
                depPlan.enabled = true;
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  // Resolve temporal constraints if timeline is enabled
  if (timelineConfig?.enabled) {
    const temporalConstraints = resolveTemporalConstraints(
      schema,
      schema.foreignKeys,
      config.template,
    );

    for (const tablePlan of tables) {
      const constraints = temporalConstraints.get(tablePlan.tableName);
      if (constraints) {
        tablePlan.temporalConstraints = constraints;
      }
    }
  }

  // Compute deterministic planId from schema + config
  const planId = computePlanId(schema, config);

  const plan: GenerationPlan = {
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
      templateVersion: template?.version,
    },
  };

  // Populate template field if template is loaded
  if (template) {
    plan.template = {
      name: template.name,
      version: template.version,
    };
  }

  // Attach timeline config if provided
  if (timelineConfig?.enabled) {
    plan.timeline = timelineConfig;
  }

  return plan;
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
  if (config.template) {
    parts.push(config.template);
  }

  // Simple djb2 hash
  const input = parts.join('|');
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `plan-${hex}`;
}
