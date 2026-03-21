import type { DomainTemplate } from '../types.js';

export const fintechTemplate: DomainTemplate = {
  name: 'fintech',
  version: '2.0',
  description: 'Financial services with accounts, transactions, fraud alerts, settlements, and chargebacks',
  targetTables: ['accounts', 'transactions', 'fraud_alerts', 'settlements', 'chargebacks', 'transfers', 'cards', 'authorizations', 'fraud_investigations', 'compliance_checks'],
  tableConfigs: new Map([
    ['accounts', {
      tableName: 'accounts',
      matchPattern: ['accounts', '*account*'],
      rowCountMultiplier: 1.0,
      columnOverrides: [
        {
          columnName: 'account_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['checking', 'savings', 'investment', 'credit', 'business'],
              weights: [0.35, 0.25, 0.15, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'balance_cents',
          strategy: { kind: 'money', options: { min: 0, max: 5000000 } },
        },
        {
          columnName: 'currency',
          strategy: {
            kind: 'enum',
            options: {
              values: ['USD', 'EUR', 'GBP', 'CAD', 'JPY'],
              weights: [0.55, 0.20, 0.10, 0.08, 0.07],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'frozen', 'closed', 'pending_review'],
              weights: [0.82, 0.05, 0.08, 0.05],
            },
          },
        },
        {
          columnName: 'owner_name',
          strategy: { kind: 'full_name' },
        },
        {
          columnName: 'email',
          strategy: { kind: 'email' },
        },
        {
          columnName: 'phone',
          strategy: { kind: 'phone' },
        },
        {
          columnName: 'account_number',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'routing_number',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'opened_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'closed_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for active accounts',
        },
      ],
    }],
    ['transactions', {
      tableName: 'transactions',
      matchPattern: ['transactions', '*transaction*', '*transfer*'],
      rowCountMultiplier: 5.0,
      columnOverrides: [
        {
          columnName: 'transaction_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['deposit', 'withdrawal', 'transfer', 'payment', 'refund', 'fee'],
              weights: [0.25, 0.20, 0.20, 0.20, 0.10, 0.05],
            },
          },
        },
        {
          columnName: 'amount_cents',
          strategy: { kind: 'money', options: { min: 100, max: 500000 } },
        },
        {
          columnName: 'fee_cents',
          strategy: { kind: 'money', options: { min: 0, max: 5000 } },
        },
        {
          columnName: 'currency',
          strategy: {
            kind: 'enum',
            options: {
              values: ['USD', 'EUR', 'GBP', 'CAD', 'JPY'],
              weights: [0.55, 0.20, 0.10, 0.08, 0.07],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['completed', 'pending', 'failed', 'reversed', 'held'],
              weights: [0.78, 0.08, 0.05, 0.04, 0.05],
            },
          },
        },
        {
          columnName: 'description',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'counterparty_name',
          strategy: { kind: 'company_name' },
        },
        {
          columnName: 'category',
          strategy: {
            kind: 'enum',
            options: {
              values: ['groceries', 'restaurants', 'transportation', 'entertainment', 'utilities', 'healthcare', 'shopping', 'travel', 'education', 'transfer', 'salary', 'investment'],
              weights: [0.12, 0.10, 0.08, 0.08, 0.07, 0.06, 0.10, 0.05, 0.04, 0.12, 0.10, 0.08],
            },
          },
        },
        {
          columnName: 'reference_id',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['fraud_alerts', {
      tableName: 'fraud_alerts',
      matchPattern: ['fraud_alerts', '*fraud*', '*alert*'],
      rowCountMultiplier: 0.3,
      columnOverrides: [
        {
          columnName: 'alert_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['unusual_amount', 'velocity_check', 'geo_mismatch', 'duplicate_transaction', 'account_takeover'],
              weights: [0.30, 0.25, 0.20, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'severity',
          strategy: {
            kind: 'enum',
            options: {
              values: ['low', 'medium', 'high', 'critical'],
              weights: [0.20, 0.40, 0.30, 0.10],
            },
          },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['open', 'investigating', 'resolved_fraud', 'resolved_legitimate', 'escalated'],
              weights: [0.25, 0.20, 0.30, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'description',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'resolved_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for open/investigating alerts',
        },
      ],
    }],
    ['settlements', {
      tableName: 'settlements',
      matchPattern: ['settlements', '*settlement*'],
      rowCountMultiplier: 1.5,
      columnOverrides: [
        {
          columnName: 'settlement_type',
          strategy: {
            kind: 'enum',
            options: {
              values: ['standard', 'expedited', 'batch', 'real_time'],
              weights: [0.50, 0.20, 0.20, 0.10],
            },
          },
        },
        {
          columnName: 'amount_cents',
          strategy: { kind: 'money', options: { min: 100, max: 500000 } },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['pending', 'processing', 'completed', 'failed'],
              weights: [0.15, 0.10, 0.70, 0.05],
            },
          },
        },
        {
          columnName: 'settled_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for pending settlements',
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['chargebacks', {
      tableName: 'chargebacks',
      matchPattern: ['chargebacks', '*chargeback*', '*dispute*'],
      rowCountMultiplier: 0.2,
      columnOverrides: [
        {
          columnName: 'reason',
          strategy: {
            kind: 'enum',
            options: {
              values: ['unauthorized', 'product_not_received', 'product_defective', 'duplicate_charge', 'subscription_canceled', 'other'],
              weights: [0.25, 0.20, 0.15, 0.15, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'amount_cents',
          strategy: { kind: 'money', options: { min: 500, max: 200000 } },
        },
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['open', 'under_review', 'won', 'lost', 'expired'],
              weights: [0.20, 0.25, 0.30, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'filed_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'resolved_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â null for open/under_review chargebacks',
        },
      ],
    }],
    ['transfers', {
      tableName: 'transfers',
      matchPattern: ['transfers', '*transfer*'],
      rowCountMultiplier: 5.0,
      columnOverrides: [
        { columnName: 'amount_cents', strategy: { kind: 'integer', options: { min: 100, max: 5000000 } } },
        { columnName: 'status', strategy: { kind: 'enum', options: { values: ['completed', 'pending', 'failed', 'cancelled'], weights: [0.75, 0.12, 0.08, 0.05] } } },
        { columnName: 'reference', strategy: { kind: 'text', options: { mode: 'short' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['cards', {
      tableName: 'cards',
      matchPattern: ['cards', '*card*'],
      rowCountMultiplier: 2.5,
      columnOverrides: [
        { columnName: 'card_number_last_four', strategy: { kind: 'text', options: { mode: 'short' } } },
        { columnName: 'card_type', strategy: { kind: 'enum', options: { values: ['debit', 'credit'], weights: [0.60, 0.40] } } },
        { columnName: 'status', strategy: { kind: 'enum', options: { values: ['active', 'blocked', 'expired', 'cancelled'], weights: [0.75, 0.08, 0.12, 0.05] } } },
        { columnName: 'daily_limit_cents', strategy: { kind: 'integer', options: { min: 50000, max: 1000000 } } },
        { columnName: 'expires_at', strategy: { kind: 'timestamp', options: { mode: 'recent' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['authorizations', {
      tableName: 'authorizations',
      matchPattern: ['authorizations', '*authorization*', '*auth*'],
      rowCountMultiplier: 8.0,
      columnOverrides: [
        { columnName: 'merchant_name', strategy: { kind: 'company_name' } },
        { columnName: 'amount_cents', strategy: { kind: 'integer', options: { min: 100, max: 500000 } } },
        { columnName: 'status', strategy: { kind: 'enum', options: { values: ['approved', 'declined', 'reversed'], weights: [0.85, 0.10, 0.05] } } },
        { columnName: 'decline_reason', strategy: { kind: 'enum', options: { values: ['insufficient_funds', 'card_blocked', 'suspicious_activity', 'expired_card', 'limit_exceeded'], weights: [0.30, 0.20, 0.25, 0.10, 0.15] } } },
        { columnName: 'authorized_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['fraud_investigations', {
      tableName: 'fraud_investigations',
      matchPattern: ['fraud_investigations', '*investigation*'],
      rowCountMultiplier: 0.2,
      columnOverrides: [
        { columnName: 'investigator_notes', strategy: { kind: 'text' } },
        { columnName: 'outcome', strategy: { kind: 'enum', options: { values: ['confirmed_fraud', 'false_positive', 'inconclusive'], weights: [0.30, 0.50, 0.20] } } },
        { columnName: 'amount_recovered_cents', strategy: { kind: 'integer', options: { min: 0, max: 500000 } } },
        { columnName: 'closed_at', strategy: { kind: 'timestamp', options: { mode: 'recent' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
    ['compliance_checks', {
      tableName: 'compliance_checks',
      matchPattern: ['compliance_checks', '*compliance*'],
      rowCountMultiplier: 2.0,
      columnOverrides: [
        { columnName: 'check_type', strategy: { kind: 'enum', options: { values: ['kyc_verification', 'aml_screening', 'pep_check', 'sanctions_check'], weights: [0.35, 0.30, 0.20, 0.15] } } },
        { columnName: 'result', strategy: { kind: 'enum', options: { values: ['pass', 'fail', 'review_needed'], weights: [0.70, 0.10, 0.20] } } },
        { columnName: 'notes', strategy: { kind: 'text' } },
        { columnName: 'performed_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
        { columnName: 'created_at', strategy: { kind: 'timestamp', options: { mode: 'past' } } },
      ],
    }],
  ]),
};
