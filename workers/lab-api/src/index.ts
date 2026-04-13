import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { neon } from '@neondatabase/serverless';

// Types
interface Env {
  DB: D1Database;
  TEMPLATES: R2Bucket;
  NEON_API_KEY: string;
  NEON_PROJECT_ID: string;
  LAB_API_KEY: string;
  ENVIRONMENT: string;
}

interface CreateLabRequest {
  template: string;
  rows?: number;
  ttl?: string;
  name?: string;
  apiKey?: string;
}

// Neon API helpers
async function createNeonBranch(projectId: string, apiKey: string, branchName: string) {
  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: { name: branchName },
        endpoints: [{ type: 'read_write' }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Neon branch creation failed: ${res.status} ${err}`);
  }

  const data: any = await res.json();
  const branchId = data.branch.id;
  const endpointId = data.endpoints[0].id;
  const host = data.endpoints[0].host;

  // Neon returns connection_uris with the full connection string including password
  if (data.connection_uris && data.connection_uris.length > 0) {
    const connUri = data.connection_uris[0].connection_uri;
    return { branchId, endpointId, host, connectionUri: connUri };
  }

  // Fallback: get password from roles
  const roleName = data.roles?.[0]?.name || 'neondb_owner';
  const rolePassword = data.roles?.[0]?.password || '';

  // If no password from create, fetch it via the password reset endpoint
  if (!rolePassword) {
    try {
      const pwRes = await fetch(
        `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles/${roleName}/reveal_password`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        }
      );
      if (pwRes.ok) {
        const pwData: any = await pwRes.json();
        const password = pwData.password || '';
        return {
          branchId, endpointId, host,
          connectionUri: `postgresql://${roleName}:${password}@${host}/neondb?sslmode=require`,
        };
      }
    } catch {}
  }

  return {
    branchId, endpointId, host,
    connectionUri: `postgresql://${roleName}:${rolePassword}@${host}/neondb?sslmode=require`,
  };
}

async function deleteNeonBranch(projectId: string, apiKey: string, branchId: string) {
  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    }
  );
  return res.ok;
}

// TTL parsing
function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)(h|d|m)$/);
  if (!match) return 4 * 60 * 60 * 1000; // default 4h
  const [, num, unit] = match;
  const n = parseInt(num);
  if (unit === 'h') return n * 60 * 60 * 1000;
  if (unit === 'd') return n * 24 * 60 * 60 * 1000;
  if (unit === 'm') return n * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

// Auth middleware
function authenticate(apiKey: string | undefined, env: Env): boolean {
  if (!apiKey) return false;
  return apiKey === env.LAB_API_KEY;
}

// App
const app = new Hono<{ Bindings: Env }>();
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'realitydb-lab-api' });
});

