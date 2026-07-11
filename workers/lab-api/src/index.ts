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
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DODO_API_KEY: string;        // Dodo Payments — test secret key
  DODO_WEBHOOK_SECRET: string; // Dodo Payments — webhook signing secret
}

interface CreateLabRequest {
  template: string;
  rows?: number;
  ttl?: string;
  name?: string;
  apiKey?: string;
  userId?: string;
  seed?: number;
}

// ── Tier Definitions ────────────────────────────────────────

const TIER_LIMITS: Record<string, { maxRows: number; maxActiveLabs: number; downloadsPerMonth: number; labsDaily: number; defaultTTL?: string }> = {
  free:       { maxRows: 5000,    maxActiveLabs: 2,  downloadsPerMonth: 0,  labsDaily: 5 },
  core:       { maxRows: 50000,   maxActiveLabs: 3,  downloadsPerMonth: 2,  labsDaily: 10 },
  compliance: { maxRows: 100000,  maxActiveLabs: 10, downloadsPerMonth: 5,  labsDaily: 20 },
  research:   { maxRows: 100000,  maxActiveLabs: 5,  downloadsPerMonth: 10, labsDaily: 5, defaultTTL: '720h' },
  enterprise: { maxRows: 1000000, maxActiveLabs: -1, downloadsPerMonth: -1, labsDaily: -1 },
};

const DATASET_PRICING: Record<string, Record<string, number>> = {
  banking:        { '5k': 0, '50k': 4900, '100k': 7900, '500k': 29900, '1000k': 49900 },
  oncology:       { '5k': 0, '50k': 9900, '100k': 14900, '500k': 29900, '1000k': 49900 },
  healthcare:     { '5k': 0, '50k': 9900, '100k': 14900, '500k': 29900, '1000k': 49900 },
  'supply-chain': { '5k': 0, '50k': 4900, '100k': 7900, '500k': 29900, '1000k': 49900 },
  aml:            { '5k': 0, '50k': 9900, '100k': 14900, '500k': 29900, '1000k': 49900 },
  fintech:        { '5k': 0, '50k': 4900, '100k': 7900, '500k': 29900, '1000k': 49900 },
  telecom:        { '5k': 0, '50k': 9900, '100k': 14900, '500k': 29900, '1000k': 49900 },
  universal:      { '5k': 0, '50k': 4900, '100k': 7900, '500k': 29900, '1000k': 49900 },
  'eu-banking':    { '5k': 0, '10k': 0, '50k': 14900, '100k': 24900, '500k': 49900, '1000k': 99900 },
  'eu-healthcare': { '5k': 0, '10k': 0, '50k': 14900, '100k': 24900, '500k': 49900, '1000k': 99900 },
  'eu-telecom':    { '5k': 0, '10k': 0, '50k': 14900, '100k': 24900, '500k': 49900, '1000k': 99900 },
};

// ── Badge Definitions ───────────────────────────────────────

const BADGE_DEFINITIONS: Record<string, { name: string; description: string; tiers: { bronze: number; silver: number; gold: number; platinum: number } }> = {
  join_master:      { name: 'JOIN Master', description: 'Complete all JOIN challenges with 80%+', tiers: { bronze: 3, silver: 6, gold: 10, platinum: 15 } },
  window_pro:       { name: 'Window Functions Pro', description: 'Complete window function challenges', tiers: { bronze: 2, silver: 5, gold: 8, platinum: 12 } },
  aggregation:      { name: 'Aggregation Expert', description: 'All GROUP BY + HAVING challenges', tiers: { bronze: 3, silver: 6, gold: 10, platinum: 15 } },
  schema_navigator: { name: 'Schema Navigator', description: 'Query across 5+ tables in one session', tiers: { bronze: 1, silver: 3, gold: 5, platinum: 10 } },
  data_detective:   { name: 'Data Detective', description: 'Find the trap in challenges', tiers: { bronze: 2, silver: 5, gold: 8, platinum: 12 } },
  volume_handler:   { name: 'Volume Handler', description: 'Complete challenges on 50K+ row labs', tiers: { bronze: 1, silver: 3, gold: 5, platinum: 10 } },
  certified_pro:    { name: 'Certified Professional', description: 'Earn certifications', tiers: { bronze: 1, silver: 2, gold: 3, platinum: 3 } },
};

// ── Entitlement Helpers ─────────────────────────────────────

async function getEntitlement(db: D1Database, userId: string) {
  const ent = await db.prepare('SELECT * FROM entitlements WHERE user_id = ? AND status = ?')
    .bind(userId, 'active').first();
  if (ent) return ent;
  // Return free tier defaults
  return {
    tier: 'free',
    max_rows: 5000,
    max_active_labs: 2,
    downloads_per_month: 0,
    downloads_used_this_month: 0,
    labs_created_today: 0,
    labs_daily_limit: 5,
  };
}

