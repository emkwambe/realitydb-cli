import type { GenerationPlan, TemporalConstraint } from '@databox/shared';
import { createSeededRandom } from '@databox/shared';
import { createGeneratorRegistry } from './registry.js';
import { resolveForeignKey } from './foreignKeyResolver.js';
import type {
  GeneratedDataset,
  GeneratedTable,
  GeneratedRow,
  GeneratorContext,
  GeneratorFunction,
} from './types.js';

const INTEGER_TYPES = new Set([
  'int2', 'int4', 'int8', 'integer', 'serial', 'bigserial',
  'smallint', 'bigint', 'int', 'mediumint', 'tinyint',
]);

export function generateDataset(plan: GenerationPlan): GeneratedDataset {
  const seed = createSeededRandom(plan.reproducibility.randomSeed);
  const registry = createGeneratorRegistry();
  const allGeneratedTables = new Map<string, GeneratedTable>();

  // Build a lookup from table name → TableGenerationPlan
  const tablePlanMap = new Map(
    plan.tables.map((t) => [t.tableName, t]),
  );

  // Generate tables in plan.tableOrder (parent tables first)
  for (const tableName of plan.tableOrder) {
    const tablePlan = tablePlanMap.get(tableName);
    if (!tablePlan || !tablePlan.enabled) {
      continue;
    }

    // Pre-resolve generators for non-FK columns
    const columnGenerators: Array<{
      columnName: string;
      dataType: string;
      generator: GeneratorFunction | null;
      isForeignKey: boolean;
      isSelfReference: boolean;
      foreignKeyRef?: typeof tablePlan.columns[0]['foreignKeyRef'];
      defaultValueMode?: string;
      fixedValue?: string | number | boolean | null;
      maxLength?: number | null;
      isUnique?: boolean;
      nullable?: boolean;
    }> = tablePlan.columns.map((colPlan) => {
      if (colPlan.strategy.kind === 'foreign_key' && colPlan.foreignKeyRef) {
        const isSelfRef = colPlan.foreignKeyRef.referencedTable === tableName;
        return {
          columnName: colPlan.columnName,
          dataType: colPlan.dataType,
          generator: null,
          isForeignKey: true,
          isSelfReference: isSelfRef,
          foreignKeyRef: colPlan.foreignKeyRef,
          defaultValueMode: colPlan.defaultValueMode,
          fixedValue: colPlan.fixedValue,
          maxLength: colPlan.maxLength,
          isUnique: colPlan.isUnique,
          nullable: colPlan.nullable,
        };
      }

      return {
        columnName: colPlan.columnName,
        dataType: colPlan.dataType,
        generator: registry.getGenerator(colPlan.strategy),
        isForeignKey: false,
        isSelfReference: false,
        defaultValueMode: colPlan.defaultValueMode,
        fixedValue: colPlan.fixedValue,
        maxLength: colPlan.maxLength,
        isUnique: colPlan.isUnique,
      };
    });

    const columns = tablePlan.columns.map((c) => c.columnName);
    const rows: GeneratedRow[] = [];

    // Fraction of rows that get NULL for self-referencing FKs (root nodes)
    const selfRefNullFraction = 0.3;

    for (let rowIndex = 0; rowIndex < tablePlan.rowCount; rowIndex++) {
      const row: GeneratedRow = {};

      for (const colGen of columnGenerators) {
        const ctx: GeneratorContext = {
          seed,
          rowIndex,
          tableName,
          columnName: colGen.columnName,
          allGeneratedTables,
          maxLength: colGen.maxLength,
          isUnique: colGen.isUnique,
          currentTableRows: rows,
        };

        // Handle fixed/db_default values
        if (colGen.defaultValueMode === 'db_default' || colGen.defaultValueMode === 'fixed') {
          row[colGen.columnName] = colGen.fixedValue ?? null;
          continue;
        }

        if (colGen.isSelfReference && colGen.foreignKeyRef) {
          // Self-referencing FK: first batch are root nodes (NULL),
          // remaining rows reference already-generated rows from same table
          if (rows.length === 0 || rowIndex < tablePlan.rowCount * selfRefNullFraction) {
            row[colGen.columnName] = null;
          } else {
            const parentRow = seed.pick(rows);
            row[colGen.columnName] = parentRow[colGen.foreignKeyRef.referencedColumn];
          }
        } else if (colGen.isForeignKey && colGen.foreignKeyRef) {
          row[colGen.columnName] = resolveForeignKey(ctx, colGen.foreignKeyRef);
        } else if (colGen.generator) {
          row[colGen.columnName] = colGen.generator(ctx);
        }

        // Safety net: floor numeric values destined for integer columns
        const val = row[colGen.columnName];
        if (typeof val === 'number' && !Number.isInteger(val)) {
          const dt = colGen.dataType.toLowerCase();
          if (INTEGER_TYPES.has(dt)) {
            row[colGen.columnName] = Math.floor(val);
          }
        }
      }

      // Post-generation fixup: temporal constraints
      if (tablePlan.temporalConstraints && tablePlan.temporalConstraints.length > 0) {
        applyTemporalFixup(row, tablePlan.temporalConstraints, seed);
      }

      // Post-generation fixup: lifecycle rules
      applyLifecycleRules(row, tablePlan.columns);

      rows.push(row);
    }

    const generatedTable: GeneratedTable = {
      tableName,
      columns,
      rows,
      rowCount: rows.length,
    };

    allGeneratedTables.set(tableName, generatedTable);
  }

  // Compute total rows
  let totalRows = 0;
  for (const table of allGeneratedTables.values()) {
    totalRows += table.rowCount;
  }

  return {
    tables: allGeneratedTables,
    generatedAt: new Date().toISOString(),
    seed: plan.reproducibility.randomSeed,
    totalRows,
  };
}

