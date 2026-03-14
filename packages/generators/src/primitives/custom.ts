import type { GeneratorContext } from '../types.js';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a SKU in format "SKU-XXXXX" where X is uppercase alphanumeric.
 * Uses SeededRandom for deterministic output.
 */
export function generateSku(ctx: GeneratorContext): string {
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += ctx.seed.pick([...ALPHANUMERIC]);
  }
  return `SKU-${suffix}`;
}

/**
 * Generates a sequential identifier like "MRN-000001", "NPI-000002", etc.
 * Guaranteed unique within a single generation run.
 */
export function generateSequential(ctx: GeneratorContext, prefix: string, padLength: number): string {
  const seq = String(ctx.rowIndex + 1).padStart(padLength, '0');
  return `${prefix}${seq}`;
}
