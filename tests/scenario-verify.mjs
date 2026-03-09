/**
 * Sprint 7B verification script — Scenario Engine + Built-in Scenarios
 */

import {
  getDefaultScenarioRegistry,
  applyScenarios,
  generateDataset,
  matchesAnyPattern,
} from '../packages/generators/dist/index.js';
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

// ── 1. Registry contains 4 scenarios ──
console.log('\n=== Scenario Registry ===');
const registry = getDefaultScenarioRegistry();
const scenarios = registry.list();
assert(scenarios.length === 4, `Registry has 4 scenarios (got ${scenarios.length})`);

const names = scenarios.map(s => s.name).sort();
assert(names.includes('payment-failures'), 'Has payment-failures');
assert(names.includes('churn-spike'), 'Has churn-spike');
assert(names.includes('fraud-spike'), 'Has fraud-spike');
assert(names.includes('data-quality'), 'Has data-quality');

for (const s of scenarios) {
  assert(s.description.length > 0, `${s.name} has description`);
  assert(s.version === '1.0', `${s.name} version is 1.0`);
  assert(s.supportedIntensities.length === 3, `${s.name} has 3 intensity levels`);
  assert(typeof s.apply === 'function', `${s.name} has apply function`);
}

// ── 2. matchesAnyPattern utility ──
console.log('\n=== Pattern Matching ===');
assert(matchesAnyPattern('payments', ['*payment*']), 'payments matches *payment*');
assert(matchesAnyPattern('user_payments', ['*payment*']), 'user_payments matches *payment*');
assert(!matchesAnyPattern('users', ['*payment*']), 'users does NOT match *payment*');
assert(matchesAnyPattern('subscriptions', ['*subscription*']), 'subscriptions matches *subscription*');

// ── 3. Build a mock dataset to test scenarios ──
console.log('\n=== Mock Dataset ===');

function buildMockDataset(rowCount) {
  const random = createSeededRandom(42);
  const paymentRows = [];
  for (let i = 0; i < rowCount; i++) {
    paymentRows.push({
      id: i + 1,
      user_id: random.nextInt(1, 50),
      amount: random.nextInt(500, 50000),
      status: 'succeeded',
      paid_at: new Date(2025, 0, 1 + i).toISOString(),
    });
  }

  const subscriptionRows = [];
  for (let i = 0; i < Math.floor(rowCount / 2); i++) {
    subscriptionRows.push({
      id: i + 1,
      user_id: i + 1,
      plan_id: random.nextInt(1, 5),
      status: 'active',
      started_at: new Date(2025, 0, 1 + i).toISOString(),
    });
  }

  const userRows = [];
  for (let i = 0; i < 50; i++) {
    userRows.push({
      id: i + 1,
      email: `user${i + 1}@example.com`,
      name: `User ${i + 1}`,
      created_at: new Date(2025, 0, 1).toISOString(),
    });
  }

  const tables = new Map();
  tables.set('payments', {
    tableName: 'payments',
    columns: ['id', 'user_id', 'amount', 'status', 'paid_at'],
    rows: paymentRows,
    rowCount: paymentRows.length,
  });
  tables.set('subscriptions', {
    tableName: 'subscriptions',
    columns: ['id', 'user_id', 'plan_id', 'status', 'started_at'],
    rows: subscriptionRows,
    rowCount: subscriptionRows.length,
  });
  tables.set('users', {
    tableName: 'users',
    columns: ['id', 'email', 'name', 'created_at'],
    rows: userRows,
    rowCount: userRows.length,
  });

  return {
    tables,
    generatedAt: new Date().toISOString(),
    seed: 42,
    totalRows: paymentRows.length + subscriptionRows.length + userRows.length,
  };
}

// ── 4. Payment Failures - Medium ──
console.log('\n=== Payment Failures (medium) ===');
{
  const dataset = buildMockDataset(1000);
  const random = createSeededRandom(123);
  const { dataset: modified, results } = applyScenarios(
    dataset,
    [{ name: 'payment-failures', intensity: 'medium' }],
    random,
  );

  const paymentTable = modified.tables.get('payments');
  const statusCounts = {};
  for (const row of paymentTable.rows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }
  console.log('  Status distribution:', statusCounts);

  const failedCount = (statusCounts['failed'] || 0) + (statusCounts['declined'] || 0);
  const failureRate = failedCount / paymentTable.rows.length;
  assert(failureRate > 0.05 && failureRate < 0.30, `Failure rate ~15% (got ${(failureRate * 100).toFixed(1)}%)`);
  assert(results.length === 1, 'One scenario result returned');
  assert(results[0].scenarioName === 'payment-failures', 'Result has correct name');

  // Check that some amounts are zeroed
  const zeroAmounts = paymentTable.rows.filter(r => r.amount === 0).length;
  assert(zeroAmounts > 0, `Some failed payments have zeroed amounts (${zeroAmounts})`);
}

// ── 5. Payment Failures - High ──
console.log('\n=== Payment Failures (high) ===');
{
  const dataset = buildMockDataset(1000);
  const random = createSeededRandom(456);
  const { dataset: modified } = applyScenarios(
    dataset,
    [{ name: 'payment-failures', intensity: 'high' }],
    random,
  );

  const paymentTable = modified.tables.get('payments');
  const statusCounts = {};
  for (const row of paymentTable.rows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }
  console.log('  Status distribution:', statusCounts);

  const totalFailures = (statusCounts['failed'] || 0) + (statusCounts['declined'] || 0) +
    (statusCounts['error'] || 0) + (statusCounts['timeout'] || 0);
  const failureRate = totalFailures / paymentTable.rows.length;
  assert(failureRate > 0.20, `High intensity >20% failures (got ${(failureRate * 100).toFixed(1)}%)`);
  assert(statusCounts['declined'] > 0 || statusCounts['error'] > 0 || statusCounts['timeout'] > 0,
    'High intensity produces mixed failure types');
}

