import type { ColumnSchema, ForeignKeySchema } from '@databox/schema';
import type { ColumnStrategy, ColumnStrategyKind } from '@databox/shared';

/**
 * Enhanced column semantic detection result.
 * Goes beyond basic strategy inference to capture detection confidence and reasoning.
 */
export interface ColumnDetection {
  columnName: string;
  dataType: string;
  detectedKind: ColumnStrategyKind;
  strategy: ColumnStrategy;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  isForeignKey: boolean;
  isPrimaryKey: boolean;
  nullable: boolean;
}

// Column name patterns grouped by semantic type
const PATTERNS: { kind: ColumnStrategyKind; names: string[]; includes: string[]; options?: Record<string, unknown>; confidence: 'high' | 'medium' }[] = [
  { kind: 'email', names: ['email', 'email_address', 'e_mail', 'user_email', 'contact_email'], includes: ['email'], confidence: 'high' },
  { kind: 'first_name', names: ['first_name', 'fname', 'given_name', 'forename'], includes: [], confidence: 'high' },
  { kind: 'last_name', names: ['last_name', 'lname', 'surname', 'family_name'], includes: [], confidence: 'high' },
  { kind: 'phone', names: ['phone', 'phone_number', 'mobile', 'mobile_number', 'cell', 'telephone', 'fax'], includes: ['phone', 'mobile', 'tel_'], confidence: 'high' },
  { kind: 'address', names: ['address', 'street', 'street_address', 'mailing_address', 'billing_address', 'shipping_address'], includes: ['address', 'street'], confidence: 'high' },
  { kind: 'company_name', names: ['company', 'company_name', 'organization', 'org_name', 'employer', 'business_name'], includes: ['company', 'organization'], confidence: 'high' },
];

// Name-based heuristics for less common but detectable patterns
const URL_NAMES = ['url', 'website', 'homepage', 'link', 'href', 'uri', 'website_url', 'profile_url', 'avatar_url', 'image_url', 'photo_url', 'callback_url'];
const URL_INCLUDES = ['_url', 'url_', 'website', 'homepage'];

const IP_NAMES = ['ip', 'ip_address', 'ipv4', 'ipv6', 'remote_ip', 'client_ip', 'source_ip', 'server_ip'];
const IP_INCLUDES = ['_ip', 'ip_'];

const SLUG_NAMES = ['slug', 'url_slug', 'permalink', 'handle', 'alias'];
const USERNAME_NAMES = ['username', 'user_name', 'login', 'screen_name', 'handle', 'nick', 'nickname'];

const COUNTRY_NAMES = ['country', 'country_code', 'country_name', 'nation', 'locale'];
const CURRENCY_NAMES = ['currency', 'currency_code', 'currency_symbol'];

const PERCENTAGE_NAMES = ['percentage', 'percent', 'rate', 'tax_rate', 'discount_rate', 'interest_rate', 'completion_rate'];
const PERCENTAGE_INCLUDES = ['_rate', '_percent', 'pct'];

const RATING_NAMES = ['rating', 'score', 'stars', 'review_score', 'satisfaction'];
const RATING_INCLUDES = ['rating', 'score'];

const MONEY_NAMES = ['amount', 'price', 'cost', 'total', 'subtotal', 'tax', 'fee', 'balance', 'revenue', 'salary', 'wage', 'budget', 'payment_amount', 'refund_amount'];
const MONEY_INCLUDES = ['amount', 'price', 'cost', 'total', '_fee', 'salary', 'wage'];

const STATUS_NAMES = ['status', 'state', 'stage', 'phase', 'lifecycle_state'];
const STATUS_INCLUDES = ['status', '_state'];

const ENUM_NAMES = ['type', 'category', 'kind', 'role', 'tier', 'level', 'plan', 'priority', 'severity', 'gender', 'size'];
const ENUM_INCLUDES = ['_type', '_kind', '_role', '_tier', '_level', '_category'];

