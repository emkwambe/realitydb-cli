import { createSeededRandom } from '@databox/shared';
import type { SimulationEvent, EventTypeConfig } from '../eventStream.js';
import { randomHex } from '../eventStream.js';

export interface GenericWebhookConfig {
  source: string;
  events: EventTypeConfig[];
}

export function generateGenericWebhooks(
  config: GenericWebhookConfig,
  count: number,
  seed: number = 42,
  startTime?: string,
): SimulationEvent[] {
  const rng = createSeededRandom(seed);
  const start = startTime ? new Date(startTime).getTime() : Date.now() - 86_400_000;
  const totalWeight = config.events.reduce((s, e) => s + e.weight, 0);
  const events: SimulationEvent[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = start + Math.floor(rng.next() * 86_400_000);

    let roll = rng.next() * totalWeight;
    let picked = config.events[0];
    for (const evt of config.events) {
      roll -= evt.weight;
      if (roll <= 0) {
        picked = evt;
        break;
      }
    }

    const event: SimulationEvent = {
      id: `evt_${randomHex(rng, 12)}`,
      timestamp: new Date(timestamp).toISOString(),
      source: config.source,
      type: picked.type,
      correlationId: `cor_${randomHex(rng, 8)}`,
      payload: { ...picked.payloadTemplate },
      metadata: { generated: true },
    };

    events.push(event);
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}
