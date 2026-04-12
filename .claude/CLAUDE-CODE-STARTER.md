# RealityDB SimLab — Claude Code Session Starter

## Read First
Read `CLAUDE.md` in the repo root. It contains the complete architecture, build rules, file locations, and design decisions.

## Context
RealityDB is a synthetic data platform. The CLI (`@realitydb/cli@2.30.3`, 32 commands) and engine (`packages/engine/`) are built and maintained separately by the developer in Claude chat sessions. **Do NOT modify CLI commands or register new commands in `apps/cli/src/index.ts`.** CLI commands will be added by the developer.

## Your Scope: Infrastructure Only

You are building the **server-side infrastructure** for RealityDB Simulation Lab — the Cloudflare Worker API that creates disposable PostgreSQL databases via Neon.

### What You Build

1. **Cloudflare Worker** (`workers/lab-api/`) — the Lab API backend
2. **Neon integration** — branch creation, seeding, cleanup
3. **R2 bucket** — template SQL file storage
4. **D1 database** — lab metadata storage
5. **Pre-generated SQL files** — generate using the existing CLI, upload to R2

### What You Do NOT Build

- CLI commands (no `lab.ts`, no changes to `index.ts`)
- Engine changes (no modifications to `packages/engine/`)
- Gate.ts changes (no tier modifications)
- Telemetry changes
- Any new npm commands

---

## Phase 1: Inspect Existing Infrastructure

Before building anything new, inspect what already exists in the Sandbox repo:

```powershell
Get-ChildItem C:\Users\HP\Documents\realitydb-sandbox\workers\neon -Recurse | Select-Object FullName
Get-Content C:\Users\HP\Documents\realitydb-sandbox\workers\neon\src\index.ts
Get-Content C:\Users\HP\Documents\realitydb-sandbox\workers\neon\wrangler.toml
```

Also check the enterprise API and cloud sandbox:
```powershell
Get-ChildItem C:\Users\HP\Documents\realitydb-sandbox\workers\enterprise-api -Recurse | Select-Object FullName
Get-Content C:\Users\HP\Documents\realitydb-sandbox\src\CloudSandbox.tsx | Select-Object -First 50
Get-Content C:\Users\HP\Documents\realitydb-sandbox\src\cloudSandboxService.ts | Select-Object -First 50
```

Report what you find before proceeding.

## Phase 2: Pre-Generate Template SQL Files

Use the existing CLI to generate SQL files. Do NOT modify the CLI — just run it:

```powershell
# Banking (16 tables)
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 5000 --format sql --drop-tables --seed 42 -o C:\Users\HP\Documents\databox\workers\lab-api\templates\banking-5k.sql

node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 10000 --format sql --drop-tables --seed 42 -o C:\Users\HP\Documents\databox\workers\lab-api\templates\banking-10k.sql

node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 50000 --format sql --drop-tables --seed 42 -o C:\Users\HP\Documents\databox\workers\lab-api\templates\banking-50k.sql

node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 100000 --format sql --drop-tables --seed 42 -o C:\Users\HP\Documents\databox\workers\lab-api\templates\banking-100k.sql

# Repeat for: Oncology, Restaurant, Supply Chain
# Check C:\Users\HP\Documents\realityDB Packs\ for all available packs
```

## Phase 3: Build the Lab API Worker

Create `workers/lab-api/` in the **databox monorepo** (NOT in the sandbox repo):

```
workers/lab-api/
├── src/
│   ├── index.ts          # Hono router — all endpoints
│   ├── neon.ts           # Neon API client (createBranch, deleteBranch, getConnectionString)
│   ├── auth.ts           # API key validation (check against Supabase or simple secret)
│   ├── seed.ts           # Fetch SQL from R2, execute via @neondatabase/serverless
│   └── cleanup.ts        # CRON handler: delete expired labs
├── wrangler.toml         # D1 binding (realitydb-labs) + R2 binding (realitydb-templates)
└── package.json
```

### API Endpoints

```
POST   /v1/labs              → createLab(template, rows, ttl, name, apiKey)
GET    /v1/labs              → listLabs(apiKey) 
GET    /v1/labs/:id          → getLab(id, apiKey)
PATCH  /v1/labs/:id/ttl      → extendTtl(id, hours, apiKey)
DELETE /v1/labs/:id          → deleteLab(id, apiKey)
POST   /v1/labs/:id/share    → shareLab(id, apiKey)
GET    /health               → { status: "ok" }
```

### D1 Schema

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
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_labs_user ON labs(user_id);
CREATE INDEX idx_labs_status ON labs(status);
CREATE INDEX idx_labs_expires ON labs(expires_at);
```

### CRON Cleanup (wrangler.toml)

```toml
[triggers]
crons = ["0 * * * *"]
```

Every hour: query D1 for labs where `expires_at < now()` and `status = 'active'`, call Neon API to delete the branch, update status to `expired`.

### Neon API Usage

```typescript
// Create branch
POST https://console.neon.tech/api/v2/projects/{project_id}/branches
Headers: Authorization: Bearer {NEON_API_KEY}
Body: { "branch": { "name": "lab-{id}" }, "endpoints": [{ "type": "read_write" }] }

// Delete branch
DELETE https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}
Headers: Authorization: Bearer {NEON_API_KEY}
```

### Seeding Flow

```typescript
import { neon } from '@neondatabase/serverless';

async function seedBranch(connectionString: string, template: string, rows: number, env: Env) {
  const key = `templates/${template}-${rows >= 1000 ? rows/1000 + 'k' : rows}.sql`;
  const object = await env.TEMPLATES.get(key);
  if (!object) throw new Error(`Template not found: ${key}`);
  const sql = await object.text();
  const db = neon(connectionString);
  const statements = sql.split(';').filter(s => s.trim());
  for (let i = 0; i < statements.length; i += 50) {
    const batch = statements.slice(i, i + 50).join(';') + ';';
    await db(batch);
  }
}
```

## Phase 4: Deploy and Test

```powershell
npx wrangler d1 create realitydb-labs
npx wrangler r2 bucket create realitydb-templates
npx wrangler secret put NEON_API_KEY
npx wrangler secret put NEON_PROJECT_ID
cd C:\Users\HP\Documents\databox\workers\lab-api
npm install
npx wrangler deploy
curl https://realitydb-lab-api.eddy-078.workers.dev/health
```

## Rules

1. **Do NOT modify any files in `apps/cli/` or `packages/engine/`**
2. Only work in `workers/lab-api/` and related infrastructure
3. Use the Cloudflare account: Mpingo Systems (078fac3f0858379e6ceae8f4c5874059)
4. Telemetry Worker already exists at `workers/telemetry/` — don't touch it
5. Report what you find in `realitydb-sandbox/workers/neon/` before building
6. If you need Neon credentials or R2 bucket creation, prompt me

## Start Here

1. Read `CLAUDE.md`
2. Inspect `realitydb-sandbox/workers/neon/`
3. Pre-generate Banking template SQL at 5k rows
4. Build Worker skeleton with health check
5. Report back before proceeding to Neon integration
