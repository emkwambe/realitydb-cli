import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, CreateLabRequest } from './types';
import { extractApiKey, validateApiKey, getUserId } from './auth';
import { createBranch, deleteBranch, buildConnectionString } from './neon';
import { seedBranch } from './seed';
import { cleanupExpiredLabs } from './cleanup';
import { initDB, insertLab, getLab, listLabsByUser, updateLabStatus, updateLabExpiry, softDeleteLab, getSavedQueries } from './db';
import { neon } from '@neondatabase/serverless';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

// ---------------------------------------------------------------------------
// Auth middleware for /v1/* routes
// ---------------------------------------------------------------------------
app.use('/v1/*', async (c, next) => {
  const apiKey = extractApiKey(c);
  if (!validateApiKey(apiKey, c.env)) {
    return c.json({ error: 'Unauthorized. Provide a valid API key via Authorization header.' }, 401);
  }
  // Store userId for downstream handlers
  c.set('userId' as any, getUserId(apiKey!));
  c.set('apiKey' as any, apiKey);
  await next();
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'realitydb-lab-api', version: '0.1.0' });
});

// ---------------------------------------------------------------------------
// POST /v1/labs — Create a new lab
// ---------------------------------------------------------------------------
app.post('/v1/labs', async (c) => {
  await initDB(c.env.DB);
  const userId = (c as any).get('userId') as string;

  const body = await c.req.json<CreateLabRequest>();
  const template = body.template;
  const rows = body.rows || 5000;
  const ttlHours = parseTTL(body.ttl || '4h');
  const name = body.name || `${template}-${Date.now().toString(36)}`;
  const labId = crypto.randomUUID();

  // 1. Create Neon branch
  let branchId: string;
  let endpointId: string;
  let connectionString: string;
  try {
    const branch = await createBranch(
      c.env.NEON_PROJECT_ID,
      c.env.NEON_API_KEY,
      `lab-${labId.slice(0, 8)}`,
    );
    branchId = branch.branchId;
    endpointId = branch.endpointId;
    connectionString = buildConnectionString(branch.host);
  } catch (err: any) {
    return c.json({ error: `Failed to create database: ${err.message}` }, 500);
  }

  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();

  // 2. Save lab metadata (status: active, seeding happens next)
  await insertLab(c.env.DB, {
    id: labId,
    user_id: userId,
    name,
    template,
    rows,
    neon_branch_id: branchId,
    neon_endpoint_id: endpointId,
    connection_string: connectionString,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    deleted_at: null,
  });

  // 3. Seed database with template SQL from R2
  try {
    const { tableCount } = await seedBranch(connectionString, template, rows, c.env);

    return c.json({
      id: labId,
      name,
      template,
      rows,
      tables: tableCount,
      status: 'active',
      connection_string: connectionString,
      expires_at: expiresAt,
    }, 201);
  } catch (err: any) {
    // Mark as error but don't delete — user can inspect
    await updateLabStatus(c.env.DB, labId, 'error');
    return c.json({
      id: labId,
      status: 'error',
      error: `Seeding failed: ${err.message}`,
    }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /v1/labs — List user's labs
// ---------------------------------------------------------------------------
app.get('/v1/labs', async (c) => {
  await initDB(c.env.DB);
  const userId = (c as any).get('userId') as string;
  const labs = await listLabsByUser(c.env.DB, userId);
  return c.json({
    labs: labs.map(l => ({
      ...l,
      connection_string: maskConnection(l.connection_string),
    })),
  });
});

// ---------------------------------------------------------------------------
// GET /v1/labs/:id — Get lab details (includes full connection string)
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
  if (lab.status !== 'active') return c.json({ error: `Lab is ${lab.status}` }, 400);

  const body = await c.req.json<{ ttl: string }>();
  const ttlHours = parseTTL(body.ttl || '4h');
  const newExpiry = new Date(Date.now() + ttlHours * 3600_000).toISOString();

  await updateLabExpiry(c.env.DB, lab.id, newExpiry);
  return c.json({ id: lab.id, expires_at: newExpiry });
});

// ---------------------------------------------------------------------------
// DELETE /v1/labs/:id — Destroy lab
// ---------------------------------------------------------------------------
app.delete('/v1/labs/:id', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  try {
    await deleteBranch(c.env.NEON_PROJECT_ID, c.env.NEON_API_KEY, lab.neon_branch_id);
  } catch {
    // Branch may already be gone
  }

  await softDeleteLab(c.env.DB, lab.id);
  return c.json({ deleted: true, id: lab.id });
});

// ---------------------------------------------------------------------------
// POST /v1/labs/:id/query — Execute SQL against the lab database
// ---------------------------------------------------------------------------
app.post('/v1/labs/:id/query', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);
  if (lab.status !== 'active') return c.json({ error: `Lab is ${lab.status}` }, 400);

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
// POST /v1/labs/:id/share — Generate shareable connection
// ---------------------------------------------------------------------------
app.post('/v1/labs/:id/share', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  // For MVP, share the same connection string
  // Production: create a read-only Neon endpoint
  return c.json({
    id: lab.id,
    connection_string: lab.connection_string,
    expires_at: lab.expires_at,
    note: 'This connection has full access. Read-only endpoints coming soon.',
  });
});

