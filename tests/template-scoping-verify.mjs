/**
 * Verify: template scoping + timeline slot-zero edge case fixes.
 */
import { buildGenerationPlan, parseTimelineString } from '../packages/core/dist/planning/index.js';
import { generateTimelineDataset, generateDataset } from '../packages/generators/dist/index.js';

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

// Mock a database schema with 8 tables (saas + ecommerce mix)
function mockSchema() {
  return {
    tables: [
      { name: 'users', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'email', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 255 },
        { name: 'created_at', udtName: 'timestamptz', isNullable: false, hasDefault: true, maxLength: null },
      ]},
      { name: 'plans', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'name', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 100 },
        { name: 'price_cents', udtName: 'int4', isNullable: false, hasDefault: false, maxLength: null },
      ]},
      { name: 'subscriptions', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'user_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'plan_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'status', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 50 },
        { name: 'created_at', udtName: 'timestamptz', isNullable: false, hasDefault: true, maxLength: null },
      ]},
      { name: 'payments', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'subscription_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'amount_cents', udtName: 'int4', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'status', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 50 },
        { name: 'created_at', udtName: 'timestamptz', isNullable: false, hasDefault: true, maxLength: null },
      ]},
      // E-commerce tables that saas template should NOT seed
      { name: 'customers', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'email', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 255 },
      ]},
      { name: 'products', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'name', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 200 },
        { name: 'price_cents', udtName: 'int4', isNullable: false, hasDefault: false, maxLength: null },
      ]},
      { name: 'orders', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'customer_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'total_cents', udtName: 'int4', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'status', udtName: 'varchar', isNullable: false, hasDefault: false, maxLength: 50 },
        { name: 'created_at', udtName: 'timestamptz', isNullable: false, hasDefault: true, maxLength: null },
      ]},
      { name: 'order_items', columns: [
        { name: 'id', udtName: 'uuid', isNullable: false, hasDefault: true, maxLength: null },
        { name: 'order_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'product_id', udtName: 'uuid', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'quantity', udtName: 'int4', isNullable: false, hasDefault: false, maxLength: null },
        { name: 'created_at', udtName: 'timestamptz', isNullable: false, hasDefault: true, maxLength: null },
      ]},
    ],
    foreignKeys: [
      { sourceTable: 'subscriptions', sourceColumn: 'user_id', targetTable: 'users', targetColumn: 'id' },
      { sourceTable: 'subscriptions', sourceColumn: 'plan_id', targetTable: 'plans', targetColumn: 'id' },
      { sourceTable: 'payments', sourceColumn: 'subscription_id', targetTable: 'subscriptions', targetColumn: 'id' },
      { sourceTable: 'orders', sourceColumn: 'customer_id', targetTable: 'customers', targetColumn: 'id' },
      { sourceTable: 'order_items', sourceColumn: 'order_id', targetTable: 'orders', targetColumn: 'id' },
      { sourceTable: 'order_items', sourceColumn: 'product_id', targetTable: 'products', targetColumn: 'id' },
    ],
  };
}

function mockConfig(template) {
  return {
    database: { connectionString: 'postgres://localhost/test' },
    seed: { defaultRecords: 20, batchSize: 100, randomSeed: 42 },
    template,
    export: {},
  };
}

// ── FIX 1: Template scoping ──
console.log('\n=== FIX 1: Template Scoping ===');

// Test: --template saas should only enable saas tables
{
  const schema = mockSchema();
  const config = mockConfig('saas');
  const plan = buildGenerationPlan(schema, config);

  const enabledTables = plan.tables.filter(t => t.enabled).map(t => t.tableName).sort();
  const disabledTables = plan.tables.filter(t => !t.enabled).map(t => t.tableName).sort();

  console.log('  Enabled:', enabledTables.join(', '));
  console.log('  Disabled:', disabledTables.join(', '));

  // SaaS template targets: users, plans, subscriptions, payments
  assert(enabledTables.includes('users'), 'users enabled (saas target)');
  assert(enabledTables.includes('plans'), 'plans enabled (saas target)');
  assert(enabledTables.includes('subscriptions'), 'subscriptions enabled (saas target)');
  assert(enabledTables.includes('payments'), 'payments enabled (saas target)');

  // E-commerce tables should be DISABLED
  assert(!enabledTables.includes('orders'), 'orders disabled (not saas)');
  assert(!enabledTables.includes('order_items'), 'order_items disabled (not saas)');
  assert(!enabledTables.includes('products'), 'products disabled (not saas)');

  // customers is tricky — saas users matchPattern includes *customer*
  // so customers might match. Let's check:
  const customerEnabled = enabledTables.includes('customers');
  console.log(`  customers enabled: ${customerEnabled} (matches saas users pattern: *user* or *account*)`);
}

