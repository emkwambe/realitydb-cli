import type { SeededRandom, LifecycleDefinition, LifecycleState, LifecycleTransition } from '@databox/shared';
import { weightedChoice } from '../distributions.js';
import { generateUuid } from '../primitives/index.js';

/**
 * Tracks a single entity through its lifecycle states.
 */
export interface SimulatedEntity {
  id: string;
  /** Index within the simulation batch */
  index: number;
  /** Current state name */
  currentState: string;
  /** Ordered history of states the entity has been in */
  stateHistory: string[];
  /** Column values accumulated from state transitions (rootTable) */
  rootRow: Record<string, unknown>;
  /** Side-effect rows created in related tables, keyed by table name */
  relatedRows: Map<string, Record<string, unknown>[]>;
}

/**
 * Selects a final state for an entity based on state weights.
 * This determines "where" the entity ends up after lifecycle simulation.
 */
export function selectFinalState(
  lifecycle: LifecycleDefinition,
  random: SeededRandom,
): LifecycleState {
  const states = lifecycle.states;
  const weights = states.map((s) => s.weight);
  return weightedChoice(random, states, weights);
}

/**
 * Finds the path of states leading to a target state by working
 * backwards through the transition graph.
 */
export function findStatePath(
  lifecycle: LifecycleDefinition,
  targetState: string,
): string[] {
  // Build reverse transition map: to → from[]
  const reverseMap = new Map<string, string[]>();
  for (const t of lifecycle.transitions) {
    const existing = reverseMap.get(t.to) ?? [];
    existing.push(t.from);
    reverseMap.set(t.to, existing);
  }

  // Trace back from target to find a path to a root state (one with no inbound transitions
  // that is also not a "from" of anything except itself)
  const path: string[] = [targetState];
  let current = targetState;
  const visited = new Set<string>([targetState]);

  while (true) {
    const parents = reverseMap.get(current);
    if (!parents || parents.length === 0) break;
    // Pick the first non-visited parent
    const parent = parents.find((p) => !visited.has(p));
    if (!parent) break;
    visited.add(parent);
    path.unshift(parent);
    current = parent;
  }

  return path;
}

/**
 * Advances an entity through a lifecycle, applying state column values
 * and firing side effects along the transition path.
 */
export function advanceEntity(
  entity: SimulatedEntity,
  lifecycle: LifecycleDefinition,
  targetState: LifecycleState,
  random: SeededRandom,
): SimulatedEntity {
  const path = findStatePath(lifecycle, targetState.name);

  // Walk through each state in the path
  for (let i = 0; i < path.length; i++) {
    const stateName = path[i];
    entity.stateHistory.push(stateName);
    entity.currentState = stateName;

    // Apply the state's column values to the root row
    const state = lifecycle.states.find((s) => s.name === stateName);
    if (state) {
      for (const [col, val] of Object.entries(state.columnValues)) {
        entity.rootRow[col] = val;
      }
    }

    // If transitioning from previous state, fire side effects
    if (i > 0) {
      const fromState = path[i - 1];
      const transition = lifecycle.transitions.find(
        (t) => t.from === fromState && t.to === stateName,
      );
      if (transition) {
        for (const effect of transition.sideEffects) {
          applyTransitionSideEffect(entity, effect, random);
        }
      }
    }
  }

  return entity;
}

function applyTransitionSideEffect(
  entity: SimulatedEntity,
  effect: { table: string; action: 'create' | 'update'; values: Record<string, unknown> },
  random: SeededRandom,
): void {
  const existing = entity.relatedRows.get(effect.table) ?? [];

  if (effect.action === 'create') {
    // Create a new row with the specified values
    const row: Record<string, unknown> = { ...effect.values };
    // Add a generated ID if not specified
    if (!row.id) {
      const ctx = {
        seed: random,
        rowIndex: existing.length,
        tableName: effect.table,
        columnName: 'id',
        allGeneratedTables: new Map(),
      };
      row.id = generateUuid(ctx);
    }
    existing.push(row);
  } else {
    // Update: apply values to the most recent row in that table
    if (existing.length > 0) {
      const lastRow = existing[existing.length - 1];
      for (const [col, val] of Object.entries(effect.values)) {
        lastRow[col] = val;
      }
    }
  }

  entity.relatedRows.set(effect.table, existing);
}

/**
 * Creates a new SimulatedEntity with a generated ID.
 */
export function createEntity(
  index: number,
  random: SeededRandom,
): SimulatedEntity {
  const ctx = {
    seed: random,
    rowIndex: index,
    tableName: 'entity',
    columnName: 'id',
    allGeneratedTables: new Map(),
  };

  return {
    id: generateUuid(ctx) as string,
    index,
    currentState: '',
    stateHistory: [],
    rootRow: {},
    relatedRows: new Map(),
  };
}

/**
 * Generates all rows for an entity across all related tables.
 * Returns a map of table name → rows (including the root table row).
 */
export function generateEntityRows(
  entity: SimulatedEntity,
  lifecycle: LifecycleDefinition,
): Map<string, Record<string, unknown>[]> {
  const result = new Map<string, Record<string, unknown>[]>();

  // Root table row
  const rootRow = { id: entity.id, ...entity.rootRow };
  result.set(lifecycle.rootTable, [rootRow]);

  // Related table rows — attach entity ID as foreign key
  for (const [tableName, rows] of entity.relatedRows) {
    const linkedRows = rows.map((row) => ({
      [`${lifecycle.entityName}_id`]: entity.id,
      ...row,
    }));
    result.set(tableName, linkedRows);
  }

  return result;
}
