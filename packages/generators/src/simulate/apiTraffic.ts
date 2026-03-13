import { createSeededRandom } from '@databox/shared';
import type { SimulationEvent, TrafficPattern } from './eventStream.js';
import { parseDuration, randomHex } from './eventStream.js';

export interface ApiEndpoint {
  method: string;
  path: string;
  weight: number;
  avgLatencyMs: number;
  errorRate: number;
}

const DEFAULT_ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET', path: '/api/v1/users', weight: 20, avgLatencyMs: 35, errorRate: 0.01 },
  { method: 'GET', path: '/api/v1/users/:id', weight: 25, avgLatencyMs: 25, errorRate: 0.02 },
  { method: 'POST', path: '/api/v1/users', weight: 5, avgLatencyMs: 80, errorRate: 0.03 },
  { method: 'GET', path: '/api/v1/products', weight: 15, avgLatencyMs: 45, errorRate: 0.01 },
  { method: 'POST', path: '/api/v1/orders', weight: 8, avgLatencyMs: 120, errorRate: 0.05 },
  { method: 'GET', path: '/api/v1/search', weight: 12, avgLatencyMs: 90, errorRate: 0.02 },
  { method: 'PUT', path: '/api/v1/settings', weight: 3, avgLatencyMs: 50, errorRate: 0.01 },
  { method: 'DELETE', path: '/api/v1/sessions', weight: 4, avgLatencyMs: 15, errorRate: 0.01 },
  { method: 'GET', path: '/api/v1/analytics', weight: 6, avgLatencyMs: 200, errorRate: 0.04 },
  { method: 'POST', path: '/api/v1/webhooks', weight: 2, avgLatencyMs: 60, errorRate: 0.02 },
];

export interface GenerateApiTrafficOptions {
  endpoints?: ApiEndpoint[];
  count?: number;
  duration?: string;
  pattern?: TrafficPattern;
  seed?: number;
  startTime?: string;
}

export function generateApiTraffic(options: GenerateApiTrafficOptions = {}): SimulationEvent[] {
  const {
    endpoints = DEFAULT_ENDPOINTS,
    count = 1000,
    duration = '1-day',
    pattern = 'diurnal',
    seed = 42,
    startTime,
  } = options;

  const rng = createSeededRandom(seed);
  const durationMs = parseDuration(duration);
  const start = startTime ? new Date(startTime).getTime() : Date.now() - durationMs;
  const totalWeight = endpoints.reduce((s, e) => s + e.weight, 0);
  const events: SimulationEvent[] = [];
  const avgInterval = durationMs / count;

  const USER_AGENTS = [
    'Mozilla/5.0 (compatible; AppClient/1.0)',
    'axios/1.6.0',
    'python-requests/2.31.0',
    'Go-http-client/2.0',
    'curl/8.4.0',
    'PostmanRuntime/7.36.0',
  ];

  let currentTime = start;
  for (let i = 0; i < count; i++) {
    const progress = (currentTime - start) / durationMs;
    if (progress > 1) break;

    let multiplier = 1.0;
    switch (pattern) {
      case 'diurnal':
        multiplier = 0.3 + 1.7 * Math.sin(progress * Math.PI);
        break;
      case 'spike':
        multiplier = (progress > 0.6 && progress < 0.7) ? 5.0 : 1.0;
        break;
      case 'ramp':
        multiplier = 0.2 + progress * 1.8;
        break;
      case 'burst':
        multiplier = rng.next() < 0.12 ? 4.0 : 1.0;
        break;
      default:
        multiplier = 1.0;
    }

    const interval = avgInterval / multiplier;
    currentTime += Math.max(1, Math.floor(interval * (0.5 + rng.next())));

    let roll = rng.next() * totalWeight;
    let endpoint = endpoints[0];
    for (const ep of endpoints) {
      roll -= ep.weight;
      if (roll <= 0) {
        endpoint = ep;
        break;
      }
    }

    const isError = rng.next() < endpoint.errorRate;
    const latencyMs = Math.max(1, Math.round(
      endpoint.avgLatencyMs * (0.5 + rng.next() * 1.5) * (isError ? 2.5 : 1),
    ));
    const statusCode = isError
      ? [400, 401, 403, 404, 500, 502, 503][Math.floor(rng.next() * 7)]
      : [200, 201, 204][Math.floor(rng.next() * 3)];

    const event: SimulationEvent = {
      id: `req_${randomHex(rng, 12)}`,
      timestamp: new Date(currentTime).toISOString(),
      source: 'api',
      type: 'http.request',
      correlationId: `cor_${randomHex(rng, 8)}`,
      actor: { id: `client_${Math.floor(rng.next() * 50) + 1}`, type: 'api_client' },
      payload: {
        method: endpoint.method,
        path: endpoint.path,
        status: statusCode,
        latency_ms: latencyMs,
        content_length: isError ? 0 : Math.floor(rng.next() * 50000),
        user_agent: rng.pick(USER_AGENTS),
      },
    };

    events.push(event);
  }

  return events;
}
