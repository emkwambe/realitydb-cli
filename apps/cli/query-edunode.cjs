const { Client } = require('pg');
const c = new Client({ 
  connectionString: process.argv[2] || 'postgresql://postgres.cfpongyknrdrudetjhdq:ips5nwzGLL3KpQqP@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
  await c.connect();
  console.log('Connected. Querying enum distributions...\n');
  
  const queries = [
    ['schools', 'subscription_tier'],
    ['schools', 'subscription_status'],
    ['students', 'grade_level'],
    ['students', 'risk_level'],
    ['students', 'status'],
    ['interventions', 'status'],
    ['interventions', 'tier'],
    ['interventions', 'type'],
    ['risk_alerts', 'severity'],
    ['risk_alerts', 'status'],
    ['risk_evaluations', 'risk_level'],
    ['notifications', 'type'],
    ['notifications', 'priority'],
    ['payments', 'status'],
    ['ai_usage', 'provider'],
    ['ai_usage', 'feature'],
    ['data_sources', 'type'],
    ['data_sources', 'status'],
    ['users', 'role'],
    ['school_memberships', 'role'],
    ['intervention_sessions', 'status'],
    ['intervention_sessions', 'type'],
    ['sync_history', 'status'],
    ['integration_events', 'event_type'],
  ];
  
  for (const [table, col] of queries) {
    try {
      const r = await c.query(
        `SELECT "${col}" as val, COUNT(*)::int as cnt FROM "${table}" GROUP BY "${col}" ORDER BY cnt DESC LIMIT 10`
      );
      console.log(`${table}.${col}:`);
      r.rows.forEach(row => console.log(`  ${row.val} (${row.cnt})`));
      console.log('');
    } catch(e) {
      console.log(`${table}.${col}: COLUMN NOT FOUND\n`);
    }
  }
  
  // Also get school names for reference
  try {
    const schools = await c.query('SELECT name, slug, subscription_tier, student_count FROM schools ORDER BY name');
    console.log('=== EXISTING SCHOOLS ===');
    schools.rows.forEach(s => console.log(`  ${s.name} (${s.slug}) - ${s.subscription_tier} - ${s.student_count} students`));
  } catch(e) {
    console.log('Could not query schools: ' + e.message);
  }
  
  // Get total row counts
  console.log('\n=== ROW COUNTS ===');
  const tables = await c.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  for (const t of tables.rows) {
    try {
      const r = await c.query(`SELECT COUNT(*)::int as cnt FROM "${t.table_name}"`);
      if (r.rows[0].cnt > 0) {
        console.log(`  ${t.table_name}: ${r.rows[0].cnt} rows`);
      }
    } catch(e) {}
  }
  
  await c.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