async function checkLabCreationAllowed(db: D1Database, userId: string, requestedRows: number): Promise<{ allowed: boolean; reason?: string; tier: string }> {
  const ent = await getEntitlement(db, userId);
  const tier = ent.tier as string;
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

  // Check row limit
  if (requestedRows > limits.maxRows) {
    return { allowed: false, reason: `Your ${tier} tier allows up to ${limits.maxRows} rows. Upgrade for more.`, tier };
  }

  // Check active lab count
  if (limits.maxActiveLabs !== -1) {
    const active = await db.prepare("SELECT COUNT(*) as c FROM labs WHERE user_id = ? AND status = 'active'")
      .bind(userId).first();
    const count = parseInt((active as any)?.c || '0');
    if (count >= limits.maxActiveLabs) {
      return { allowed: false, reason: `You have ${count} active labs (limit: ${limits.maxActiveLabs}). Delete a lab or upgrade.`, tier };
    }
  }

  // Check daily rate limit
  if (limits.labsDaily !== -1) {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = await db.prepare("SELECT COUNT(*) as c FROM labs WHERE user_id = ? AND created_at LIKE ?")
      .bind(userId, todayStr + '%').first();
    const todayCount = parseInt((today as any)?.c || '0');
    if (todayCount >= limits.labsDaily) {
      return { allowed: false, reason: `Daily lab creation limit reached (${limits.labsDaily}/day). Try again tomorrow.`, tier };
    }
  }

  // Check if user has a one-time purchase for higher rows
  if (requestedRows > limits.maxRows) {
    const rowLabel = requestedRows >= 1000 ? `${requestedRows / 1000}k` : String(requestedRows);
    const purchase = await db.prepare(
      "SELECT * FROM dataset_purchases WHERE user_id = ? AND rows >= ? AND status = 'completed' AND lab_credits_remaining > 0"
    ).bind(userId, requestedRows).first();

    if (purchase) {
      // Decrement lab credit
      await db.prepare('UPDATE dataset_purchases SET lab_credits_remaining = lab_credits_remaining - 1 WHERE id = ?')
        .bind(purchase.id).run();
      return { allowed: true, tier: tier + '+purchase' };
    }
    return { allowed: false, reason: `Row count ${requestedRows} requires a higher tier or one-time purchase.`, tier };
  }

  return { allowed: true, tier };
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

// Mask password in connection string for list responses
function maskConnection(conn: string): string {
  if (!conn) return conn;
  return conn.replace(/:([^@]+)@/, ':****@');
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
  const userId = body.userId || 'api-user';
  const seed = body.seed ?? null;
  const id = `lab-${crypto.randomUUID().split('-')[0]}`;

  // Check entitlements (skip for api-user default to maintain backward compat)
  if (userId !== 'api-user') {
    const check = await checkLabCreationAllowed(env.DB, userId, rows);
    if (!check.allowed) {
      return c.json({ error: check.reason, tier: check.tier, upgradeRequired: true }, 403);
    }
  }

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
      `INSERT INTO labs (id, user_id, name, template, rows, seed, neon_branch_id, neon_endpoint_id, connection_string, status, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    ).bind(
      id, userId, name, template, rows, seed,
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
  // Mask connection strings in list responses — full connection available via GET /v1/labs/:id
  const labs = (result.results || []).map((lab: any) => ({
    ...lab,
    connection_string: maskConnection(lab.connection_string as string),
  }));
  return c.json({ labs });
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

// Execute SQL against a lab's database (proxy)
app.post('/v1/labs/:id/query', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);
  if (lab.status !== 'active') return c.json({ error: `Lab is ${lab.status}` }, 400);

  const { sql: query } = await c.req.json<{ sql: string }>();
  if (!query?.trim()) return c.json({ error: 'No SQL provided' }, 400);

  const start = Date.now();
  try {
    const sql = neon(lab.connection_string as string);
    const result = await sql(query);
    const duration = Date.now() - start;

    return c.json({
      columns: result.length > 0 ? Object.keys(result[0]) : [],
      rows: result,
      rowCount: result.length,
      duration,
    });
  } catch (err: any) {
    return c.json({ error: err.message, duration: Date.now() - start }, 400);
  }
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
    expiresAt: new Date(lab.expires_at as string).toISOString(),
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
    lab.template, lab.seed ?? null, totalRows, tableNames.length,
    '', r2Key, sqlDump.length, now
  ).run();

  return c.json({
    id: snapshotId,
    name: body.name,
    description: body.description || '',
    labId: lab.id,
    template: lab.template,
    seed: lab.seed ?? null,
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

  try {
    const body = await c.req.json<{
      snapshotId: string;
      title: string;
      authors: string;
      description?: string;
      tags?: string | string[];
      license?: string;
    }>();

    // Normalize tags: the SimLabV3 client sends an array, but D1 .bind() only
    // accepts scalar values — passing an array here threw and produced a bare 500.
    const tagsValue = Array.isArray(body.tags) ? body.tags.join(',') : (body.tags ?? '');

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
      tagsValue, body.license || 'CC-BY-4.0',
      snapshot.template, snapshot.seed ?? null, snapshot.rows, snapshot.tables_count,
      'active', new Date().toISOString()
    ).run();

    return c.json({
      id: pubId,
      slug: finalSlug,
      title: body.title,
      url: 'https://gallery.realitydb.dev/labs/' + finalSlug,
      publishedAt: new Date().toISOString(),
    }, 201);
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'publish_failed', detail: err?.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
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

// Export lab as Jupyter notebook — with live schema introspection and pandas
app.get('/v1/labs/:id/export', async (c) => {
  const env = c.env;
  const format = c.req.query('format');
  if (format !== 'notebook') {
    return c.json({ error: 'Unsupported format. Use ?format=notebook' }, 400);
  }

  const lab = await env.DB.prepare('SELECT * FROM labs WHERE id = ?').bind(c.req.param('id')).first();
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // Fetch live schema from the database
  let schemaMarkdown = 'Schema information unavailable (database may be suspended).';
  try {
    const sql = neon(lab.connection_string as string);
    const tables = await sql(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const schemaLines: string[] = [];
    for (const t of tables as any[]) {
      const cols = await sql(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [t.table_name]
      );

      schemaLines.push(`### ${t.table_name}`);
      schemaLines.push('| Column | Type | Nullable |');
      schemaLines.push('|--------|------|----------|');
      for (const col of cols as any[]) {
        schemaLines.push(`| ${col.column_name} | ${col.data_type} | ${col.is_nullable} |`);
      }
      schemaLines.push('');
    }
    schemaMarkdown = schemaLines.join('\n');
  } catch {
    // If DB is unreachable, use placeholder
  }

  // Fetch saved queries
  const queriesResult = await env.DB.prepare(
    'SELECT name, sql_text FROM saved_queries WHERE lab_id = ? ORDER BY created_at ASC'
  ).bind(lab.id).all();
  const savedQueries = queriesResult.results || [];

  // Cell builders
  const mdCell = (lines: string[]) => ({
    cell_type: 'markdown',
    metadata: {},
    source: lines.map((l, i) => (i < lines.length - 1 ? l + '\n' : l)),
  });
  const codeCell = (lines: string[]) => ({
    cell_type: 'code',
    execution_count: null,
    metadata: {},
    outputs: [],
    source: lines.map((l, i) => (i < lines.length - 1 ? l + '\n' : l)),
  });

  const cells: any[] = [];

  // Title cell
  cells.push(mdCell([
    `# RealityDB Lab: ${lab.name || lab.template}`,
    '',
    `- **Template:** ${lab.template}`,
    `- **Rows:** ${(lab.rows as number).toLocaleString()}`,
    `- **Created:** ${lab.created_at}`,
    `- **Expires:** ${lab.expires_at}`,
    `- **Lab ID:** \`${lab.id}\``,
  ]));

  // Schema cell
  cells.push(mdCell([
    '## Database Schema',
    '',
    schemaMarkdown,
  ]));

  // Setup cell
  cells.push(codeCell([
    '# Install dependencies (run once)',
    '!pip install psycopg2-binary pandas sqlalchemy -q',
  ]));

  // Connection cell (mask password — user fills in from `realitydb lab connect`)
  const maskedConn = maskConnection(lab.connection_string as string);
  cells.push(codeCell([
    'import pandas as pd',
    'from sqlalchemy import create_engine',
    '',
    '# Replace **** with your actual password from `realitydb lab connect`',
    `DATABASE_URL = "${maskedConn}"`,
    '',
    'engine = create_engine(DATABASE_URL)',
    '',
    '# Quick test',
    "tables = pd.read_sql(\"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'\", engine)",
    'print(f"Connected! {len(tables)} tables available")',
    'tables',
  ]));

  // Saved query cells or default exploration
  if (savedQueries.length > 0) {
    cells.push(mdCell(['## Saved Queries', '']));
    for (const q of savedQueries as any[]) {
      cells.push(mdCell([`### ${q.name}`]));
      cells.push(codeCell([
        `# ${q.name}`,
        `df = pd.read_sql("""`,
        q.sql_text,
        `""", engine)`,
        'df.head(20)',
      ]));
    }
  } else {
    cells.push(mdCell(['## Explore the Data', '']));
    cells.push(codeCell([
      '# List all tables with row counts',
      "query = \"\"\"",
      "SELECT schemaname, tablename,",
      "       (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count",
      "FROM (",
      "  SELECT schemaname, tablename,",
      "         query_to_xml('SELECT count(*) AS cnt FROM ' || schemaname || '.' || tablename, false, true, '') AS xml_count",
      "  FROM pg_tables WHERE schemaname = 'public'",
      ") t ORDER BY row_count DESC",
      "\"\"\"",
      'pd.read_sql(query, engine)',
    ]));
  }

  // Reproducibility + citation cell
  cells.push(mdCell([
    '## Reproducibility',
    '',
    'This dataset was generated by RealityDB with deterministic seeding.',
    'Regenerate identical data with:',
    '',
    '```bash',
    `realitydb lab create ${lab.template} --rows ${lab.rows} --seed 42`,
    '```',
    '',
    '## Citation',
    '',
    '```bibtex',
    '@software{realitydb,',
    '  title = {RealityDB: Synthetic Data Generation Platform},',
    '  author = {Mpingo Systems},',
    '  url = {https://realitydb.dev},',
    `  year = {${new Date().getFullYear()}}`,
    '}',
    '```',
  ]));

  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.11.0' },
      realitydb: { lab_id: lab.id, template: lab.template, rows: lab.rows },
    },
    cells,
  };

  const filename = `realitydb-${lab.template}-${lab.rows}.ipynb`;
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

