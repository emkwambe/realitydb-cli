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
  generateSku,
} from './primitives/index.js';
export { generateDataset } from './engine.js';
export { resolveForeignKey } from './foreignKeyResolver.js';
export { exportToJson } from './exporters/json.js';
export { exportToCsv } from './exporters/csv.js';
export { exportToSql } from './exporters/sql.js';
export {
  weightedChoice,
  boundedNormal,
  longTailInteger,
  uniformChoice,
  percentageChance,
} from './distributions.js';
export {
  computeTimelineSlots,
  linearGrowth,
  exponentialGrowth,
  sCurveGrowth,
  flatGrowth,
} from './growthModels.js';
export {
  resolveTemporalConstraints,
  applyTemporalConstraint,
} from './temporalResolver.js';
export { generateTimelineDataset } from './timeline.js';
export {
  ScenarioRegistry,
  createScenarioRegistry,
  getDefaultScenarioRegistry,
  applyScenarios,
  matchesAnyPattern,
} from './scenarioEngine.js';
export type { ScenarioDefinition, ScenarioApplyFn } from './scenarioEngine.js';
export {
  paymentFailuresScenario,
  churnSpikeScenario,
  fraudSpikeScenario,
  dataQualityScenario,
  seasonalTrafficScenario,
  dataMigrationScenario,
  systemOutageScenario,
} from './scenarios/index.js';
export { composeScenarios } from './scenarios/compose.js';
export type { CompositionResult, ScenarioConflict } from './scenarios/compose.js';
export { parseScheduleString, applyScheduledScenarios } from './scenarios/schedule.js';
export type { ScheduledScenario } from './scenarios/schedule.js';
export { loadCustomScenario, scaffoldCustomScenario } from './scenarios/loadScenario.js';
export type { CustomScenarioJSON, CustomScenarioRule } from './scenarios/loadScenario.js';
export { buildScenarioReport, formatScenarioReport, formatScenarioReportCI } from './scenarios/report.js';
export type { ScenarioReport, ScenarioReportEntry } from './scenarios/report.js';
export {
  exportRealityPack,
  saveRealityPack,
  loadRealityPack,
} from './packExporter.js';
export {
  createEntity,
  selectFinalState,
  advanceEntity,
  generateEntityRows,
  findStatePath,
  simulateLifecycles,
  applyCorrelations,
} from './lifecycle/index.js';
export type { SimulatedEntity } from './lifecycle/index.js';

// Data Science distributions
export {
  normalDistribution,
  boundedNormalDistribution,
  uniformDistribution,
  uniformIntDistribution,
  zipfDistribution,
  zipfInRange,
  exponentialDistribution,
  boundedExponentialDistribution,
  logNormalDistribution,
  boundedLogNormalDistribution,
  sampleDistribution,
} from './distributions/index.js';
export type { DistributionType, DistributionConfig } from './distributions/index.js';

// Streaming generator
export {
  streamingGenerate,
  generateInMemory,
  databaseSchemaToGenerateSchema,
} from './streaming.js';
export type {
  GenerateSchema,
  GenerateTableDef,
  GenerateColumnDef,
  ColumnCorrelation,
  GenerateOptions,
} from './streaming.js';

// Cross-column correlations
export {
  applyColumnCorrelations,
  pearsonCorrelation,
} from './correlations.js';

// Streaming writers
export {
  writeParquet,
  appendParquetBatch,
  writeCsvHeader,
  appendCsvBatch,
  writeJsonHeader,
  appendJsonBatch,
  writeJsonArray,
} from './writers/index.js';

// Schema analysis
export {
  detectColumn,
  detectTableColumns,
  analyzeTableSample,
  refineDetection,
  generateTemplate,
  serializeTemplate,
  buildAnalysisReport,
  formatAnalysisReport,
  formatAnalysisReportCI,
} from './analyze/index.js';
export type {
  ColumnDetection,
  ColumnSampleStats,
  TableSampleAnalysis,
  TableAnalysis,
  ColumnAnalysisEntry,
  AnalysisReport,
} from './analyze/index.js';
