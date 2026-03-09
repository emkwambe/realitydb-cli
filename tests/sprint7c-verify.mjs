/**
 * Sprint 7C verification — CLI Integration + End-to-End Wiring
 */
import { parseTimelineString } from '../packages/core/dist/planning/parseTimeline.js';
import { getDefaultScenarioRegistry, applyScenarios, generateDataset } from '../packages/generators/dist/index.js';
import { createSeededRandom } from '../packages/shared/dist/index.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    failed++;
  }
}

// ── 1. Timeline Parsing ──
console.log('\n=== Timeline Parsing ===');
{
  const tc12 = parseTimelineString('12-months');
  assert(tc12.enabled === true, '12-months: enabled');
  assert(tc12.granularity === 'month', '12-months: month granularity');
  assert(tc12.growthModel.kind === 's-curve', '12-months: s-curve growth');
  const start = new Date(tc12.startDate);
  const end = new Date(tc12.endDate);
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  assert(monthSpan === 12, `12-months: spans 12 months (got ${monthSpan})`);
}

{
  const tc6 = parseTimelineString('6-months');
  assert(tc6.enabled === true, '6-months: enabled');
  const start = new Date(tc6.startDate);
  const end = new Date(tc6.endDate);
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  assert(monthSpan === 6, `6-months: spans 6 months (got ${monthSpan})`);
}

{
  const tc1y = parseTimelineString('1-year');
  assert(tc1y.enabled === true, '1-year: alias works');
  const start = new Date(tc1y.startDate);
  const end = new Date(tc1y.endDate);
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  assert(monthSpan === 12, `1-year: spans 12 months (got ${monthSpan})`);
}

{
  const tc2y = parseTimelineString('2-years');
  assert(tc2y.enabled === true, '2-years: alias works');
  const start = new Date(tc2y.startDate);
  const end = new Date(tc2y.endDate);
  const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  assert(monthSpan === 24, `2-years: spans 24 months (got ${monthSpan})`);
}

{
  const tc24 = parseTimelineString('24-months');
  assert(tc24.enabled === true, '24-months: enabled');
}

{
  let caught = false;
  try {
    parseTimelineString('invalid');
  } catch (e) {
    caught = true;
    assert(e.message.includes('Invalid timeline format'), 'Invalid format throws helpful error');
  }
  assert(caught, 'Invalid format throws error');
}

// ── 2. Scenario Registry from core re-export ──
console.log('\n=== Scenario Registry ===');
{
  const registry = getDefaultScenarioRegistry();
  const list = registry.list();
  assert(list.length === 4, `4 scenarios registered (got ${list.length})`);
}

// ── 3. Invalid scenario name detection ──
console.log('\n=== Invalid Scenario Detection ===');
{
  const registry = getDefaultScenarioRegistry();
  const invalid = registry.get('nonexistent');
  assert(invalid === undefined, 'Invalid scenario returns undefined');
}

// ── 4. Backward compatibility — generateDataset still works without timeline/scenario ──
console.log('\n=== Backward Compatibility ===');
{
  // Generate a simple dataset with no timeline or scenario
  const plan = {
    version: '1.0',
    planId: 'test-plan',
    config: {
      targetDatabase: 'postgres',
      defaultRowCount: 10,
      batchSize: 100,
      environment: 'dev',
    },
    tableOrder: ['test'],
    tables: [{
      tableName: 'test',
      rowCount: 10,
      dependencies: [],
      columns: [{
        columnName: 'id',
        dataType: 'uuid',
        nullable: false,
        required: true,
        strategy: { kind: 'uuid' },
        defaultValueMode: 'generated',
        maxLength: null,
      }],
      enabled: true,
    }],
    reproducibility: {
      randomSeed: 42,
      strategyVersion: '1.0',
    },
  };

  const dataset = generateDataset(plan);
  assert(dataset.tables.size === 1, 'Basic generation still works');
  assert(dataset.tables.get('test').rows.length === 10, '10 rows generated');
}

// ── 5. Determinism with scenarios ──
console.log('\n=== Determinism with Scenarios ===');
{
  function makeDataset() {
    const random = createSeededRandom(42);
    const rows = [];
    for (let i = 0; i < 100; i++) {
      rows.push({
        id: i + 1,
        amount: random.nextInt(100, 10000),
        status: 'succeeded',
        paid_at: new Date(2025, 0, 1 + i).toISOString(),
      });
    }
    const tables = new Map();
    tables.set('payments', {
      tableName: 'payments',
      columns: ['id', 'amount', 'status', 'paid_at'],
      rows,
      rowCount: rows.length,
    });
    return { tables, generatedAt: new Date().toISOString(), seed: 42, totalRows: rows.length };
  }

  const d1 = makeDataset();
  const r1 = createSeededRandom(99);
  const result1 = applyScenarios(d1, [{ name: 'payment-failures', intensity: 'high' }], r1);

  const d2 = makeDataset();
  const r2 = createSeededRandom(99);
  const result2 = applyScenarios(d2, [{ name: 'payment-failures', intensity: 'high' }], r2);

  const rows1 = result1.dataset.tables.get('payments').rows;
  const rows2 = result2.dataset.tables.get('payments').rows;
  let identical = true;
  for (let i = 0; i < rows1.length; i++) {
    if (rows1[i].status !== rows2[i].status || rows1[i].amount !== rows2[i].amount) {
      identical = false;
      break;
    }
  }
  assert(identical, 'Same seed + same scenario = identical results');
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Sprint 7C Verification: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