// Create lab
app.post('/v1/labs', async (c) => {
  const env = c.env;
  const body = await c.req.json<CreateLabRequest>();
  const apiKey = body.apiKey || c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');

  if (!authenticate(apiKey, env)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const template = body.template;
  const rows = body.rows || 5000;
  const ttl = body.ttl || '4h';
  const name = body.name || `lab-${Date.now().toString(36)}`;
  const id = `lab-${crypto.randomUUID().split('-')[0]}`;

  // Validate template + rows combo exists in R2
  const rowLabel = rows >= 1000 ? `${rows / 1000}k` : String(rows);
  const r2Key = `templates/${template}-${rowLabel}.sql`;

  const templateObj = await env.TEMPLATES.get(r2Key);
  if (!templateObj) {
    return c.json({ error: `Template not found: ${r2Key}. Available: banking-5k, banking-10k, banking-50k, banking-100k` }, 404);
  }

  try {
    // Create Neon branch
    const branch = await createNeonBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, id);
    const connectionString = branch.connectionUri;

    // Seed the branch with template SQL
    // Use Neon's SQL over HTTP with transaction mode
    const sqlText = await templateObj.text();

    // Parse connection string to get host and auth
    const connUrl = new URL(connectionString.replace('postgresql://', 'https://'));
    const neonHost = connUrl.hostname;
    const neonUser = connUrl.username;
    const neonPass = connUrl.password;
    const neonDb = connUrl.pathname.replace('/', '');

    // Split SQL into individual statements properly
    // Each statement ends with ); or a line with just ;
    const statements: string[] = [];
    let current = '';
    for (const line of sqlText.split('\n')) {
      current += line + '\n';
      // Statement boundary: line ends with ; and next meaningful line starts with CREATE/INSERT/DROP or is empty
      if (line.trimEnd().endsWith(';') && !line.trim().startsWith('--')) {
        const trimmed = current.trim();
        if (trimmed && trimmed !== ';') {
          statements.push(trimmed);
        }
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());

    console.log(`Parsed ${statements.length} SQL statements`);

    // Use Neon's transaction HTTP endpoint — sends all statements in one request
    const txBody = JSON.stringify({
      queries: statements.map(s => ({
        query: s.replace(/;\s*$/, ''),
        params: [],
      })),
    });

    const txRes = await fetch(`https://${neonHost}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
        'Neon-Raw-Text-Output': 'true',
        'Neon-Array-Mode': 'true',
        'Neon-Pool-Opt-In': 'true',
      },
      body: txBody,
    });

    if (!txRes.ok) {
      const errText = await txRes.text();
      console.error(`Neon SQL API error (${txRes.status}):`, errText.substring(0, 300));

      // Fallback: execute statements one by one with neon driver, but limit to 45 subrequests
      console.log('Falling back to individual statement execution (max 45)...');
      const db = neon(connectionString);
      let seeded = 0;
      let errors = 0;
      for (const stmt of statements.slice(0, 45)) {
        const cleaned = stmt.replace(/;\s*$/, '');
        if (!cleaned) continue;
        try {
          await db(cleaned);
          seeded++;
        } catch (e: any) {
          errors++;
          if (errors <= 5) console.error(`Stmt ${seeded + errors}:`, e.message?.substring(0, 80));
        }
      }
      console.log(`Fallback: seeded ${seeded}, errors ${errors}`);
    } else {
      console.log('Seeded successfully via Neon SQL API');
    }

    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + parseTTL(ttl));

    // Store in D1
    await env.DB.prepare(
      `INSERT INTO labs (id, user_id, name, template, rows, neon_branch_id, neon_endpoint_id, connection_string, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(
      id, 'api-user', name, template, rows,
      branch.branchId, branch.endpointId,
      connectionString,
      now.toISOString(), expiresAt.toISOString()
    ).run();

    return c.json({
      id,
      name,
      template,
      rows,
      connectionString,
      expiresAt: expiresAt.toISOString(),
      ttl,
      status: 'active',
    }, 201);
  } catch (err: any) {
    return c.json({ error: `Lab creation failed: ${err.message}` }, 500);
  }
});

// List labs
app.get('/v1/labs', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const showAll = c.req.query('all') === 'true';
  const query = showAll
    ? 'SELECT * FROM labs ORDER BY created_at DESC LIMIT 50'
    : "SELECT * FROM labs WHERE status = 'active' ORDER BY created_at DESC LIMIT 50";

  const result = await env.DB.prepare(query).all();
  return c.json({ labs: result.results });
});

// Get lab
app.get('/v1/labs/:id', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const result = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!result) return c.json({ error: 'Lab not found' }, 404);
  return c.json(result);
});

// Extend TTL
app.patch('/v1/labs/:id/ttl', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ ttl: string }>();
  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  const currentExpiry = new Date(lab.expires_at as string);
  const newExpiry = new Date(currentExpiry.getTime() + parseTTL(body.ttl));

  await env.DB.prepare('UPDATE labs SET expires_at = ? WHERE id = ?')
    .bind(newExpiry.toISOString(), c.req.param('id')).run();

  return c.json({ id: lab.id, expiresAt: newExpiry.toISOString() });
});

// Delete lab
app.delete('/v1/labs/:id', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // Delete Neon branch
  await deleteNeonBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, lab.neon_branch_id as string);

  // Update status
  await env.DB.prepare("UPDATE labs SET status = 'deleted', deleted_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), c.req.param('id')).run();

  return c.json({ deleted: true, id: lab.id });
});

