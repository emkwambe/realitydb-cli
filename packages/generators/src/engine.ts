import type { GenerationPlan } from '@databox/shared';
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
      generator: GeneratorFunction | null;
      isForeignKey: boolean;
      foreignKeyRef?: typeof tablePlan.columns[0]['foreignKeyRef'];
      defaultValueMode?: string;
      fixedValue?: string | number | boolean | null;
    }> = tablePlan.columns.map((colPlan) => {
      if (colPlan.strategy.kind === 'foreign_key' && colPlan.foreignKeyRef) {
        return {
          columnName: colPlan.columnName,
          generator: null,
          isForeignKey: true,
          foreignKeyRef: colPlan.foreignKeyRef,
          defaultValueMode: colPlan.defaultValueMode,
          fixedValue: colPlan.fixedValue,
        };
      }

      return {
        columnName: colPlan.columnName,
        generator: registry.getGenerator(colPlan.strategy),
        isForeignKey: false,
        defaultValueMode: colPlan.defaultValueMode,
        fixedValue: colPlan.fixedValue,
      };
    });

    const columns = tablePlan.columns.map((c) => c.columnName);
    const rows: GeneratedRow[] = [];

    for (let rowIndex = 0; rowIndex < tablePlan.rowCount; rowIndex++) {
      const row: GeneratedRow = {};

      for (const colGen of columnGenerators) {
        const ctx: GeneratorContext = {
          seed,
          rowIndex,
          tableName,
          columnName: colGen.columnName,
          allGeneratedTables,
        };

        // Handle fixed/db_default values
        if (colGen.defaultValueMode === 'db_default' || colGen.defaultValueMode === 'fixed') {
          row[colGen.columnName] = colGen.fixedValue ?? null;
          continue;
        }

        if (colGen.isForeignKey && colGen.foreignKeyRef) {
          row[colGen.columnName] = resolveForeignKey(ctx, colGen.foreignKeyRef);
        } else if (colGen.generator) {
          row[colGen.columnName] = colGen.generator(ctx);
        }
      }

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
