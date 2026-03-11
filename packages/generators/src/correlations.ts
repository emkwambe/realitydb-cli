import type { SeededRandom } from '@databox/shared';
import type { GeneratedRow } from './types.js';
import type { ColumnCorrelation } from './streaming.js';

/**
 * Cross-column correlation engine for data science datasets.
 *
 * Applies statistical correlations between columns after initial generation.
 * This is a post-processing step that adjusts values to match desired
 * correlation coefficients while preserving marginal distributions.
 */

/**
 * Apply correlations to a batch of already-generated rows.
 * Uses rank-based correlation (Spearman) to preserve distributions.
 */
export function applyColumnCorrelations(
  rows: GeneratedRow[],
  correlations: ColumnCorrelation[],
  random: SeededRandom,
): GeneratedRow[] {
  if (rows.length < 2 || correlations.length === 0) return rows;

  for (const corr of correlations) {
    applyCorrelation(rows, corr, random);
  }

  return rows;
}

function applyCorrelation(
  rows: GeneratedRow[],
  correlation: ColumnCorrelation,
  _random: SeededRandom,
): void {
  const { source, target, coefficient } = correlation;

  // Get numeric values from source column
  const sourceValues = rows.map((r) => toNumber(r[source]));
  const targetValues = rows.map((r) => toNumber(r[target]));

  if (sourceValues.some(isNaN) || targetValues.some(isNaN)) return;

  // Compute source ranks
  const sourceRanks = computeRanks(sourceValues);

  // Sort target indices by desired rank (respecting coefficient direction)
  const targetIndices = Array.from({ length: rows.length }, (_, i) => i);

  if (Math.abs(coefficient) > 0.01) {
    // Sort target values
    const sortedTargetValues = [...targetValues].sort((a, b) => a - b);

    // Assign target values based on source rank order
    // coefficient > 0 → same order; coefficient < 0 → reverse order
    const orderedSourceRankIndices = sourceRanks
      .map((rank, idx) => ({ rank, idx }))
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.idx);

    const sortedTargets = coefficient >= 0
      ? sortedTargetValues
      : [...sortedTargetValues].reverse();

    // Blend between original and perfectly correlated values
    const blendFactor = Math.abs(coefficient);

    for (let i = 0; i < orderedSourceRankIndices.length; i++) {
      const rowIdx = orderedSourceRankIndices[i];
      const correlatedValue = sortedTargets[i];
      const originalValue = targetValues[rowIdx];
      const blended = originalValue * (1 - blendFactor) + correlatedValue * blendFactor;
      rows[rowIdx][target] = isIntLike(rows[rowIdx][target]) ? Math.round(blended) : Math.round(blended * 100) / 100;
    }
  }
}

function computeRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  for (let i = 0; i < indexed.length; i++) {
    ranks[indexed[i].i] = i;
  }
  return ranks;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isNaN(n) ? NaN : n;
  }
  return NaN;
}

function isIntLike(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Compute the Pearson correlation coefficient between two arrays.
 * Useful for verifying generated correlations.
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  return denom === 0 ? 0 : sumXY / denom;
}
