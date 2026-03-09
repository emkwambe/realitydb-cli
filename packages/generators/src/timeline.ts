import type {
  GenerationPlan,
  TimelineConfig,
  TemporalConstraint,
} from '@databox/shared';
import { createSeededRandom } from '@databox/shared';
import { createGeneratorRegistry } from './registry.js';
import { resolveForeignKey } from './foreignKeyResolver.js';
import { computeTimelineSlots } from './growthModels.js';
import { applyTemporalConstraint } from './temporalResolver.js';
import type {
  GeneratedDataset,
  GeneratedTable,
  GeneratedRow,
  GeneratorContext,
  GeneratorFunction,
} from './types.js';

/**
 * Alternative to generateDataset that respects timeline configuration.
 * Generates rows distributed across time slots with temporal coherence.
 */
export function generateTimelineDataset(
  plan: GenerationPlan,
  timelineConfig: TimelineConfig,
): GeneratedDataset {
  const seed = createSeededRandom(plan.reproducibility.randomSeed);
  const registry = createGeneratorRegistry();
  const allGeneratedTables = new Map<string, GeneratedTable>();

  const slots = computeTimelineSlots(timelineConfig);
  if (slots.length === 0) {
    // Fallback: no slots means empty or invalid range
    return {
      tables: allGeneratedTables,
      generatedAt: new Date().toISOString(),
      seed: plan.reproducibility.randomSeed,
      totalRows: 0,
    };
  }

  // Build table plan lookup
  const tablePlanMap = new Map(
    plan.tables.map((t) => [t.tableName, t]),
  );

  // Build temporal constraint lookup
  const constraintMap = new Map<string, TemporalConstraint[]>();
  for (const tablePlan of plan.tables) {
    if (tablePlan.temporalConstraints && tablePlan.temporalConstraints.length > 0) {
      constraintMap.set(tablePlan.tableName, tablePlan.temporalConstraints);
    }
  }

  // Identify which tables have timestamp columns
  const tablesWithTimestamps = new Set<string>();
  for (const tablePlan of plan.tables) {
    const hasTimestamp = tablePlan.columns.some(
      (c) => c.strategy.kind === 'timestamp',
    );
    if (hasTimestamp) {
      tablesWithTimestamps.add(tablePlan.tableName);
    }
  }

  // Generate tables in plan.tableOrder (parent tables first)
  for (const tableName of plan.tableOrder) {
    const tablePlan = tablePlanMap.get(tableName);
    if (!tablePlan || !tablePlan.enabled) continue;

    const hasTimeline = tablesWithTimestamps.has(tableName);

    // Pre-resolve generators
    const columnGenerators = tablePlan.columns.map((colPlan) => {
      if (colPlan.strategy.kind === 'foreign_key' && colPlan.foreignKeyRef) {
        return {
          columnName: colPlan.columnName,
          generator: null as GeneratorFunction | null,
          isForeignKey: true,
          isTimestamp: false,
          foreignKeyRef: colPlan.foreignKeyRef,
          maxLength: colPlan.maxLength,
        };
      }

      return {
        columnName: colPlan.columnName,
        generator: registry.getGenerator(colPlan.strategy),
        isForeignKey: false,
        isTimestamp: colPlan.strategy.kind === 'timestamp',
        foreignKeyRef: undefined as typeof colPlan.foreignKeyRef,
        maxLength: colPlan.maxLength,
      };
    });

    const columns = tablePlan.columns.map((c) => c.columnName);
    const constraints = constraintMap.get(tableName) ?? [];
    const allRows: GeneratedRow[] = [];

    if (hasTimeline) {
      // Distribute rows across time slots
      for (const slot of slots) {
        const slotRowCount = Math.round(
          (slot.targetRowCount / tablePlan.rowCount) * tablePlan.rowCount,
        );

        for (let rowIndex = 0; rowIndex < slot.targetRowCount; rowIndex++) {
          const globalRowIndex = allRows.length;
          const row: GeneratedRow = {};

          for (const colGen of columnGenerators) {
            const ctx: GeneratorContext = {
              seed,
              rowIndex: globalRowIndex,
              tableName,
              columnName: colGen.columnName,
              allGeneratedTables,
              maxLength: colGen.maxLength,
            };

            if (colGen.isForeignKey && colGen.foreignKeyRef) {
              row[colGen.columnName] = resolveForeignKey(ctx, colGen.foreignKeyRef);
            } else if (colGen.isTimestamp) {
              // Check for temporal constraint
              const constraint = constraints.find(
                (c) => c.columnName === colGen.columnName,
              );

              if (constraint) {
                // Get parent row for dependent constraints
                let parentRow: GeneratedRow | null = null;
                if (constraint.mode === 'dependent' && constraint.afterTable) {
                  const parentTable = allGeneratedTables.get(constraint.afterTable);
                  if (parentTable && parentTable.rows.length > 0) {
                    // Pick the parent row that this row references via FK
                    const fkCol = columnGenerators.find(
                      (c) => c.isForeignKey && c.foreignKeyRef?.referencedTable === constraint.afterTable,
                    );
                    if (fkCol && row[fkCol.columnName] !== undefined) {
                      const parentPK = constraint.afterColumn
                        ? undefined
                        : undefined;
                      // Find the parent row by FK value
                      const fkValue = row[fkCol.columnName];
                      const refCol = fkCol.foreignKeyRef!.referencedColumn;
                      parentRow = parentTable.rows.find((r) => r[refCol] === fkValue) ?? null;
                    }
                    if (!parentRow) {
                      parentRow = parentTable.rows[globalRowIndex % parentTable.rows.length] ?? null;
                    }
                  }
                } else if (constraint.mode === 'lifecycle') {
                  // Lifecycle: reference same row
                  parentRow = row;
                }

                row[colGen.columnName] = applyTemporalConstraint(
                  seed,
                  constraint,
                  parentRow,
                  slot.startDate,
                  slot.endDate,
                );
              } else {
                // No constraint, place within slot
                const slotMs = slot.endDate.getTime() - slot.startDate.getTime();
                const offsetMs = Math.floor(seed.next() * Math.max(slotMs, 1));
                row[colGen.columnName] = new Date(
                  slot.startDate.getTime() + offsetMs,
                ).toISOString();
              }
            } else if (colGen.generator) {
              row[colGen.columnName] = colGen.generator(ctx);
            }
          }

          allRows.push(row);
        }
      }
    } else {
      // Table without timestamps: generate all rows normally
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
          };

          if (colGen.isForeignKey && colGen.foreignKeyRef) {
            row[colGen.columnName] = resolveForeignKey(ctx, colGen.foreignKeyRef);
          } else if (colGen.generator) {
            row[colGen.columnName] = colGen.generator(ctx);
          }
        }

        allRows.push(row);
      }
    }

    allGeneratedTables.set(tableName, {
      tableName,
      columns,
      rows: allRows,
      rowCount: allRows.length,
    });
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
