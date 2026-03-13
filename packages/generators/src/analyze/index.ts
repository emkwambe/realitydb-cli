export { detectColumn, detectTableColumns } from './columnDetector.js';
export type { ColumnDetection } from './columnDetector.js';

export { analyzeTableSample } from './sampleAnalyzer.js';
export type { ColumnSampleStats, TableSampleAnalysis } from './sampleAnalyzer.js';

export { refineDetection, generateTemplate, serializeTemplate } from './templateGenerator.js';
export type { TableAnalysis, ColumnAnalysisEntry } from './templateGenerator.js';

export { buildAnalysisReport, formatAnalysisReport, formatAnalysisReportCI } from './report.js';
export type { AnalysisReport } from './report.js';
