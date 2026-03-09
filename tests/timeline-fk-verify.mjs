/**
 * Verify timeline engine FK ordering bug fix.
 *
 * Reproduces: "FK resolution failed: referenced table 'orders' has 0 rows
 *              (resolving order_items.order_id)"
 */
import { generateTimelineDataset } from '../packages/generators/dist/index.js';

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

// Build a plan with orders → order_items FK dependency,
// where both tables have timestamps (timeline-distributed).
function buildPlan(rowCount, seed) {
  return {
    version: '1.0',
    planId: 'fk-test',
    config: {
      targetDatabase: 'postgres',
      defaultRowCount: rowCount,
      batchSize: 100,
      environment: 'dev',
    },
    tableOrder: ['users', 'orders', 'order_items'],
    tables: [
      {
        tableName: 'users',
        rowCount,
        dependencies: [],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'email', dataType: 'text', nullable: false, required: true, strategy: { kind: 'email' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
      {
        tableName: 'orders',
        rowCount,
        dependencies: ['users'],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'user_id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'foreign_key' }, foreignKeyRef: { referencedTable: 'users', referencedColumn: 'id', selectionMode: 'uniform' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'amount', dataType: 'int4', nullable: false, required: true, strategy: { kind: 'money' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'created_at', dataType: 'timestamptz', nullable: false, required: true, strategy: { kind: 'timestamp' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
      {
        tableName: 'order_items',
        rowCount: rowCount * 2,
        dependencies: ['orders'],
        columns: [
          { columnName: 'id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'uuid' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'order_id', dataType: 'uuid', nullable: false, required: true, strategy: { kind: 'foreign_key' }, foreignKeyRef: { referencedTable: 'orders', referencedColumn: 'id', selectionMode: 'uniform' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'price', dataType: 'int4', nullable: false, required: true, strategy: { kind: 'money' }, defaultValueMode: 'generated', maxLength: null },
          { columnName: 'created_at', dataType: 'timestamptz', nullable: false, required: true, strategy: { kind: 'timestamp' }, defaultValueMode: 'generated', maxLength: null },
        ],
        enabled: true,
      },
    ],
    reproducibility: { randomSeed: seed, strategyVersion: '1.0' },
  };
}

// ── Test 1: Basic FK ordering with timeline ──
console.log('\n=== Test 1: FK ordering within slots ===');
{
  const plan = buildPlan(50, 42);
  const timeline = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 0, finalCount: 50 },
  };

  let error = null;
  let dataset = null;
  try {
    dataset = generateTimelineDataset(plan, timeline);
  } catch (e) {
    error = e;
  }

  assert(error === null, `No FK resolution error (was: ${error?.message ?? 'none'})`);
  assert(dataset !== null, 'Dataset generated successfully');

  if (dataset) {
    const orders = dataset.tables.get('orders');
    const items = dataset.tables.get('order_items');
    assert(orders.rows.length > 0, `Orders has rows (${orders.rows.length})`);
    assert(items.rows.length > 0, `Order items has rows (${items.rows.length})`);

    // Verify all order_items reference valid order IDs
    const orderIds = new Set(orders.rows.map(r => r.id));
    let allValid = true;
    for (const item of items.rows) {
      if (!orderIds.has(item.order_id)) {
        allValid = false;
        break;
      }
    }
    assert(allValid, 'All order_items reference valid order IDs');
  }
}

// ── Test 2: Non-timestamp parent (users) with timestamp children ──
console.log('\n=== Test 2: Non-timestamp parent with timestamp children ===');
{
  // users has NO timestamp column, orders has timestamps
  const plan = {
    ...buildPlan(30, 99),
  };
  // Remove timestamps from users
  plan.tables[0] = {
    ...plan.tables[0],
    columns: plan.tables[0].columns.filter(c => c.strategy.kind !== 'timestamp'),
  };

  const timeline = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2025, 6, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 'linear', initialCount: 1, finalCount: 30 },
  };

  let error = null;
  let dataset = null;
  try {
    dataset = generateTimelineDataset(plan, timeline);
  } catch (e) {
    error = e;
  }

  assert(error === null, `No error (was: ${error?.message ?? 'none'})`);
  if (dataset) {
    const users = dataset.tables.get('users');
    assert(users.rows.length === 30, `Users fully generated in first slot (${users.rows.length})`);

    const orders = dataset.tables.get('orders');
    assert(orders.rows.length > 0, `Orders generated across slots (${orders.rows.length})`);

    // All orders should reference valid user IDs
    const userIds = new Set(users.rows.map(r => r.id));
    const allOrdersValid = orders.rows.every(r => userIds.has(r.user_id));
    assert(allOrdersValid, 'All orders reference valid user IDs');
  }
}

// ── Test 3: S-curve with small counts (some slots get 0 rows) ──
console.log('\n=== Test 3: S-curve with small counts (0-row slots) ===');
{
  const plan = buildPlan(5, 77);  // Only 5 rows spread over 12 months
  const timeline = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 0, finalCount: 5 },
  };

  let error = null;
  let dataset = null;
  try {
    dataset = generateTimelineDataset(plan, timeline);
  } catch (e) {
    error = e;
  }

  assert(error === null, `No error even with sparse slots (was: ${error?.message ?? 'none'})`);
  if (dataset) {
    const orders = dataset.tables.get('orders');
    const items = dataset.tables.get('order_items');
    assert(orders.rows.length === 5, `Orders total = 5 (got ${orders.rows.length})`);

    // Items should reference valid orders even when some slots had 0 order rows
    const orderIds = new Set(orders.rows.map(r => r.id));
    const allItemsValid = items.rows.every(r => orderIds.has(r.order_id));
    assert(allItemsValid, 'All items reference valid orders despite sparse distribution');
  }
}

// ── Test 4: Determinism ──
console.log('\n=== Test 4: Determinism ===');
{
  const timeline = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2025, 6, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 'linear', initialCount: 1, finalCount: 20 },
  };

  const d1 = generateTimelineDataset(buildPlan(20, 42), timeline);
  const d2 = generateTimelineDataset(buildPlan(20, 42), timeline);

  const orders1 = d1.tables.get('orders').rows;
  const orders2 = d2.tables.get('orders').rows;

  assert(orders1.length === orders2.length, 'Same row count');
  let identical = true;
  for (let i = 0; i < orders1.length; i++) {
    if (orders1[i].id !== orders2[i].id || orders1[i].amount !== orders2[i].amount) {
      identical = false;
      break;
    }
  }
  assert(identical, 'Same seed produces identical timeline results');
}

// ── Test 5: Cross-slot cumulative references ──
console.log('\n=== Test 5: Cross-slot cumulative FK references ===');
{
  // 6 rows total with flat growth across 3 months = 2 rows/month for each temporal table
  // Both orders and order_items use the same slot distribution
  // In month 2, order_items should reference orders from month 1 AND month 2
  const plan = buildPlan(6, 55);
  const timeline = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2025, 3, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 'flat', initialCount: 0, finalCount: 6 },
  };

  const dataset = generateTimelineDataset(plan, timeline);
  const orders = dataset.tables.get('orders');
  const items = dataset.tables.get('order_items');

  assert(orders.rows.length === 6, `6 orders generated (got ${orders.rows.length})`);
  assert(items.rows.length > 0, `Items generated (got ${items.rows.length})`);

  const orderIds = new Set(orders.rows.map(r => r.id));
  const allValid = items.rows.every(r => orderIds.has(r.order_id));
  assert(allValid, 'All items reference valid orders across slots');
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Timeline FK Fix Verification: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
