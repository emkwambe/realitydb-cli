import type { SeededRandom } from '@databox/shared';

/**
 * Generates values from a normal (Gaussian) distribution using Box-Muller transform.
 */
export function normalDistribution(
  random: SeededRandom,
  mean: number = 0,
  stddev: number = 1,
): number {
  const u1 = Math.max(random.next(), 1e-10);
  const u2 = random.next();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

/**
 * Generates bounded normal values clamped to [min, max].
 */
export function boundedNormalDistribution(
  random: SeededRandom,
  min: number,
  max: number,
  mean?: number,
  stddev?: number,
): number {
  const effectiveMean = mean ?? (min + max) / 2;
  const effectiveStddev = stddev ?? (max - min) / 6;
  const value = normalDistribution(random, effectiveMean, effectiveStddev);
  return Math.max(min, Math.min(max, value));
}
