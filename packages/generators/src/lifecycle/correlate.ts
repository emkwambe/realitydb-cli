import type { SeededRandom, CrossTableCorrelation, SimulationResult } from '@databox/shared';
import { generateUuid } from '../primitives/index.js';

/**
 * Applies cross-table correlations to a simulation result.
 *
 * Correlations adjust data in related tables based on conditions in other tables.
 * For example: "enterprise plan users have 2x more payments" duplicates payment
 * rows for entities matching the condition.
 */
export function applyCorrelations(
  result: SimulationResult,
  correlations: CrossTableCorrelation[],
  random: SeededRandom,
): SimulationResult {
  for (const correlation of correlations) {
    applyCorrelation(result, correlation, random);
  }
  return result;
}

function applyCorrelation(
  result: SimulationResult,
  correlation: CrossTableCorrelation,
  random: SeededRandom,
): void {
  const { condition, effect } = correlation;

  // Get the condition table rows
  const conditionRows = result.tables.get(condition.table);
  if (!conditionRows) return;

  // Find entity IDs that match the condition
  const matchingEntityIds = new Set<string>();
  for (const row of conditionRows) {
    if (evaluateCondition(row[condition.column], condition.operator, condition.value)) {
      // Grab the entity ID — could be 'id' for root table or '*_id' for related
      const entityId = (row.id ?? row.user_id ?? row.account_id) as string | undefined;
      if (entityId) {
        matchingEntityIds.add(entityId);
      }
    }
  }

  if (matchingEntityIds.size === 0) return;

  // Apply effect
  const effectRows = result.tables.get(effect.table);
  if (!effectRows) return;

  if (effect.multiplier && effect.multiplier > 1) {
    // Duplicate rows for matching entities
    const additionalRows: Record<string, unknown>[] = [];
    for (const row of effectRows) {
      const entityId = findEntityId(row);
      if (entityId && matchingEntityIds.has(entityId)) {
        // Create (multiplier - 1) copies
        const copies = Math.round(effect.multiplier - 1);
        for (let c = 0; c < copies; c++) {
          const ctx = {
            seed: random,
            rowIndex: additionalRows.length,
            tableName: effect.table,
            columnName: 'id',
            allGeneratedTables: new Map(),
          };
          const copy = { ...row, id: generateUuid(ctx) };
          additionalRows.push(copy);
        }
      }
    }
    effectRows.push(...additionalRows);
  }

  if (effect.values && effect.values.length > 0) {
    // Override column values for matching entity rows
    for (const row of effectRows) {
      const entityId = findEntityId(row);
      if (entityId && matchingEntityIds.has(entityId)) {
        row[effect.column] = random.pick(effect.values as unknown[]);
      }
    }
  }
}

function evaluateCondition(
  actual: unknown,
  operator: string,
  expected: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return (actual as number) > (expected as number);
    case 'lt':
      return (actual as number) < (expected as number);
    case 'gte':
      return (actual as number) >= (expected as number);
    case 'lte':
      return (actual as number) <= (expected as number);
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    default:
      return false;
  }
}

function findEntityId(row: Record<string, unknown>): string | undefined {
  // Try common FK patterns
  if (typeof row.user_id === 'string') return row.user_id;
  if (typeof row.account_id === 'string') return row.account_id;
  if (typeof row.id === 'string') return row.id;
  return undefined;
}
