import type { SeededRandom } from '@databox/shared';
import { normalDistribution } from './normal.js';

/**
 * Generates values from a log-normal distribution.
 * If X ~ Normal(mu, sigma), then exp(X) ~ LogNormal(mu, sigma).
 *
 * The resulting distribution has:
 *   median = exp(mu)
 *   mean = exp(mu + sigma^2/2)
 *
 * @param random - Seeded random source
 * @param mu - Mean of the underlying normal distribution. Default 0
 * @param sigma - Std dev of the underlying normal distribution. Default 1
 */
export function logNormalDistribution(
  random: SeededRandom,
  mu: number = 0,
  sigma: number = 1,
): number {
  return Math.exp(normalDistribution(random, mu, sigma));
}

/**
 * Generates bounded log-normal values clamped to [min, max].
 */
export function boundedLogNormalDistribution(
  random: SeededRandom,
  min: number,
  max: number,
  mu?: number,
  sigma?: number,
): number {
  const effectiveMu = mu ?? Math.log((min + max) / 2);
  const effectiveSigma = sigma ?? 0.5;
  const value = logNormalDistribution(random, effectiveMu, effectiveSigma);
  return Math.max(min, Math.min(max, value));
}
