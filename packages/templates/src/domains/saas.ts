import type { DomainTemplate } from '../types.js';

export const saasTemplate: DomainTemplate = {
  name: 'saas',
  version: '2.0',
  description: 'SaaS platform with 10 tables: organizations, users, plans, features, plan_features, subscriptions, invoices, payments, sessions, events',
  targetTables: ['organizations', 'users', 'plans', 'features', 'plan_features', 'subscriptions', 'invoices', 'payments', 'sessions', 'events'],
  tableConfigs: new Map([
    ['organizations', {
      tableName: 'organizations',
      matchPattern: ['organizations', '*org*', 'teams', 'companies', '*team*', '*company*'],
      rowCountMultiplier: 0.3,
      columnOverrides: [
        {
          columnName: 'name',
          strategy: { kind: 'company_name' },
        },
        {
          columnName: 'slug',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'industry',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Media', 'Manufacturing', 'Other'],
              weights: [0.25, 0.12, 0.12, 0.10, 0.10, 0.08, 0.08, 0.15],
            },
          },
        },
        {
          columnName: 'employee_count',
          strategy: { kind: 'integer', options: { min: 1, max: 5000 } },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['users', {
      tableName: 'users',
      matchPattern: ['users', '*user*'],
      rowCountMultiplier: 1.0,
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        {
          columnName: 'full_name',
          matchPattern: ['full_name', 'name', 'display_name'],
          strategy: { kind: 'full_name' },
        },
        {
          columnName: 'role',
          strategy: {
            kind: 'enum',
            options: {
              values: ['owner', 'admin', 'member', 'viewer'],
              weights: [0.05, 0.10, 0.70, 0.15],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'inactive', 'suspended', 'invited'],
              weights: [0.80, 0.08, 0.02, 0.10],
            },
          },
        },
        {
          columnName: 'last_login_at',
          strategy: { kind: 'timestamp', options: { mode: 'recent' } },
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
      rowCountMultiplier: 0.1,
      columnOverrides: [
        {
          columnName: 'name',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Free', 'Starter', 'Professional', 'Business', 'Enterprise'],
              weights: [0.10, 0.30, 0.30, 0.20, 0.10],
            },
          },
        },
        {
          columnName: 'tier',
          strategy: {
            kind: 'enum',
            options: {
              values: ['free', 'starter', 'professional', 'business', 'enterprise'],
              weights: [0.10, 0.30, 0.30, 0.20, 0.10],
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
        {
          columnName: 'trial_days',
          strategy: {
            kind: 'enum',
            options: {
              values: [0, 7, 14, 30],
              weights: [0.20, 0.15, 0.45, 0.20],
            },
          },
        },
        {
          columnName: 'is_active',
          strategy: { kind: 'boolean', options: { trueWeight: 0.90 } },
        },
      ],
    }],
    ['subscriptions', {
      tableName: 'subscriptions',
      matchPattern: ['subscriptions', '*subscription*'],
      rowCountMultiplier: 1.2,
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'trialing', 'past_due', 'canceled', 'paused'],
              weights: [0.60, 0.12, 0.08, 0.15, 0.05],
            },
          },
        },
        {
          columnName: 'trial_ends_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for non-trial subscriptions',
        },
        {
          columnName: 'current_period_start',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'current_period_end',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'started_at',
          matchPattern: ['started_at', 'start_date', 'begins_at'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'canceled_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â should be null for active/trialing subscriptions',
        },
      ],
    }],
    ['invoices', {
      tableName: 'invoices',
      matchPattern: ['invoices', '*invoice*'],
      rowCountMultiplier: 3.0,
      columnOverrides: [
        {
          columnName: 'amount_cents',
          matchPattern: ['amount_cents', 'amount', 'total', 'total_cents'],
          strategy: { kind: 'money', options: { min: 0, max: 500000 } },
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
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['paid', 'open', 'past_due', 'void', 'uncollectible'],
              weights: [0.70, 0.10, 0.08, 0.07, 0.05],
            },
          },
        },
        {
          columnName: 'due_date',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'paid_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for unpaid invoices',
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['payments', {
      tableName: 'payments',
      matchPattern: ['payments', '*payment*'],
      rowCountMultiplier: 3.0,
      columnOverrides: [
        {
          columnName: 'amount_cents',
          matchPattern: ['amount_cents', 'amount', 'total', 'total_cents'],
          strategy: { kind: 'money', options: { min: 999, max: 49999 } },
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
          columnName: 'payment_method',
          strategy: {
            kind: 'enum',
            options: {
              values: ['card', 'bank_transfer', 'paypal', 'wire'],
              weights: [0.65, 0.15, 0.12, 0.08],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['succeeded', 'failed', 'pending', 'refunded'],
              weights: [0.82, 0.08, 0.05, 0.05],
            },
          },
        },
        {
          columnName: 'failure_reason',
          strategy: {
            kind: 'enum',
            options: {
              values: ['card_declined', 'insufficient_funds', 'expired_card', 'processing_error'],
              weights: [0.35, 0.30, 0.20, 0.15],
            },
          },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for successful payments',
        },
        {
          columnName: 'paid_at',
          matchPattern: ['paid_at', 'payment_date', 'charged_at'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['features', {
      tableName: 'features',
      matchPattern: ['features', '*feature*'],
      rowCountMultiplier: 0.02,
      columnOverrides: [
        { columnName: 'name', strategy: { kind: 'text', options: { mode: 'short' } } },
        { columnName: 'category', strategy: { kind: 'enum', options: { values: ['core', 'analytics', 'security', 'integration'], weights: [0.35, 0.25, 0.20, 0.20] } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['plan_features', {
      tableName: 'plan_features',
      matchPattern: ['plan_features', '*plan_feature*'],
      rowCountMultiplier: 0.06,
      columnOverrides: [
        { columnName: 'enabled', strategy: { kind: 'boolean' } },
        { columnName: 'limit_value', strategy: { kind: 'integer', options: { min: 0, max: 10000 } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['sessions', {
      tableName: 'sessions',
      matchPattern: ['sessions', '*session*'],
      rowCountMultiplier: 8.0,
      columnOverrides: [
        { columnName: 'started_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
        { columnName: 'ended_at', strategy: { kind: 'timestamp', options: { mode: 'recent' } } },
        { columnName: 'duration_seconds', strategy: { kind: 'integer', options: { min: 10, max: 14400 } } },
        { columnName: 'ip_address', strategy: { kind: 'text', options: { mode: 'short' } } },
        { columnName: 'user_agent', strategy: { kind: 'text' } },
        { columnName: 'country', strategy: { kind: 'enum', options: { values: ['US', 'UK', 'CA', 'DE', 'FR', 'AU', 'IN', 'BR'], weights: [0.50, 0.10, 0.08, 0.06, 0.05, 0.04, 0.04, 0.03] } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['events', {
      tableName: 'events',
      matchPattern: ['events', '*event*'],
      rowCountMultiplier: 10.0,
      columnOverrides: [
        { columnName: 'event_type', strategy: { kind: 'enum', options: { values: ['page_view', 'button_click', 'api_call', 'feature_use', 'error', 'search'], weights: [0.40, 0.20, 0.15, 0.12, 0.05, 0.08] } } },
        { columnName: 'event_name', strategy: { kind: 'text', options: { mode: 'short' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'recent' } } },
      ],
    }],
  ]),
};
