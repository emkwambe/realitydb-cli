/**
 * Verify: per-table timeline distribution fix.
 * Reproduces the exact failure: --template saas --records 500 --seed 42 --timeline 12-months
 * where users/subscriptions/payments got 0 rows because finalCount was 0.
 */
import { generateTimelineDataset, generateDataset } from '../packages/generators/dist/index.js';
import { buildGenerationPlan, parseTimelineString } from '../packages/core/dist/planning/index.js';
import { sCurveGrowth } from '../packages/generators/dist/growthModels.js';

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

// Simulate the real schema (users, plans, subscriptions, payments — saas only)
function buildSaaSPlan(rowCount, seed, timelineConfig) {
  return {
    version: '1.0',
    planId: 'saas-test',
    config: {
      targetDatabase: 'postgres',
      defaultRowCount: rowCount,
      batchSize: 100,
      environment: 'dev',
      templateName: 'saas',
    },
    tableOrder: ['plans', 'users', 'subscriptions', 'payments'],
    tables: [
      {
        tableName: 'plans',
        rowCount,
        dependencies: [],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'name', dataType: 'varchar', nullable: false, required: true, strategy: { kind: 'text' }, defaultValueMode: 'generated', maxLength: 100 },
          { columnName: 'price_cents', dataType: 'int4', nullable: false, required: true, strategy: { kind: 'money' }, defaultValueMode: 'generated', maxLength: null },
          // NO timestamp column — plans is non-temporal
        ],
        enabled: true,
      },
      {
        tableName: 'users',
        rowCount,
        dependencies: [],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'email', dataType: 'varchar', nullable: false, required: true, strategy: { kind: 'email' }, defaultValueMode: 'generated', maxLength: 255 },
          { columnName: 'created_at', dataType: 'timestamptz', nullable: false, required: true, strategy: { kind: 'timestamp' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
      {
        tableName: 'subscriptions',
        rowCount,
        dependencies: ['users', 'plans'],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'user_id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'foreign_key' }, foreignKeyRef: { referencedTable: 'users', referencedColumn: 'id', selectionMode: 'uniform' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'plan_id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'foreign_key' }, foreignKeyRef: { referencedTable: 'plans', referencedColumn: 'id', selectionMode: 'uniform' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'status', dataType: 'varchar', nullable: false, required: true, strategy: { kind: 'enum', options: { values: ['active', 'canceled'] } }, defaultValueMode: 'generated', maxLength: 50 },
          { columnName: 'started_at', dataType: 'timestamptz', nullable: false, required: true, strategy: { kind: 'timestamp' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
      {
        tableName: 'payments',
        rowCount,
        dependencies: ['subscriptions'],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'subscription_id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'foreign_key' }, foreignKeyRef: { referencedTable: 'subscriptions', referencedColumn: 'id', selectionMode: 'uniform' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'amount_cents', dataType: 'int4', nullable: false, required: true, strategy: { kind: 'money' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'status', dataType: 'varchar', nullable: false, required: true, strategy: { kind: 'enum', options: { values: ['succeeded', 'failed'] } }, defaultValueMode: 'generated', maxLength: 50 },
          { columnName: 'paid_at', dataType: 'timestamptz', nullable: false, required: true, strategy: { kind: 'timestamp' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
    ],
    reproducibility: { randomSeed: seed, strategyVersion: '1.0' },
    timeline: timelineConfig,
  };
}

// ── Test 1: Exact reproduction of the bug scenario ──
console.log('\n=== Test 1: Exact bug reproduction (500 rows, 12-months, s-curve, finalCount=0) ===');
{
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 1, finalCount: 0 }, // The bug: finalCount=0
  };

  const plan = buildSaaSPlan(500, 42, timelineConfig);
  let error = null;
  let dataset = null;
  try {
    dataset = generateTimelineDataset(plan, timelineConfig);
  } catch (e) {
    error = e;
  }

  assert(error === null, `No error (was: ${error?.message ?? 'none'})`);
  if (dataset) {
    const plans = dataset.tables.get('plans');
    const users = dataset.tables.get('users');
    const subs = dataset.tables.get('subscriptions');
    const payments = dataset.tables.get('payments');

    console.log(`  plans: ${plans.rows.length} rows (non-temporal, expected 500)`);
    console.log(`  users: ${users.rows.length} rows (temporal, expected 500)`);
    console.log(`  subscriptions: ${subs.rows.length} rows (temporal, expected 500)`);
    console.log(`  payments: ${payments.rows.length} rows (temporal, expected 500)`);

    assert(plans.rows.length === 500, `plans: 500 rows (got ${plans.rows.length})`);
    assert(users.rows.length === 500, `users: 500 rows (got ${users.rows.length})`);
    assert(subs.rows.length === 500, `subscriptions: 500 rows (got ${subs.rows.length})`);
    assert(payments.rows.length === 500, `payments: 500 rows (got ${payments.rows.length})`);
    assert(dataset.totalRows === 2000, `totalRows: 2000 (got ${dataset.totalRows})`);
  }
}

// ── Test 2: Verify s-curve distribution shape ──
console.log('\n=== Test 2: S-curve distribution shape ===');
{
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 1, finalCount: 0 },
  };

  const plan = buildSaaSPlan(120, 42, timelineConfig);
  const dataset = generateTimelineDataset(plan, timelineConfig);
  const users = dataset.tables.get('users');

  // Group by month
  const monthCounts = {};
  for (const row of users.rows) {
    const date = new Date(row.created_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }

  const months = Object.keys(monthCounts).sort();
  console.log('  Monthly distribution:');
  for (const m of months) {
    const bar = '█'.repeat(monthCounts[m]);
    console.log(`    ${m}: ${String(monthCounts[m]).padStart(3)} ${bar}`);
  }

  // S-curve: early months should have fewer rows than later months
  const firstMonth = monthCounts[months[0]] || 0;
  const lastMonth = monthCounts[months[months.length - 1]] || 0;
  const midMonth = monthCounts[months[Math.floor(months.length / 2)]] || 0;

  assert(users.rows.length === 120, `Total rows correct (${users.rows.length})`);
  assert(firstMonth < midMonth, `First month (${firstMonth}) < mid month (${midMonth})`);
  assert(months.length >= 6, `Rows spread across ${months.length} months`);
}

// ── Test 3: FK integrity across all tables ──
console.log('\n=== Test 3: FK integrity ===');
{
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 1, finalCount: 0 },
  };

  const plan = buildSaaSPlan(100, 42, timelineConfig);
  const dataset = generateTimelineDataset(plan, timelineConfig);

  const userIds = new Set(dataset.tables.get('users').rows.map(r => r.id));
  const planIds = new Set(dataset.tables.get('plans').rows.map(r => r.id));
  const subIds = new Set(dataset.tables.get('subscriptions').rows.map(r => r.id));

  const subs = dataset.tables.get('subscriptions').rows;
  const payments = dataset.tables.get('payments').rows;

  const allSubsValid = subs.every(r => userIds.has(r.user_id) && planIds.has(r.plan_id));
  const allPaymentsValid = payments.every(r => subIds.has(r.subscription_id));

  assert(allSubsValid, 'All subscriptions reference valid users and plans');
  assert(allPaymentsValid, 'All payments reference valid subscriptions');
}

