import { loadLicense } from '../auth/license';
import {
  normalizeTables,
  topologicalSort,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function resetCommand(options: {
  pack: string;
  connection: string;
  confirm?: boolean;
}): Promise<void> {
  const license = loadLicense();

  // Read pack to know which tables to drop
  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  // Reverse FK order — drop children first
  const ordered = topologicalSort(tables).reverse();
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

  console.log(`\n\u{1F5D1} RealityDB Reset`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`   Database: ${masked}`);
  console.log(`   Template: ${templateName}`);
  console.log(`   Tables to drop: ${ordered.length}`);
  console.log(`${'\u2500'.repeat(40)}`);

  for (const t of ordered) {
    console.log(`   \u{1F5D1} ${t.name}`);
  }

  if (!options.confirm) {
    console.log(`\n\u26A0\uFE0F  This will DROP ${ordered.length} tables and all their data.`);
    console.log(`   Add --confirm to proceed.\n`);
    process.exit(0);
  }

  // Dynamic import pg
  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error(`\n\u274C PostgreSQL driver not found. Run: npm install pg`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: options.connection });

  try {
    await client.connect();
    console.log(`\n   Dropping tables...`);

    for (const table of ordered) {
      await client.query(`DROP TABLE IF EXISTS "${table.name}" CASCADE`);
      console.log(`   \u2705 Dropped ${table.name}`);
    }

    console.log(`\n\u2705 Reset complete! ${ordered.length} tables dropped.\n`);

  } catch (error: any) {
    console.error(`\n\u274C Reset failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
