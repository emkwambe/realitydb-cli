export type {
  SimulationEvent,
  TrafficPattern,
  EventSourceConfig,
  EventTypeConfig,
  SimulationProfile,
  CorrelationRule,
  GenerateEventsOptions,
} from './eventStream.js';
export {
  EVENT_CATALOG,
  parseDuration,
  randomHex,
  generateEventStream,
} from './eventStream.js';

export type { StripeEventType } from './webhooks/stripe.js';
export { generateStripeWebhooks } from './webhooks/stripe.js';

export type { GitHubEventType } from './webhooks/github.js';
export { generateGitHubWebhooks } from './webhooks/github.js';

export type { GenericWebhookConfig } from './webhooks/generic.js';
export { generateGenericWebhooks } from './webhooks/generic.js';

export type { ApiEndpoint, GenerateApiTrafficOptions } from './apiTraffic.js';
export { generateApiTraffic } from './apiTraffic.js';

export { applyCorrelations } from './correlation.js';

export type { SimulationReport } from './report.js';
export {
  buildSimulationReport,
  formatSimulationReport,
  formatSimulationReportCI,
} from './report.js';

export { SIMULATION_PROFILES, getSimulationProfile } from './profiles.js';
