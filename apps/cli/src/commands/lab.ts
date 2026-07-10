import { loadLicense } from '../auth/license';

const LAB_API = 'https://realitydb-lab-api.eddy-078.workers.dev';

function getApiKey(): string {
  if (process.env.REALITYDB_API_KEY) {
    return process.env.REALITYDB_API_KEY;
  }
  const license = loadLicense();
  if (!license?.apiKey) {
    throw new Error(
      'No API key found. Run: realitydb auth login\n' +
      'Or set REALITYDB_API_KEY environment variable.'
    );
  }
  return license.apiKey;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': getApiKey(),
  };
}

async function apiCall(method: string, path: string, body?: any): Promise<any> {
  const url = LAB_API + path;
  const opts: any = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = (data as any).error || `API error: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function formatTTL(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 24) return Math.floor(hours / 24) + 'd ' + (hours % 24) + 'h';
  return hours + 'h ' + mins + 'm';
}

function maskConn(conn: string): string {
  return conn.replace(/:([^@]+)@/, ':****@');
}

// ============================================================
// lab create
// ============================================================
export async function labCreateCommand(template: string, options: {
  rows?: string;
  ttl?: string;
  name?: string;
}): Promise<void> {
  const rows = options.rows ? parseInt(options.rows) : 5000;
  const ttl = options.ttl || '4h';
  const name = options.name || `${template}-${Date.now().toString(36)}`;

  console.log(`\n\u{1F9EA} Creating lab...`);
  console.log(`   Template: ${template}`);
  console.log(`   Rows: ${rows.toLocaleString()}`);
  console.log(`   TTL: ${ttl}`);

  try {
    const lab = await apiCall('POST', '/v1/labs', { template, rows, ttl, name });

    console.log(`\n\u{1F9EA} Lab Created!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Name:       ${lab.name}`);
    console.log(`   Template:   ${lab.template}`);
    console.log(`   Rows:       ${lab.rows.toLocaleString()}`);
    console.log(`   Status:     ${lab.status}`);
    console.log(`   Expires:    ${formatTTL(lab.expiresAt)}`);
    console.log(`\n   \u{1F517} Connection string:`);
    console.log(`   ${lab.connectionString}`);
    console.log(`\n   Connect: psql "${lab.connectionString}"`);
    console.log(`   Extend:  realitydb lab extend ${lab.name} --ttl 24h`);
    console.log(`   Delete:  realitydb lab delete ${lab.name}\n`);
  } catch (err: any) {
    console.error(`\n\u274C Lab creation failed: ${err.message}\n`);
    process.exit(1);
  }
}

// ============================================================
// lab list
// ============================================================
export async function labListCommand(options: {
  all?: boolean;
}): Promise<void> {
  try {
    const query = options.all ? '?all=true' : '';
    const data = await apiCall('GET', '/v1/labs' + query);
    const labs = data.labs || [];

    if (labs.length === 0) {
      console.log(`\n\u{1F9EA} No active labs.`);
      console.log(`   Create one: realitydb lab create banking\n`);
      return;
    }

    console.log(`\n\u{1F9EA} Labs (${labs.length})`);
    console.log(`${'\u2500'.repeat(80)}`);
    console.log(`   ${'NAME'.padEnd(25)} ${'TEMPLATE'.padEnd(15)} ${'ROWS'.padEnd(8)} ${'TTL'.padEnd(10)} STATUS`);
    console.log(`${'\u2500'.repeat(80)}`);

    for (const lab of labs) {
      const ttl = lab.status === 'active' ? formatTTL(lab.expires_at) : lab.status;
      console.log(`   ${(lab.name || lab.id).padEnd(25)} ${(lab.template || '').padEnd(15)} ${String(lab.rows || 0).padEnd(8)} ${ttl.padEnd(10)} ${lab.status}`);
    }

    console.log(`${'\u2500'.repeat(80)}\n`);
  } catch (err: any) {
    console.error(`\n\u274C Failed to list labs: ${err.message}\n`);
  }
}

// ============================================================
// lab connect
// ============================================================
export async function labConnectCommand(name: string): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found. Run: realitydb lab list\n`);
      process.exit(1);
    }

    console.log(`\n\u{1F517} ${lab.name}`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   ${lab.connection_string}`);
    console.log(`\n   Template: ${lab.template} | Rows: ${lab.rows} | Expires: ${formatTTL(lab.expires_at)}`);
    console.log(`\n   psql "${lab.connection_string}"\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab extend
// ============================================================
export async function labExtendCommand(name: string, options: {
  ttl: string;
}): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    const result = await apiCall('PATCH', `/v1/labs/${lab.id}/ttl`, { ttl: options.ttl });

    console.log(`\n\u23F1\uFE0F  Extended "${name}"`);
    console.log(`   New expiry: ${formatTTL(result.expiresAt)}`);
    console.log(`   Expires at: ${result.expiresAt}\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab delete
// ============================================================
export async function labDeleteCommand(name: string): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    await apiCall('DELETE', `/v1/labs/${lab.id}`);

    console.log(`\n\u{1F5D1}\uFE0F  Deleted "${name}"`);
    console.log(`   Neon branch destroyed. Data is gone.\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab snapshot
// ============================================================
export async function labSnapshotCommand(name: string, options: {
  name: string;
  description?: string;
}): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    console.log(`\n\u{1F512} Creating snapshot of '${name}'...\n`);

    const snap = await apiCall('POST', `/v1/labs/${lab.id}/snapshot`, {
      name: options.name,
      description: options.description || '',
    });

    function fmtBytes(b: number): string {
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    console.log(`   \u{1F4CA} Snapshot: ${snap.name}`);
    if (snap.description) console.log(`   \u{1F4DD} Description: ${snap.description}`);
    console.log(`   \u{1F4C1} Schema: ${snap.tableCount || '?'} tables`);
    console.log(`   \u{1F4C8} Data: ${(snap.totalRows || 0).toLocaleString()} rows (${fmtBytes(snap.sizeBytes || 0)})`);
    if (snap.savedQueriesCount > 0) console.log(`   \u{1F4BE} Saved queries: ${snap.savedQueriesCount}`);
    console.log(`   \u{1F517} Template: ${snap.template || 'custom'}`);
    console.log(`   \u23F1\uFE0F  Created: ${snap.createdAt}`);

    console.log(`\n\u2705 Snapshot created successfully!\n`);
    console.log(`   Cloud storage: r2://realitydb-snapshots/${snap.id}/`);
    console.log(`\n   Snapshots persist indefinitely and do not count against your active lab limit.\n`);
    console.log(`   Next steps:`);
    console.log(`   \u2022 realitydb lab snapshots ${name}                    # View all snapshots`);
    console.log(`   \u2022 realitydb lab publish --snapshot ${snap.id} --title "My Analysis"\n`);
  } catch (err: any) {
    console.error(`\n\u274C Snapshot failed: ${err.message}\n`);
  }
}

// ============================================================
// lab publish
// ============================================================
export async function labPublishCommand(options: {
  snapshot: string;
  title: string;
  authors?: string;
  description?: string;
  tags?: string;
  license?: string;
}): Promise<void> {
  const license = loadLicense();

  try {
    console.log(`\n\u{1F4E4} Publishing to gallery...`);

    const pub = await apiCall('POST', '/v1/publish', {
      snapshotId: options.snapshot,
      title: options.title,
      authors: options.authors || license?.email || 'Anonymous',
      description: options.description || '',
      tags: options.tags || '',
      license: options.license || 'CC-BY-4.0',
    });

    console.log(`\n\u{1F389} Published!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Title:     ${pub.title}`);
    console.log(`   Slug:      ${pub.slug}`);
    console.log(`   URL:       ${pub.url}`);
    console.log(`   Published: ${pub.publishedAt}`);
    console.log(`\n   Share this URL. Others can fork your lab with:`);
    console.log(`   realitydb lab fork ${pub.slug}\n`);
  } catch (err: any) {
    console.error(`\n\u274C Publish failed: ${err.message}\n`);
  }
}

// ============================================================
// lab fork
// ============================================================
export async function labForkCommand(slug: string, options: {
  name?: string;
}): Promise<void> {
  try {
    console.log(`\n\u{1F500} Forking "${slug}"...`);

    const fork = await apiCall('POST', `/v1/gallery/${slug}/fork`, {
      name: options.name || `fork-${slug.substring(0, 20)}`,
    });

    console.log(`\n\u{1F9EA} Fork Created!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Name:       ${fork.name}`);
    console.log(`   Forked from: ${fork.forkedFrom}`);
    console.log(`   Expires:    ${formatTTL(fork.expiresAt)}`);
    console.log(`\n   \u{1F517} Connection string:`);
    console.log(`   ${fork.connectionString}`);
    console.log(`\n   This is an exact replica. Same template, same seed, same data.\n`);
  } catch (err: any) {
    console.error(`\n\u274C Fork failed: ${err.message}\n`);
  }
}

// ============================================================
// lab gallery
// ============================================================
export async function labGalleryCommand(options: {
  tag?: string;
  template?: string;
  search?: string;
}): Promise<void> {
  try {
    let query = '';
    const params: string[] = [];
    if (options.tag) params.push(`tag=${options.tag}`);
    if (options.template) params.push(`template=${options.template}`);
    if (options.search) params.push(`q=${options.search}`);
    if (params.length > 0) query = '?' + params.join('&');

    const data = await apiCall('GET', '/v1/gallery' + query);
    const labs = data.labs || [];

    if (labs.length === 0) {
      console.log(`\n\u{1F4DA} Gallery is empty.`);
      console.log(`   Be the first to publish: realitydb lab publish --snapshot <id> --title "My Analysis"\n`);
      return;
    }

    console.log(`\n\u{1F4DA} RealityDB Gallery (${labs.length} published)`);
    console.log(`${'\u2500'.repeat(80)}`);

    for (const lab of labs) {
      const tags = lab.tags ? lab.tags.split(',').map((t: string) => `#${t.trim()}`).join(' ') : '';
      console.log(`\n   \u{1F4D6} ${lab.title}`);
      console.log(`      By: ${lab.authors} | Template: ${lab.template} | ${lab.rows?.toLocaleString()} rows`);
      console.log(`      Views: ${lab.view_count || 0} | Forks: ${lab.fork_count || 0} | License: ${lab.license}`);
      if (tags) console.log(`      Tags: ${tags}`);
      console.log(`      Fork: realitydb lab fork ${lab.slug}`);
    }

    console.log(`\n${'\u2500'.repeat(80)}\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}


// ============================================================
// lab snapshot list
// ============================================================
export async function labSnapshotListCommand(name: string): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    const snapData = await apiCall('GET', `/v1/labs/${lab.id}/snapshots`);
    const snaps = snapData.snapshots || [];

    if (snaps.length === 0) {
      console.log(`\n\u{1F4F8} No snapshots for "${name}".\n`);
      console.log(`   Create one: realitydb lab snapshot ${name} --name "my-analysis"\n`);
      return;
    }

    console.log(`\n\u{1F4F8} Snapshots for "${name}" (${snaps.length})\n`);
    console.log(`   ${'ID'.padEnd(18)} ${'NAME'.padEnd(25)} ${'SIZE'.padEnd(12)} CREATED`);
    console.log(`${'\u2500'.repeat(80)}`);

    for (const snap of snaps) {
      const size = snap.size_bytes ? (snap.size_bytes / 1024).toFixed(0) + ' KB' : 'N/A';
      const created = snap.created_at ? new Date(snap.created_at).toLocaleDateString() : 'N/A';
      console.log(`   ${(snap.id || '').padEnd(18)} ${(snap.name || '').padEnd(25)} ${size.padEnd(12)} ${created}`);
    }

    console.log(`${'\u2500'.repeat(80)}\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab query save
// ============================================================
export async function labQuerySaveCommand(name: string, options: {
  name: string;
  sql: string;
}): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    const result = await apiCall('POST', `/v1/labs/${lab.id}/queries`, {
      name: options.name,
      sql: options.sql,
    });

    console.log(`\n\u{1F4BE} Query saved: ${result.name}`);
    console.log(`   ID: ${result.id}\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab query list
// ============================================================
export async function labQueryListCommand(name: string): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    const qData = await apiCall('GET', `/v1/labs/${lab.id}/queries`);
    const queries = qData.queries || [];

    if (queries.length === 0) {
      console.log(`\n\u{1F4DD} No saved queries for "${name}".\n`);
      console.log(`   Save one: realitydb lab query save ${name} --name "my-query" --sql "SELECT * FROM ..."\n`);
      return;
    }

    console.log(`\n\u{1F4DD} Saved Queries for "${name}" (${queries.length})\n`);

    for (const q of queries) {
      const time = q.execution_time_ms ? `${q.execution_time_ms}ms` : '';
      const rows = q.row_count ? `${q.row_count} rows` : '';
      console.log(`   \u{1F50D} ${q.name} (${q.id})`);
      console.log(`      ${q.sql_text?.substring(0, 100)}${q.sql_text?.length > 100 ? '...' : ''}`);
      if (time || rows) console.log(`      ${[time, rows].filter(Boolean).join(' | ')}`);
      console.log('');
    }
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab query run — execute a query against a live lab
// ============================================================
export async function labQueryRunCommand(name: string, options: {
  sql: string;
  save?: string;
}): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    // Execute the query using neon serverless driver
    const connStr = lab.connection_string;
    let neonModule: any;
    try {
      neonModule = require('@neondatabase/serverless');
    } catch {
      console.error(`\n\u274C @neondatabase/serverless not installed.\n   Run: npm install -g @neondatabase/serverless\n`);
      process.exit(1);
    }

    const sql = neonModule.neon(connStr);
    const start = Date.now();
    const result = await sql(options.sql);
    const elapsed = Date.now() - start;

    console.log(`\n\u{1F50D} Query Results (${result.length} rows, ${elapsed}ms)\n`);

    if (result.length > 0) {
      // Print header
      const cols = Object.keys(result[0]);
      const widths = cols.map(c => Math.max(c.length, ...result.slice(0, 20).map((r: any) => String(r[c] ?? '').length)));
      console.log('   ' + cols.map((c, i) => c.padEnd(widths[i])).join('  '));
      console.log('   ' + widths.map(w => '\u2500'.repeat(w)).join('  '));

      // Print rows (max 20)
      for (const row of result.slice(0, 20)) {
        console.log('   ' + cols.map((c, i) => String(row[c] ?? '').padEnd(widths[i])).join('  '));
      }

      if (result.length > 20) {
        console.log(`   ... and ${result.length - 20} more rows`);
      }
    }

    // Optionally save the query
    if (options.save) {
      await apiCall('POST', `/v1/labs/${lab.id}/queries`, {
        name: options.save,
        sql: options.sql,
        executionTimeMs: elapsed,
        rowCount: result.length,
        resultPreview: JSON.stringify(result.slice(0, 5)),
      });
      console.log(`\n   \u{1F4BE} Query saved as "${options.save}"\n`);
    }

    console.log('');
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}

// ============================================================
// lab share — generate read-only connection string
// ============================================================
export async function labShareCommand(name: string): Promise<void> {
  try {
    const data = await apiCall('GET', '/v1/labs');
    const labs = data.labs || [];
    const lab = labs.find((l: any) => l.name === name || l.id === name);

    if (!lab) {
      console.error(`\n\u274C Lab "${name}" not found.\n`);
      process.exit(1);
    }

    const share = await apiCall('POST', `/v1/labs/${lab.id}/share`);

    console.log(`\n\u{1F517} Share "${name}"\n`);
    console.log(`   Connection (read-only):\n   ${share.connectionString}\n`);
    console.log(`   Expires: ${share.expiresAt}`);
    console.log(`   \u{26A0}\uFE0F  Recipients can query but should not modify data.\n`);
  } catch (err: any) {
    console.error(`\n\u274C ${err.message}\n`);
  }
}
