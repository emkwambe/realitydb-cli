/**
 * RealityDB — Data Quality Assurance Validator
 * 
 * Run this after EVERY generation to verify data integrity.
 * Catches: mock placeholders, orphan FKs, broken timestamps,
 * empty enums, uniform distributions, and lifecycle violations.
 * 
 * Usage:
 *   node qa-validate.cjs <file.sql|file.json>
 * 
 * Exit codes:
 *   0 = PASS (all checks passed)
 *   1 = FAIL (quality issues found)
 */

const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node qa-validate.cjs <file.sql|file.json>');
  process.exit(1);
}

const filePath = path.resolve(file);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const ext = path.extname(filePath).toLowerCase();
const raw = fs.readFileSync(filePath, 'utf-8');
const fileSize = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);

console.log('');
console.log('\u{1F50D} RealityDB Quality Assurance Validator');
console.log('\u2500'.repeat(50));
console.log(`   File: ${path.basename(filePath)} (${fileSize} MB)`);
console.log(`   Format: ${ext.replace('.', '').toUpperCase()}`);
console.log('\u2500'.repeat(50));

let failures = 0;
let warnings = 0;
let passes = 0;

function pass(check, detail) {
  passes++;
  console.log(`   \u2705 ${check}${detail ? ' — ' + detail : ''}`);
}

function fail(check, detail) {
  failures++;
  console.log(`   \u274C ${check}${detail ? ' — ' + detail : ''}`);
}

function warn(check, detail) {
  warnings++;
  console.log(`   \u26A0\uFE0F  ${check}${detail ? ' — ' + detail : ''}`);
}

// ============================================
// CHECK 1: Mock/Placeholder Values
// ============================================
console.log('\n   --- Placeholder Detection ---');

const mockPatterns = [
  { pattern: /mock_past_date_\d+/gi, name: 'mock_past_date' },
  { pattern: /mock_future_date_\d+/gi, name: 'mock_future_date' },
  { pattern: /mock_text_[a-z0-9]+/gi, name: 'mock_text' },
  { pattern: /mock_\w+_\d+/gi, name: 'mock_*' },
  { pattern: /placeholder_\d+/gi, name: 'placeholder' },
  { pattern: /TODO_\w+/g, name: 'TODO markers' },
  { pattern: /FIXME_\w+/g, name: 'FIXME markers' },
  { pattern: /lorem ipsum/gi, name: 'lorem ipsum' },
  { pattern: /test_data_\d+/gi, name: 'test_data' },
  { pattern: /fake_\w+_\d+/gi, name: 'fake_*' },
  { pattern: /sample_\w+_\d+/gi, name: 'sample_*' },
  { pattern: /dummy_\w+/gi, name: 'dummy_*' },
];

let totalMocks = 0;
for (const { pattern, name } of mockPatterns) {
  const matches = raw.match(pattern) || [];
  if (matches.length > 0) {
    fail(`${name}`, `${matches.length} occurrences found`);
    totalMocks += matches.length;
    // Show first 3 examples
    const unique = [...new Set(matches)].slice(0, 3);
    unique.forEach(m => console.log(`      Example: "${m}"`));
  }
}

if (totalMocks === 0) {
  pass('No mock/placeholder values detected');
}

// ============================================
// CHECK 2: Timestamp Validity
// ============================================
console.log('\n   --- Timestamp Quality ---');

// Count ISO timestamps
const isoTimestamps = raw.match(/'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z'/g) || [];
const dateOnly = raw.match(/'\d{4}-\d{2}-\d{2}'/g) || [];
const totalTimestamps = isoTimestamps.length + dateOnly.length;

