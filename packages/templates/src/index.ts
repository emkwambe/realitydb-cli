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
export { saasTemplate } from './domains/saas.js';
export { ecommerceTemplate } from './domains/ecommerce.js';