// ============================================================
// CERTIFICATE VERIFICATION (PUBLIC — no auth required)
// ============================================================

// Verify a certificate by cert_id
app.get('/v1/certs/:certId/verify', async (c) => {
  const env = c.env;
  const certId = c.req.param('certId');

  const cert = await env.DB.prepare('SELECT * FROM certificates WHERE cert_id = ?').bind(certId).first();
  if (!cert) {
    return c.json({ valid: false, error: 'Certificate not found' }, 404);
  }

  // Increment verified_count
  await env.DB.prepare('UPDATE certificates SET verified_count = verified_count + 1 WHERE cert_id = ?')
    .bind(certId).run();

  return c.json({
    valid: true,
    certId: cert.cert_id,
    level: cert.level,
    score: cert.score,
    grade: cert.grade,
    displayName: cert.display_name,
    challengeCount: cert.challenge_count,
    timeTakenSeconds: cert.time_taken_seconds,
    templateUsed: cert.template_used,
    issuedAt: cert.issued_at,
    verifiedCount: (cert.verified_count as number) + 1,
  });
});

// Sync a certificate from the frontend (called after exam completion)
app.post('/v1/certs', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    certId: string;
    userId: string;
    attemptId?: string;
    level: string;
    score: number;
    grade: string;
    displayName?: string;
    challengeCount?: number;
    timeTakenSeconds?: number;
    templateUsed?: string;
    issuedAt: string;
  }>();

  const id = 'cert-' + crypto.randomUUID().split('-')[0];

  await env.DB.prepare(
    `INSERT INTO certificates (id, cert_id, user_id, attempt_id, level, score, grade, display_name, challenge_count, time_taken_seconds, template_used, issued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(cert_id) DO UPDATE SET score = excluded.score, grade = excluded.grade`
  ).bind(
    id, body.certId, body.userId, body.attemptId || null,
    body.level, body.score, body.grade, body.displayName || null,
    body.challengeCount || null, body.timeTakenSeconds || null,
    body.templateUsed || null, body.issuedAt
  ).run();

  return c.json({ synced: true, certId: body.certId }, 201);
});

// List all certificates for a user
app.get('/v1/certs', async (c) => {
  const env = c.env;
  const userId = c.req.query('userId');
  if (!userId) return c.json({ error: 'userId query parameter required' }, 400);

  const result = await env.DB.prepare(
    'SELECT cert_id, level, score, grade, display_name, issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC'
  ).bind(userId).all();

  return c.json({ certificates: result.results });
});

// ============================================================
// ENTITLEMENT ENDPOINTS
// ============================================================

// Get user's current entitlement/tier
app.get('/v1/entitlements/:userId', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const ent = await getEntitlement(env.DB, c.req.param('userId'));
  return c.json(ent);
});

// Set/update user entitlement (called by Stripe webhook or admin)
app.put('/v1/entitlements/:userId', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const userId = c.req.param('userId');
  const body = await c.req.json<{
    tier: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    periodEnd?: string;
  }>();

  const limits = TIER_LIMITS[body.tier];
  if (!limits) return c.json({ error: `Unknown tier: ${body.tier}` }, 400);

  const now = new Date().toISOString();
  const id = 'ent-' + crypto.randomUUID().split('-')[0];

  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, tier, max_rows, max_active_labs, downloads_per_month, labs_daily_limit, stripe_customer_id, stripe_subscription_id, current_period_end, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET tier = excluded.tier, max_rows = excluded.max_rows, max_active_labs = excluded.max_active_labs, downloads_per_month = excluded.downloads_per_month, labs_daily_limit = excluded.labs_daily_limit, stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id, current_period_end = excluded.current_period_end, status = 'active', updated_at = excluded.updated_at`
  ).bind(
    id, userId, body.tier, limits.maxRows, limits.maxActiveLabs, limits.downloadsPerMonth, limits.labsDaily,
    body.stripeCustomerId || null, body.stripeSubscriptionId || null,
    body.periodEnd || null, now, now
  ).run();

  return c.json({ userId, tier: body.tier, limits });
});

// ============================================================
// BADGE ENDPOINTS
// ============================================================

// List badge definitions
app.get('/v1/badges', (c) => {
  return c.json({ badges: BADGE_DEFINITIONS });
});

// Get badges for a user
app.get('/v1/badges/:userId', async (c) => {
  const env = c.env;
  const result = await env.DB.prepare(
    'SELECT * FROM badges WHERE user_id = ? ORDER BY earned_at DESC'
  ).bind(c.req.param('userId')).all();

  return c.json({ badges: result.results });
});

// Award a badge (called by frontend after achievement)
app.post('/v1/badges', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    userId: string;
    badgeType: string;
    badgeTier: string;
    score?: number;
    challengesCompleted?: number;
  }>();

  if (!BADGE_DEFINITIONS[body.badgeType]) {
    return c.json({ error: `Unknown badge type: ${body.badgeType}` }, 400);
  }

  const id = 'badge-' + crypto.randomUUID().split('-')[0];
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO badges (id, user_id, badge_type, badge_tier, score, challenges_completed, earned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, badge_type) DO UPDATE SET badge_tier = excluded.badge_tier, score = excluded.score, challenges_completed = excluded.challenges_completed, earned_at = excluded.earned_at`
  ).bind(id, body.userId, body.badgeType, body.badgeTier, body.score || null, body.challengesCompleted || null, now).run();

  return c.json({
    id,
    badge: BADGE_DEFINITIONS[body.badgeType],
    tier: body.badgeTier,
    earnedAt: now,
  }, 201);
});

