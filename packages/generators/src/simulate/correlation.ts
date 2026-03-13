import { createSeededRandom } from '@databox/shared';
import type { SeededRandom } from '@databox/shared';
import type { SimulationEvent, CorrelationRule } from './eventStream.js';
import { randomHex } from './eventStream.js';

export function applyCorrelations(
  events: SimulationEvent[],
  rules: CorrelationRule[],
  seed: number = 42,
): SimulationEvent[] {
  const rng = createSeededRandom(seed + 7777);
  const correlated: SimulationEvent[] = [];

  for (const event of events) {
    for (const rule of rules) {
      if (event.type !== rule.trigger) continue;
      if (rng.next() > rule.probability) continue;

      let prevTimestamp = new Date(event.timestamp).getTime();
      const correlationId = event.correlationId;

      for (const seqType of rule.sequence) {
        const [minDelay, maxDelay] = rule.delayMs;
        const delay = minDelay + Math.floor(rng.next() * (maxDelay - minDelay));
        prevTimestamp += delay;

        const followUp: SimulationEvent = {
          id: `evt_${randomHex(rng, 12)}`,
          timestamp: new Date(prevTimestamp).toISOString(),
          source: inferSource(seqType),
          type: seqType,
          correlationId,
          sessionId: event.sessionId,
          actor: event.actor,
          payload: buildCorrelatedPayload(seqType, event, rng),
        };

        correlated.push(followUp);
      }
    }
  }

  const all = [...events, ...correlated];
  all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return all;
}

function inferSource(eventType: string): string {
  if (eventType.startsWith('payment') || eventType.startsWith('invoice') || eventType.startsWith('charge')) return 'stripe';
  if (eventType.startsWith('push') || eventType.startsWith('pull_request') || eventType.startsWith('issues')) return 'github';
  if (eventType.startsWith('notification') || eventType.startsWith('email')) return 'notifications';
  if (eventType.startsWith('analytics')) return 'analytics';
  if (eventType.startsWith('http')) return 'api';
  return 'app';
}

function buildCorrelatedPayload(
  type: string,
  trigger: SimulationEvent,
  _rng: SeededRandom,
): Record<string, unknown> {
  switch (type) {
    case 'payment_intent.succeeded':
      return {
        object: 'payment_intent',
        amount: (trigger.payload.amount as number) ?? 4999,
        currency: 'usd',
        status: 'succeeded',
        triggered_by: trigger.type,
      };
    case 'notification.email_sent':
      return {
        template: 'purchase_confirmation',
        to: trigger.actor?.id ?? 'user',
        triggered_by: trigger.type,
      };
    case 'notification.push_sent':
      return {
        title: 'Order confirmed',
        triggered_by: trigger.type,
      };
    case 'analytics.event_tracked':
      return {
        event_name: trigger.type,
        properties: { source: trigger.source },
        triggered_by: trigger.type,
      };
    case 'invoice.paid':
      return {
        object: 'invoice',
        amount_paid: (trigger.payload.amount as number) ?? 0,
        currency: 'usd',
        status: 'paid',
        triggered_by: trigger.type,
      };
    default:
      return {
        triggered_by: trigger.type,
        correlation_source: trigger.id,
      };
  }
}