// ── Test 4: Determinism ──
console.log('\n=== Test 4: Determinism ===');
{
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2025, 6, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 1, finalCount: 0 },
  };

  const d1 = generateTimelineDataset(buildSaaSPlan(50, 42, timelineConfig), timelineConfig);
  const d2 = generateTimelineDataset(buildSaaSPlan(50, 42, timelineConfig), timelineConfig);

  const u1 = d1.tables.get('users').rows;
  const u2 = d2.tables.get('users').rows;

  assert(u1.length === u2.length, `Same row count (${u1.length})`);
  let identical = true;
  for (let i = 0; i < u1.length; i++) {
    if (u1[i].id !== u2[i].id || u1[i].email !== u2[i].email || u1[i].created_at !== u2[i].created_at) {
      identical = false;
      break;
    }
  }
  assert(identical, 'Same seed produces byte-identical results');
}

// ── Test 5: parseTimelineString produces initialCount=1 ──
console.log('\n=== Test 5: parseTimelineString ===');
{
  const tc = parseTimelineString('12-months');
  assert(tc.growthModel.initialCount === 1, `initialCount=1 (got ${tc.growthModel.initialCount})`);
  assert(tc.growthModel.finalCount === 0, `finalCount=0 (will be computed per-table)`);
}

// ── Test 6: Different table row counts get correct totals ──
console.log('\n=== Test 6: Different table row counts ===');
{
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2025, 6, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 'flat', initialCount: 0, finalCount: 0 },
  };

  const plan = buildSaaSPlan(100, 42, timelineConfig);
  // Override: payments gets 3x rows (simulating rowCountMultiplier)
  plan.tables[3].rowCount = 300;

  const dataset = generateTimelineDataset(plan, timelineConfig);
  const users = dataset.tables.get('users');
  const payments = dataset.tables.get('payments');

  assert(users.rows.length === 100, `users: 100 rows (got ${users.rows.length})`);
  assert(payments.rows.length === 300, `payments: 300 rows (got ${payments.rows.length})`);
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Per-table distribution fix: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
