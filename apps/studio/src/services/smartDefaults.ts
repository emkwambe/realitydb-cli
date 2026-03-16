import type { DataType } from '../types';

interface ColumnSuggestion {
  name: string;
  type: DataType;
  strategy: string;
  isPK?: boolean;
  nullable?: boolean;
  options?: Record<string, unknown>;
}

const TABLE_SUGGESTIONS: Record<string, ColumnSuggestion[]> = {
  user: [
    { name: 'email', type: 'email', strategy: 'email' },
    { name: 'name', type: 'name', strategy: 'name' },
    { name: 'role', type: 'enum', strategy: 'enum', options: { values: ['admin', 'member', 'viewer'], weights: [10, 70, 20] } },
    { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
  ],
  order: [
    { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], weights: [15, 25, 20, 30, 10] } },
    { name: 'total', type: 'decimal', strategy: 'decimal', options: { min: 10, max: 5000 } },
    { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
  ],
  product: [
    { name: 'name', type: 'name', strategy: 'name' },
    { name: 'price', type: 'decimal', strategy: 'decimal', options: { min: 1, max: 999 } },
    { name: 'sku', type: 'string', strategy: 'random_string' },
    { name: 'stock', type: 'integer', strategy: 'integer', options: { min: 0, max: 500 } },
  ],
  payment: [
    { name: 'amount', type: 'decimal', strategy: 'decimal', options: { min: 1, max: 10000 } },
    { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['pending', 'completed', 'failed', 'refunded'], weights: [15, 60, 10, 15] } },
    { name: 'method', type: 'enum', strategy: 'enum', options: { values: ['card', 'bank_transfer', 'paypal', 'crypto'], weights: [50, 25, 20, 5] } },
    { name: 'paid_at', type: 'timestamp', strategy: 'past_date', nullable: true },
  ],
  event: [
    { name: 'type', type: 'enum', strategy: 'enum', options: { values: ['click', 'view', 'purchase', 'signup'], weights: [40, 30, 15, 15] } },
    { name: 'payload', type: 'string', strategy: 'random_string' },
    { name: 'timestamp', type: 'timestamp', strategy: 'past_date' },
  ],
  log: [
    { name: 'type', type: 'enum', strategy: 'enum', options: { values: ['info', 'warn', 'error', 'debug'], weights: [50, 20, 15, 15] } },
    { name: 'payload', type: 'string', strategy: 'random_string' },
    { name: 'timestamp', type: 'timestamp', strategy: 'past_date' },
  ],
};

const DEFAULT_SUGGESTIONS: ColumnSuggestion[] = [
  { name: 'name', type: 'string', strategy: 'random_string' },
  { name: 'status', type: 'enum', strategy: 'enum', options: { values: ['active', 'inactive', 'pending'], weights: [60, 20, 20] } },
  { name: 'created_at', type: 'timestamp', strategy: 'past_date' },
];

/** Column strategy auto-suggestion based on column name */
const NAME_STRATEGY_MAP: Record<string, { type: DataType; strategy: string; options?: Record<string, unknown> }> = {
  email: { type: 'email', strategy: 'email' },
  name: { type: 'name', strategy: 'name' },
  full_name: { type: 'name', strategy: 'name' },
  first_name: { type: 'name', strategy: 'name' },
  last_name: { type: 'name', strategy: 'name' },
  phone: { type: 'phone', strategy: 'phone' },
  amount: { type: 'decimal', strategy: 'decimal', options: { min: 1, max: 10000 } },
  price: { type: 'decimal', strategy: 'decimal', options: { min: 1, max: 999 } },
  total: { type: 'decimal', strategy: 'decimal', options: { min: 1, max: 5000 } },
  cost: { type: 'decimal', strategy: 'decimal', options: { min: 1, max: 5000 } },
  status: { type: 'enum', strategy: 'enum', options: { values: ['active', 'inactive', 'pending'], weights: [60, 20, 20] } },
  role: { type: 'enum', strategy: 'enum', options: { values: ['admin', 'member', 'viewer'], weights: [10, 70, 20] } },
  type: { type: 'enum', strategy: 'enum', options: { values: ['type_a', 'type_b', 'type_c'], weights: [40, 35, 25] } },
  created_at: { type: 'timestamp', strategy: 'past_date' },
  updated_at: { type: 'timestamp', strategy: 'past_date' },
  deleted_at: { type: 'timestamp', strategy: 'past_date' },
};

export function getSuggestedColumns(tableName: string): ColumnSuggestion[] {
  const lower = tableName.toLowerCase();
  for (const [key, suggestions] of Object.entries(TABLE_SUGGESTIONS)) {
    if (lower.includes(key)) return suggestions;
  }
  return DEFAULT_SUGGESTIONS;
}

export function inferColumnDefaults(columnName: string): { type: DataType; strategy: string; options?: Record<string, unknown> } | null {
  const lower = columnName.toLowerCase();
  if (NAME_STRATEGY_MAP[lower]) return NAME_STRATEGY_MAP[lower];
  // Partial matching for common suffixes
  if (lower.endsWith('_at') || lower.endsWith('_date')) return { type: 'timestamp', strategy: 'past_date' };
  if (lower.endsWith('_id')) return { type: 'uuid', strategy: 'uuid' };
  if (lower.includes('email')) return { type: 'email', strategy: 'email' };
  if (lower.includes('phone')) return { type: 'phone', strategy: 'phone' };
  if (lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('total')) {
    return { type: 'decimal', strategy: 'decimal', options: { min: 1, max: 5000 } };
  }
  return null;
}
