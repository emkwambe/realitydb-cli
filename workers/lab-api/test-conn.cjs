const { neon } = require('@neondatabase/serverless');
const connStr = process.argv[2];
if (!connStr) { console.log('Usage: node test-conn.cjs <connection-string>'); process.exit(1); }

const sql = neon(connStr);

async function test() {
  try {
    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('Tables:', tables.length);
    for (const t of tables) console.log('  ', t.tablename);

    if (tables.length > 0) {
      for (const t of tables.slice(0, 5)) {
        const count = await sql`SELECT COUNT(*) as c FROM ${sql(t.tablename)}`;
        console.log(`  ${t.tablename}: ${count[0]?.c || 0} rows`);
      }
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();
