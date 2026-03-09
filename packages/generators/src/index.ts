export { VERSION } from './version.js';
export type {
  GeneratedDataset,
  GeneratedTable,
  GeneratedRow,
  GeneratorFunction,
  GeneratorContext,
} from './types.js';
export { inferColumnStrategy, inferTableStrategies } from './strategyInference.js';
export { createGeneratorRegistry } from './registry.js';
export type { GeneratorRegistry } from './registry.js';
export {
  generateUuid,
  generateEmail,
  generateFirstName,
  generateLastName,
  generateFullName,
  generatePhone,
  generateAddress,
  generateCompanyName,
  generateText,
  generateInteger,
  generateFloat,
  generateMoney,
  generateBoolean,
  generateTimestamp,
  generateEnum,
} from './primitives/index.js';
export { generateDataset } from './engine.js';
export { resolveForeignKey } from './foreignKeyResolver.js';
