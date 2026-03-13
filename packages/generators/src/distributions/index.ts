export { normalDistribution, boundedNormalDistribution } from './normal.js';
export { uniformDistribution, uniformIntDistribution } from './uniform.js';
export { zipfDistribution, zipfInRange } from './zipf.js';
export { exponentialDistribution, boundedExponentialDistribution } from './exponential.js';
export { logNormalDistribution, boundedLogNormalDistribution } from './logNormal.js';

import type { SeededRandom } from '@databox/shared';
import { normalDistribution, boundedNormalDistribution } from './normal.js';
import { uniformDistribution } from './uniform.js';
import { zipfInRange } from './zipf.js';
import { exponentialDistribution, boundedExponentialDistribution } from './exponential.js';
import { logNormalDistribution, boundedLogNormalDistribution } from './logNormal.js';

/**
 * Supported distribution types for the generate command.
 */
export type DistributionType = 'normal' | 'uniform' | 'zipf' | 'exponential' | 'log-normal';

export interface DistributionConfig {
  type: DistributionType;
  /** Normal: mean */
  mean?: number;
  /** Normal: standard deviation */
  stddev?: number;
  /** Exponential: rate parameter (1/mean) */
  lambda?: number;
  /** Zipf: exponent (skew factor) */
  exponent?: number;
  /** Log-normal: mu (mean of log) */
  mu?: number;
  /** Log-normal: sigma (stddev of log) */
  sigma?: number;
  /** Clamp min */
  min?: number;
  /** Clamp max */
  max?: number;
}

/**
 * Generate a value from a configured distribution.
 */
export function sampleDistribution(
  random: SeededRandom,
  config: DistributionConfig,
): number {
  const { type, min, max } = config;

  switch (type) {
    case 'normal': {
      if (min !== undefined && max !== undefined) {
        return boundedNormalDistribution(random, min, max, config.mean, config.stddev);
      }
      return normalDistribution(random, config.mean ?? 0, config.stddev ?? 1);
    }
    case 'uniform': {
      return uniformDistribution(random, min ?? 0, max ?? 1);
    }
    case 'zipf': {
      const lo = min ?? 1;
      const hi = max ?? 100;
      return zipfInRange(random, lo, hi, config.exponent ?? 1.0);
    }
    case 'exponential': {
      if (min !== undefined && max !== undefined) {
        return boundedExponentialDistribution(random, min, max, config.lambda ?? 1.0);
      }
      return exponentialDistribution(random, config.lambda ?? 1.0);
    }
    case 'log-normal': {
      if (min !== undefined && max !== undefined) {
        return boundedLogNormalDistribution(random, min, max, config.mu, config.sigma);
      }
      return logNormalDistribution(random, config.mu ?? 0, config.sigma ?? 1);
    }
    default:
      throw new Error(`Unknown distribution type: ${type}`);
  }
}
