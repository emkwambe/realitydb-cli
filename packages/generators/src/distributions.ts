import type { SeededRandom } from '@databox/shared';

/**
 * Selects an item based on weighted probability.
 * Weights do not need to sum to 1 — normalized internally.
 */
export function weightedChoice<T>(random: SeededRandom, items: T[], weights: number[]): T {
  if (items.length === 0) {
    throw new Error('weightedChoice: items array must not be empty');
  }
  if (items.length !== weights.length) {
    throw new Error('weightedChoice: items and weights must have the same length');
  }

  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    throw new Error('weightedChoice: total weight must be positive');
  }

  const roll = random.next() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return items[i];
    }
  }

  // Fallback for floating point edge cases
  return items[items.length - 1];
}

/**
 * Generates a number from a normal-ish distribution bounded between min and max.
 * Uses Box-Muller transform approximation with the seeded random.
 */
export function boundedNormal(
  random: SeededRandom,
  min: number,
  max: number,
  mean?: number,
  stdDev?: number,
): number {
  const effectiveMean = mean ?? (min + max) / 2;
  const effectiveStdDev = stdDev ?? (max - min) / 6;

  // Box-Muller transform using two uniform random values
  const u1 = random.next();
  const u2 = random.next();

  // Avoid log(0)
  const safeU1 = Math.max(u1, 1e-10);
  const z = Math.sqrt(-2 * Math.log(safeU1)) * Math.cos(2 * Math.PI * u2);

  const value = effectiveMean + z * effectiveStdDev;

  // Clamp to bounds
  return Math.max(min, Math.min(max, value));
}

/**
 * Generates integers with a long-tail distribution (many small values, few large).
 * Uses power-law transformation.
 */
export function longTailInteger(
  random: SeededRandom,
  min: number,
  max: number,
  skew: number = 2,
): number {
  // Power-law: raise uniform random to 1/skew to create right skew
  const u = random.next();
  const skewed = Math.pow(u, skew);
  const value = Math.floor(min + skewed * (max - min + 1));
  return Math.min(value, max);
}

/**
 * Simple uniform random selection from array.
 */
export function uniformChoice<T>(random: SeededRandom, items: T[]): T {
  if (items.length === 0) {
    throw new Error('uniformChoice: items array must not be empty');
  }
  return random.pick(items);
}

/**
 * Returns true with given percentage probability (0-100).
 */
export function percentageChance(random: SeededRandom, percentage: number): boolean {
  return random.next() * 100 < percentage;
}
