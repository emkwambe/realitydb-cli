const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_W5FLKpdDEAc2@ep-wandering-tooth-annvgglr.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function test() {
  try {
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('Tables:', tables.map(t => t.tablename).join(', '));
    console.log('Count:', tables.length);

    if (tables.length > 0) {
      const counts = await sql`SELECT 'customers' as t, COUNT(*) as c FROM customers UNION ALL SELECT 'accounts', COUNT(*) FROM accounts UNION ALL SELECT 'transactions', COUNT(*) FROM transactions`;
      for (const row of counts) {
        console.log(`  ${row.t}: ${row.c} rows`);
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();
