import type { ColumnStrategy } from '@databox/shared';
import type { GeneratorContext, GeneratorFunction } from './types.js';
import { generateUuid } from './primitives/uuid.js';
import {
  generateEmail,
  generateFirstName,
  generateLastName,
  generateFullName,
  generatePhone,
  generateAddress,
  generateCompanyName,
  generateText,
} from './primitives/text.js';
import {
  generateInteger,
  generateFloat,
  generateMoney,
  generateBoolean,
} from './primitives/numeric.js';
import { generateTimestamp } from './primitives/temporal.js';
import { generateEnum } from './primitives/enum.js';
import { generateSku, generateSequential } from './primitives/custom.js';

export interface GeneratorRegistry {
  getGenerator(strategy: ColumnStrategy): GeneratorFunction;
}

export function createGeneratorRegistry(): GeneratorRegistry {
  const generators: Record<string, (strategy: ColumnStrategy) => GeneratorFunction> = {
    uuid: () => (ctx: GeneratorContext) => generateUuid(ctx),
    email: () => (ctx: GeneratorContext) => generateEmail(ctx),
    first_name: () => (ctx: GeneratorContext) => generateFirstName(ctx),
    last_name: () => (ctx: GeneratorContext) => generateLastName(ctx),
    full_name: () => (ctx: GeneratorContext) => generateFullName(ctx),
    phone: () => (ctx: GeneratorContext) => generatePhone(ctx),
    address: () => (ctx: GeneratorContext) => generateAddress(ctx),
    company_name: () => (ctx: GeneratorContext) => generateCompanyName(ctx),
    text: (strategy) => {
      const mode = (strategy.options?.['mode'] as 'short' | 'medium' | 'long') ?? 'medium';
      return (ctx: GeneratorContext) => generateText(ctx, mode);
    },
    integer: (strategy) => {
      const min = (strategy.options?.['min'] as number) ?? 0;
      const max = (strategy.options?.['max'] as number) ?? 10000;
      return (ctx: GeneratorContext) => generateInteger(ctx, min, max);
    },
    float: (strategy) => {
      const min = (strategy.options?.['min'] as number) ?? 0;
      const max = (strategy.options?.['max'] as number) ?? 10000;
      return (ctx: GeneratorContext) => generateFloat(ctx, min, max);
    },
    money: (strategy) => {
      const min = (strategy.options?.['min'] as number) ?? 100;
      const max = (strategy.options?.['max'] as number) ?? 100000;
      return (ctx: GeneratorContext) => generateMoney(ctx, min, max);
    },
    boolean: (strategy) => {
      const trueWeight = (strategy.options?.['trueWeight'] as number) ?? 0.5;
      return (ctx: GeneratorContext) => generateBoolean(ctx, trueWeight);
    },
    timestamp: (strategy) => {
      const mode = (strategy.options?.['mode'] as 'past' | 'recent' | 'timeline') ?? 'past';
      return (ctx: GeneratorContext) => generateTimestamp(ctx, mode);
    },
    enum: (strategy) => {
      const values = (strategy.options?.['values'] as string[]) ?? [];
      const weights = strategy.options?.['weights'] as number[] | undefined;
      return (ctx: GeneratorContext) => generateEnum(ctx, values, weights);
    },
    foreign_key: () => (ctx: GeneratorContext) => {
      // FK resolution is handled by the engine, not the registry
      throw new Error(
        `Foreign key generator called directly for ${ctx.tableName}.${ctx.columnName}. FK resolution must be handled by the dataset engine.`
      );
    },
    custom: (strategy) => {
      const name = strategy.options?.['name'] as string | undefined;
      if (name === 'sku') {
        return (ctx: GeneratorContext) => generateSku(ctx);
      }
      if (name === 'sequential') {
        const prefix = (strategy.options?.['prefix'] as string) ?? '';
        const padLength = (strategy.options?.['padLength'] as number) ?? 6;
        return (ctx: GeneratorContext) => generateSequential(ctx, prefix, padLength);
      }
      // Fallback to text generator with warning for unknown custom generators
      console.warn(`[databox] Unknown custom generator "${name}", falling back to text.`);
      return (ctx: GeneratorContext) => generateText(ctx, 'short');
    },
  };

  return {
    getGenerator(strategy: ColumnStrategy): GeneratorFunction {
      const factory = generators[strategy.kind];
      if (!factory) {
        throw new Error(
          `Unknown strategy kind: "${strategy.kind}". Available kinds: ${Object.keys(generators).join(', ')}`
        );
      }
      return factory(strategy);
    },
  };
}
