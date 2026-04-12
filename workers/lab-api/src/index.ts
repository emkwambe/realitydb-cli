import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, CreateLabRequest } from './types';
import { createBranch, deleteBranch, buildConnectionString } from './neon';
import { initDB, createLab, getLab, listLabs, updateLab, deleteLab as removeLabFromDB, getExpiredLabs } from './db';
import { neon } from '@neondatabase/serverless';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'realitydb-lab-api', version: '0.1.0' });
});

// ---------------------------------------------------------------------------
// POST /v1/labs — Create a new lab
// ---------------------------------------------------------------------------
app.post('/v1/labs', async (c) => {
  await initDB(c.env.DB);

  const body = await c.req.json<CreateLabRequest>();
  const template = body.template;
  const rows = body.rows || 5000;
  const ttlHours = parseTTL(body.ttl || '4h');
  const name = body.name || `${template}-${Date.now().toString(36)}`;
  const tier = body.tier || 'free';
  const labId = crypto.randomUUID();

  // Validate template SQL exists in R2
  const templateKey = `${template}-${formatRowCount(rows)}.sql`;
  const sqlObj = await c.env.TEMPLATES.get(templateKey);
  if (!sqlObj) {
    return c.json({ error: `Template not found: ${templateKey}. Available sizes: 5k, 10k, 50k, 100k` }, 404);
  }

  // Create Neon branch
  let branchId: string;
  let connectionString: string;
  try {
    const branch = await createBranch(c.env.NEON_PROJECT_ID, c.env.NEON_API_KEY, `lab-${labId.slice(0, 8)}`);
    branchId = branch.id;
    const host = branch.endpoints[0]?.host;
    if (!host) throw new Error('No endpoint returned from Neon');
    connectionString = buildConnectionString(host, c.env.NEON_PROJECT_ID);
  } catch (err: any) {
    return c.json({ error: `Failed to create database: ${err.message}` }, 500);
  }

  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

  // Save lab metadata
  await createLab(c.env.DB, {
    id: labId,
    name,
    template,
    rows,
    table_count: 0,
    status: 'seeding',
    branch_id: branchId,
    connection_string: connectionString,
    tier,
    expires_at: expiresAt,
  });

  // Seed the database with template SQL from R2
  try {
    const sqlContent = await sqlObj.text();
    const sql = neon(connectionString);

    // Split SQL into statements and execute
    const statements = splitSQL(sqlContent);
    let tableCount = 0;
    for (const stmt of statements) {
      if (stmt.trim()) {
        await sql(stmt);
        if (stmt.trim().toUpperCase().startsWith('CREATE TABLE')) {
          tableCount++;
        }
      }
    }

    await updateLab(c.env.DB, labId, {
      status: 'ready',
      table_count: tableCount,
    });
  } catch (err: any) {
    await updateLab(c.env.DB, labId, {
      status: 'error',
      error_message: err.message?.slice(0, 500),
    });
    return c.json({
      id: labId,
      status: 'error',
      error: err.message,
    }, 500);
  }

  return c.json({
    id: labId,
    name,
    template,
    rows,
    status: 'ready',
    connection_string: connectionString,
    expires_at: expiresAt,
  }, 201);
});

// ---------------------------------------------------------------------------
// GET /v1/labs — List labs
// ---------------------------------------------------------------------------
app.get('/v1/labs', async (c) => {
  await initDB(c.env.DB);
  const labs = await listLabs(c.env.DB);
  // Mask connection strings in list view
  return c.json({
    labs: labs.map(l => ({
      ...l,
      connection_string: maskConnection(l.connection_string),
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /v1/labs/:id — Get lab details
// ---------------------------------------------------------------------------
app.get('/v1/labs/:id', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);
  return c.json(lab);
});

// ---------------------------------------------------------------------------
// PATCH /v1/labs/:id/ttl — Extend TTL
// ---------------------------------------------------------------------------
app.patch('/v1/labs/:id/ttl', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  const body = await c.req.json<{ ttl: string }>();
  const ttlHours = parseTTL(body.ttl || '4h');
  const newExpiry = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

  await updateLab(c.env.DB, lab.id, { expires_at: newExpiry });
  return c.json({ id: lab.id, expires_at: newExpiry });
});

// ---------------------------------------------------------------------------
// DELETE /v1/labs/:id — Destroy lab
// ---------------------------------------------------------------------------
app.delete('/v1/labs/:id', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // Delete Neon branch
  try {
    await deleteBranch(c.env.NEON_PROJECT_ID, c.env.NEON_API_KEY, lab.branch_id);
  } catch {
    // Branch may already be gone — continue cleanup
  }

  await removeLabFromDB(c.env.DB, lab.id);
  return c.json({ deleted: true, id: lab.id });
});

// ---------------------------------------------------------------------------
// POST /v1/labs/:id/query — Execute SQL query
// ---------------------------------------------------------------------------
app.post('/v1/labs/:id/query', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);
  if (lab.status !== 'ready') return c.json({ error: `Lab is ${lab.status}` }, 400);

  const { sql: query } = await c.req.json<{ sql: string }>();
  if (!query?.trim()) return c.json({ error: 'No SQL provided' }, 400);

  const start = Date.now();
  try {
    const sql = neon(lab.connection_string);
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

// ---------------------------------------------------------------------------
// POST /v1/labs/:id/share — Generate read-only connection
// ---------------------------------------------------------------------------
app.post('/v1/labs/:id/share', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // For now, return the same connection string with a note
  // Full implementation would create a read-only Neon endpoint
  const readOnlyConn = lab.connection_string;
  await updateLab(c.env.DB, lab.id, { read_only_connection: readOnlyConn });

  return c.json({
    id: lab.id,
    read_only_connection: readOnlyConn,
    expires_at: lab.expires_at,
  });
});

// ---------------------------------------------------------------------------
// Scheduled handler — clean up expired labs
// ---------------------------------------------------------------------------
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await initDB(env.DB);
    const expired = await getExpiredLabs(env.DB);

    for (const lab of expired) {
      try {
        await deleteBranch(env.NEON_PROJECT_ID, env.NEON_API_KEY, lab.branch_id);
      } catch {
        // Ignore — branch may already be deleted
      }
      await updateLab(env.DB, lab.id, { status: 'expired' });
    }

    console.log(`Cleanup: processed ${expired.length} expired labs`);
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)(h|d)$/);
  if (!match) return 4;
  const [, num, unit] = match;
  return unit === 'd' ? parseInt(num) * 24 : parseInt(num);
}

function formatRowCount(rows: number): string {
  if (rows >= 1000000) return `${Math.round(rows / 1000000)}m`;
  if (rows >= 1000) return `${Math.round(rows / 1000)}k`;
  return String(rows);
}

function maskConnection(conn: string): string {
  return conn.replace(/:([^@]+)@/, ':****@');
}

function splitSQL(sql: string): string[] {
  // Split on semicolons that aren't inside string literals
  const statements: string[] = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && sql[i + 1] !== stringChar) {
        inString = false;
      } else if (ch === stringChar && sql[i + 1] === stringChar) {
        current += sql[++i]; // skip escaped quote
      }
    } else if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
    } else if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += ch;
    }
  }

  const last = current.trim();
  if (last && !last.startsWith('--')) {
    statements.push(last);
  }

  return statements;
}