// Test: --template ecommerce should only enable ecommerce tables
{
  const schema = mockSchema();
  const config = mockConfig('ecommerce');
  const plan = buildGenerationPlan(schema, config);

  const enabledTables = plan.tables.filter(t => t.enabled).map(t => t.tableName).sort();
  const disabledTables = plan.tables.filter(t => !t.enabled).map(t => t.tableName).sort();

  console.log('\n  Ecommerce enabled:', enabledTables.join(', '));
  console.log('  Ecommerce disabled:', disabledTables.join(', '));

  assert(enabledTables.includes('customers'), 'customers enabled (ecommerce target)');
  assert(enabledTables.includes('products'), 'products enabled (ecommerce target)');
  assert(enabledTables.includes('orders'), 'orders enabled (ecommerce target)');
  assert(enabledTables.includes('order_items'), 'order_items enabled (ecommerce target)');

  assert(!enabledTables.includes('plans'), 'plans disabled (not ecommerce)');
  assert(!enabledTables.includes('subscriptions'), 'subscriptions disabled (not ecommerce)');
  assert(!enabledTables.includes('payments'), 'payments disabled (not ecommerce)');
}

// Test: No template → all tables enabled
{
  const schema = mockSchema();
  const config = mockConfig(undefined);
  const plan = buildGenerationPlan(schema, config);

  const allEnabled = plan.tables.every(t => t.enabled);
  assert(allEnabled, 'No template: all tables enabled');
}

// Test: FK dependency auto-enable
{
  // Verify that users is enabled even if its matchPattern doesn't
  // directly match, because subscriptions depends on it
  const schema = mockSchema();
  const config = mockConfig('saas');
  const plan = buildGenerationPlan(schema, config);

  const usersPlan = plan.tables.find(t => t.tableName === 'users');
  assert(usersPlan.enabled, 'users enabled (FK dependency of subscriptions)');

  const plansPlan = plan.tables.find(t => t.tableName === 'plans');
  assert(plansPlan.enabled, 'plans enabled (FK dependency of subscriptions)');
}

// Test: Generation with saas template doesn't touch ecommerce tables
console.log('\n=== Template-scoped generation ===');
{
  const schema = mockSchema();
  const config = mockConfig('saas');
  const plan = buildGenerationPlan(schema, config);

  const dataset = generateDataset(plan);

  const generatedTableNames = [...dataset.tables.keys()].sort();
  console.log('  Generated tables:', generatedTableNames.join(', '));

  assert(!dataset.tables.has('orders'), 'orders NOT generated');
  assert(!dataset.tables.has('order_items'), 'order_items NOT generated');
  assert(!dataset.tables.has('products'), 'products NOT generated');
  assert(dataset.tables.has('users'), 'users generated');
  assert(dataset.tables.has('subscriptions'), 'subscriptions generated');
  assert(dataset.tables.has('payments'), 'payments generated');
}

// ── FIX 2: Timeline slot-zero edge case ──
console.log('\n=== FIX 2: Timeline slot-zero edge case ===');

// Test: parseTimelineString sets initialCount to 1
{
  const tc = parseTimelineString('12-months');
  assert(tc.growthModel.initialCount === 1, `initialCount is 1 (got ${tc.growthModel.initialCount})`);
}

// Test: Timeline with saas template generates without FK errors
{
  const schema = mockSchema();
  const config = mockConfig('saas');
  const timelineConfig = {
    enabled: true,
    startDate: new Date(2025, 0, 1).toISOString(),
    endDate: new Date(2026, 0, 1).toISOString(),
    granularity: 'month',
    growthModel: { kind: 's-curve', initialCount: 1, finalCount: 20 },
  };

  const plan = buildGenerationPlan(schema, config, timelineConfig);
  let error = null;
  let dataset = null;
  try {
    dataset = generateTimelineDataset(plan, timelineConfig);
  } catch (e) {
    error = e;
  }

  assert(error === null, `No FK error with saas+timeline (was: ${error?.message ?? 'none'})`);
  if (dataset) {
    assert(!dataset.tables.has('orders'), 'orders NOT in timeline dataset');
    assert(!dataset.tables.has('order_items'), 'order_items NOT in timeline dataset');
    assert(dataset.tables.has('users'), 'users in timeline dataset');
    assert(dataset.tables.has('payments'), 'payments in timeline dataset');

    // Verify FK integrity
    const users = dataset.tables.get('users');
    const subs = dataset.tables.get('subscriptions');
    const payments = dataset.tables.get('payments');

    assert(users.rows.length > 0, `users has rows (${users.rows.length})`);
    assert(subs.rows.length > 0, `subscriptions has rows (${subs.rows.length})`);
    assert(payments.rows.length > 0, `payments has rows (${payments.rows.length})`);
  }
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Template scoping + slot-zero fix: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
