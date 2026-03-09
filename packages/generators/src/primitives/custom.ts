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
