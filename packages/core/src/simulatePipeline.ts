import {
  generateEventStream,
  generateStripeWebhooks,
  generateGitHubWebhooks,
  generateApiTraffic,
  applyEventCorrelations,
  buildSimulationReport,
  SIMULATION_PROFILES,
  getSimulationProfile,
} from '@databox/generators';
import type {
  SimulationEvent,
  SimulationProfile,
  SimulationReport,
} from '@databox/generators';
import { writeFileSync } from 'node:fs';

export interface SimulateRunOptions {
  profile?: string;
  duration?: string;
  events?: number;
  seed?: number;
  startTime?: string;
  output?: string;
  format?: 'json' | 'ndjson';
}

export interface SimulateRunResult {
  events: SimulationEvent[];
  report: SimulationReport;
  outputFile?: string;
  durationMs: number;
}

export interface SimulateWebhooksOptions {
  source: 'stripe' | 'github';
  events?: number;
  seed?: number;
  startTime?: string;
  output?: string;
  format?: 'json' | 'ndjson';
}

export interface SimulateWebhooksResult {
  events: SimulationEvent[];
  report: SimulationReport;
  outputFile?: string;
  durationMs: number;
}

/**
 * Run a full simulation using a profile.
 */
export function simulateRun(options: SimulateRunOptions): SimulateRunResult {
  const start = performance.now();
  const profileName = options.profile ?? 'saas-startup';
  const profile = getSimulationProfile(profileName);

  if (!profile) {
    const available = SIMULATION_PROFILES.map((p) => p.name).join(', ');
    throw new Error(`Profile "${profileName}" not found. Available: ${available}`);
  }

  // Override duration if specified
  const effectiveProfile: SimulationProfile = options.duration
    ? { ...profile, duration: options.duration }
    : profile;

  let events = generateEventStream({
    profile: effectiveProfile,
    seed: options.seed ?? 42,
    totalEvents: options.events ?? 1000,
    startTime: options.startTime,
  });

  // Apply correlation rules
  if (effectiveProfile.correlationRules.length > 0) {
    events = applyEventCorrelations(
      events,
      effectiveProfile.correlationRules,
      options.seed ?? 42,
    );
  }

  const report = buildSimulationReport(events);

  // Write output
  let outputFile: string | undefined;
  if (options.output) {
    outputFile = options.output;
    const format = options.format ?? 'json';
    if (format === 'ndjson') {
      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      writeFileSync(outputFile, ndjson, 'utf-8');
    } else {
      writeFileSync(outputFile, JSON.stringify(events, null, 2) + '\n', 'utf-8');
    }
  }

  return {
    events,
    report,
    outputFile,
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Generate webhook events from a specific source.
 */
export function simulateWebhooks(options: SimulateWebhooksOptions): SimulateWebhooksResult {
  const start = performance.now();
  const count = options.events ?? 100;
  const seed = options.seed ?? 42;

  let events: SimulationEvent[];
  if (options.source === 'stripe') {
    events = generateStripeWebhooks(count, seed, options.startTime);
  } else if (options.source === 'github') {
    events = generateGitHubWebhooks(count, seed, options.startTime);
  } else {
    throw new Error(`Unknown webhook source: "${options.source}". Use: stripe, github`);
  }

  const report = buildSimulationReport(events);

  let outputFile: string | undefined;
  if (options.output) {
    outputFile = options.output;
    const format = options.format ?? 'json';
    if (format === 'ndjson') {
      const ndjson = events.map((e) => JSON.stringify(e)).join('\n') + '\n';
      writeFileSync(outputFile, ndjson, 'utf-8');
    } else {
      writeFileSync(outputFile, JSON.stringify(events, null, 2) + '\n', 'utf-8');
    }
  }

  return {
    events,
    report,
    outputFile,
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * List available simulation profiles.
 */
export function simulateProfiles(): SimulationProfile[] {
  return SIMULATION_PROFILES;
}
