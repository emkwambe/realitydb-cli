#!/usr/bin/env node
/**
 * RealityDB CLI Smoke Test v2
 * Runs before every npm publish to verify nothing is broken.
 * 
 * TIER 1: Core CLI functionality (help, version, etc.)
 * TIER 2: Dynamic dataset quality gates (auto-discovers ALL bundled packs)
 * TIER 3: Pack operations (validate, explain, benchmark)
 * TIER 4: Data integrity (no mock values, real dates, valid UUIDs)
 * TIER 5: Assessment & compliance (quality score, PII scan)
 * 
 * Usage: node smoke-test.cjs
 * Exit code 0 = all tests passed
 * Exit code 1 = one or more tests failed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CLI = path.resolve(__dirname, 'dist', 'index.js');
const CLI_CMD = `node "${CLI}"`;
const PACKS_DIR = path.resolve(__dirname, 'dist', 'packs');
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
      timeout: 60000,
      cwd: TMP_DIR,
      env: { ...process.env, NO_COLOR: '1' }
    });

    if (expectInOutput && !output.includes(expectInOutput)) {
      results.push({ name, status: 'FAIL', reason: `Expected "${expectInOutput}" in output` });
      failed++;
      return output;
    }

    results.push({ name, status: 'PASS' });
    passed++;
    return output;
  } catch (err) {
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';

    if (expectInOutput && (stdout.includes(expectInOutput) || stderr.includes(expectInOutput))) {
      results.push({ name, status: 'PASS', note: 'Expected error' });
      passed++;
      return stdout || stderr;
    }

    results.push({ name, status: 'FAIL', reason: err.message?.substring(0, 200) });
    failed++;
    return '';
  }
}

function fileTest(name, filePath, checkFn) {
  try {
    if (!fs.existsSync(filePath)) {
      results.push({ name, status: 'FAIL', reason: `File not found: ${filePath}` });
      failed++;
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = checkFn(content);
    if (result === true) {
      results.push({ name, status: 'PASS' });
      passed++;
    } else {
      results.push({ name, status: 'FAIL', reason: result || 'Check failed' });
      failed++;
    }
  } catch (err) {
    results.push({ name, status: 'FAIL', reason: err.message?.substring(0, 200) });
    failed++;
  }
}

// ============================================================
// Discover all bundled packs
// ============================================================
const bundledPacks = [];
if (fs.existsSync(PACKS_DIR)) {
  for (const f of fs.readdirSync(PACKS_DIR)) {
    if (f.endsWith('.json')) {
      bundledPacks.push({
        name: f.replace('.json', ''),
        path: path.join(PACKS_DIR, f),
      });
    }
  }
}

console.log('\n🧪 RealityDB CLI Smoke Test v2');
console.log('─'.repeat(50));
console.log(`   CLI: ${CLI}`);
console.log(`   Packs: ${bundledPacks.length} bundled (${bundledPacks.map(p => p.name).join(', ')})`);
console.log(`   Temp: ${TMP_DIR}`);
console.log('─'.repeat(50) + '\n');

// ============================================================
// TIER 1: Core CLI functionality (must ALL pass)
// ============================================================
console.log('TIER 1: Core CLI Functionality');
console.log('─'.repeat(40));

test('Version',         `${CLI_CMD} --version`,                    '2.');
test('Help',            `${CLI_CMD} --help`,                       'Developer Reality Platform');
test('Menu help',       `${CLI_CMD} menu --help`,                  'Interactive command menu');
test('Scan help',       `${CLI_CMD} scan --help`,                  '--infer-enums');
test('Tune help',       `${CLI_CMD} tune --help`,                  '--values');
test('Add help',        `${CLI_CMD} add --help`,                   '--trigger');
test('Validate help',   `${CLI_CMD} validate --help`,              '--level');
test('Explain help',    `${CLI_CMD} explain --help`,               '--rows');
test('Run help',        `${CLI_CMD} run --help`,                   '--mask-pii');
test('Run help scale',  `${CLI_CMD} run --help`,                   '--cardinality-scale');
test('Split help',      `${CLI_CMD} split --help`,                 '--strategy');
test('Anomaly help',    `${CLI_CMD} anomaly --help`,               '--inject');
test('Benchmark help',  `${CLI_CMD} benchmark --help`,             '--iterations');
test('CI help',         `${CLI_CMD} ci --help`,                    '--platform');
test('Analytics',       `${CLI_CMD} analytics`,                    'This Month');
test('Audit export',    `${CLI_CMD} audit:export --help`,          '--sign');

// ============================================================
// TIER 2: Built-in template resolution
// ============================================================
console.log('\nTIER 2: Built-in Template Resolution');
console.log('─'.repeat(40));

test('Pack list command',
  `${CLI_CMD} run --pack list`,
  'Available built-in templates');

// Verify all bundled packs appear in list
for (const pack of bundledPacks) {
  test(`Pack list includes ${pack.name}`,
    `${CLI_CMD} run --pack list`,
    pack.name);
}

// ============================================================
// TIER 3: Dataset generation for EVERY bundled pack
// ============================================================
console.log('\nTIER 3: Dataset Generation (all packs)');
console.log('─'.repeat(40));

const generatedFiles = {};

for (const pack of bundledPacks) {
  const sqlOut = path.join(TMP_DIR, `${pack.name}-test.sql`);
  generatedFiles[pack.name] = sqlOut;

  // Generate 500 rows (small, fast)
  test(`Generate ${pack.name} (SQL)`,
    `${CLI_CMD} run --pack ${pack.name} --rows 500 --format sql --seed 42 -o "${sqlOut}"`,
    'Generation complete');

  // Verify file exists and has content
  fileTest(`${pack.name}: file exists`, sqlOut, (c) => c.length > 100 ? true : `File too small: ${c.length} bytes`);
  fileTest(`${pack.name}: has CREATE TABLE`, sqlOut, (c) => c.includes('CREATE TABLE') ? true : 'No CREATE TABLE found');
  fileTest(`${pack.name}: has INSERT INTO`, sqlOut, (c) => c.includes('INSERT INTO') ? true : 'No INSERT INTO found');
  fileTest(`${pack.name}: has _realitydb_meta`, sqlOut, (c) => c.includes('_realitydb_meta') ? true : 'Missing _realitydb_meta watermark');
}

// ============================================================
// TIER 4: Data integrity for EVERY generated dataset
// ============================================================
console.log('\nTIER 4: Data Integrity (no mock values)');
console.log('─'.repeat(40));

const FORBIDDEN_PATTERNS = [
  { pattern: 'mock_past_date',   label: 'mock_past_date placeholder',   type: 'literal' },
  { pattern: 'mock_future_date', label: 'mock_future_date placeholder', type: 'literal' },
  { pattern: 'mock_template',    label: 'mock_template placeholder',    type: 'literal' },
  { pattern: 'mock_street',      label: 'mock_street placeholder',      type: 'literal' },
  { pattern: 'mock_city',        label: 'mock_city placeholder',        type: 'literal' },
  { pattern: 'mock_state',       label: 'mock_state placeholder',       type: 'literal' },
  { pattern: 'mock_ip',          label: 'mock_ip placeholder',          type: 'literal' },
  { pattern: 'mock_number',      label: 'mock_number placeholder',      type: 'literal' },
  { pattern: 'sample_text_',     label: 'sample_text_ placeholder',     type: 'literal' },
  { pattern: /\bval_\d{1,5}_\d{1,5}\b/, label: 'val_X_Y template fallback leak', type: 'regex' },
  { pattern: "'undefined'",      label: 'literal undefined in output',  type: 'literal' },
];

for (const pack of bundledPacks) {
  const sqlOut = generatedFiles[pack.name];
  if (!sqlOut || !fs.existsSync(sqlOut)) continue;

  for (const fp of FORBIDDEN_PATTERNS) {
    fileTest(`${pack.name}: no ${fp.label}`, sqlOut, (c) =>
      (fp.type === 'regex' || fp.pattern instanceof RegExp ? fp.pattern.test(c) : c.includes(fp.pattern)) ? `Found ${fp.label}` : true
    );
  }

  // Verify dates are ISO 8601 (at least one real date exists)
  fileTest(`${pack.name}: has real ISO dates`, sqlOut, (c) => {
    const dateMatch = c.match(/'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z'/);
    return dateMatch ? true : 'No ISO 8601 dates found — past_date strategy may be broken';
  });

  // Verify UUIDs look real (8-4-4-4-12 hex pattern)
  fileTest(`${pack.name}: has valid UUIDs`, sqlOut, (c) => {
    const uuidMatch = c.match(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'/);
    return uuidMatch ? true : 'No valid UUID pattern found';
  });
}

// ============================================================
// TIER 5: Quality assessment (score >= 95)
// ============================================================
console.log('\nTIER 5: Quality Assessment');
console.log('─'.repeat(40));

for (const pack of bundledPacks) {
  const sqlOut = generatedFiles[pack.name];
  if (!sqlOut || !fs.existsSync(sqlOut)) continue;

  // Run assess and check score
  const output = test(`${pack.name}: assess runs`,
    `${CLI_CMD} examine assess "${sqlOut}"`,
    'OVERALL SCORE');

  // Extract score from output
  if (output) {
    const scoreMatch = output.match(/OVERALL SCORE:\s*(\d+)\/100/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1]);
      if (score >= 95) {
        results.push({ name: `${pack.name}: quality >= 95 (got ${score})`, status: 'PASS' });
        passed++;
      } else {
        results.push({ name: `${pack.name}: quality >= 95 (got ${score})`, status: 'FAIL', reason: `Score ${score} < 95` });
        failed++;
      }
    }

    // Check Privacy pillar is 100 (synthetic provenance)
    const privacyMatch = output.match(/Privacy:\s*(\d+)\/100/);
    if (privacyMatch) {
      const privScore = parseInt(privacyMatch[1]);
      if (privScore === 100) {
        results.push({ name: `${pack.name}: privacy = 100 (synthetic provenance)`, status: 'PASS' });
        passed++;
      } else {
        results.push({ name: `${pack.name}: privacy = 100 (got ${privScore})`, status: 'FAIL', reason: `Privacy ${privScore} != 100` });
        failed++;
      }
    }
  }
}

// ============================================================
// TIER 6: Legacy pack operations (banking external pack)
// ============================================================
console.log('\nTIER 6: Legacy Pack Operations');
console.log('─'.repeat(40));

if (fs.existsSync(BANKING_PACK)) {
  const bankingSql = path.join(TMP_DIR, 'test-banking.sql');
  const bankingCsv = path.join(TMP_DIR, 'test-csv');
  const bankingJson = path.join(TMP_DIR, 'test.json');

  test('Banking SQL generation',
    `${CLI_CMD} run --pack "${BANKING_PACK}" --rows 1000 --format sql --drop-tables --seed 42 -o "${bankingSql}"`,
    'Generation complete');

  test('Banking CSV generation',
    `${CLI_CMD} run --pack "${BANKING_PACK}" --rows 1000 --format csv --seed 42 -o "${bankingCsv}"`,
    'Generation complete');

  test('Banking JSON generation',
    `${CLI_CMD} run --pack "${BANKING_PACK}" --rows 1000 --seed 42 -o "${bankingJson}"`,
    'Generation complete');

  test('Explain (Banking)',
    `${CLI_CMD} explain --pack "${BANKING_PACK}" --rows 5000`,
    'Total planned');

  test('Validate (Banking)',
    `${CLI_CMD} validate --pack "${BANKING_PACK}"`,
    'Validation PASSED');

  test('Benchmark (Banking)',
    `${CLI_CMD} benchmark --pack "${BANKING_PACK}" --rows 1000 --iterations 1`,
    'Benchmark Results');

  test('Tune list (Banking)',
    `${CLI_CMD} tune --pack "${BANKING_PACK}"`,
    'Tunable Enum Columns');

  test('Rule list (Banking)',
    `${CLI_CMD} rule:list --pack "${BANKING_PACK}"`,
    'Weighted Enums');

  if (fs.existsSync(bankingSql)) {
    fileTest('Banking: no mock_ prefix', bankingSql, (c) =>
      c.includes('mock_') ? 'Found mock_ placeholder' : true
    );
  }
} else {
  console.log('  ⚠️  Banking pack not found — skipping legacy tests');
}

// ============================================================
// RESULTS
// ============================================================

console.log('\n' + '═'.repeat(50));
console.log('📊 Results\n');

const tiers = {};
for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  const extra = r.reason ? ` — ${r.reason}` : (r.note ? ` (${r.note})` : '');
  console.log(`   ${icon} ${r.name}${extra}`);
}

console.log('\n' + '═'.repeat(50));
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📊 Total:  ${passed + failed}`);
console.log(`   📦 Packs tested: ${bundledPacks.length} (${bundledPacks.map(p => p.name).join(', ')})`);
console.log('═'.repeat(50));

// Cleanup
try { fs.rmSync(TMP_DIR, { recursive: true }); } catch {}

if (failed > 0) {
  console.log('\n   ⛔ SMOKE TEST FAILED — DO NOT PUBLISH\n');
  process.exit(1);
} else {
  console.log('\n   ✅ ALL TESTS PASSED — Safe to publish\n');
  process.exit(0);
}