// ============================================================
// STORE ENDPOINTS
// ============================================================

// List available datasets with pricing
app.get('/v1/store', (c) => {
  const datasets = Object.entries(DATASET_PRICING).map(([template, prices]) => ({
    template,
    variants: Object.entries(prices).map(([size, priceCents]) => ({
      size,
      rows: parseInt(size) * 1000,
      priceCents,
      free: priceCents === 0,
    })),
  }));
  return c.json({ datasets, tiers: TIER_LIMITS });
});

// Get details for a specific dataset template
app.get('/v1/store/:template', async (c) => {
  const env = c.env;
  const template = c.req.param('template');
  const pricing = DATASET_PRICING[template];
  if (!pricing) return c.json({ error: 'Template not found' }, 404);

  // Try to get a 5-row preview from the 5k template
  const r2Key = `templates/${template}-5k.sql`;
  const templateObj = await env.TEMPLATES.get(r2Key);

  let preview: string[] = [];
  if (templateObj) {
    const sql = await templateObj.text();
    // Extract first INSERT block to show sample data
    const insertMatch = sql.match(/INSERT INTO (\w+) .+?VALUES\n([\s\S]*?);/);
    if (insertMatch) {
      const rows = insertMatch[2].split('\n').filter(l => l.trim().startsWith('(')).slice(0, 5);
      preview = rows.map(r => r.trim());
    }
  }

  return c.json({
    template,
    variants: Object.entries(pricing).map(([size, priceCents]) => ({
      size,
      rows: parseInt(size) * 1000,
      priceCents,
      free: priceCents === 0,
    })),
    preview,
  });
});

// Initiate a purchase (stub — will be wired to Stripe)
app.post('/v1/store/:template/buy', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const template = c.req.param('template');
  const body = await c.req.json<{ userId: string; rows: number }>();
  const rowLabel = body.rows >= 1000 ? `${body.rows / 1000}k` : String(body.rows);
  const pricing = DATASET_PRICING[template];
  if (!pricing || pricing[rowLabel] === undefined) {
    return c.json({ error: 'Invalid template/size combination' }, 400);
  }

  const priceCents = pricing[rowLabel];
  if (priceCents === 0) {
    return c.json({ error: 'Free tier — no purchase needed. Create a lab directly.' }, 400);
  }

  const id = 'pur-' + crypto.randomUUID().split('-')[0];
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO dataset_purchases (id, user_id, template, rows, price_cents, status, lab_credits_remaining, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 3, ?)`
  ).bind(id, body.userId, template, body.rows, priceCents, now).run();

  // In production: create Stripe checkout session and return URL
  // For now: return purchase ID for manual completion
  return c.json({
    purchaseId: id,
    template,
    rows: body.rows,
    priceCents,
    priceFormatted: `$${(priceCents / 100).toFixed(2)}`,
    status: 'pending',
    note: 'Stripe integration pending. Use PUT /v1/store/complete/:purchaseId to simulate completion.',
  }, 201);
});

// Complete a purchase (simulate Stripe webhook for now)
app.put('/v1/store/complete/:purchaseId', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);

  const purchaseId = c.req.param('purchaseId');
  const now = new Date().toISOString();

  await env.DB.prepare(
    "UPDATE dataset_purchases SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'pending'"
  ).bind(now, purchaseId).run();

  const purchase = await env.DB.prepare('SELECT * FROM dataset_purchases WHERE id = ?').bind(purchaseId).first();
  if (!purchase) return c.json({ error: 'Purchase not found' }, 404);

  return c.json({ completed: true, purchase });
});

// Download dataset SQL file from R2
app.get('/v1/store/:template/download', async (c) => {
  const env = c.env;
  const template = c.req.param('template');
  const size = c.req.query('size') || '5k';
  const format = c.req.query('format') || 'sql';

  if (format !== 'sql') {
    return c.json({ error: 'Only format=sql is supported' }, 400);
  }

  const pricing = DATASET_PRICING[template];
  if (!pricing) return c.json({ error: `Unknown template: ${template}` }, 404);

  const priceCents = pricing[size];
  if (priceCents === undefined) {
    return c.json({ error: `Size ${size} not available for ${template}. Available: ${Object.keys(pricing).join(', ')}` }, 400);
  }

  // Free tier (5k): no auth required
  // Paid sizes: require auth + check download entitlement or purchase
  if (priceCents > 0) {
    const apiKey = c.req.header('Authorization')?.replace('Bearer ', '') || c.req.header('X-API-Key');
    if (!authenticate(apiKey, env)) {
      return c.json({ error: 'Authentication required for paid dataset downloads' }, 401);
    }

    // Check if user has an active subscription with downloads remaining
    // or a completed purchase for this template/size
    const userId = 'api-user'; // TODO: extract from JWT or API key mapping
    const ent = await getEntitlement(env.DB, userId);

    if (ent.downloads_per_month === 0 && (ent.tier === 'free')) {
      // Check one-time purchases
      const rows = parseInt(size) * 1000;
      const purchase = await env.DB.prepare(
        "SELECT * FROM dataset_purchases WHERE user_id = ? AND template = ? AND rows >= ? AND status = 'completed'"
      ).bind(userId, template, rows).first();

      if (!purchase) {
        return c.json({
          error: 'Download requires a subscription (Core+) or one-time purchase',
          tier: ent.tier,
          buyUrl: `/v1/store/${template}/buy`,
        }, 403);
      }
    }

    // Decrement download counter for subscription users
    if ((ent.downloads_per_month as number) > 0) {
      const used = (ent.downloads_used_this_month as number) || 0;
      if (used >= (ent.downloads_per_month as number) && (ent.downloads_per_month as number) !== -1) {
        return c.json({ error: 'Monthly download limit reached', used, limit: ent.downloads_per_month }, 429);
      }
      await env.DB.prepare('UPDATE entitlements SET downloads_used_this_month = downloads_used_this_month + 1 WHERE user_id = ?')
        .bind(userId).run();
    }
  }

  // Fetch from R2
  const r2Key = `templates/${template}-${size}.sql`;
  const object = await env.TEMPLATES.get(r2Key);

  if (!object) {
    return c.json({ error: `Dataset file not found: ${r2Key}. This size may not have been generated yet.` }, 404);
  }

  const filename = `realitydb-${template}-${size}.sql`;
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/sql',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(object.size),
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

// Check which sizes are available for a template in R2
app.get('/v1/store/:template/sizes', async (c) => {
  const env = c.env;
  const template = c.req.param('template');

  const pricing = DATASET_PRICING[template];
  if (!pricing) return c.json({ error: `Unknown template: ${template}` }, 404);

  const allSizes = Object.keys(pricing);
  const available: string[] = [];

  for (const size of allSizes) {
    const r2Key = `templates/${template}-${size}.sql`;
    const head = await env.TEMPLATES.head(r2Key);
    if (head) {
      available.push(size);
    }
  }

  return c.json({
    template,
    sizes: available,
    allSizes,
    formats: ['sql'],
    pricing: Object.fromEntries(
      allSizes.map(s => [s, { priceCents: pricing[s], available: available.includes(s) }])
    ),
  });
});

// ============================================================
// STRIPE PAYMENT ENDPOINTS
// ============================================================

// Stripe API helper — all Stripe calls go through fetch (no SDK needed)
async function stripeAPI(secretKey: string, endpoint: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

async function stripeGET(secretKey: string, endpoint: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });
  return res.json();
}

// ============================================================
// DODO PAYMENTS — primary payment processor (Stripe kept as fallback above)
// ============================================================

// Dodo API helper — JSON body, Bearer auth (mirrors stripeAPI but JSON not form-encoded)
async function dodoAPI(
  secretKey: string,
  endpoint: string,
  body?: Record<string, any>
): Promise<any> {
  const baseUrl = 'https://live.dodopayments.com';
  const res = await fetch(`${baseUrl}/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Dodo occasionally returns non-JSON (404 HTML, empty body). Parse defensively
  // so callers get structured data instead of an uncaught throw → 500.
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { _dodo_status: res.status, _dodo_raw: text.slice(0, 500) };
  }
}

