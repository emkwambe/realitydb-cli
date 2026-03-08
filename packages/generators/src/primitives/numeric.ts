import type { GeneratorContext } from '../types.js';

export function generateInteger(ctx: GeneratorContext, min: number, max: number): number {
  return ctx.seed.nextInt(min, max);
}

export function generateFloat(ctx: GeneratorContext, min: number, max: number): number {
  return ctx.seed.nextFloat(min, max);
}

export function generateMoney(ctx: GeneratorContext, min: number, max: number): number {
  return ctx.seed.nextInt(min, max);
}

export function generateBoolean(ctx: GeneratorContext, trueWeight: number): boolean {
  return ctx.seed.nextBoolean(trueWeight);
}