const PERSON_LIKE_TABLES = [
  'users', 'user', 'people', 'person', 'contacts', 'contact',
  'members', 'member', 'employees', 'employee', 'customers', 'customer',
  'profiles', 'profile', 'authors', 'author', 'staff', 'agents', 'agent',
];

/**
 * Detects the semantic meaning of a column using enhanced heuristics.
 * Produces a ColumnDetection with confidence level and reasoning.
 */
export function detectColumn(
  column: ColumnSchema,
  tableForeignKeys: ForeignKeySchema[],
  tableName: string,
): ColumnDetection {
  const base = {
    columnName: column.name,
    dataType: column.udtName,
    nullable: column.isNullable,
    isPrimaryKey: column.isPrimaryKey,
    isForeignKey: false,
  };

  // 1. Primary key — skip (handled by engine)
  if (column.isPrimaryKey && column.udtName === 'uuid') {
    return { ...base, detectedKind: 'uuid', strategy: { kind: 'uuid' }, confidence: 'high', reason: 'Primary key UUID column' };
  }

  // 2. Foreign key — highest priority
  const fk = tableForeignKeys.find((f) => f.sourceColumn === column.name);
  if (fk) {
    return { ...base, detectedKind: 'foreign_key', strategy: { kind: 'foreign_key' }, confidence: 'high', reason: `FK → ${fk.targetTable}.${fk.targetColumn}`, isForeignKey: true };
  }

  const name = column.name.toLowerCase();
  const dataType = column.udtName.toLowerCase();

  // 3. Exact/pattern-based semantic detection
  for (const p of PATTERNS) {
    if (p.names.includes(name) || p.includes.some((inc) => name.includes(inc))) {
      return { ...base, detectedKind: p.kind, strategy: { kind: p.kind, options: p.options }, confidence: p.confidence, reason: `Column name matches ${p.kind} pattern` };
    }
  }

  // 4. Full name detection (context-aware)
  if (name === 'full_name' || name === 'display_name' || (name === 'name' && isPersonLikeTable(tableName))) {
    return { ...base, detectedKind: 'full_name', strategy: { kind: 'full_name' }, confidence: 'high', reason: 'Name column on person-like table' };
  }

  // 5. URL detection
  if (URL_NAMES.includes(name) || URL_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'url' } }, confidence: 'high', reason: 'URL/website column' };
  }

  // 6. IP address detection
  if (IP_NAMES.includes(name) || IP_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'ip' } }, confidence: 'high', reason: 'IP address column' };
  }

  // 7. Slug/username detection
  if (SLUG_NAMES.includes(name)) {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'slug' } }, confidence: 'high', reason: 'Slug/permalink column' };
  }
  if (USERNAME_NAMES.includes(name)) {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'username' } }, confidence: 'high', reason: 'Username column' };
  }

  // 8. Country/currency detection
  if (COUNTRY_NAMES.includes(name)) {
    return { ...base, detectedKind: 'enum', strategy: { kind: 'enum', options: { values: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'IN', 'MX'], weights: [0.35, 0.12, 0.08, 0.06, 0.06, 0.05, 0.05, 0.05, 0.05, 0.03] } }, confidence: 'high', reason: 'Country column' };
  }
  if (CURRENCY_NAMES.includes(name)) {
    return { ...base, detectedKind: 'enum', strategy: { kind: 'enum', options: { values: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'], weights: [0.45, 0.20, 0.10, 0.08, 0.07, 0.10] } }, confidence: 'high', reason: 'Currency column' };
  }

  // 9. Money detection
  if (MONEY_NAMES.includes(name) || MONEY_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'money', strategy: { kind: 'money', options: { min: 100, max: 100000 } }, confidence: 'high', reason: 'Monetary amount column' };
  }

  // 10. Percentage/rate detection
  if (PERCENTAGE_NAMES.includes(name) || PERCENTAGE_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'float', strategy: { kind: 'float', options: { min: 0, max: 100 } }, confidence: 'high', reason: 'Percentage/rate column' };
  }

  // 11. Rating/score detection
  if (RATING_NAMES.includes(name) || RATING_INCLUDES.some((inc) => name.includes(inc))) {
    const isInteger = dataType.includes('int');
    if (isInteger) {
      return { ...base, detectedKind: 'integer', strategy: { kind: 'integer', options: { min: 1, max: 5 } }, confidence: 'high', reason: 'Rating/score column (integer)' };
    }
    return { ...base, detectedKind: 'float', strategy: { kind: 'float', options: { min: 0, max: 5 } }, confidence: 'high', reason: 'Rating/score column (decimal)' };
  }

  // 12. Status/enum detection (name-based, sample data will refine)
  if (STATUS_NAMES.includes(name) || STATUS_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'enum', strategy: { kind: 'enum', options: { values: ['active', 'inactive', 'pending'], weights: [0.7, 0.15, 0.15] } }, confidence: 'medium', reason: 'Status column (default values, refine with --sample-size)' };
  }

  if (ENUM_NAMES.includes(name) || ENUM_INCLUDES.some((inc) => name.includes(inc))) {
    return { ...base, detectedKind: 'enum', strategy: { kind: 'enum', options: { values: ['default'], weights: [1.0] } }, confidence: 'low', reason: 'Likely enum column (needs sample data to determine values)' };
  }

  // 13. Data type fallbacks
  if (dataType === 'uuid') {
    return { ...base, detectedKind: 'uuid', strategy: { kind: 'uuid' }, confidence: 'high', reason: 'UUID data type' };
  }

  if (dataType === 'bool' || dataType === 'boolean') {
    return { ...base, detectedKind: 'boolean', strategy: { kind: 'boolean', options: { trueWeight: 0.5 } }, confidence: 'high', reason: 'Boolean data type' };
  }

  if (dataType === 'timestamp' || dataType === 'timestamptz') {
    return { ...base, detectedKind: 'timestamp', strategy: { kind: 'timestamp', options: { mode: 'past' } }, confidence: 'high', reason: 'Timestamp data type' };
  }

  if (dataType === 'date') {
    return { ...base, detectedKind: 'timestamp', strategy: { kind: 'timestamp', options: { mode: 'past' } }, confidence: 'high', reason: 'Date data type' };
  }

  if (['int2', 'int4', 'int8', 'integer', 'serial', 'bigserial', 'smallint', 'bigint'].includes(dataType)) {
    return { ...base, detectedKind: 'integer', strategy: { kind: 'integer', options: { min: 0, max: 10000 } }, confidence: 'medium', reason: 'Integer data type (refine range with sample data)' };
  }

  if (['numeric', 'decimal', 'float4', 'float8', 'float', 'real', 'double precision'].includes(dataType)) {
    return { ...base, detectedKind: 'float', strategy: { kind: 'float', options: { min: 0, max: 10000 } }, confidence: 'medium', reason: 'Float data type (refine range with sample data)' };
  }

  if ((dataType === 'varchar' || dataType === 'text' || dataType === 'char') && column.maxLength !== null && column.maxLength <= 10) {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'short' } }, confidence: 'low', reason: 'Short text column' };
  }

  if (dataType === 'varchar' || dataType === 'text' || dataType === 'char') {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'medium' } }, confidence: 'low', reason: 'Text column' };
  }

  if (dataType === 'jsonb' || dataType === 'json') {
    return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'short' } }, confidence: 'low', reason: 'JSON column (will generate placeholder)' };
  }

  // Ultimate fallback
  return { ...base, detectedKind: 'text', strategy: { kind: 'text', options: { mode: 'short' } }, confidence: 'low', reason: `Unknown type "${dataType}", defaulting to text` };
}

/**
 * Detects all columns in a table.
 */
export function detectTableColumns(
  columns: ColumnSchema[],
  tableForeignKeys: ForeignKeySchema[],
  tableName: string,
): ColumnDetection[] {
  return columns.map((col) => detectColumn(col, tableForeignKeys, tableName));
}

function isPersonLikeTable(tableName: string): boolean {
  return PERSON_LIKE_TABLES.includes(tableName.toLowerCase());
}
