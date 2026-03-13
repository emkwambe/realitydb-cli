import type { LifecycleDefinition } from '@databox/shared';

/**
 * Fintech account lifecycle: opened → active → [frozen | closed]
 *
 * States:
 *   active (82%)         - regular transactions
 *   frozen (5%)          - fraud_alert exists, no transactions after freeze
 *   closed (8%)          - settlement completed
 *   pending_review (5%)  - under compliance review
 *
 * Correlations:
 *   Frozen accounts → always have a fraud alert
 *   Closed accounts → always have a completed settlement
 */
export const fintechLifecycle: LifecycleDefinition = {
  entityName: 'account',
  rootTable: 'accounts',
  states: [
    {
      name: 'active',
      weight: 0.82,
      columnValues: {
        status: 'active',
      },
    },
    {
      name: 'frozen',
      weight: 0.05,
      columnValues: {
        status: 'frozen',
      },
    },
    {
      name: 'closed',
      weight: 0.08,
      columnValues: {
        status: 'closed',
      },
    },
    {
      name: 'pending_review',
      weight: 0.05,
      columnValues: {
        status: 'pending_review',
      },
    },
  ],
  transitions: [
    {
      from: 'active',
      to: 'frozen',
      probability: 0.05,
      sideEffects: [
        {
          table: 'fraud_alerts',
          action: 'create',
          values: {
            alert_type: 'unusual_amount',
            severity: 'high',
            status: 'investigating',
          },
        },
      ],
    },
    {
      from: 'active',
      to: 'closed',
      probability: 0.08,
      sideEffects: [
        {
          table: 'settlements',
          action: 'create',
          values: {
            settlement_type: 'standard',
            status: 'completed',
            amount_cents: 0,
          },
        },
      ],
    },
    {
      from: 'active',
      to: 'pending_review',
      probability: 0.05,
      sideEffects: [
        {
          table: 'fraud_alerts',
          action: 'create',
          values: {
            alert_type: 'account_takeover',
            severity: 'critical',
            status: 'open',
          },
        },
      ],
    },
    {
      from: 'frozen',
      to: 'closed',
      probability: 0.30,
      sideEffects: [
        {
          table: 'settlements',
          action: 'create',
          values: {
            settlement_type: 'expedited',
            status: 'completed',
            amount_cents: 0,
          },
        },
      ],
    },
    {
      from: 'pending_review',
      to: 'frozen',
      probability: 0.40,
      sideEffects: [
        {
          table: 'fraud_alerts',
          action: 'update',
          values: {
            status: 'resolved_fraud',
          },
        },
      ],
    },
    {
      from: 'pending_review',
      to: 'active',
      probability: 0.50,
      sideEffects: [
        {
          table: 'fraud_alerts',
          action: 'update',
          values: {
            status: 'resolved_legitimate',
          },
        },
      ],
    },
  ],
  correlations: [
    {
      description: 'Frozen accounts always have at least one fraud alert',
      condition: {
        table: 'accounts',
        column: 'status',
        operator: 'eq',
        value: 'frozen',
      },
      effect: {
        table: 'fraud_alerts',
        column: 'severity',
        values: ['high', 'critical'],
      },
    },
    {
      description: 'Closed accounts always have a completed settlement',
      condition: {
        table: 'accounts',
        column: 'status',
        operator: 'eq',
        value: 'closed',
      },
      effect: {
        table: 'settlements',
        column: 'status',
        values: ['completed'],
      },
    },
  ],
};