// Business ID: bus_0Ncmo4Hc4s7QRoViHC7Fj
// Product ID map — canonical source of truth for allowed Dodo products
const DODO_PRODUCTS: Record<string, string> = {
  // Subscriptions
  data_monthly:           'pdt_0Nirf6Mx6bpCNmvw95xUp',  // $19/mo
  data_annual:            'pdt_0Nirf6QAWnvSfWIQ7vuHw',  // $190/yr
  professional_monthly:   'pdt_0NirfGsVdeTfxs1dDREhp',  // $49/mo
  professional_annual:    'pdt_0NirfGvvtkR7JFAS2XPyF',  // $490/yr
  enterprise_eu_monthly:  'pdt_0NirfeJV05qMdKB2WSu2g',  // €499/mo
  enterprise_eu_annual:   'pdt_0NirfeOfJwXzZupRtDrua',  // €4,990/yr
  // Credits (one-time)
  credits_starter:        'pdt_0NirfeTLQMc7V6kgvfjMB',  // $9  — 5 runs, 50K rows
  credits_standard:       'pdt_0Nirfs73dKQndnUGJgPh7',  // $29 — 20 runs, 100K rows
  credits_research:       'pdt_0Nirfs8ke53HBG9iWKDvq',  // $79 — 30 days, 500K rows
  credits_eu_compliance:  'pdt_0Nirfs9a1QlZ5AIDEBM7T',  // €299 — 10 EU runs + comply
};

// Reverse lookup: product_id → product key
function dodoProductKey(productId: string): string | undefined {
  return Object.keys(DODO_PRODUCTS).find((k) => DODO_PRODUCTS[k] === productId);
}

// Subscription product → tier + explicit entitlement limits (per sprint spec).
// NOTE: tiers 'data' / 'professional' / 'enterprise_eu' are NOT in TIER_LIMITS,
// so limits are specified explicitly here rather than looked up.
interface DodoTierLimits {
  tier: string;
  maxRows: number;
  maxActiveLabs: number;
  downloadsPerMonth: number;
  labsDaily: number;
}
const DODO_SUBSCRIPTION_TIERS: Record<string, DodoTierLimits> = {
  data_monthly:          { tier: 'data',          maxRows: 500000,    maxActiveLabs: 3,   downloadsPerMonth: 50,  labsDaily: 3 },
  data_annual:           { tier: 'data',          maxRows: 500000,    maxActiveLabs: 3,   downloadsPerMonth: 50,  labsDaily: 3 },
  professional_monthly:  { tier: 'professional',  maxRows: 2000000,   maxActiveLabs: 5,   downloadsPerMonth: 200, labsDaily: 10 },
  professional_annual:   { tier: 'professional',  maxRows: 2000000,   maxActiveLabs: 5,   downloadsPerMonth: 200, labsDaily: 10 },
  enterprise_eu_monthly: { tier: 'enterprise_eu', maxRows: 999999999, maxActiveLabs: 999, downloadsPerMonth: 999, labsDaily: 999 },
  enterprise_eu_annual:  { tier: 'enterprise_eu', maxRows: 999999999, maxActiveLabs: 999, downloadsPerMonth: 999, labsDaily: 999 },
};

// One-time credit product → grant (per sprint spec).
interface DodoCreditGrant {
  runs?: number;
  euRuns?: number;
  researchDays?: number;
  maxRowsPerRun: number;
  euComplyEnabled?: boolean;
}
const DODO_CREDIT_PRODUCTS: Record<string, DodoCreditGrant> = {
  credits_starter:       { runs: 5,  maxRowsPerRun: 50000 },
  credits_standard:      { runs: 20, maxRowsPerRun: 100000 },
  credits_research:      { researchDays: 30, maxRowsPerRun: 500000 },
  credits_eu_compliance: { euRuns: 10, maxRowsPerRun: 100000, euComplyEnabled: true },
};

