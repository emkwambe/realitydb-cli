import type { SeededRandom } from '@databox/shared';

/**
 * Generates values from a continuous uniform distribution over [min, max].
 */
export function uniformDistribution(
  random: SeededRandom,
  min: number = 0,
  max: number = 1,
): number {
  return min + random.next() * (max - min);
}

/**
 * Generates integer values from a discrete uniform distribution over [min, max].
 */
export function uniformIntDistribution(
  random: SeededRandom,
  min: number,
  max: number,
): number {
  return Math.floor(min + random.next() * (max - min + 1));
}
