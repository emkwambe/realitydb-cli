import type { GenerationPlan } from './types.js';

export interface PlanValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateGenerationPlan(plan: GenerationPlan): PlanValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const tableNames = new Set(plan.tables.map((t) => t.tableName));

  for (const table of plan.tables) {
    // Check FK references point to tables that exist in the plan
    for (const column of table.columns) {
      if (column.foreignKeyRef) {
        const ref = column.foreignKeyRef.referencedTable;
        if (!tableNames.has(ref)) {
          errors.push(
            `Table "${table.tableName}" column "${column.columnName}" references table "${ref}" which is not in the plan`,
          );
        }
      }

      // Validate strategy kind is not empty
      if (!column.strategy.kind) {
        errors.push(
          `Table "${table.tableName}" column "${column.columnName}" has no strategy kind`,
        );
      }
    }

    // Check for zero row count
    if (table.rowCount === 0 && table.enabled) {
      errors.push(
        `Table "${table.tableName}" has 0 rowCount but is enabled`,
      );
    }
  }

  // Check tableOrder contains all enabled tables
  const orderedSet = new Set(plan.tableOrder);
  for (const table of plan.tables) {
    if (table.enabled && !orderedSet.has(table.tableName)) {
      errors.push(
        `Table "${table.tableName}" is enabled but not in tableOrder`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
