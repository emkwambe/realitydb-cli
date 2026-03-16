import type { GeneratorContext } from '../types.js';

export function generateEnum(ctx: GeneratorContext, values: string[], weights?: number[]): string {
  let result: string;

  if (!weights || weights.length === 0) {
    result = ctx.seed.pick(values);
  } else {
    // Normalize weights to sum to 1 (Studio exports raw counts like [20, 30, 40, 10])
    const sum = weights.reduce((a, b) => a + b, 0);
    const normalized = sum > 0 && Math.abs(sum - 1) > 0.001
      ? weights.map((w) => w / sum)
      : weights;

    const roll = ctx.seed.next();
    let cumulative = 0;
    result = values[values.length - 1]; // fallback for floating point rounding
    for (let i = 0; i < values.length; i++) {
      cumulative += normalized[i];
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