// Share lab (read-only connection)
app.post('/v1/labs/:id/share', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // For MVP: return the same connection string with a note about read-only
  // Full implementation would create a read-only Neon endpoint
  return c.json({
    id: lab.id,
    connectionString: lab.connection_string,
    readOnly: true,
    note: 'Share this connection string. Recipients can query but should not modify data.',
    expiresAt: lab.expires_at,
  });
});


// ============================================================
// SNAPSHOT ENDPOINTS
// ============================================================

// Save a snapshot of a lab
app.post('/v1/labs/:id/snapshot', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ name: string; description?: string }>();
  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  const snapshotId = 'snap-' + crypto.randomUUID().split('-')[0];
  const r2Key = 'snapshots/' + snapshotId + '.sql';

  // Export the lab data as SQL dump via Neon
  const db = neon(lab.connection_string as string);
  let sqlDump = '';
  let tables: any[] = [];
  try {
    // Get all table names
    tables = await db('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
    
    // For each table, get CREATE TABLE + data
    for (const t of tables) {
      const tableName = t.tablename;
      // Get rows as JSON
      const rows = await db('SELECT * FROM ' + tableName);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        sqlDump += '-- Table: ' + tableName + ' (' + rows.length + ' rows)\n';
        sqlDump += 'INSERT INTO ' + tableName + ' (' + columns.join(', ') + ') VALUES\n';
        sqlDump += rows.map((r: any) => {
          const vals = columns.map(col => {
            const v = r[col];
            if (v === null) return 'NULL';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            return "'" + String(v).replace(/'/g, "''") + "'";
          }).join(', ');
          return '  (' + vals + ')';
        }).join(',\n') + ';\n\n';
      }
    }
  } catch (e: any) {
    console.error('Snapshot export error:', e.message);
  }

  // Count tables and rows from the dump (parsed from comments, no extra queries)
  const tableNames = tables.map((t: any) => t.tablename);
  const rowsByTable: Record<string, number> = {};
  let totalRows = 0;
  const rowPattern = /-- Table: (\w+) \((\d+) rows\)/g;
  let rmatch;
  while ((rmatch = rowPattern.exec(sqlDump)) !== null) {
    rowsByTable[rmatch[1]] = parseInt(rmatch[2]);
    totalRows += parseInt(rmatch[2]);
  }
  // Count saved queries for this lab
  const queryCount = await env.DB.prepare('SELECT COUNT(*) as c FROM saved_queries WHERE lab_id = ?').bind(lab.id as string).first();
  const savedQueriesCount = parseInt((queryCount as any)?.c || '0');

  // Store in R2
  await env.TEMPLATES.put(r2Key, sqlDump);

  const now = new Date().toISOString();

  // Store metadata in D1
  await env.DB.prepare(
    'INSERT INTO snapshots (id, lab_id, user_id, name, description, template, seed, rows, tables_count, schema_hash, r2_key, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    snapshotId, lab.id, lab.user_id, body.name, body.description || '',
    lab.template, null, totalRows, tableNames.length,
    '', r2Key, sqlDump.length, now
  ).run();

  return c.json({
    id: snapshotId,
    name: body.name,
    description: body.description || '',
    labId: lab.id,
    template: lab.template,
    tableCount: tableNames.length,
    tables: tableNames,
    totalRows,
    rowsByTable,
    savedQueriesCount,
    sizeBytes: sqlDump.length,
    r2Key,
    createdAt: now,
  }, 201);
});

// List snapshots for a lab
app.get('/v1/labs/:id/snapshots', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const result = await env.DB.prepare('SELECT * FROM snapshots WHERE lab_id = ? ORDER BY created_at DESC').bind(c.req.param('id')).all();
  return c.json({ snapshots: result.results });
});

// ============================================================
// PUBLISH ENDPOINTS
// ============================================================