// ---------------------------------------------------------------------------
// GET /v1/labs/:id/export — Export lab as Jupyter Notebook
// ---------------------------------------------------------------------------
app.get('/v1/labs/:id/export', async (c) => {
  await initDB(c.env.DB);
  const lab = await getLab(c.env.DB, c.req.param('id'));
  if (!lab) return c.json({ error: 'Lab not found' }, 404);

  const format = c.req.query('format');
  if (format !== 'notebook') {
    return c.json({ error: 'Unsupported format. Use ?format=notebook' }, 400);
  }

  // Fetch schema from the live database
  let schemaMarkdown = 'Schema information unavailable.';
  try {
    const sql = neon(lab.connection_string);
    const tables = await sql(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const schemaLines: string[] = [];
    for (const t of tables) {
      const cols = await sql(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [t.table_name]);

      schemaLines.push(`### ${t.table_name}`);
      schemaLines.push('| Column | Type | Nullable |');
      schemaLines.push('|--------|------|----------|');
      for (const col of cols) {
        schemaLines.push(`| ${col.column_name} | ${col.data_type} | ${col.is_nullable} |`);
      }
      schemaLines.push('');
    }
    schemaMarkdown = schemaLines.join('\n');
  } catch {
    // If DB is suspended or unreachable, use placeholder
  }

  // Fetch saved queries
  const savedQueries = await getSavedQueries(c.env.DB, lab.id);

  // Build .ipynb cells
  const cells: any[] = [];

  // Title cell
  cells.push(markdownCell([
    `# RealityDB Lab: ${lab.name}`,
    '',
    `- **Template:** ${lab.template}`,
    `- **Rows:** ${lab.rows.toLocaleString()}`,
    `- **Created:** ${lab.created_at}`,
    `- **Lab ID:** \`${lab.id}\``,
  ]));

  // Schema cell
  cells.push(markdownCell([
    '## Database Schema',
    '',
    schemaMarkdown,
  ]));

  // Setup cell
  cells.push(codeCell([
    '# Install dependencies (run once)',
    '!pip install psycopg2-binary pandas sqlalchemy -q',
  ]));

  // Connection cell
  const maskedConn = lab.connection_string.replace(/:([^@]+)@/, ':****@');
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

  // Saved query cells
  if (savedQueries.length > 0) {
    cells.push(markdownCell(['## Saved Queries', '']));
    for (const q of savedQueries) {
      cells.push(markdownCell([`### ${q.title}`]));
      cells.push(codeCell([
        `# ${q.title}`,
        `df = pd.read_sql("""`,
        q.sql,
        `""", engine)`,
        'df.head(20)',
      ]));
    }
  } else {
    // Default exploration queries
    cells.push(markdownCell(['## Explore the Data', '']));
    cells.push(codeCell([
      '# List all tables and row counts',
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

  // Reproducibility cell
  cells.push(markdownCell([
    '## Reproducibility',
    '',
    'This dataset was generated by RealityDB with deterministic seeding.',
    `Regenerate identical data with:`,
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

  // Assemble notebook
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
    },
    cells,
  };

  const filename = `realitydb-${lab.template}-${lab.rows}.ipynb`;
  return new Response(JSON.stringify(notebook, null, 2), {
    headers: {
      'Content-Type': 'application/x-ipynb+json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /v1/labs/ci — Simplified CI pipeline endpoint
// ---------------------------------------------------------------------------
app.post('/v1/labs/ci', async (c) => {
  // CI endpoint uses apiKey in body, not header — skip auth middleware
  // by placing this BEFORE the middleware? No — middleware already ran.
  // Instead, this route works with the standard auth middleware.
  await initDB(c.env.DB);
  const userId = (c as any).get('userId') as string;

  const body = await c.req.json<{ template: string; rows?: number; apiKey?: string }>();
  const template = body.template;
  const rows = body.rows || 5000;
  const labId = crypto.randomUUID();
  const name = `ci-${template}-${Date.now().toString(36)}`;
  const ttlHours = 2; // CI labs expire in 2 hours

  let branchId: string;
  let endpointId: string;
  let connectionString: string;
  try {
    const branch = await createBranch(
      c.env.NEON_PROJECT_ID,
      c.env.NEON_API_KEY,
      `ci-${labId.slice(0, 8)}`,
    );
    branchId = branch.branchId;
    endpointId = branch.endpointId;
    connectionString = buildConnectionString(branch.host);
  } catch (err: any) {
    return c.json({ error: `Failed to create database: ${err.message}` }, 500);
  }

  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();

  await insertLab(c.env.DB, {
    id: labId,
    user_id: userId,
    name,
    template,
    rows,
    neon_branch_id: branchId,
    neon_endpoint_id: endpointId,
    connection_string: connectionString,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    deleted_at: null,
  });

  try {
    await seedBranch(connectionString, template, rows, c.env);
  } catch (err: any) {
    await updateLabStatus(c.env.DB, labId, 'error');
    return c.json({ error: `Seeding failed: ${err.message}` }, 500);
  }

  // Minimal response for CI — just what you need for DATABASE_URL
  return c.json({
    connectionString,
    labId,
    expiresAt,
  }, 201);
});

// ---------------------------------------------------------------------------
// Export: fetch handler + scheduled CRON
// ---------------------------------------------------------------------------
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await initDB(env.DB);
    const cleaned = await cleanupExpiredLabs(env);
    console.log(`[CRON] Cleaned up ${cleaned} expired labs`);
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

function maskConnection(conn: string): string {
  return conn.replace(/:([^@]+)@/, ':****@');
}

// ---------------------------------------------------------------------------
// Jupyter Notebook cell builders
// ---------------------------------------------------------------------------

function markdownCell(lines: string[]): any {
  return {
    cell_type: 'markdown',
    metadata: {},
    source: lines.map((l, i) => i < lines.length - 1 ? l + '\n' : l),
  };
}

function codeCell(lines: string[]): any {
  return {
    cell_type: 'code',
    execution_count: null,
    metadata: {},
    outputs: [],
    source: lines.map((l, i) => i < lines.length - 1 ? l + '\n' : l),
  };
}
