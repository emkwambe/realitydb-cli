import type { GeneratorContext } from '../types.js';

export function generateEnum(ctx: GeneratorContext, values: string[], weights?: number[]): string {
  if (!weights || weights.length === 0) {
    return ctx.seed.pick(values);
  }

  const roll = ctx.seed.next();
  let cumulative = 0;
  for (let i = 0; i < values.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return values[i];
    }
  }

  // Fallback to last value (handles floating point rounding)
  return values[values.length - 1];
}