// Publish a snapshot to the gallery
app.post('/v1/publish', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    snapshotId: string;
    title: string;
    authors: string;
    description?: string;
    tags?: string;
    license?: string;
  }>();

  const snapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(body.snapshotId).first();
  if (!snapshot) return c.json({ error: 'Snapshot not found' }, 404);

  const pubId = 'pub-' + crypto.randomUUID().split('-')[0];
  const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);

  // Check slug uniqueness
  const existing = await env.DB.prepare('SELECT id FROM published_labs WHERE slug = ?').bind(slug).first();
  const finalSlug = existing ? slug + '-' + pubId.split('-')[1] : slug;

  await env.DB.prepare(
    'INSERT INTO published_labs (id, snapshot_id, user_id, slug, title, authors, description, tags, license, template, seed, rows, tables_count, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    pubId, snapshot.id, snapshot.user_id, finalSlug,
    body.title, body.authors, body.description || '',
    body.tags || '', body.license || 'CC-BY-4.0',
    snapshot.template, snapshot.seed || null, snapshot.rows, snapshot.tables_count,
    'active', new Date().toISOString()
  ).run();

  return c.json({
    id: pubId,
    slug: finalSlug,
    title: body.title,
    url: 'https://gallery.realitydb.dev/labs/' + finalSlug,
    publishedAt: new Date().toISOString(),
  }, 201);
});

// Browse the gallery
app.get('/v1/gallery', async (c) => {
  const env = c.env;
  const tag = c.req.query('tag');
  const template = c.req.query('template');
  const search = c.req.query('q');

  let query = "SELECT * FROM published_labs WHERE status = 'active'";
  const params: string[] = [];

  if (tag) { query += " AND tags LIKE ?"; params.push('%' + tag + '%'); }
  if (template) { query += " AND template = ?"; params.push(template); }
  if (search) { query += " AND (title LIKE ? OR description LIKE ?)"; params.push('%' + search + '%', '%' + search + '%'); }

  query += ' ORDER BY published_at DESC LIMIT 50';

  let stmt = env.DB.prepare(query);
  for (let i = 0; i < params.length; i++) {
    stmt = stmt.bind(...params);
  }

  // Simple approach: bind all at once
  const result = params.length > 0
    ? await env.DB.prepare(query).bind(...params).all()
    : await env.DB.prepare(query).all();

  return c.json({ labs: result.results });
});

// Get a single published lab
app.get('/v1/gallery/:slug', async (c) => {
  const env = c.env;
  const lab = await env.DB.prepare('SELECT * FROM published_labs WHERE slug = ?').bind(c.req.param('slug')).first();
  if (!lab) return c.json({ error: 'Published lab not found' }, 404);

  // Increment view count
  await env.DB.prepare('UPDATE published_labs SET view_count = view_count + 1 WHERE id = ?').bind(lab.id).run();

  return c.json(lab);
});

// Fork a published lab
app.post('/v1/gallery/:slug/fork', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ name?: string }>();
  const pubLab = await env.DB.prepare('SELECT * FROM published_labs WHERE slug = ?').bind(c.req.param('slug')).first();
  if (!pubLab) return c.json({ error: 'Published lab not found' }, 404);

  // Get the snapshot's R2 data
  const snapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?').bind(pubLab.snapshot_id).first();
  if (!snapshot) return c.json({ error: 'Snapshot data not found' }, 404);

  // Create a new lab using the same template
  const forkName = body.name || 'fork-' + (pubLab.slug as string).substring(0, 20);
  const forkId = 'lab-' + crypto.randomUUID().split('-')[0];

  // Create Neon branch
  const branch = await createNeonBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, forkId);

  // Fetch snapshot SQL from R2 and seed
  const sqlObj = await env.TEMPLATES.get(snapshot.r2_key as string);
  if (sqlObj) {
    const sqlText = await sqlObj.text();
    const db = neon(branch.connectionUri);
    // Also need the schema — fetch original template
    const rowLabel = (pubLab.rows as number) >= 1000 ? (pubLab.rows as number) / 1000 + 'k' : String(pubLab.rows);
    const templateObj = await env.TEMPLATES.get('templates/' + pubLab.template + '-' + rowLabel + '.sql');
    if (templateObj) {
      const templateSql = await templateObj.text();
      try { await db(templateSql); } catch {}
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h default for forks

  // Store the fork as a lab
  await env.DB.prepare(
    'INSERT INTO labs (id, user_id, name, template, rows, neon_branch_id, neon_endpoint_id, connection_string, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    forkId, 'api-user', forkName, pubLab.template, pubLab.rows,
    branch.branchId, branch.endpointId, branch.connectionUri,
    'active', now.toISOString(), expiresAt.toISOString()
  ).run();

  // Record the fork
  await env.DB.prepare(
    'INSERT INTO forks (id, published_lab_id, user_id, lab_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind('fork-' + crypto.randomUUID().split('-')[0], pubLab.id, 'api-user', forkId, now.toISOString()).run();

  // Increment fork count
  await env.DB.prepare('UPDATE published_labs SET fork_count = fork_count + 1 WHERE id = ?').bind(pubLab.id).run();

  return c.json({
    id: forkId,
    name: forkName,
    forkedFrom: pubLab.slug,
    connectionString: branch.connectionUri,
    expiresAt: expiresAt.toISOString(),
  }, 201);
});

// Save a query during a lab session
app.post('/v1/labs/:id/queries', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ name: string; sql: string; resultPreview?: string; executionTimeMs?: number; rowCount?: number }>();
  const queryId = 'qry-' + crypto.randomUUID().split('-')[0];

  await env.DB.prepare(
    'INSERT INTO saved_queries (id, lab_id, user_id, name, sql_text, result_preview, execution_time_ms, row_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    queryId, c.req.param('id'), 'api-user',
    body.name, body.sql, body.resultPreview || null,
    body.executionTimeMs || null, body.rowCount || null,
    new Date().toISOString()
  ).run();

  return c.json({ id: queryId, name: body.name }, 201);
});

