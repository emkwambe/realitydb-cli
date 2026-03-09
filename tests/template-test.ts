/**
 * Template Integration Test
 *
 * Usage: npx tsx tests/template-test.ts
 *
 * Prerequisites:
 *   - PostgreSQL running with databox_dev database
 *   - Both SaaS and e-commerce schemas created
 *   - databox.config.json in project root
 */
import { loadConfig } from '@databox/config';
import { resetDatabase, seedDatabase } from '@databox/core';

async function runTest(): Promise<void> {
  const config = await loadConfig();

  console.log('=== Template Integration Test ===\n');

  // 1. Reset tables
  console.log('Resetting tables...');
  await resetDatabase(config);

  // 2. Seed with SaaS template
  console.log('Seeding with SaaS template (200 records, seed 42)...');
  const saasResult = await seedDatabase(config, {
    template: 'saas',
    records: 200,
    seed: 42,
  });
  console.log(`  Seeded ${saasResult.totalRows} rows in ${saasResult.durationMs}ms\n`);

  // 3. Query subscription status distribution
  const { createPostgresClient, closeConnection } = await import('@databox/db');
  const pool = createPostgresClient(config.database.connectionString);

  try {
    const subResult = await pool.query(
      'SELECT status, COUNT(*)::int as count FROM subscriptions GROUP BY status ORDER BY count DESC',
    );
    console.log('Subscription status distribution:');
    let activeCount = 0;
    let totalSubs = 0;
    for (const row of subResult.rows) {
      console.log(`  ${row.status}: ${row.count}`);
      totalSubs += row.count;
      if (row.status === 'active') activeCount = row.count;
    }
    const activePct = (activeCount / totalSubs) * 100;
    console.log(`  Active %: ${activePct.toFixed(1)}%`);
    const subPass = activePct > 50 && activePct < 80;
    console.log(`  RESULT: ${subPass ? 'PASS' : 'FAIL'} (~65% expected)\n`);

    // 4. Query plan interval distribution
    const intervalResult = await pool.query(
      'SELECT interval, COUNT(*)::int as count FROM plans GROUP BY interval ORDER BY count DESC',
    );
    console.log('Plan interval distribution:');
    let monthlyCount = 0;
    let yearlyCount = 0;
    for (const row of intervalResult.rows) {
      console.log(`  ${row.interval}: ${row.count}`);
      if (row.interval === 'monthly') monthlyCount = row.count;
      if (row.interval === 'yearly') yearlyCount = row.count;
    }
    const intervalPass = monthlyCount > yearlyCount;
    console.log(`  RESULT: ${intervalPass ? 'PASS' : 'FAIL'} (monthly > yearly)\n`);

    // 5. Query payment status distribution
    const payResult = await pool.query(
      'SELECT status, COUNT(*)::int as count FROM payments GROUP BY status ORDER BY count DESC',
    );
    console.log('Payment status distribution:');
    let succeededCount = 0;
    let totalPay = 0;
    for (const row of payResult.rows) {
      console.log(`  ${row.status}: ${row.count}`);
      totalPay += row.count;
      if (row.status === 'succeeded') succeededCount = row.count;
    }
    const succeededPct = (succeededCount / totalPay) * 100;
    console.log(`  Succeeded %: ${succeededPct.toFixed(1)}%`);
    const payPass = succeededPct > 70;
    console.log(`  RESULT: ${payPass ? 'PASS' : 'FAIL'} (~85% expected)\n`);

    // 6. Reset and verify determinism
    console.log('Resetting for determinism check...');
    await resetDatabase(config);
    const saasResult2 = await seedDatabase(config, {
      template: 'saas',
      records: 200,
      seed: 42,
    });
    console.log(`  Re-seeded ${saasResult2.totalRows} rows`);
    const determinismPass = saasResult.totalRows === saasResult2.totalRows;
    console.log(`  Determinism: ${determinismPass ? 'PASS' : 'FAIL'}\n`);

    // 7. Final reset
    await resetDatabase(config);

    // Summary
    const allPass = subPass && intervalPass && payPass && determinismPass;
    console.log('=== SUMMARY ===');
    console.log(`Subscription status: ${subPass ? 'PASS' : 'FAIL'}`);
    console.log(`Plan intervals:      ${intervalPass ? 'PASS' : 'FAIL'}`);
    console.log(`Payment status:      ${payPass ? 'PASS' : 'FAIL'}`);
    console.log(`Determinism:         ${determinismPass ? 'PASS' : 'FAIL'}`);
    console.log(`\nOverall: ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);

    process.exit(allPass ? 0 : 1);
  } finally {
    await closeConnection(pool);
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
