import type { SeededRandom } from '@databox/shared';

/**
 * Generates values from a Zipf (power-law) distribution.
 * Produces integers in [1, n] where probability is proportional to 1/k^s.
 *
 * @param random - Seeded random source
 * @param n - Maximum value (number of elements)
 * @param s - Exponent parameter (higher = more skewed toward 1). Default 1.0
 */
export function zipfDistribution(
  random: SeededRandom,
  n: number,
  s: number = 1.0,
): number {
  // Precompute harmonic numbers for rejection sampling
  const harmonicSum = computeHarmonicSum(n, s);
  const target = random.next() * harmonicSum;

  let cumulative = 0;
  for (let k = 1; k <= n; k++) {
    cumulative += 1 / Math.pow(k, s);
    if (target <= cumulative) {
      return k;
    }
  }
  return n;
}

function computeHarmonicSum(n: number, s: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) {
    sum += 1 / Math.pow(k, s);
  }
  return sum;
}

/**
 * Generates values from a Zipf distribution mapped to [min, max] range.
 */
export function zipfInRange(
  random: SeededRandom,
  min: number,
  max: number,
  s: number = 1.0,
): number {
  const range = max - min + 1;
  const k = zipfDistribution(random, range, s);
  return min + k - 1;
}
