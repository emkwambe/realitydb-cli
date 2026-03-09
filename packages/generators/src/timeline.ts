import type {
  GenerationPlan,
  TimelineConfig,
  TemporalConstraint,
} from '@databox/shared';
import { createSeededRandom } from '@databox/shared';
import { createGeneratorRegistry } from './registry.js';
import { resolveForeignKey } from './foreignKeyResolver.js';
import {
  computeTimelineSlots,
  linearGrowth,
  exponentialGrowth,
  sCurveGrowth,
  flatGrowth,
} from './growthModels.js';
import { applyTemporalConstraint } from './temporalResolver.js';
import type {
  GeneratedDataset,
  GeneratedTable,
  GeneratedRow,
  GeneratorContext,
  GeneratorFunction,
} from './types.js';

/**
 * Compute a per-table row distribution across slots using the growth model
 * and the table's own rowCount (not the global finalCount).
 */
function computeTableDistribution(
  slotCount: number,
  tableRowCount: number,
  growthKind: string,
  initialCount: number,
): number[] {
  switch (growthKind) {
    case 'linear':
      return linearGrowth(slotCount, initialCount, tableRowCount);
    case 'exponential':
      return exponentialGrowth(slotCount, initialCount, tableRowCount);
    case 's-curve':
      return sCurveGrowth(slotCount, initialCount, tableRowCount);
    case 'flat':
      return flatGrowth(slotCount, tableRowCount);
    default:
      return flatGrowth(slotCount, tableRowCount);
  }
}

