import type { SeededRandom } from '@databox/shared';
import { createSeededRandom } from '@databox/shared';

// ─── Types ───────────────────────────────────────────────────

export interface SimulationEvent {
  id: string;
  timestamp: string;
  source: string;
  type: string;
  correlationId: string;
  sessionId?: string;
  actor?: { id: string; type: string };
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type TrafficPattern = 'steady' | 'spike' | 'ramp' | 'burst' | 'diurnal';

export interface EventSourceConfig {
  source: string;
  types: EventTypeConfig[];
  weight: number;
}

export interface EventTypeConfig {
  type: string;
  weight: number;
  payloadTemplate: Record<string, unknown>;
}

export interface SimulationProfile {
  name: string;
  description: string;
  duration: string;
  eventSources: EventSourceConfig[];
  correlationRules: CorrelationRule[];
  trafficPattern: TrafficPattern;
}

export interface CorrelationRule {
  trigger: string;
  sequence: string[];
  delayMs: [number, number];
  probability: number;
}

// ─── Helpers ─────────────────────────────────────────────────

export function randomHex(rng: SeededRandom, length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(rng.next() * 16)];
  }
  return result;
}

// ─── Built-in Event Catalog ──────────────────────────────────

export const EVENT_CATALOG: EventTypeConfig[] = [
  { type: 'user.signup', weight: 5, payloadTemplate: { method: 'email', plan: 'free', source: 'organic' } },
  { type: 'user.login', weight: 20, payloadTemplate: { method: 'password', success: true } },
  { type: 'user.logout', weight: 10, payloadTemplate: { reason: 'manual' } },
  { type: 'page.view', weight: 40, payloadTemplate: { path: '/dashboard', duration_ms: 3500, referrer: null } },
  { type: 'purchase.completed', weight: 8, payloadTemplate: { amount: 4999, currency: 'usd', items: 1 } },
  { type: 'subscription.changed', weight: 3, payloadTemplate: { from: 'free', to: 'pro', action: 'upgrade' } },
  { type: 'api.call', weight: 30, payloadTemplate: { method: 'GET', path: '/api/v1/data', status: 200, latency_ms: 45 } },
  { type: 'error.occurred', weight: 4, payloadTemplate: { code: 'ERR_TIMEOUT', message: 'Request timed out', severity: 'warning' } },
];

// ─── Duration Parsing ────────────────────────────────────────

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)-(hour|day|week|month)s?$/);
  if (!match) throw new Error(`Invalid duration: "${duration}". Use: 1-hour, 1-day, 1-week, 1-month`);
  const count = parseInt(match[1], 10);
  const unit = match[2];
  const msPerUnit: Record<string, number> = {
    hour: 3_600_000,
    day: 86_400_000,
    week: 604_800_000,
    month: 2_592_000_000,
  };
  return count * msPerUnit[unit];
}

// ─── Traffic Shaping ─────────────────────────────────────────

function trafficMultiplier(
  pattern: TrafficPattern,
  progress: number,
  rng: SeededRandom,
): number {
  switch (pattern) {
    case 'steady':
      return 1.0;
    case 'spike':
      if (progress > 0.6 && progress < 0.7) return 4.0 + rng.next() * 2;
      return 0.8 + rng.next() * 0.4;
    case 'ramp':
      return 0.2 + progress * 1.8;
    case 'burst':
      return rng.next() < 0.15 ? 3.0 + rng.next() * 3 : 0.7 + rng.next() * 0.6;
    case 'diurnal':
      return 0.3 + 1.7 * Math.sin(progress * Math.PI);
    default:
      return 1.0;
  }
}

// ─── Event Stream Generator ─────────────────────────────────

export interface GenerateEventsOptions {
  profile: SimulationProfile;
  seed?: number;
  totalEvents?: number;
  startTime?: string;
}

export function generateEventStream(options: GenerateEventsOptions): SimulationEvent[] {
  const { profile, seed = 42, totalEvents = 1000, startTime } = options;
  const rng = createSeededRandom(seed);
  const durationMs = parseDuration(profile.duration);
  const start = startTime ? new Date(startTime).getTime() : Date.now() - durationMs;

  // Build weighted type list
  const weightedTypes: Array<{ source: string; type: string; template: Record<string, unknown>; weight: number }> = [];
  for (const src of profile.eventSources) {
    for (const evt of src.types) {
      weightedTypes.push({
        source: src.source,
        type: evt.type,
        template: evt.payloadTemplate,
        weight: evt.weight * src.weight,
      });
    }
  }

  const totalWeight = weightedTypes.reduce((s, t) => s + t.weight, 0);
  const events: SimulationEvent[] = [];

  // Generate actors
  const actorCount = Math.max(10, Math.floor(totalEvents / 20));
  const actors = Array.from({ length: actorCount }, (_, i) => ({
    id: `user_${String(i + 1).padStart(4, '0')}`,
    type: 'user',
  }));

  // Generate sessions
  const sessionCount = Math.floor(actorCount * 1.5);
  const sessions = Array.from({ length: sessionCount }, () =>
    `sess_${randomHex(rng, 8)}`,
  );

  let generatedCount = 0;
  let currentTime = start;
  const avgInterval = durationMs / totalEvents;

  while (generatedCount < totalEvents) {
    const progress = (currentTime - start) / durationMs;
    if (progress > 1) break;

    const multiplier = trafficMultiplier(profile.trafficPattern, progress, rng);
    const interval = avgInterval / multiplier;
    currentTime += Math.max(1, Math.floor(interval * (0.5 + rng.next())));

    // Pick event type by weight
    let roll = rng.next() * totalWeight;
    let picked = weightedTypes[0];
    for (const wt of weightedTypes) {
      roll -= wt.weight;
      if (roll <= 0) {
        picked = wt;
        break;
      }
    }

    const actor = actors[Math.floor(rng.next() * actors.length)];
    const session = sessions[Math.floor(rng.next() * sessions.length)];

    const event: SimulationEvent = {
      id: `evt_${randomHex(rng, 12)}`,
      timestamp: new Date(currentTime).toISOString(),
      source: picked.source,
      type: picked.type,
      correlationId: `cor_${randomHex(rng, 8)}`,
      sessionId: session,
      actor,
      payload: randomizePayload(picked.template, rng),
    };

    events.push(event);
    generatedCount++;
  }

  return events;
}

// ─── Payload Randomization ───────────────────────────────────

function randomizePayload(
  template: Record<string, unknown>,
  rng: SeededRandom,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === 'number') {
      result[key] = Math.round(value * (0.7 + rng.next() * 0.6));
    } else if (typeof value === 'boolean') {
      result[key] = rng.next() > 0.1;
    } else if (value === null) {
      result[key] = rng.next() > 0.5 ? null : 'direct';
    } else if (typeof value === 'string') {
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}
