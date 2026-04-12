#!/usr/bin/env node
/**
 * RealityDB CLI Smoke Test
 * Run before every npm publish to verify nothing is broken.
 * Usage: node smoke-test.cjs
 * 
 * Exit code 0 = all tests passed
 * Exit code 1 = one or more tests failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI = 'node C:\\Users\\HP\\Documents\\databox\\apps\\cli\\dist\\index.js';
const BANKING_PACK = 'C:\\Users\\HP\\Documents\\realityDB Packs\\Banking\\realitydb-studio-pack.json';
const TMP_DIR = path.join(require('os').tmpdir(), 'realitydb-smoke-' + Date.now());

fs.mkdirSync(TMP_DIR, { recursive: true });

let passed = 0;
let failed = 0;
const results = [];

function test(name, command, expectInOutput) {
  try {
    const output = execSync(command, { 
      encoding: 'utf-8', 
      timeout: 30000,
      cwd: TMP_DIR,
      env: { ...process.env, NO_COLOR: '1' }
    });
    
    if (expectInOutput && !output.includes(expectInOutput)) {
      results.push({ name, status: 'FAIL', reason: `Expected "${expectInOutput}" in output` });
      failed++;
      return;
    }
    
    results.push({ name, status: 'PASS' });
    passed++;
  } catch (err) {
    // Some commands are expected to fail (e.g., missing pack file)
    // Check if it's an expected failure
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';
    
    if (expectInOutput && (stdout.includes(expectInOutput) || stderr.includes(expectInOutput))) {
      results.push({ name, status: 'PASS', note: 'Expected error' });
      passed++;
      return;
    }
    
    results.push({ name, status: 'FAIL', reason: err.message?.substring(0, 200) });
    failed++;
  }
}

console.log('\n🧪 RealityDB CLI Smoke Test');
console.log('─'.repeat(50));
console.log(`   CLI: ${CLI}`);
console.log(`   Temp: ${TMP_DIR}`);
console.log('─'.repeat(50) + '\n');

// ============================================================
// TIER 1: Basic CLI functionality (must ALL pass)
// ============================================================

test('Version',         `${CLI} --version`,                    '2.');
test('Help',            `${CLI} --help`,                       'Developer Reality Platform');
test('Menu help',       `${CLI} menu --help`,                  'Interactive command menu');
test('Scan help',       `${CLI} scan --help`,                  '--infer-enums');
test('Tune help',       `${CLI} tune --help`,                  '--values');
test('Add help',        `${CLI} add --help`,                   '--trigger');
test('Validate help',   `${CLI} validate --help`,              '--level');
test('Explain help',    `${CLI} explain --help`,               '--rows');
test('Run help',        `${CLI} run --help`,                   '--mask-pii');
test('Run help scale',  `${CLI} run --help`,                   '--cardinality-scale');
test('Split help',      `${CLI} split --help`,                 '--strategy');
test('Anomaly help',    `${CLI} anomaly --help`,               '--inject');
test('Benchmark help',  `${CLI} benchmark --help`,             '--iterations');
test('CI help',         `${CLI} ci --help`,                    '--platform');
test('Analytics',       `${CLI} analytics`,                    'This Month');
test('Audit export',    `${CLI} audit:export --help`,          '--sign');

// ============================================================
// TIER 2: Generation (core engine must work)
// ============================================================

const sqlOut = path.join(TMP_DIR, 'test-banking.sql');
const csvOut = path.join(TMP_DIR, 'test-csv');
const jsonOut = path.join(TMP_DIR, 'test.json');

test('Run SQL (Banking)',
  `${CLI} run --pack "${BANKING_PACK}" --rows 1000 --format sql --drop-tables --seed 42 -o "${sqlOut}"`,
  'Generation complete');

test('Run CSV (Banking)',
  `${CLI} run --pack "${BANKING_PACK}" --rows 1000 --format csv --seed 42 -o "${csvOut}"`,
  'Generation complete');

test('Run JSON (Banking)',
  `${CLI} run --pack "${BANKING_PACK}" --rows 1000 --seed 42 -o "${jsonOut}"`,
  'Generation complete');

// Verify output files exist
test('SQL file exists',
  `node -e "console.log(require('fs').existsSync('${sqlOut.replace(/\\/g, '\\\\')}') ? 'EXISTS' : 'MISSING')"`,
  'EXISTS');

test('SQL has CREATE TABLE',
  `node -e "const c=require('fs').readFileSync('${sqlOut.replace(/\\/g, '\\\\')}','utf-8');console.log(c.includes('CREATE TABLE') ? 'HAS_DDL' : 'NO_DDL')"`,
  'HAS_DDL');

test('SQL has INSERT',
  `node -e "const c=require('fs').readFileSync('${sqlOut.replace(/\\/g, '\\\\')}','utf-8');console.log(c.includes('INSERT INTO') ? 'HAS_DATA' : 'NO_DATA')"`,
  'HAS_DATA');

// ============================================================
// TIER 3: Pack operations
// ============================================================

test('Explain (Banking)',
  `${CLI} explain --pack "${BANKING_PACK}" --rows 5000`,
  'Total planned');

test('Validate (Banking)',
  `${CLI} validate --pack "${BANKING_PACK}"`,
  'Validation PASSED');

test('Benchmark (Banking)',
  `${CLI} benchmark --pack "${BANKING_PACK}" --rows 1000 --iterations 1`,
  'Benchmark Results');

test('Tune list (Banking)',
  `${CLI} tune --pack "${BANKING_PACK}"`,
  'Tunable Enum Columns');

test('Rule list (Banking)',
  `${CLI} rule:list --pack "${BANKING_PACK}"`,
  'Weighted Enums');

// ============================================================
// TIER 4: No mock values in output
// ============================================================

test('No mock_past_date in SQL',
  `node -e "const c=require('fs').readFileSync('${sqlOut.replace(/\\/g, '\\\\')}','utf-8');console.log(c.includes('mock_past_date') ? 'MOCK_FOUND' : 'CLEAN')"`,
  'CLEAN');

test('No mock_ prefix in SQL',
  `node -e "const c=require('fs').readFileSync('${sqlOut.replace(/\\/g, '\\\\')}','utf-8');console.log(c.includes('mock_') ? 'MOCK_FOUND' : 'CLEAN')"`,
  'CLEAN');

// ============================================================
// RESULTS
// ============================================================

console.log('\n' + '─'.repeat(50));
console.log('📊 Results\n');

for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  const extra = r.reason ? ` — ${r.reason}` : (r.note ? ` (${r.note})` : '');
  console.log(`   ${icon} ${r.name}${extra}`);
}

console.log('\n' + '─'.repeat(50));
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📊 Total:  ${passed + failed}`);
console.log('─'.repeat(50));

// Cleanup
try { fs.rmSync(TMP_DIR, { recursive: true }); } catch {}

if (failed > 0) {
  console.log('\n   ⛔ SMOKE TEST FAILED — DO NOT PUBLISH\n');
  process.exit(1);
} else {
  console.log('\n   ✅ ALL TESTS PASSED — Safe to publish\n');
  process.exit(0);
}