// Subscription price mapping — these get created on first deploy via /v1/stripe/setup
const SUBSCRIPTION_TIERS: Record<string, { name: string; monthlyPriceCents: number; features: string }> = {
  core: { name: 'RealityDB Core', monthlyPriceCents: 4900, features: '50K rows, 3 active labs, SQL downloads' },
  compliance: { name: 'RealityDB Compliance', monthlyPriceCents: 19900, features: '100K rows, 10 active labs, domain specialist' },
  research: { name: 'RealityDB Research', monthlyPriceCents: 2492, features: '100K rows, 5 labs, 30-day TTL, Jupyter export, citations' },
};

// One-time setup: create Stripe products and prices (idempotent)
app.post('/v1/stripe/setup', async (c) => {
  const env = c.env;
  const apiKey = c.req.header('X-API-Key');
  if (!authenticate(apiKey, env)) return c.json({ error: 'Unauthorized' }, 401);
  if (!env.STRIPE_SECRET_KEY) return c.json({ error: 'STRIPE_SECRET_KEY not configured' }, 500);

  const results: Record<string, any> = {};

  // Create subscription products + prices
  for (const [tier, config] of Object.entries(SUBSCRIPTION_TIERS)) {
    const product = await stripeAPI(env.STRIPE_SECRET_KEY, 'products', {
      name: config.name,
      description: config.features,
      'metadata[tier]': tier,
    });

    const price = await stripeAPI(env.STRIPE_SECRET_KEY, 'prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: String(config.monthlyPriceCents),
      'recurring[interval]': 'month',
      'metadata[tier]': tier,
    });

    results[tier] = { productId: product.id, priceId: price.id, amount: config.monthlyPriceCents };
  }

  // Create one-time purchase products for each template/size combo
  for (const [template, prices] of Object.entries(DATASET_PRICING)) {
    for (const [size, priceCents] of Object.entries(prices)) {
      if (priceCents === 0) continue; // Skip free tier
      const product = await stripeAPI(env.STRIPE_SECRET_KEY, 'products', {
        name: `RealityDB ${template} Dataset — ${size} rows`,
        description: `One-time purchase: ${template} template, ${size} rows. Includes SQL download + 3 lab credits.`,
        'metadata[template]': template,
        'metadata[size]': size,
      });

      const price = await stripeAPI(env.STRIPE_SECRET_KEY, 'prices', {
        product: product.id,
        currency: 'usd',
        unit_amount: String(priceCents),
        'metadata[template]': template,
        'metadata[size]': size,
      });

      results[`${template}-${size}`] = { productId: product.id, priceId: price.id, amount: priceCents };
    }
  }

  // Create certification exam products
  const certPrices: Record<string, number> = { foundations: 2900, analyst: 4900, advanced: 7900, specialist: 9900 };
  for (const [level, priceCents] of Object.entries(certPrices)) {
    const product = await stripeAPI(env.STRIPE_SECRET_KEY, 'products', {
      name: `RealityDB SQL Certification — ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      description: `Timed SQL certification exam with verifiable credential`,
      'metadata[type]': 'certification',
      'metadata[level]': level,
    });

    const price = await stripeAPI(env.STRIPE_SECRET_KEY, 'prices', {
      product: product.id,
      currency: 'usd',
      unit_amount: String(priceCents),
      'metadata[type]': 'certification',
      'metadata[level]': level,
    });

    results[`cert-${level}`] = { productId: product.id, priceId: price.id, amount: priceCents };
  }

  return c.json({ created: results });
});

// Create a Stripe Checkout Session (subscription or one-time)
app.post('/v1/stripe/checkout', async (c) => {
  const env = c.env;
  if (!env.STRIPE_SECRET_KEY) return c.json({ error: 'Stripe not configured' }, 500);

  const body = await c.req.json<{
    priceId: string;
    userId: string;
    email?: string;
    returnUrl: string;
    mode?: 'subscription' | 'payment';
  }>();

  if (!body.priceId || !body.userId || !body.returnUrl) {
    return c.json({ error: 'priceId, userId, and returnUrl are required' }, 400);
  }

  const mode = body.mode || 'subscription';

  // Check if user already has a Stripe customer ID
  const ent = await env.DB.prepare('SELECT stripe_customer_id FROM entitlements WHERE user_id = ?')
    .bind(body.userId).first();
  let customerId = (ent as any)?.stripe_customer_id;

  // Create customer if needed
  if (!customerId) {
    const customer = await stripeAPI(env.STRIPE_SECRET_KEY, 'customers', {
      'metadata[userId]': body.userId,
      ...(body.email ? { email: body.email } : {}),
    });
    customerId = customer.id;
  }

  // Create checkout session
  const params: Record<string, string> = {
    customer: customerId,
    mode,
    'line_items[0][price]': body.priceId,
    'line_items[0][quantity]': '1',
    success_url: `${body.returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${body.returnUrl}?status=cancelled`,
    'metadata[userId]': body.userId,
  };

  if (mode === 'subscription') {
    params['subscription_data[metadata][userId]'] = body.userId;
  } else {
    params['payment_intent_data[metadata][userId]'] = body.userId;
  }

  const session = await stripeAPI(env.STRIPE_SECRET_KEY, 'checkout/sessions', params);

  if (session.error) {
    return c.json({ error: session.error.message }, 400);
  }

  return c.json({ url: session.url, sessionId: session.id });
});

// Create a Stripe Customer Portal session (manage subscription)
app.post('/v1/stripe/portal', async (c) => {
  const env = c.env;
  if (!env.STRIPE_SECRET_KEY) return c.json({ error: 'Stripe not configured' }, 500);

  const body = await c.req.json<{ customerId: string; returnUrl: string }>();

  const session = await stripeAPI(env.STRIPE_SECRET_KEY, 'billing_portal/sessions', {
    customer: body.customerId,
    return_url: body.returnUrl,
  });

  if (session.error) {
    return c.json({ error: session.error.message }, 400);
  }

  return c.json({ url: session.url });
});

// Stripe Webhook handler — processes payment events
app.post('/v1/stripe/webhook', async (c) => {
  const env = c.env;
  if (!env.STRIPE_SECRET_KEY) return c.json({ error: 'Stripe not configured' }, 500);

  const body = await c.req.text();
  const sig = c.req.header('stripe-signature');

  // Verify webhook signature
  if (env.STRIPE_WEBHOOK_SECRET && sig) {
    const verified = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return c.json({ error: 'Invalid signature' }, 400);
    }
  }

  const event = JSON.parse(body);
  console.log(`Stripe webhook: ${event.type}`);

  const now = new Date().toISOString();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (!userId) break;

      if (session.mode === 'subscription') {
        // Fetch subscription to get price metadata
        const sub = await stripeGET(env.STRIPE_SECRET_KEY, `subscriptions/${session.subscription}`);
        const tier = sub.items?.data?.[0]?.price?.metadata?.tier || 'core';
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.core;

        // Upsert entitlement
        const entId = 'ent-' + crypto.randomUUID().split('-')[0];
        await env.DB.prepare(
          `INSERT INTO entitlements (id, user_id, tier, max_rows, max_active_labs, downloads_per_month, labs_daily_limit, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET tier=excluded.tier, max_rows=excluded.max_rows, max_active_labs=excluded.max_active_labs, downloads_per_month=excluded.downloads_per_month, labs_daily_limit=excluded.labs_daily_limit, stripe_customer_id=excluded.stripe_customer_id, stripe_subscription_id=excluded.stripe_subscription_id, status='active', current_period_end=excluded.current_period_end, updated_at=excluded.updated_at`
        ).bind(
          entId, userId, tier, limits.maxRows, limits.maxActiveLabs, limits.downloadsPerMonth, limits.labsDaily,
          session.customer, session.subscription,
          sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          now, now
        ).run();

        console.log(`Subscription activated: ${userId} → ${tier}`);
      } else if (session.mode === 'payment') {
        // One-time purchase — check line items for template/size
        const lineItems = await stripeGET(env.STRIPE_SECRET_KEY, `checkout/sessions/${session.id}/line_items`);
        const item = lineItems.data?.[0];
        const price = item?.price;
        const template = price?.metadata?.template;
        const size = price?.metadata?.size;
        const certLevel = price?.metadata?.level;

        if (template && size) {
          // Dataset purchase
          const rows = parseInt(size) * 1000;
          const purId = 'pur-' + crypto.randomUUID().split('-')[0];
          await env.DB.prepare(
            `INSERT INTO dataset_purchases (id, user_id, template, rows, price_cents, stripe_payment_id, status, lab_credits_remaining, created_at, completed_at)
             VALUES (?, ?, ?, ?, ?, ?, 'completed', 3, ?, ?)`
          ).bind(purId, userId, template, rows, price?.unit_amount || 0, session.payment_intent, now, now).run();

          console.log(`Dataset purchased: ${userId} → ${template}-${size}`);
        } else if (certLevel) {
          // Certification exam purchase — could store entitlement to take exam
          console.log(`Cert exam purchased: ${userId} → ${certLevel}`);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const tier = sub.items?.data?.[0]?.price?.metadata?.tier || 'core';
      const status = sub.status === 'active' ? 'active' : (sub.status === 'past_due' ? 'past_due' : 'cancelled');

      await env.DB.prepare(
        `UPDATE entitlements SET status = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?`
      ).bind(
        status,
        sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        now, userId
      ).run();

      console.log(`Subscription updated: ${userId} → ${status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      // Downgrade to free
      const limits = TIER_LIMITS.free;
      await env.DB.prepare(
        `UPDATE entitlements SET tier = 'free', status = 'cancelled', max_rows = ?, max_active_labs = ?, downloads_per_month = ?, labs_daily_limit = ?, updated_at = ? WHERE user_id = ?`
      ).bind(limits.maxRows, limits.maxActiveLabs, limits.downloadsPerMonth, limits.labsDaily, now, userId).run();

      console.log(`Subscription cancelled: ${userId} → free`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subId = invoice.subscription;
      if (subId) {
        await env.DB.prepare(
          `UPDATE entitlements SET status = 'past_due', updated_at = ? WHERE stripe_subscription_id = ?`
        ).bind(now, subId).run();
      }
      break;
    }
  }

  return c.json({ received: true });
});

// Verify Stripe webhook signature using Web Crypto API
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = header.split(',').reduce((acc: Record<string, string>, part) => {
      const [k, v] = part.split('=');
      acc[k.trim()] = v;
      return acc;
    }, {});

    const timestamp = parts['t'];
    const signature = parts['v1'];
    if (!timestamp || !signature) return false;

    // Reject if timestamp is too old (5 min tolerance)
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (age > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    return computed === signature;
  } catch {
    return false;
  }
}

// ============================================================
// DODO PAYMENTS ENDPOINTS
// ============================================================

// Create a Dodo hosted checkout session
app.post('/v1/checkout', async (c) => {
  const env = c.env;
  if (!env.DODO_API_KEY) return c.json({ error: 'Dodo Payments not configured' }, 500);

  const body = await c.req.json<{
    product_id: string;
    user_email: string;
    success_url: string;
    cancel_url: string;
  }>().catch(() => null);

  if (!body || !body.product_id || !body.user_email || !body.success_url || !body.cancel_url) {
    return c.json({ error: 'product_id, user_email, success_url, and cancel_url are required' }, 400);
  }

  // Validate product_id is one we recognize
  if (!dodoProductKey(body.product_id)) {
    return c.json({ error: `Unknown product_id: ${body.product_id}` }, 400);
  }

  // Dodo checkout API: POST /checkouts with a `customer` object and `return_url`.
  // (The sprint spec's `/checkout/sessions` + top-level `customer_email`/`success_url`
  //  do not match Dodo's current API — corrected here per docs.dodopayments.com.
  //  Client-facing request/response contract is kept exactly as the sprint defined.)
  const session = await dodoAPI(env.DODO_API_KEY, 'checkouts', {
    product_cart: [{ product_id: body.product_id, quantity: 1 }],
    customer: { email: body.user_email },
    return_url: body.success_url,
    cancel_url: body.cancel_url,
    metadata: {
      user_email: body.user_email,
      product_id: body.product_id,
    },
  });

  const checkoutUrl = session?.checkout_url || session?.payment_link || session?.url;
  const sessionId = session?.session_id || session?.id;

  if (!checkoutUrl) {
    // Surface Dodo's error so it can be debugged rather than returning a false success
    return c.json({ error: 'Dodo checkout session failed', details: session }, 400);
  }

  return c.json({ checkout_url: checkoutUrl, session_id: sessionId });
});

// Dodo webhook handler — verify signature, ack immediately (200), then process async
app.post('/v1/webhooks/dodo', async (c) => {
  const env = c.env;
  const rawBody = await c.req.text();

  const valid = await verifyDodoSignature(
    rawBody,
    {
      id: c.req.header('webhook-id'),
      timestamp: c.req.header('webhook-timestamp'),
      signature: c.req.header('webhook-signature'),
    },
    env.DODO_WEBHOOK_SECRET
  );

  if (!valid) return c.json({ error: 'Invalid signature' }, 401);

  // Ack immediately (before processing) to prevent Dodo retries; process in the background.
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ received: true });
  }
  c.executionCtx.waitUntil(processDodoEvent(env, event));
  return c.json({ received: true });
});