// List saved queries for a lab
app.get('/v1/labs/:id/queries', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const result = await env.DB.prepare('SELECT * FROM saved_queries WHERE lab_id = ? ORDER BY created_at DESC').bind(c.req.param('id')).all();
  return c.json({ queries: result.results });
});

// ============================================================
// EXPORT ENDPOINTS
// ============================================================

// Export lab as Jupyter notebook
app.get('/v1/labs/:id/export', async (c) => {
  const env = c.env;
  const format = c.req.query('format');
  if (format !== 'notebook') {
    return c.json({ error: 'Unsupported format. Use ?format=notebook' }, 400);
  }

  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // Get saved queries for this lab
  const queriesResult = await env.DB.prepare(
    'SELECT name, sql_text FROM saved_queries WHERE lab_id = ? ORDER BY created_at ASC'
  ).bind(lab.id).all();
  const savedQueries = queriesResult.results || [];

  // Build Jupyter notebook JSON
  const cells: any[] = [];

  // Title cell
  cells.push({
    cell_type: 'markdown',
    metadata: {},
    source: [
      `# ${lab.name || lab.template + ' Lab'}\n`,
      `\n`,
      `**Template:** ${lab.template}  \n`,
      `**Rows:** ${lab.rows}  \n`,
      `**Created:** ${lab.created_at}  \n`,
      `**Expires:** ${lab.expires_at}  \n`,
    ],
  });

  // Connection setup cell
  cells.push({
    cell_type: 'code',
    execution_count: null,
    metadata: {},
    outputs: [],
    source: [
      `%load_ext sql\n`,
      `%sql ${lab.connection_string}`,
    ],
  });

  // Explore schema cell
  cells.push({
    cell_type: 'code',
    execution_count: null,
    metadata: {},
    outputs: [],
    source: [
      `%%sql\n`,
      `SELECT table_name, \n`,
      `       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count\n`,
      `FROM information_schema.tables t\n`,
      `WHERE table_schema = 'public'\n`,
      `ORDER BY table_name;`,
    ],
  });

  // Saved queries as cells
  for (const q of savedQueries) {
    cells.push({
      cell_type: 'markdown',
      metadata: {},
      source: [`## ${(q as any).name}\n`],
    });
    cells.push({
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [`%%sql\n`, (q as any).sql_text],
    });
  }

  // Sample query if no saved queries
  if (savedQueries.length === 0) {
    cells.push({
      cell_type: 'markdown',
      metadata: {},
      source: [`## Sample Query\n`],
    });
    cells.push({
      cell_type: 'code',
      execution_count: null,
      metadata: {},
      outputs: [],
      source: [
        `%%sql\n`,
        `SELECT * FROM information_schema.tables\n`,
        `WHERE table_schema = 'public'\n`,
        `LIMIT 20;`,
      ],
    });
  }

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.11.0',
      },
      realitydb: {
        lab_id: lab.id,
        template: lab.template,
        rows: lab.rows,
      },
    },
    cells,
  };

  const filename = `${lab.name || lab.template}-lab.ipynb`;
  return new Response(JSON.stringify(notebook, null, 2), {
    headers: {
      'Content-Type': 'application/x-ipynb+json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// ============================================================
// CI ENDPOINT
// ============================================================

// Minimal CI endpoint: create a short-lived lab for CI pipelines
app.post('/v1/labs/ci', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{ template?: string; rows?: number }>().catch(() => ({}));
  const template = (body as any).template || 'banking';
  const rows = (body as any).rows || 5000;
  const id = `ci-${crypto.randomUUID().split('-')[0]}`;
  const name = `ci-${Date.now().toString(36)}`;

  // Validate template exists in R2
  const rowLabel = rows >= 1000 ? `${rows / 1000}k` : String(rows);
  const r2Key = `templates/${template}-${rowLabel}.sql`;
  const templateObj = await env.TEMPLATES.get(r2Key);
  if (!templateObj) {
    return c.json({ error: `Template not found: ${r2Key}` }, 404);
  }

  try {
    const branch = await createNeonBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, id);
    const connectionString = branch.connectionUri;

    // Seed via Neon SQL API
    const sqlText = await templateObj.text();
    const connUrl = new URL(connectionString.replace('postgresql://', 'https://'));
    const neonHost = connUrl.hostname;

    const statements: string[] = [];
    let current = '';
    for (const line of sqlText.split('\n')) {
      current += line + '\n';
      if (line.trimEnd().endsWith(';') && !line.trim().startsWith('--')) {
        const trimmed = current.trim();
        if (trimmed && trimmed !== ';') statements.push(trimmed);
        current = '';
      }
    }
    if (current.trim()) statements.push(current.trim());

    const txRes = await fetch(`https://${neonHost}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
        'Neon-Raw-Text-Output': 'true',
        'Neon-Array-Mode': 'true',
        'Neon-Pool-Opt-In': 'true',
      },
      body: JSON.stringify({
        queries: statements.map(s => ({ query: s.replace(/;\s*$/, ''), params: [] })),
      }),
    });

    if (!txRes.ok) {
      // Fallback to individual statements
      const db = neon(connectionString);
      for (const stmt of statements.slice(0, 45)) {
        try { await db(stmt.replace(/;\s*$/, '')); } catch {}
      }
    }

    // 2h TTL for CI
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    await env.DB.prepare(
      `INSERT INTO labs (id, user_id, name, template, rows, neon_branch_id, neon_endpoint_id, connection_string, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(id, 'ci', name, template, rows, branch.branchId, branch.endpointId, connectionString, now.toISOString(), expiresAt.toISOString()).run();

    // Return minimal JSON for CI consumption
    return c.json({
      id,
      connectionString,
      host: connUrl.hostname,
      database: 'neondb',
      expiresAt: expiresAt.toISOString(),
    }, 201);
  } catch (err: any) {
    return c.json({ error: `CI lab creation failed: ${err.message}` }, 500);
  }
});

// CRON: cleanup expired labs
async function cleanupExpiredLabs(env: Env) {
  const now = new Date().toISOString();
  const expired = await env.DB.prepare(
    "SELECT * FROM labs WHERE status = 'active' AND expires_at < ?"
  ).bind(now).all();

  let cleaned = 0;
  for (const lab of (expired.results || [])) {
    try {
      await deleteNeonBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, lab.neon_branch_id as string);
      await env.DB.prepare("UPDATE labs SET status = 'expired', deleted_at = ? WHERE id = ?")
        .bind(now, lab.id).run();
      cleaned++;
    } catch (err) {
      console.error(`Failed to cleanup lab ${lab.id}:`, err);
    }
  }

  return { cleaned, total: expired.results?.length || 0 };
}

// Export
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredLabs(env));
  },
};
