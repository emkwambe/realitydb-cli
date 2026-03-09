import type { GeneratorContext } from '../types.js';

export function generateEnum(ctx: GeneratorContext, values: string[], weights?: number[]): string {
  let result: string;

  if (!weights || weights.length === 0) {
    result = ctx.seed.pick(values);
  } else {
    const roll = ctx.seed.next();
    let cumulative = 0;
    result = values[values.length - 1]; // fallback for floating point rounding
    for (let i = 0; i < values.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        result = values[i];
        break;
      }
    }
  }

  // Respect column maxLength
  if (ctx.maxLength != null && ctx.maxLength > 0 && result.length > ctx.maxLength) {
    return result.slice(0, ctx.maxLength);
  }
  return result;
}
