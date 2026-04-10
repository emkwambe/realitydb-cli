# RealityDB Lab — Disposable Database Environments

> **Status:** Design Complete · **Target:** v2.21.0
> **Architecture:** CLI → Cloudflare Worker → Neon Serverless PostgreSQL

---

## Overview

`realitydb lab` creates instant, disposable PostgreSQL databases pre-loaded with template data. Users get a connection string, use it for testing/demos/development, and the database auto-deletes after the TTL expires.

**Why this matters:** Developers currently need Docker, local PostgreSQL, or a staging environment to test with RealityDB data. Lab removes all that friction — one command, instant database, auto-cleanup.

---

## CLI Commands

```bash
# Create a lab from a template
realitydb lab create --template banking --rows 10000 --ttl 24h --name my-test
# Output: 
#   Lab created: my-test
#   Connection: postgresql://lab_abc123:xyz@ep-something.neon.tech/neondb
#   Expires: 2026-04-11T04:00:00Z (24h)
#   Tables: 16 | Rows: 10,000

# List active labs
realitydb lab list
# Output:
#   NAME        TEMPLATE    ROWS    CREATED          EXPIRES          STATUS
#   my-test     banking     10,000  2026-04-10 04:00 2026-04-11 04:00 active
#   demo-1      healthcare  5,000   2026-04-09 10:00 2026-04-10 10:00 expired

# Get connection string for an existing lab
realitydb lab connect my-test
# Output: postgresql://lab_abc123:xyz@ep-something.neon.tech/neondb

# Extend TTL
realitydb lab extend my-test --ttl 48h

# Delete a lab manually
realitydb lab delete my-test

# Share a lab (generates a read-only connection)
realitydb lab share my-test
# Output: postgresql://lab_abc123_ro:xyz@ep-something.neon.tech/neondb (read-only)
```

---

## Architecture

### Component 1: CLI Commands (`src/commands/lab.ts`)

```
realitydb lab create
  → POST https://api.realitydb.dev/v1/labs
    Body: { template, rows, ttl, name, apiKey }
  ← { id, connectionString, expiresAt, tables, rows }

realitydb lab list
  → GET https://api.realitydb.dev/v1/labs
    Headers: Authorization: Bearer <apiKey>
  ← [{ id, name, template, status, connectionString, expiresAt }]

realitydb lab delete <name>
  → DELETE https://api.realitydb.dev/v1/labs/<id>
```

### Component 2: Cloudflare Worker (`workers/lab-api/`)

The API backend runs on Cloudflare Workers (free tier, globally distributed).

```typescript
// Endpoints:
POST   /v1/labs          → createLab()
GET    /v1/labs          → listLabs()
GET    /v1/labs/:id      → getLab()
DELETE /v1/labs/:id      → deleteLab()
PATCH  /v1/labs/:id/ttl  → extendTtl()
```

**Worker responsibilities:**
1. Authenticate request (validate API key against Supabase)
2. Call Neon API to create a branch
3. Run SQL schema + seed data on the new branch
4. Store lab metadata in Cloudflare KV (or D1)
5. Return connection string to CLI
6. CRON trigger: delete expired labs every hour

### Component 3: Neon Serverless PostgreSQL

Neon provides:
- **Instant branching** — create a database in ~1-2 seconds via API
- **Copy-on-write** — branches share storage with parent (cost-efficient)
- **Auto-suspend** — idle branches consume zero compute
- **API-driven** — create/delete branches programmatically
- **Free tier** — 10 branches, 0.5 GB storage, 190 compute hours/month

**Neon API calls:**
```bash
# Create a branch
POST https://console.neon.tech/api/v2/projects/{project_id}/branches
Body: { "branch": { "name": "lab-abc123" }, "endpoints": [{ "type": "read_write" }] }

# Delete a branch
DELETE https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}
```

### Component 4: Metadata Storage (Cloudflare D1 or KV)

```sql
CREATE TABLE labs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  rows INTEGER NOT NULL,
  neon_branch_id TEXT NOT NULL,
  neon_endpoint_id TEXT NOT NULL,
  connection_string TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active, expired, deleted
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  deleted_at TEXT
);
```

---

## Implementation Plan

### Phase 1: Neon Setup (30 min)

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a project: `realitydb-labs`
3. Get API key from Settings → API Keys
4. Store API key as Cloudflare Worker secret

### Phase 2: Cloudflare Worker (2-3 hours)

```bash
# Initialize worker
cd C:\Users\HP\Documents\databox
mkdir workers\lab-api
cd workers\lab-api
npx wrangler init lab-api
```

**Worker code structure:**
```
workers/lab-api/
├── src/
│   ├── index.ts          # Router (Hono or itty-router)
│   ├── neon.ts           # Neon API client
│   ├── auth.ts           # API key validation
│   ├── schema.ts         # Template SQL loader
│   └── cleanup.ts        # CRON: delete expired labs
├── wrangler.toml         # Worker config + KV bindings
└── package.json
```

**Key implementation details:**

```typescript
// neon.ts — Create a branch
async function createBranch(projectId: string, apiKey: string, name: string) {
  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branch: { name },
        endpoints: [{ type: 'read_write' }],
      }),
    }
  );
  const data = await res.json();
  return {
    branchId: data.branch.id,
    endpointId: data.endpoints[0].id,
    host: data.endpoints[0].host,
  };
}

// schema.ts — Seed the branch
async function seedBranch(connectionString: string, template: string, rows: number) {
  // Option A: Use @neondatabase/serverless (Neon's HTTP driver)
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(connectionString);
  
  // Generate SQL from template using RealityDB engine
  const pack = loadTemplate(template);
  const { tables } = normalizeTables(pack);
  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);
  const { allData } = generateData(ordered, rowsPerTable);
  
  // Execute DDL
  for (const table of ordered) {
    await sql(generateCreateTable(table));
  }
  
  // Execute INSERT statements
  for (const table of ordered) {
    const tableData = allData[table.name];
    if (!tableData?.length) continue;
    const insertSql = generateInsertStatements(table.name, tableData);
    await sql(insertSql);
  }
}
```

