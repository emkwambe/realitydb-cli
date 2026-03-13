import type { SeededRandom, LifecycleDefinition, SimulationResult } from '@databox/shared';
import { createEntity, selectFinalState, advanceEntity, generateEntityRows } from './stateMachine.js';

/**
 * Simulates N entities through a lifecycle, producing a coherent
 * multi-table dataset where all cross-table relationships are consistent.
 *
 * Each entity:
 * 1. Gets assigned a final state (based on state weights)
 * 2. Walks through the transition path to reach that state
 * 3. Accumulates column values and side-effect rows along the way
 */
export function simulateLifecycles(
  lifecycle: LifecycleDefinition,
  count: number,
  random: SeededRandom,
): SimulationResult {
  const allTables = new Map<string, Record<string, unknown>[]>();
  const stateDistribution = new Map<string, number>();

  for (let i = 0; i < count; i++) {
    // 1. Create entity
    const entity = createEntity(i, random);

    // 2. Select final state based on weights
    const targetState = selectFinalState(lifecycle, random);

    // 3. Walk entity through the lifecycle to reach target state
    advanceEntity(entity, lifecycle, targetState, random);

    // 4. Track state distribution
    const currentCount = stateDistribution.get(entity.currentState) ?? 0;
    stateDistribution.set(entity.currentState, currentCount + 1);

    // 5. Generate all rows for this entity
    const entityRows = generateEntityRows(entity, lifecycle);

    // 6. Merge into the aggregate tables
    for (const [tableName, rows] of entityRows) {
      const existing = allTables.get(tableName) ?? [];
      existing.push(...rows);
      allTables.set(tableName, existing);
    }
  }

  return {
    tables: allTables,
    entityCount: count,
    stateDistribution,
  };
}
