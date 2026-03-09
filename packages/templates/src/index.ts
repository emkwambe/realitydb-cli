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
