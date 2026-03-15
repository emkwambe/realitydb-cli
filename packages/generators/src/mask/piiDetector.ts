import type { ColumnSchema, ForeignKeySchema } from '@databox/schema';

/**
 * PII classification for a column.
 */
export type PIICategory =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'date_of_birth'
  | 'ssn'
  | 'ip_address'
  | 'username'
  | 'url'
  | 'free_text'
  | 'financial'
  | 'medical'
  | 'quasi_identifier'
  | 'drivers_license'
  | 'passport'
  | 'student_id'
  | 'case_number'
  | 'vin'
  | 'bank_routing'
  | 'safe';

export type ComplianceMode = 'hipaa' | 'gdpr' | 'strict';

/**
 * Detection result for a single column.
 */
export interface PIIDetection {
  columnName: string;
  dataType: string;
  category: PIICategory;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  shouldMask: boolean;
  maskStrategy: MaskStrategy;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export type MaskStrategy =
  | 'replace_name'
  | 'replace_email'
  | 'replace_phone'
  | 'replace_address'
  | 'replace_username'
  | 'replace_ip'
  | 'replace_url'
  | 'replace_ssn'
  | 'shift_date'
  | 'generalize_numeric'
  | 'replace_text'
  | 'redact'
  | 'preserve';

// PII column name patterns
const NAME_PATTERNS = ['first_name', 'fname', 'given_name', 'last_name', 'lname', 'surname', 'family_name', 'full_name', 'display_name', 'middle_name'];
const NAME_INCLUDES = ['_name'];
const PERSON_TABLES = ['users', 'user', 'people', 'person', 'contacts', 'contact', 'members', 'member', 'employees', 'employee', 'customers', 'customer', 'patients', 'patient', 'profiles', 'profile', 'staff'];

const EMAIL_PATTERNS = ['email', 'email_address', 'e_mail', 'user_email', 'contact_email'];
const PHONE_PATTERNS = ['phone', 'phone_number', 'mobile', 'mobile_number', 'cell', 'telephone', 'fax', 'home_phone', 'work_phone'];
const ADDRESS_PATTERNS = ['address', 'street', 'street_address', 'city', 'state', 'zip', 'zip_code', 'postal_code', 'mailing_address', 'billing_address', 'shipping_address'];
const SSN_PATTERNS = ['ssn', 'social_security', 'tax_id', 'national_id', 'sin', 'nin'];
const DOB_PATTERNS = ['date_of_birth', 'dob', 'birth_date', 'birthday', 'birthdate'];
const IP_PATTERNS = ['ip', 'ip_address', 'ipv4', 'ipv6', 'remote_ip', 'client_ip', 'source_ip'];
const USERNAME_PATTERNS = ['username', 'user_name', 'login', 'screen_name', 'handle', 'nickname'];
const URL_PATTERNS = ['url', 'website', 'homepage', 'profile_url', 'avatar_url', 'photo_url', 'image_url'];

// Medical (HIPAA-specific)
const MEDICAL_PATTERNS = ['diagnosis', 'condition', 'medication', 'prescription', 'treatment', 'medical_record', 'mrn', 'insurance_id', 'policy_number'];

// Financial
const FINANCIAL_PATTERNS = ['account_number', 'routing_number', 'card_number', 'credit_card', 'iban', 'swift', 'bank_account'];

// Quasi-identifiers (not PII alone but combinable)
const QUASI_PATTERNS = ['age', 'gender', 'ethnicity', 'race', 'marital_status', 'income', 'salary', 'occupation', 'employer'];

/**
 * Detects PII in a column based on compliance mode.
 */
export function detectPII(
  column: ColumnSchema,
  tableForeignKeys: ForeignKeySchema[],
  tableName: string,
  mode: ComplianceMode,
): PIIDetection {
  const base = {
    columnName: column.name,
    dataType: column.udtName,
    isPrimaryKey: column.isPrimaryKey,
    isForeignKey: false,
  };

  // Primary keys are never masked (needed for integrity)
  if (column.isPrimaryKey) {
    return { ...base, category: 'safe', confidence: 'high', reason: 'Primary key', shouldMask: false, maskStrategy: 'preserve' };
  }

  // Foreign keys are never masked (preserves referential integrity)
  const fk = tableForeignKeys.find((f) => f.sourceColumn === column.name);
  if (fk) {
    return { ...base, category: 'safe', confidence: 'high', reason: `FK → ${fk.targetTable}.${fk.targetColumn}`, shouldMask: false, maskStrategy: 'preserve', isForeignKey: true };
  }

  const name = column.name.toLowerCase();
  const isPersonTable = PERSON_TABLES.includes(tableName.toLowerCase());

  // Direct PII detection
  if (EMAIL_PATTERNS.includes(name) || name.includes('email')) {
    return { ...base, category: 'email', confidence: 'high', reason: 'Email column', shouldMask: true, maskStrategy: 'replace_email' };
  }

  if (NAME_PATTERNS.includes(name)) {
    return { ...base, category: 'name', confidence: 'high', reason: 'Name column', shouldMask: true, maskStrategy: 'replace_name' };
  }

  // "name" on a person table
  if (name === 'name' && isPersonTable) {
    return { ...base, category: 'name', confidence: 'high', reason: 'Name column on person table', shouldMask: true, maskStrategy: 'replace_name' };
  }

  // Name includes (but not on non-person contexts like "table_name", "product_name")
  if (NAME_INCLUDES.some((p) => name.includes(p)) && isPersonTable) {
    return { ...base, category: 'name', confidence: 'medium', reason: 'Likely name column on person table', shouldMask: true, maskStrategy: 'replace_name' };
  }

  if (PHONE_PATTERNS.includes(name) || name.includes('phone') || name.includes('mobile')) {
    return { ...base, category: 'phone', confidence: 'high', reason: 'Phone column', shouldMask: true, maskStrategy: 'replace_phone' };
  }

  if (ADDRESS_PATTERNS.includes(name) || name.includes('address') || name.includes('street')) {
    return { ...base, category: 'address', confidence: 'high', reason: 'Address column', shouldMask: true, maskStrategy: 'replace_address' };
  }

  if (SSN_PATTERNS.includes(name)) {
    return { ...base, category: 'ssn', confidence: 'high', reason: 'SSN/National ID column', shouldMask: true, maskStrategy: 'replace_ssn' };
  }

  if (DOB_PATTERNS.includes(name)) {
    return { ...base, category: 'date_of_birth', confidence: 'high', reason: 'Date of birth column', shouldMask: true, maskStrategy: 'shift_date' };
  }

  if (IP_PATTERNS.includes(name) || name.includes('_ip')) {
    return { ...base, category: 'ip_address', confidence: 'high', reason: 'IP address column', shouldMask: true, maskStrategy: 'replace_ip' };
  }

  if (USERNAME_PATTERNS.includes(name)) {
    return { ...base, category: 'username', confidence: 'high', reason: 'Username column', shouldMask: true, maskStrategy: 'replace_username' };
  }

  if (URL_PATTERNS.includes(name) || name.includes('_url')) {
    return { ...base, category: 'url', confidence: 'medium', reason: 'URL column', shouldMask: mode !== 'hipaa', maskStrategy: mode !== 'hipaa' ? 'replace_url' : 'preserve' };
  }

  // HIPAA: medical columns
  if (mode === 'hipaa' || mode === 'strict') {
    if (MEDICAL_PATTERNS.includes(name) || name.includes('diagnos') || name.includes('medic') || name.includes('prescri')) {
      return { ...base, category: 'medical', confidence: 'high', reason: 'Medical/health column (HIPAA)', shouldMask: true, maskStrategy: 'redact' };
    }
  }

  // Financial identifiers
  if (FINANCIAL_PATTERNS.includes(name) || name.includes('card_') || name.includes('account_num')) {
    return { ...base, category: 'financial', confidence: 'high', reason: 'Financial identifier', shouldMask: true, maskStrategy: 'replace_ssn' };
  }

  // Quasi-identifiers: mask in strict mode, flag in others
  if (QUASI_PATTERNS.includes(name)) {
    const shouldMask = mode === 'strict';
    return { ...base, category: 'quasi_identifier', confidence: 'medium', reason: 'Quasi-identifier (combinable for re-identification)', shouldMask, maskStrategy: shouldMask ? 'generalize_numeric' : 'preserve' };
  }

  // GDPR/strict: free text columns could contain PII
  if (mode === 'strict' || mode === 'gdpr') {
    const dt = column.udtName.toLowerCase();
    if ((dt === 'text' || dt === 'varchar') && column.maxLength !== null && column.maxLength > 100) {
      // Long text fields might contain embedded PII
      if (name.includes('note') || name.includes('comment') || name.includes('description') || name.includes('bio') || name.includes('about') || name.includes('message')) {
        return { ...base, category: 'free_text', confidence: 'medium', reason: 'Free text field may contain PII', shouldMask: true, maskStrategy: 'replace_text' };
      }
    }
  }

  return { ...base, category: 'safe', confidence: 'high', reason: 'No PII detected', shouldMask: false, maskStrategy: 'preserve' };
}

/**
 * Detects PII across all columns in a table.
 */
export function detectTablePII(
  columns: ColumnSchema[],
  tableForeignKeys: ForeignKeySchema[],
  tableName: string,
  mode: ComplianceMode,
): PIIDetection[] {
  return columns.map((col) => detectPII(col, tableForeignKeys, tableName, mode));
}
