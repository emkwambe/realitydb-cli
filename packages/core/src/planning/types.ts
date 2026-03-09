// Planning types are defined in @databox/shared and re-exported here
// for backwards compatibility — consumers can import from either package.
export type {
  ColumnStrategyKind,
  ColumnStrategy,
  ForeignKeyReferencePlan,
  ColumnGenerationPlan,
  TableGenerationPlan,
  GenerationPlanConfig,
  ReproducibilityPlan,
  TemplateOverride,
  TemplatePlan,
  GenerationPlan,
} from '@databox/shared';