**CRON cleanup (wrangler.toml):**
```toml
[triggers]
crons = ["0 * * * *"]  # Every hour
```

```typescript
// cleanup.ts
async function cleanupExpiredLabs(env: Env) {
  const now = new Date().toISOString();
  // Query KV/D1 for expired labs
  // Delete Neon branches
  // Update status to 'deleted'
}
```

### Phase 3: CLI Commands (1-2 hours)

```bash
# Create src/commands/lab.ts
```

```typescript
// lab.ts
import { loadLicense } from '../auth/license';

const LAB_API = 'https://lab-api.realitydb.dev';

export async function labCreateCommand(options: {
  template: string;
  rows?: string;
  ttl?: string;
  name?: string;
}) {
  const license = loadLicense();
  if (!license) {
    console.error('Lab requires authentication. Run: realitydb login');
    process.exit(1);
  }

  const res = await fetch(`${LAB_API}/v1/labs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${license.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template: options.template,
      rows: parseInt(options.rows || '5000'),
      ttl: options.ttl || '24h',
      name: options.name || `lab-${Date.now()}`,
    }),
  });

  const lab = await res.json();
  
  console.log(`\n🧪 Lab Created!`);
  console.log(`   Name: ${lab.name}`);
  console.log(`   Connection: ${lab.connectionString}`);
  console.log(`   Tables: ${lab.tables} | Rows: ${lab.rows}`);
  console.log(`   Expires: ${lab.expiresAt}`);
  console.log(`\n   Connect: psql "${lab.connectionString}"`);
}
```

### Phase 4: Template Registry (1 hour)

Pre-built templates stored in Cloudflare R2 or KV:

| Template Name | Tables | Description |
|--------------|--------|-------------|
| `banking` | 16 | Banking platform (accounts, transactions, fraud) |
| `ecommerce` | 6 | Online store (customers, orders, payments) |
| `healthcare` | 6 | Medical system (patients, encounters) |
| `oncology` | 20 | Clinical oncology (patients, trials, genomics) |
| `saas` | 6 | SaaS platform (orgs, users, subscriptions) |
| `education` | 6 | School system (students, grades) |
| `restaurant` | 14 | Restaurant chain (orders, menus, deliveries) |
| `supply-chain` | 24 | Logistics (warehouses, shipments, inventory) |

Users can also upload custom templates:
```bash
realitydb lab create --pack ./my-custom-template.json --rows 10000
```

---

## Pricing

| Tier | Labs | TTL | Rows per Lab |
|------|------|-----|-------------|
| Free | 1 active | 4 hours | 5,000 |
| Core ($49/mo) | 5 active | 72 hours | 100,000 |
| Team | 20 active | 7 days | 500,000 |

**Cost basis:** Neon free tier provides 10 branches. At scale, Neon Pro ($19/mo) provides unlimited branches. Cloudflare Worker is free tier (100K requests/day).

---

## Development Sequence

```
Week 1: Neon account + Worker skeleton + createLab endpoint
Week 2: CLI lab create/list/delete + template registry
Week 3: TTL cleanup CRON + lab extend/share
Week 4: Testing, docs, publish
```

---

## Dependencies

| Service | Account Needed | Cost |
|---------|---------------|------|
| Neon | neon.tech | Free (10 branches) |
| Cloudflare Workers | Already have (Mpingo Systems) | Free |
| Cloudflare D1 or KV | Already have | Free |
| npm | Already have (@realitydb/cli) | Free |

**Total infrastructure cost:** $0 at launch (free tiers). $19/mo at scale (Neon Pro).

---

## Security

- Labs are isolated PostgreSQL branches — no shared data between users
- Connection strings use per-branch credentials (not shared)
- Read-only share connections use Neon's role system
- API key required for all operations
- TTL enforced server-side (CRON cleanup)
- No PII in lab databases (synthetic data only)

---

## Files to Create

| File | Purpose |
|------|---------|
| `workers/lab-api/src/index.ts` | Cloudflare Worker router |
| `workers/lab-api/src/neon.ts` | Neon branch API client |
| `workers/lab-api/src/auth.ts` | API key validation |
| `workers/lab-api/src/schema.ts` | Template loader + seeder |
| `workers/lab-api/src/cleanup.ts` | Expired lab CRON cleanup |
| `workers/lab-api/wrangler.toml` | Worker config |
| `apps/cli/src/commands/lab.ts` | CLI commands (create/list/delete/connect/share/extend) |

---

## Claude Code Prompt

```
Build the RealityDB Lab feature — disposable PostgreSQL databases from templates.

Architecture:
1. CLI commands in apps/cli/src/commands/lab.ts (create, list, delete, connect, share, extend)
2. Cloudflare Worker API at workers/lab-api/ (Hono router)  
3. Neon serverless PostgreSQL for instant branch creation
4. Cloudflare D1 for lab metadata storage

The CLI calls the Worker API, which creates a Neon branch, seeds it with template 
data using the RealityDB engine, stores metadata in D1, and returns a connection string.

Start with: Neon account setup, Worker skeleton with createLab endpoint, 
CLI lab create command. Get one end-to-end flow working first.

Reference: docs/LAB-DESIGN.md has the full architecture and API spec.
```

---

*RealityDB Lab Design v1.0 · April 2026 · Mpingo Systems LLC*