/**
 * Alternative to generateDataset that respects timeline configuration.
 * Generates rows distributed across time slots with temporal coherence.
 *
 * Architecture: slot-first iteration.
 *   for each slot → for each table (in FK-safe tableOrder)
 *
 * Each temporal table gets its own per-table row distribution computed
 * from its rowCount and the growth model. This ensures tables with
 * different row counts (via rowCountMultiplier) get correct totals.
 *
 * Within each slot, parent tables are generated before child tables,
 * and allGeneratedTables always contains the cumulative rows from all
 * previous slots — so FK resolution never fails.
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

  // Identify which tables have timestamp columns (these get per-slot distribution)
  const tablesWithTimestamps = new Set<string>();
  for (const tablePlan of plan.tables) {
    const hasTimestamp = tablePlan.columns.some(
      (c) => c.strategy.kind === 'timestamp',
    );
    if (hasTimestamp) {
      tablesWithTimestamps.add(tablePlan.tableName);
    }
  }

  // Pre-resolve column generators for each table
  const tableColumnGenerators = new Map<string, Array<{
    columnName: string;
    generator: GeneratorFunction | null;
    isForeignKey: boolean;
    isTimestamp: boolean;
    foreignKeyRef: ReturnType<typeof getFKRef>;
    maxLength: number | null | undefined;
  }>>();

  // Track which non-timestamp tables have already been fully generated
  const nonTemporalGenerated = new Set<string>();

  // Compute per-table slot distributions for temporal tables
  const tableDistributions = new Map<string, number[]>();

  for (const tableName of plan.tableOrder) {
    const tablePlan = tablePlanMap.get(tableName);
    if (!tablePlan || !tablePlan.enabled) continue;

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

    tableColumnGenerators.set(tableName, columnGenerators);

    // Initialize the table entry in allGeneratedTables so FK resolver
    // can find the table even before any rows are added
    allGeneratedTables.set(tableName, {
      tableName,
      columns: tablePlan.columns.map((c) => c.columnName),
      rows: [],
      rowCount: 0,
    });

    // Compute per-table distribution for temporal tables
    if (tablesWithTimestamps.has(tableName)) {
      const distribution = computeTableDistribution(
        slots.length,
        tablePlan.rowCount,
        timelineConfig.growthModel.kind,
        timelineConfig.growthModel.initialCount,
      );
      tableDistributions.set(tableName, distribution);
    }
  }

  // Track deferred rows: if a child table can't generate rows in a slot
  // because its FK parent has 0 cumulative rows, defer to the next slot.
  const deferredRows = new Map<string, number>();

  // Slot-first iteration: for each slot, generate rows for ALL tables in FK order
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const slot = slots[slotIndex];
    const isFirstSlot = slotIndex === 0;

    for (const tableName of plan.tableOrder) {
      const tablePlan = tablePlanMap.get(tableName);
      if (!tablePlan || !tablePlan.enabled) continue;

      const hasTimeline = tablesWithTimestamps.has(tableName);
      const columnGenerators = tableColumnGenerators.get(tableName)!;
      const constraints = constraintMap.get(tableName) ?? [];
      const table = allGeneratedTables.get(tableName)!;

      if (!hasTimeline) {
        // Tables without timestamps: generate ALL rows in the first slot only,
        // so child tables in this and subsequent slots can reference them.
        if (!isFirstSlot) continue;
        if (nonTemporalGenerated.has(tableName)) continue;

        for (let rowIndex = 0; rowIndex < tablePlan.rowCount; rowIndex++) {
          const row = generateRow(
            columnGenerators,
            constraints,
            seed,
            rowIndex,
            tableName,
            allGeneratedTables,
            null, // no slot for non-temporal tables
          );
          table.rows.push(row);
        }
        table.rowCount = table.rows.length;
        nonTemporalGenerated.add(tableName);
      } else {
        // Tables with timestamps: generate this slot's share of rows
        // using the per-table distribution (NOT the global slot.targetRowCount)
        const distribution = tableDistributions.get(tableName)!;
        let slotRowCount = distribution[slotIndex];

        // Add any deferred rows from previous slots
        const deferredKey = tableName;
        slotRowCount += (deferredRows.get(deferredKey) ?? 0);
        deferredRows.set(deferredKey, 0);

        // If this table has FK dependencies and any parent has 0 cumulative
        // rows, defer this slot's rows to a later slot
        if (slotRowCount > 0 && tablePlan.dependencies.length > 0) {
          const parentsMissing = tablePlan.dependencies.some((dep) => {
            const parentTable = allGeneratedTables.get(dep);
            return !parentTable || parentTable.rows.length === 0;
          });
          if (parentsMissing) {
            deferredRows.set(deferredKey, slotRowCount);
            continue;
          }
        }

        for (let rowIndex = 0; rowIndex < slotRowCount; rowIndex++) {
          const globalRowIndex = table.rows.length;
          const row = generateRow(
            columnGenerators,
            constraints,
            seed,
            globalRowIndex,
            tableName,
            allGeneratedTables,
            slot,
          );
          table.rows.push(row);
        }
        table.rowCount = table.rows.length;
      }
    }
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
 * Generate a single row using column generators and temporal constraints.
 */
function generateRow(
  columnGenerators: Array<{
    columnName: string;
    generator: GeneratorFunction | null;
    isForeignKey: boolean;
    isTimestamp: boolean;
    foreignKeyRef: ReturnType<typeof getFKRef>;
    maxLength: number | null | undefined;
  }>,
  constraints: TemporalConstraint[],
  seed: ReturnType<typeof createSeededRandom>,
  rowIndex: number,
  tableName: string,
  allGeneratedTables: Map<string, GeneratedTable>,
  slot: { startDate: Date; endDate: Date; targetRowCount: number } | null,
): GeneratedRow {
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
    } else if (colGen.isTimestamp && slot) {
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
              // Find the parent row by FK value
              const fkValue = row[fkCol.columnName];
              const refCol = fkCol.foreignKeyRef!.referencedColumn;
              parentRow = parentTable.rows.find((r) => r[refCol] === fkValue) ?? null;
            }
            if (!parentRow) {
              parentRow = parentTable.rows[rowIndex % parentTable.rows.length] ?? null;
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

  return row;
}

// Helper type extraction — used only for type inference
function getFKRef() {
  return undefined as import('@databox/shared').ForeignKeyReferencePlan | undefined;
}
