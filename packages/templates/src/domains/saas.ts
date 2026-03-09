import type { DomainTemplate } from '../types.js';

export const saasTemplate: DomainTemplate = {
  name: 'saas',
  version: '1.0',
  description: 'SaaS subscription business with users, plans, and payments',
  targetTables: ['users', 'plans', 'subscriptions', 'payments'],
  tableConfigs: new Map([
    ['users', {
      tableName: 'users',
      matchPattern: ['users', 'accounts', 'customers', '*user*', '*account*'],
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        {
          columnName: 'full_name',
          matchPattern: ['full_name', 'name', 'display_name'],
          strategy: { kind: 'full_name' },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['plans', {
      tableName: 'plans',
      matchPattern: ['plans', 'tiers', 'pricing', '*plan*', '*tier*', '*pricing*'],
      columnOverrides: [
        {
          columnName: 'name',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Starter', 'Professional', 'Business', 'Enterprise'],
              weights: [0.35, 0.35, 0.20, 0.10],
            },
          },
        },
        {
          columnName: 'price_cents',
          matchPattern: ['price_cents', 'price', 'amount_cents'],
          strategy: {
            kind: 'enum',
            options: {
              values: [0, 999, 2999, 4999, 9999, 19999],
              weights: [0.10, 0.25, 0.30, 0.20, 0.10, 0.05],
            },
          },
        },
        {
          columnName: 'interval',
          matchPattern: ['interval', 'billing_interval', 'billing_period'],
          strategy: {
            kind: 'enum',
            options: {
              values: ['monthly', 'yearly'],
              weights: [0.65, 0.35],
            },
          },
        },
      ],
    }],
    ['subscriptions', {
      tableName: 'subscriptions',
      matchPattern: ['subscriptions', '*subscription*'],
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'trialing', 'canceled', 'past_due', 'paused'],
              weights: [0.65, 0.12, 0.10, 0.08, 0.05],
            },
          },
        },
        {
          columnName: 'canceled_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — should be null for active/trialing subscriptions',
        },
      ],
    }],
    ['payments', {
      tableName: 'payments',
      matchPattern: ['payments', 'invoices', 'charges', '*payment*', '*invoice*', '*charge*'],
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['succeeded', 'pending', 'failed', 'refunded'],
              weights: [0.85, 0.05, 0.05, 0.05],
            },
          },
        },
        {
          columnName: 'currency',
          strategy: {
            kind: 'enum',
            options: {
              values: ['USD', 'EUR', 'GBP', 'CAD'],
              weights: [0.60, 0.20, 0.12, 0.08],
            },
          },
        },
        {
          columnName: 'amount_cents',
          matchPattern: ['amount_cents', 'amount', 'total', 'total_cents'],
          strategy: { kind: 'money', options: { min: 999, max: 49999 } },
        },
      ],
    }],
  ]),
};