// Verify a Dodo webhook using the Standard Webhooks scheme (HMAC-SHA256).
// Signed content = `${webhook-id}.${webhook-timestamp}.${payload}`.
async function verifyDodoSignature(
  payload: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string
): Promise<boolean> {
  try {
    const { id, timestamp, signature } = headers;
    if (!id || !timestamp || !signature || !secret) return false;

    // Replay protection: reject timestamps older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (!Number.isFinite(age) || age > 300) return false;

    const signedContent = `${id}.${timestamp}.${payload}`;
    const enc = new TextEncoder();

    // Standard Webhooks secrets are `whsec_<base64>`; the HMAC key is the decoded portion.
    let keyBytes: Uint8Array;
    if (secret.startsWith('whsec_')) {
      keyBytes = Uint8Array.from(atob(secret.slice('whsec_'.length)), (ch) => ch.charCodeAt(0));
    } else {
      keyBytes = enc.encode(secret);
    }

    const computed = await hmacBase64(keyBytes, enc.encode(signedContent));

    // Header is a space-separated list of `v1,<base64sig>` entries
    const provided = signature.split(' ').map((s) => (s.includes(',') ? s.split(',')[1] : s));
    if (provided.some((sig) => timingSafeEqual(sig, computed))) return true;

    // Fallback: some setups HMAC the raw (undecoded) secret bytes
    if (secret.startsWith('whsec_')) {
      const rawComputed = await hmacBase64(enc.encode(secret), enc.encode(signedContent));
      if (provided.some((sig) => timingSafeEqual(sig, rawComputed))) return true;
    }

    return false;
  } catch {
    return false;
  }
}

