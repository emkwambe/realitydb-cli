export type {
  ColumnStrategy,
  ColumnStrategyKind,
  ColumnGenerationPlan,
  ForeignKeyReferencePlan,
  GenerationPlan,
  GenerationPlanConfig,
  ReproducibilityPlan,
  TableGenerationPlan,
  TemplatePlan,
  TemplateOverride,
  DependencyGraph,
  TopologicalResult,
  PlanValidationResult,
} from './planning/index.js';

export {
  buildDependencyGraph,
  topologicalSort,
  buildGenerationPlan,
  validateGenerationPlan,
} from './planning/index.js';

export { scanDatabase } from './scanPipeline.js';
export type { ScanResult } from './scanPipeline.js';
