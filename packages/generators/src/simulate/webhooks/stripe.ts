import { createSeededRandom } from '@databox/shared';
import type { SeededRandom } from '@databox/shared';
import type { SimulationEvent } from '../eventStream.js';
import { randomHex } from '../eventStream.js';

export type StripeEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'charge.refunded';

export function generateStripeWebhooks(
  count: number,
  seed: number = 42,
  startTime?: string,
): SimulationEvent[] {
  const rng = createSeededRandom(seed);
  const start = startTime ? new Date(startTime).getTime() : Date.now() - 86_400_000;
  const events: SimulationEvent[] = [];

  const weights: Record<StripeEventType, number> = {
    'payment_intent.succeeded': 40,
    'payment_intent.payment_failed': 8,
    'customer.subscription.created': 12,
    'customer.subscription.updated': 10,
    'customer.subscription.deleted': 5,
    'invoice.paid': 20,
    'charge.refunded': 5,
  };
  const entries = Object.entries(weights) as [StripeEventType, number][];
  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);

  for (let i = 0; i < count; i++) {
    const timestamp = start + Math.floor(rng.next() * 86_400_000);

    let roll = rng.next() * totalWeight;
    let eventType: StripeEventType = 'payment_intent.succeeded';
    for (const [type, weight] of entries) {
      roll -= weight;
      if (roll <= 0) {
        eventType = type;
        break;
      }
    }

    const customerId = `cus_${randomHex(rng, 14)}`;
    const event: SimulationEvent = {
      id: `evt_${randomHex(rng, 14)}`,
      timestamp: new Date(timestamp).toISOString(),
      source: 'stripe',
      type: eventType,
      correlationId: `cor_${randomHex(rng, 8)}`,
      actor: { id: customerId, type: 'customer' },
      payload: buildStripePayload(eventType, customerId, rng),
      metadata: {
        api_version: '2024-12-18.acacia',
        livemode: false,
        pending_webhooks: Math.floor(rng.next() * 3),
      },
    };

    events.push(event);
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}

function buildStripePayload(
  type: StripeEventType,
  customerId: string,
  rng: SeededRandom,
): Record<string, unknown> {
  switch (type) {
    case 'payment_intent.succeeded':
      return {
        object: 'payment_intent',
        id: `pi_${randomHex(rng, 14)}`,
        amount: Math.floor(rng.next() * 50000) + 500,
        currency: 'usd',
        status: 'succeeded',
        customer: customerId,
        payment_method: `pm_${randomHex(rng, 14)}`,
        created: Math.floor(Date.now() / 1000),
      };
    case 'payment_intent.payment_failed':
      return {
        object: 'payment_intent',
        id: `pi_${randomHex(rng, 14)}`,
        amount: Math.floor(rng.next() * 30000) + 500,
        currency: 'usd',
        status: 'requires_payment_method',
        customer: customerId,
        last_payment_error: {
          code: rng.next() > 0.5 ? 'card_declined' : 'insufficient_funds',
          message: 'Your card was declined.',
        },
      };
    case 'customer.subscription.created':
      return {
        object: 'subscription',
        id: `sub_${randomHex(rng, 14)}`,
        customer: customerId,
        status: 'active',
        plan: {
          id: `plan_${randomHex(rng, 8)}`,
          amount: [999, 2999, 9999][Math.floor(rng.next() * 3)],
          interval: 'month',
        },
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2_592_000,
      };
    case 'customer.subscription.updated':
      return {
        object: 'subscription',
        id: `sub_${randomHex(rng, 14)}`,
        customer: customerId,
        status: 'active',
        previous_attributes: { plan: { amount: 999 } },
        plan: { amount: 2999, interval: 'month' },
      };
    case 'customer.subscription.deleted':
      return {
        object: 'subscription',
        id: `sub_${randomHex(rng, 14)}`,
        customer: customerId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
        cancellation_details: {
          reason: rng.next() > 0.5 ? 'cancellation_requested' : 'payment_failed',
        },
      };
    case 'invoice.paid':
      return {
        object: 'invoice',
        id: `in_${randomHex(rng, 14)}`,
        customer: customerId,
        amount_paid: Math.floor(rng.next() * 30000) + 999,
        currency: 'usd',
        status: 'paid',
        subscription: `sub_${randomHex(rng, 14)}`,
      };
    case 'charge.refunded':
      return {
        object: 'charge',
        id: `ch_${randomHex(rng, 14)}`,
        customer: customerId,
        amount: Math.floor(rng.next() * 20000) + 500,
        amount_refunded: Math.floor(rng.next() * 10000) + 500,
        currency: 'usd',
        refunded: true,
      };
    default:
      return { object: 'unknown', customer: customerId };
  }
}
