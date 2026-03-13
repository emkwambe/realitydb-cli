import type { LifecycleDefinition } from '@databox/shared';

/**
 * SaaS user lifecycle: signup → trial → active → [churned | renewed | upgraded]
 *
 * States:
 *   trial (12%)   - subscription trialing, no payments
 *   active (65%)  - subscription active, regular payments
 *   churned (10%) - subscription canceled, canceled_at set, last payment failed
 *   past_due (8%) - subscription past_due, last payment failed
 *   paused (5%)   - subscription paused
 *
 * Correlations:
 *   Enterprise plan users → 2x more payments (longer tenure)
 *   Churned users → always have a failed payment before cancel
 */
export const saasLifecycle: LifecycleDefinition = {
  entityName: 'user',
  rootTable: 'users',
  states: [
    {
      name: 'trial',
      weight: 0.12,
      columnValues: {},
    },
    {
      name: 'active',
      weight: 0.65,
      columnValues: {},
    },
    {
      name: 'churned',
      weight: 0.10,
      columnValues: {},
    },
    {
      name: 'past_due',
      weight: 0.08,
      columnValues: {},
    },
    {
      name: 'paused',
      weight: 0.05,
      columnValues: {},
    },
  ],
  transitions: [
    {
      from: 'trial',
      to: 'active',
      probability: 0.60,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'create',
          values: { status: 'active', plan: 'Professional' },
        },
        {
          table: 'payments',
          action: 'create',
          values: { status: 'succeeded', amount_cents: 2999, currency: 'USD' },
        },
      ],
    },
    {
      from: 'trial',
      to: 'churned',
      probability: 0.15,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'create',
          values: { status: 'canceled' },
        },
        {
          table: 'payments',
          action: 'create',
          values: { status: 'failed', amount_cents: 2999, currency: 'USD' },
        },
      ],
    },
    {
      from: 'trial',
      to: 'past_due',
      probability: 0.10,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'create',
          values: { status: 'past_due' },
        },
        {
          table: 'payments',
          action: 'create',
          values: { status: 'failed', amount_cents: 2999, currency: 'USD' },
        },
      ],
    },
    {
      from: 'trial',
      to: 'paused',
      probability: 0.05,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'create',
          values: { status: 'paused' },
        },
      ],
    },
    {
      from: 'active',
      to: 'churned',
      probability: 0.12,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'update',
          values: { status: 'canceled' },
        },
        {
          table: 'payments',
          action: 'create',
          values: { status: 'failed', amount_cents: 2999, currency: 'USD' },
        },
      ],
    },
    {
      from: 'active',
      to: 'past_due',
      probability: 0.08,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'update',
          values: { status: 'past_due' },
        },
        {
          table: 'payments',
          action: 'create',
          values: { status: 'failed', amount_cents: 2999, currency: 'USD' },
        },
      ],
    },
    {
      from: 'active',
      to: 'paused',
      probability: 0.05,
      sideEffects: [
        {
          table: 'subscriptions',
          action: 'update',
          values: { status: 'paused' },
        },
      ],
    },
  ],
  correlations: [
    {
      description: 'Enterprise plan users have 2x more payments (longer tenure)',
      condition: {
        table: 'subscriptions',
        column: 'plan',
        operator: 'eq',
        value: 'Enterprise',
      },
      effect: {
        table: 'payments',
        column: 'amount_cents',
        multiplier: 2,
      },
    },
    {
      description: 'Churned users always have a failed payment before cancel',
      condition: {
        table: 'subscriptions',
        column: 'status',
        operator: 'eq',
        value: 'canceled',
      },
      effect: {
        table: 'payments',
        column: 'status',
        values: ['failed'],
      },
    },
  ],
};