async function hmacBase64(keyBytes: Uint8Array, msg: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msg);
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Upsert an entitlement row (mirrors the Stripe webhook upsert; no Stripe IDs).
async function upsertDodoEntitlement(
  env: Env,
  userId: string,
  limits: DodoTierLimits,
  status: string,
  periodEnd: string | null,
  now: string
): Promise<void> {
  const entId = 'ent-' + crypto.randomUUID().split('-')[0];
  await env.DB.prepare(
    `INSERT INTO entitlements (id, user_id, tier, max_rows, max_active_labs, downloads_per_month, labs_daily_limit, status, current_period_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET tier=excluded.tier, max_rows=excluded.max_rows, max_active_labs=excluded.max_active_labs, downloads_per_month=excluded.downloads_per_month, labs_daily_limit=excluded.labs_daily_limit, status=excluded.status, current_period_end=excluded.current_period_end, updated_at=excluded.updated_at`
  ).bind(
    entId, userId, limits.tier, limits.maxRows, limits.maxActiveLabs, limits.downloadsPerMonth, limits.labsDaily,
    status, periodEnd, now, now
  ).run();
}

// Process a verified Dodo webhook event.
// NOTE: the entitlements schema has no runs / max_rows_per_run / research_expires_at /
// eu_runs / eu_comply_enabled columns, so one-time credit grants are recorded in the
// existing dataset_purchases table (lab_credits_remaining) as the closest existing store.
// Adding those columns is a separate schema migration (out of scope for this one-file sprint).
async function processDodoEvent(env: Env, event: any): Promise<void> {
  const type: string = event?.type;
  const data: any = event?.data || {};
  const now = new Date().toISOString();

  const productId: string | undefined = data.product_id || data.product_cart?.[0]?.product_id;
  const email: string | undefined = data.customer?.email || data.metadata?.user_email;
  const productKey = productId ? dodoProductKey(productId) : undefined;

  try {
    switch (type) {
      case 'payment.succeeded': {
        // One-time credit purchases (subscription first-payments arrive via subscription.active)
        if (!email || !productKey) break;
        const credit = DODO_CREDIT_PRODUCTS[productKey];
        if (!credit) break;

        const creditsRemaining = credit.runs ?? credit.euRuns ?? (credit.researchDays ? -1 : 0);
        const purId = 'pur-' + crypto.randomUUID().split('-')[0];
        await env.DB.prepare(
          `INSERT INTO dataset_purchases (id, user_id, template, rows, price_cents, stripe_payment_id, status, lab_credits_remaining, created_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`
        ).bind(
          purId, email, productKey, credit.maxRowsPerRun, 0,
          data.payment_id || data.id || null, creditsRemaining, now, now
        ).run();

        console.log(`Dodo credits: ${email} → ${productKey} (credits=${creditsRemaining}, maxRowsPerRun=${credit.maxRowsPerRun}, euComply=${!!credit.euComplyEnabled})`);
        break;
      }

      case 'subscription.active': {
        if (!email || !productKey) break;
        const limits = DODO_SUBSCRIPTION_TIERS[productKey];
        if (!limits) break;
        const periodEnd: string | null = data.current_period_end || data.next_billing_date || null;
        await upsertDodoEntitlement(env, email, limits, 'active', periodEnd, now);
        console.log(`Dodo subscription active: ${email} → ${limits.tier}`);
        break;
      }

      case 'subscription.cancelled': {
        if (!email) break;
        // Keep access until current_period_end; only flip status.
        await env.DB.prepare(`UPDATE entitlements SET status = 'cancelled', updated_at = ? WHERE user_id = ?`)
          .bind(now, email).run();
        console.log(`Dodo subscription cancelled: ${email}`);
        break;
      }

      case 'subscription.renewed': {
        if (!email) break;
        const periodEnd: string | null = data.current_period_end || data.next_billing_date || null;
        await env.DB.prepare(`UPDATE entitlements SET current_period_end = ?, status = 'active', updated_at = ? WHERE user_id = ?`)
          .bind(periodEnd, now, email).run();
        console.log(`Dodo subscription renewed: ${email}`);
        break;
      }

      case 'subscription.on_hold': {
        if (!email) break;
        // Block generation — treat as community tier by marking on_hold.
        await env.DB.prepare(`UPDATE entitlements SET status = 'on_hold', updated_at = ? WHERE user_id = ?`)
          .bind(now, email).run();
        console.log(`Dodo subscription on_hold: ${email}`);
        break;
      }

      default:
        console.log(`Dodo webhook: unhandled event type ${type}`);
    }
  } catch (err: any) {
    console.error(`Dodo event processing error (${type}):`, err?.message);
  }
}

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