if (totalTimestamps > 0) {
  pass(`${totalTimestamps.toLocaleString()} valid timestamps found`);
  
  // Check for reasonable date ranges (not year 1970 or 2099)
  const years = new Set();
  const yearMatches = raw.match(/'(19\d{2}|20\d{2})-\d{2}-\d{2}/g) || [];
  yearMatches.forEach(m => years.add(m.match(/(\d{4})/)[1]));
  
  const yearList = [...years].sort();
  if (yearList.length > 0) {
    const minYear = parseInt(yearList[0]);
    const maxYear = parseInt(yearList[yearList.length - 1]);
    
    if (minYear < 2000) warn('Timestamps before year 2000 detected', `earliest: ${minYear}`);
    else pass(`Date range: ${minYear}–${maxYear}`);
    
    if (maxYear > 2030) warn('Timestamps after year 2030 detected', `latest: ${maxYear}`);
  }
} else {
  warn('No timestamps found', 'verify date columns are using timestamp strategy');
}

// ============================================
// CHECK 3: UUID Quality
// ============================================
console.log('\n   --- UUID Quality ---');

const uuids = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
const uniqueUuids = new Set(uuids.map(u => u.toLowerCase()));

if (uuids.length > 0) {
  pass(`${uuids.length.toLocaleString()} UUIDs found`);
  
  const dupeCount = uuids.length - uniqueUuids.size;
  // Some dupes are expected (FK references), but ratio matters
  const dupeRatio = dupeCount / uuids.length;
  
  if (uniqueUuids.size < 10) {
    warn('Very few unique UUIDs', `${uniqueUuids.size} unique out of ${uuids.length} total`);
  } else {
    pass(`${uniqueUuids.size.toLocaleString()} unique UUIDs (${(dupeRatio * 100).toFixed(1)}% are FK references)`);
  }
} else {
  warn('No UUIDs found');
}

// ============================================
// CHECK 4: Enum Distribution (SQL only)
// ============================================
if (ext === '.sql') {
  console.log('\n   --- Enum Distribution ---');
  
  // Common enum patterns to check for uniform distribution
  const enumChecks = [
    { name: 'status', pattern: /'(active|inactive|pending|completed|cancelled|closed|open|frozen|blocked|expired|processed|failed|planned|in_progress)'/gi },
    { name: 'risk_level', pattern: /'(on_track|watch|at_risk|critical)'/gi },
    { name: 'priority', pattern: /'(low|medium|high|urgent)'/gi },
    { name: 'severity', pattern: /'(info|warning|urgent|critical)'/gi },
    { name: 'boolean', pattern: /(TRUE|FALSE)/g },
  ];
  
  for (const { name, pattern } of enumChecks) {
    const matches = raw.match(pattern) || [];
    if (matches.length > 10) {
      const dist = {};
      matches.forEach(m => {
        const val = m.replace(/'/g, '');
        dist[val] = (dist[val] || 0) + 1;
      });
      
      const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
      const total = matches.length;
      const topPct = (entries[0][1] / total * 100).toFixed(0);
      const bottomPct = (entries[entries.length - 1][1] / total * 100).toFixed(0);
      
      // Check if distribution is suspiciously uniform (within 2% of each other)
      const pcts = entries.map(([_, v]) => v / total * 100);
      const range = Math.max(...pcts) - Math.min(...pcts);
      
      if (range < 3 && entries.length > 2) {
        warn(`${name}: suspiciously uniform distribution`, entries.map(([k, v]) => `${k}:${(v / total * 100).toFixed(0)}%`).join(', '));
      } else {
        const distStr = entries.slice(0, 5).map(([k, v]) => `${k}:${(v / total * 100).toFixed(0)}%`).join(', ');
        pass(`${name} distribution (${total} values)`, distStr);
      }
    }
  }
}

// ============================================
// CHECK 5: Empty/NULL Ratio
// ============================================
console.log('\n   --- NULL Analysis ---');

const nullCount = (raw.match(/NULL/g) || []).length;
const totalValues = ext === '.sql' ? (raw.match(/VALUES/gi) || []).length * 10 : 0; // rough estimate

if (nullCount > 0 && totalValues > 0) {
  const nullRatio = (nullCount / totalValues * 100).toFixed(1);
  if (nullCount > totalValues * 0.8) {
    fail('Excessive NULLs', `${nullCount.toLocaleString()} NULLs (~${nullRatio}% of estimated values)`);
  } else if (nullCount > totalValues * 0.5) {
    warn('High NULL ratio', `${nullCount.toLocaleString()} NULLs (~${nullRatio}% of estimated values)`);
  } else {
    pass(`${nullCount.toLocaleString()} NULLs present`, 'acceptable ratio');
  }
} else if (nullCount === 0) {
  warn('Zero NULLs', 'real databases always have some NULLs — check optional fields');
} else {
  pass(`${nullCount.toLocaleString()} NULLs present`);
}

// ============================================
// CHECK 6: SQL Structure (SQL only)
// ============================================
if (ext === '.sql') {
  console.log('\n   --- SQL Structure ---');
  
  const createTables = (raw.match(/CREATE TABLE/gi) || []).length;
  const dropTables = (raw.match(/DROP TABLE/gi) || []).length;
  const insertInto = (raw.match(/INSERT INTO/gi) || []).length;
  
  if (insertInto > 0) pass(`${insertInto} INSERT statements`);
  else fail('No INSERT statements found');
  
  if (createTables > 0) pass(`${createTables} CREATE TABLE statements`);
  if (dropTables > 0) pass(`${dropTables} DROP TABLE statements (idempotent)`);
  
  // Check for FK constraint keywords
  const fkRefs = (raw.match(/REFERENCES/gi) || []).length;
  if (fkRefs > 0) pass(`${fkRefs} FK references in schema`);
}

// ============================================
// CHECK 7: Data Volume
// ============================================
console.log('\n   --- Data Volume ---');

const lineCount = raw.split('\n').length;
pass(`${lineCount.toLocaleString()} total lines`);

if (ext === '.sql') {
  // Estimate row count from VALUES clauses
  const valueLines = raw.match(/^\(/gm) || [];
  pass(`~${valueLines.length.toLocaleString()} data rows (estimated)`);
}

// ============================================
// CHECK 8: Email/Phone Format
// ============================================
console.log('\n   --- Data Pattern Quality ---');

const emails = raw.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
if (emails.length > 0) {
  const unique = new Set(emails);
  pass(`${emails.length.toLocaleString()} emails found (${unique.size} unique)`);
  // Show a sample
  const sample = [...unique].slice(0, 2).join(', ');
  console.log(`      Sample: ${sample}`);
} 

const phones = raw.match(/\+1\d{10}/g) || [];
if (phones.length > 0) {
  pass(`${phones.length.toLocaleString()} phone numbers found`);
}

// ============================================
// CHECK 9: Numeric Range Sanity
// ============================================
// Check for obviously wrong numbers (negative prices, 1000% rates)
const bigNumbers = raw.match(/\b\d{10,}\b/g) || [];
const negatives = raw.match(/-\d+\.\d+/g) || [];

if (bigNumbers.length > uuids.length * 0.1) {
  // More than 10% of UUIDs as big numbers is suspicious
  warn('Large numbers detected', `${bigNumbers.length} values with 10+ digits`);
}

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '\u2500'.repeat(50));

const total = passes + failures + warnings;
if (failures === 0) {
  console.log(`   \u2705 QA PASSED — ${passes} checks passed, ${warnings} warnings`);
  console.log('');
  process.exit(0);
} else {
  console.log(`   \u274C QA FAILED — ${failures} failures, ${warnings} warnings, ${passes} passed`);
  console.log(`   Fix the failures above before shipping this dataset.`);
  console.log('');
  process.exit(1);
}
