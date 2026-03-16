import { Table, Relationship, SimulationConfig, RealityTemplate } from './types';

const generateId = () => crypto.randomUUID();

// Helper to create a table with IDs
const createTable = (name: string, x: number, y: number, columns: any[]): Table => {
  const tableId = generateId();
  return {
    id: tableId,
    name,
    position: { x, y },
    columns: columns.map(col => ({
      id: generateId(),
      name: col.name,
      type: col.type,
      isPK: col.isPK || false,
      isFK: col.isFK || false,
      nullable: col.nullable || false,
      strategy: col.strategy,
      options: col.options || {},
    }))
  };
};

export const REALITY_TEMPLATES: RealityTemplate[] = [
  {
    name: 'SaaS Subscription Platform',
    description: 'Complete B2B SaaS model with organizations, users, and subscription lifecycles.',
    category: 'Startup',
    simulation: {
      seed: 42,
      timelineDays: 365,
      growthCurve: 'exponential',
      anomalyRate: 0.05
    },
    tables: [
      createTable('organizations', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'name', type: 'string', strategy: 'company_name' },
        { name: 'plan', type: 'enum', strategy: 'enum', options: { values: ['free', 'pro', 'enterprise'], weights: [60, 30, 10] } },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('users', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'organization_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'email', type: 'email', strategy: 'email' },
        { name: 'full_name', type: 'name', strategy: 'name' },
        { name: 'role', type: 'enum', strategy: 'enum', options: { values: ['admin', 'member', 'viewer'], weights: [10, 70, 20] } },
      ]),
      createTable('subscriptions', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'organization_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { 
          values: ['trial', 'active', 'cancelled'], 
          weights: [15, 75, 10],
          lifecycleRules: [
            { value: 'cancelled', nullFields: ['next_billing_at'] }
          ]
        }},
        { name: 'started_at', type: 'timestamp', strategy: 'past_date' },
        { name: 'next_billing_at', type: 'timestamp', strategy: 'future_date', options: { dependsOn: 'started_at', dependencyRule: 'after' } },
      ]),
      createTable('payments', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'subscription_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'amount', type: 'decimal', strategy: 'decimal', options: { min: 20, max: 500 } },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['succeeded', 'failed', 'refunded'], weights: [95, 4, 1] } },
        { name: 'paid_at', type: 'timestamp', strategy: 'past_date' },
      ])
    ],
    relationships: [] // Will be populated below
  },
  {
    name: 'E-Commerce Marketplace',
    description: 'Relational cascade from customers to shipments and payments.',
    category: 'Commerce',
    simulation: {
      seed: 123,
      timelineDays: 180,
      growthCurve: 's-curve',
      anomalyRate: 0.08
    },
    tables: [
      createTable('customers', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'email', type: 'email', strategy: 'email' },
        { name: 'name', type: 'name', strategy: 'name' },
      ]),
      createTable('products', 900, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'sku', type: 'string', strategy: 'random_string' },
        { name: 'price', type: 'decimal', strategy: 'decimal', options: { min: 10, max: 1000 } },
        { name: 'stock', type: 'integer', strategy: 'integer', options: { min: 0, max: 100 } },
      ]),
      createTable('orders', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'customer_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['pending', 'paid', 'shipped', 'delivered', 'returned'], weights: [5, 20, 30, 40, 5] } },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('order_items', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'order_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'product_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'quantity', type: 'integer', strategy: 'integer', options: { min: 1, max: 5 } },
      ]),
      createTable('shipments', 100, 700, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'order_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'carrier', type: 'enum', strategy: 'enum', options: { values: ['FedEx', 'UPS', 'DHL'] } },
        { name: 'shipped_at', type: 'timestamp', strategy: 'past_date' },
        { name: 'delivered_at', type: 'timestamp', strategy: 'future_date', options: { dependsOn: 'shipped_at', dependencyRule: 'after' } },
      ])
    ],
    relationships: []
  },
  {
    name: 'FinTech Banking',
    description: 'High-integrity financial event streams with fraud detection scenarios.',
    category: 'Finance',
    simulation: {
      seed: 777,
      timelineDays: 90,
      growthCurve: 'linear',
      anomalyRate: 0.12
    },
    tables: [
      createTable('accounts', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'owner_name', type: 'name', strategy: 'name' },
        { name: 'balance', type: 'decimal', strategy: 'decimal', options: { min: 0, max: 100000 } },
        { name: 'type', type: 'enum', strategy: 'enum', options: { values: ['checking', 'savings', 'investment'] } },
      ]),
      createTable('transactions', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'account_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'amount', type: 'decimal', strategy: 'decimal' },
        { name: 'type', type: 'enum', strategy: 'enum', options: { values: ['deposit', 'withdrawal', 'transfer', 'payment'] } },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['pending', 'completed', 'failed', 'reversed'], weights: [5, 90, 3, 2] } },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('fraud_alerts', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'transaction_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'risk_score', type: 'integer', strategy: 'integer', options: { min: 0, max: 100 } },
        { name: 'action_taken', type: 'enum', strategy: 'enum', options: { values: ['none', 'flagged', 'blocked', 'investigated'] } },
      ])
    ],
    relationships: []
  },
  {
    name: 'Logistics & Supply Chain',
    description: 'Global trade system with complex event ordering and operational disruptions.',
    category: 'Operations',
    simulation: {
      seed: 99,
      timelineDays: 180,
      growthCurve: 's-curve',
      anomalyRate: 0.15
    },
    tables: [
      createTable('suppliers', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'name', type: 'string', strategy: 'company_name' },
        { name: 'country', type: 'enum', strategy: 'enum', options: { values: ['China', 'Vietnam', 'Germany', 'USA', 'Mexico'] } },
      ]),
      createTable('purchase_orders', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'supplier_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['draft', 'sent', 'confirmed', 'shipped', 'received', 'cancelled'] } },
        { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('shipments', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'po_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'origin', type: 'string', strategy: 'random_string' },
        { name: 'destination', type: 'string', strategy: 'random_string' },
        { name: 'dispatched_at', type: 'timestamp', strategy: 'past_date' },
        { name: 'delivered_at', type: 'timestamp', strategy: 'future_date', options: { dependsOn: 'dispatched_at', dependencyRule: 'after' } },
      ]),
      createTable('inventory', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'product_name', type: 'string', strategy: 'random_string' },
        { name: 'quantity', type: 'integer', strategy: 'integer', options: { min: 0, max: 10000 } },
        { name: 'warehouse_location', type: 'enum', strategy: 'enum', options: { values: ['North', 'South', 'East', 'West'] } },
      ])
    ],
    relationships: []
  },
  {
    name: 'Healthcare Systems',
    description: 'Multi-stage patient lifecycles and regulatory testing scenarios.',
    category: 'Public Sector',
    simulation: {
      seed: 555,
      timelineDays: 365,
      growthCurve: 'linear',
      anomalyRate: 0.03
    },
    tables: [
      createTable('patients', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'name', type: 'name', strategy: 'name' },
        { name: 'dob', type: 'timestamp', strategy: 'past_date' },
        { name: 'gender', type: 'enum', strategy: 'enum', options: { values: ['M', 'F', 'O'] } },
      ]),
      createTable('appointments', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'patient_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'scheduled_at', type: 'timestamp', strategy: 'future_date' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['scheduled', 'completed', 'cancelled', 'no-show'] } },
      ]),
      createTable('encounters', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'appointment_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'notes', type: 'string', strategy: 'random_string' },
        { name: 'diagnosis_code', type: 'string', strategy: 'random_string' },
      ]),
      createTable('billing', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'encounter_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'amount', type: 'decimal', strategy: 'decimal' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['pending', 'paid', 'denied', 'appealed'] } },
      ])
    ],
    relationships: []
  },
  {
    name: 'Cyber-Security Intelligence',
    description: 'Anomaly-heavy distributions for training threat detection systems.',
    category: 'Security',
    simulation: {
      seed: 1337,
      timelineDays: 30,
      growthCurve: 'exponential',
      anomalyRate: 0.45
    },
    tables: [
      createTable('access_logs', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'ip_address', type: 'string', strategy: 'random_string' },
        { name: 'user_agent', type: 'string', strategy: 'random_string' },
        { name: 'timestamp', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('login_attempts', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'user_id', type: 'string', strategy: 'random_string' },
        { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['success', 'failure', 'mfa_pending'], weights: [60, 35, 5] } },
        { name: 'is_suspicious', type: 'boolean', strategy: 'boolean' },
      ]),
      createTable('security_alerts', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'source_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'severity', type: 'enum', strategy: 'enum', options: { values: ['low', 'medium', 'high', 'critical'], weights: [50, 30, 15, 5] } },
        { name: 'type', type: 'enum', strategy: 'enum', options: { values: ['brute_force', 'sql_injection', 'privilege_escalation', 'malware'] } },
      ])
    ],
    relationships: []
  },
  {
    name: 'AI Event-Stream Systems',
    description: 'Behavioral event streams for ML pipelines and feature stores.',
    category: 'AI',
    simulation: {
      seed: 2024,
      timelineDays: 7,
      growthCurve: 'exponential',
      anomalyRate: 0.02
    },
    tables: [
      createTable('users', 100, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'segment', type: 'enum', strategy: 'enum', options: { values: ['power', 'casual', 'new', 'churned'] } },
      ]),
      createTable('events', 500, 100, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'user_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'event_type', type: 'enum', strategy: 'enum', options: { values: ['page_view', 'click', 'search', 'purchase', 'recommendation_request'] } },
        { name: 'timestamp', type: 'timestamp', strategy: 'past_date' },
      ]),
      createTable('inference_logs', 100, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'request_id', type: 'uuid', isFK: true, strategy: 'uuid' },
        { name: 'model_version', type: 'string', strategy: 'random_string' },
        { name: 'latency_ms', type: 'integer', strategy: 'integer', options: { min: 10, max: 500 } },
        { name: 'prediction', type: 'decimal', strategy: 'decimal' },
      ]),
      createTable('drift_alerts', 500, 400, [
        { name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
        { name: 'model_name', type: 'string', strategy: 'random_string' },
        { name: 'feature_name', type: 'string', strategy: 'random_string' },
        { name: 'drift_score', type: 'decimal', strategy: 'decimal', options: { min: 0, max: 1 } },
      ])
    ],
    relationships: []
  }
];

