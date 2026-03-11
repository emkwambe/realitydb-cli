export type {
  DomainTemplate,
  TableTemplateConfig,
  ColumnTemplateOverride,
  TemplateMatchResult,
} from './types.js';
export {
  TemplateRegistry,
  createTemplateRegistry,
  getDefaultRegistry,
} from './registry.js';
export {
  resolveColumnOverride,
  resolveTableConfig,
} from './resolver.js';
export type {
  TemplateJSON,
  TemplateTableJSON,
  TemplateColumnJSON,
} from './templateSchema.js';
export { VALID_STRATEGY_KINDS } from './templateSchema.js';
export { loadTemplateFromJSON, convertToDomainTemplate } from './loadTemplate.js';
export { validateTemplateJSON, assertValidTemplate } from './validateTemplate.js';
export type { ValidationResult } from './validateTemplate.js';
export { getUserTemplateDir, listUserTemplates, resolveUserTemplate } from './userTemplates.js';
export type { UserTemplateEntry } from './userTemplates.js';
export { saasTemplate } from './domains/saas.js';
export { ecommerceTemplate } from './domains/ecommerce.js';
export { educationTemplate } from './domains/education.js';
export { fintechTemplate } from './domains/fintech.js';
export { healthcareTemplate } from './domains/healthcare.js';
