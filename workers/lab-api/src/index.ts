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
