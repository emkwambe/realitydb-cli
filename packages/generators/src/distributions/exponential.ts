import type { SeededRandom } from '@databox/shared';

/**
 * Generates values from an exponential distribution.
 * Mean = 1/lambda.
 *
 * @param random - Seeded random source
 * @param lambda - Rate parameter (inverse of mean). Default 1.0
 */
export function exponentialDistribution(
  random: SeededRandom,
  lambda: number = 1.0,
): number {
  const u = Math.max(random.next(), 1e-10);
  return -Math.log(u) / lambda;
}

/**
 * Generates bounded exponential values clamped to [min, max].
 */
export function boundedExponentialDistribution(
  random: SeededRandom,
  min: number,
  max: number,
  lambda: number = 1.0,
): number {
  const value = min + exponentialDistribution(random, lambda);
  return Math.min(value, max);
}