/**
 * Enforce temporal ordering: if a column depends on another column (afterColumn),
 * ensure the dependent value is chronologically after the base value.
 */
function applyTemporalFixup(
  row: GeneratedRow,
  constraints: TemporalConstraint[],
  seed: ReturnType<typeof createSeededRandom>,
): void {
  for (const constraint of constraints) {
    if (constraint.mode !== 'dependent' || !constraint.afterColumn) continue;

    const baseValue = row[constraint.afterColumn];
    const depValue = row[constraint.columnName];

    // Skip if either value is null or not a parseable date
    if (baseValue == null || depValue == null) continue;
    if (typeof baseValue !== 'string' && !(baseValue instanceof Date)) continue;

    const baseDate = new Date(baseValue as string | number);
    if (isNaN(baseDate.getTime())) continue;

    const depDate = new Date(depValue as string | number);
    const withinDays = constraint.withinDays ?? 90;

    // If dependent date is not after the base date, regenerate it
    if (isNaN(depDate.getTime()) || depDate <= baseDate) {
      const offsetMs = (1 + Math.floor(seed.next() * withinDays)) * 86400000;
      const newDate = new Date(baseDate.getTime() + offsetMs);
      row[constraint.columnName] = newDate.toISOString();
    }
  }
}

/**
 * Apply lifecycle rules: if an enum column's value matches a lifecycle rule,
 * set the specified fields to null.
 */
function applyLifecycleRules(
  row: GeneratedRow,
  columns: GenerationPlan['tables'][0]['columns'],
): void {
  for (const colPlan of columns) {
    if (colPlan.strategy.kind !== 'enum') continue;

    const lifecycleRules = colPlan.strategy.options?.['lifecycleRules'] as
      | Array<{ value: string; nullFields: string[] }>
      | undefined;
    if (!lifecycleRules || !Array.isArray(lifecycleRules)) continue;

    const currentValue = row[colPlan.columnName];
    if (typeof currentValue !== 'string') continue;

    for (const rule of lifecycleRules) {
      if (rule.value === currentValue && Array.isArray(rule.nullFields)) {
        for (const field of rule.nullFields) {
          if (field in row) {
            row[field] = null;
          }
        }
      }
    }
  }
}