// ── 6. Churn Spike ──
console.log('\n=== Churn Spike (medium) ===');
{
  const dataset = buildMockDataset(1000);
  const random = createSeededRandom(789);
  const { dataset: modified } = applyScenarios(
    dataset,
    [{ name: 'churn-spike', intensity: 'medium' }],
    random,
  );

  const subTable = modified.tables.get('subscriptions');
  const canceledCount = subTable.rows.filter(r => r.status === 'canceled').length;
  const cancelRate = canceledCount / subTable.rows.length;
  console.log(`  Canceled: ${canceledCount}/${subTable.rows.length} (${(cancelRate * 100).toFixed(1)}%)`);

  assert(cancelRate > 0.10 && cancelRate < 0.50, `Cancellation rate ~25% (got ${(cancelRate * 100).toFixed(1)}%)`);

  // Verify canceled_at populated
  const canceledRows = subTable.rows.filter(r => r.status === 'canceled');
  const allHaveCanceledAt = canceledRows.every(r => r.canceled_at != null);
  assert(allHaveCanceledAt, 'All canceled subscriptions have canceled_at');
}

// ── 7. Fraud Spike ──
console.log('\n=== Fraud Spike (medium) ===');
{
  const dataset = buildMockDataset(1000);
  const random = createSeededRandom(321);
  const { dataset: modified } = applyScenarios(
    dataset,
    [{ name: 'fraud-spike', intensity: 'medium' }],
    random,
  );

  const paymentTable = modified.tables.get('payments');
  const fraudulent = paymentTable.rows.filter(r => r.status === 'fraudulent').length;
  console.log(`  Fraudulent: ${fraudulent}/${paymentTable.rows.length}`);
  assert(fraudulent > 0, 'Some rows marked as fraudulent');

  // Check for duplicate amounts (rapid duplicate pattern)
  let duplicateAmounts = 0;
  for (let i = 1; i < paymentTable.rows.length; i++) {
    if (paymentTable.rows[i].amount === paymentTable.rows[i - 1].amount) {
      duplicateAmounts++;
    }
  }
  assert(duplicateAmounts > 0, `Duplicate amounts detected (${duplicateAmounts})`);
}

// ── 8. Data Quality ──
console.log('\n=== Data Quality (medium) ===');
{
  const dataset = buildMockDataset(1000);
  const random = createSeededRandom(654);
  const { dataset: modified } = applyScenarios(
    dataset,
    [{ name: 'data-quality', intensity: 'medium' }],
    random,
  );

  // Check that id columns are NOT nullified (FK safety)
  const paymentTable = modified.tables.get('payments');
  const nullIds = paymentTable.rows.filter(r => r.id === null).length;
  assert(nullIds === 0, 'id columns are never nullified');

  const userIdNulls = paymentTable.rows.filter(r => r.user_id === null).length;
  assert(userIdNulls === 0, 'FK columns (_id) are never nullified');

  // Check that some nullable columns got nullified
  const nullStatuses = paymentTable.rows.filter(r => r.status === null).length;
  const nullAmounts = paymentTable.rows.filter(r => r.amount === null).length;
  const totalNulls = nullStatuses + nullAmounts;
  console.log(`  Null statuses: ${nullStatuses}, null amounts: ${nullAmounts}`);
  assert(totalNulls > 0, `Some nullable columns nullified (${totalNulls})`);
}

// ── 9. Determinism ──
console.log('\n=== Determinism ===');
{
  const dataset1 = buildMockDataset(200);
  const random1 = createSeededRandom(42);
  const { dataset: modified1 } = applyScenarios(
    dataset1,
    [{ name: 'payment-failures', intensity: 'medium' }],
    random1,
  );

  const dataset2 = buildMockDataset(200);
  const random2 = createSeededRandom(42);
  const { dataset: modified2 } = applyScenarios(
    dataset2,
    [{ name: 'payment-failures', intensity: 'medium' }],
    random2,
  );

  const rows1 = modified1.tables.get('payments').rows;
  const rows2 = modified2.tables.get('payments').rows;
  let identical = true;
  for (let i = 0; i < rows1.length; i++) {
    if (rows1[i].status !== rows2[i].status || rows1[i].amount !== rows2[i].amount) {
      identical = false;
      break;
    }
  }
  assert(identical, 'Same seed produces identical scenario results');
}

// ── 10. Multiple scenarios sequentially ──
console.log('\n=== Multiple Scenarios ===');
{
  const dataset = buildMockDataset(500);
  const random = createSeededRandom(42);
  const { dataset: modified, results } = applyScenarios(
    dataset,
    [
      { name: 'payment-failures', intensity: 'medium' },
      { name: 'churn-spike', intensity: 'low' },
    ],
    random,
  );

  assert(results.length === 2, 'Two scenario results returned');
  assert(results[0].scenarioName === 'payment-failures', 'First result is payment-failures');
  assert(results[1].scenarioName === 'churn-spike', 'Second result is churn-spike');

  // Both effects should be visible
  const payments = modified.tables.get('payments');
  const subs = modified.tables.get('subscriptions');
  const failedPayments = payments.rows.filter(r => r.status !== 'succeeded').length;
  const canceledSubs = subs.rows.filter(r => r.status === 'canceled').length;
  assert(failedPayments > 0, `Payment failures applied (${failedPayments})`);
  assert(canceledSubs > 0, `Churn spike applied (${canceledSubs})`);
}

// ── Summary ──
console.log(`\n${'='.repeat(40)}`);
console.log(`Sprint 7B Verification: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