// Helper to auto-populate relationships based on FK flags
REALITY_TEMPLATES.forEach(template => {
  template.tables.forEach(table => {
    table.columns.forEach(col => {
      if (col.isFK && col.fkTarget) {
        // This is a bit tricky because createTable doesn't know the other table IDs yet
        // So we'll do a second pass to find the target table by name if we use names instead of IDs in createTable
      }
    });
  });
});

// Re-implementing with a more robust ID linking for templates
const populateRelationships = (template: RealityTemplate) => {
  const rels: Relationship[] = [];
  
  template.tables.forEach(targetTable => {
    targetTable.columns.forEach(targetCol => {
      if (targetCol.isFK) {
        // Infer target table from column name
        const prefix = targetCol.name.split('_')[0];
        const possibleNames = [
          prefix + 's',
          prefix + 'es',
          prefix === 'org' ? 'organizations' : '',
          prefix === 'sub' ? 'subscriptions' : '',
          targetCol.name.replace('_id', 's'),
          targetCol.name.replace('_id', 'es')
        ].filter(Boolean);

        const sourceTable = template.tables.find(t => possibleNames.includes(t.name));
        
        if (sourceTable) {
          const sourceCol = sourceTable.columns.find(c => c.isPK);
          if (sourceCol) {
            targetCol.fkTarget = { tableId: sourceTable.id, columnId: sourceCol.id };
            
            // Assign semantic based on target table name
            let semantic: Relationship['semantic'] = 'connection';
            const name = targetTable.name.toLowerCase();
            
            if (name.includes('shipment') || name.includes('payment') || name.includes('billing')) {
              semantic = 'trigger';
            } else if (name.includes('alert') || name.includes('fraud') || name.includes('risk')) {
              semantic = 'risk';
            } else if (name.includes('event') || name.includes('log') || name.includes('activity')) {
              semantic = 'activity';
            } else if (name.includes('item') || name.includes('detail')) {
              semantic = 'connection';
            } else if (name.includes('subscription') || name.includes('enrollment')) {
              semantic = 'lifecycle';
            }

            rels.push({
              id: generateId(),
              sourceTableId: sourceTable.id,
              sourceColumnId: sourceCol.id,
              targetTableId: targetTable.id,
              targetColumnId: targetCol.id,
              type: 'one-to-many',
              semantic
            });
          }
        }
      }
    });
  });
  
  template.relationships = rels;
};

REALITY_TEMPLATES.forEach(populateRelationships);
