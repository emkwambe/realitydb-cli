const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://neondb_owner:npg_W5FLKpdDEAc2@ep-weathered-heart-anwmtrbl.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
client.connect()
  .then(() => client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
  .then(r => { 
    console.log('Tables found:', r.rows.length);
    r.rows.forEach(row => console.log(' -', row.tablename));
    client.end(); 
  })
  .catch(e => { console.error('Error:', e.message); client.end(); });