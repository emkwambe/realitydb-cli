# RealityDB SimLab — Claude Code Infrastructure Directive

## Read `CLAUDE.md` in the databox repo root first.

---

## INFRASTRUCTURE STATUS (All Deployed & Verified)

### Lab API Worker
- **URL:** `https://realitydb-lab-api.eddy-078.workers.dev`
- **Source:** `C:\Users\HP\Documents\databox\workers\lab-api\src\index.ts` (single Hono router file)
- **Account:** Mpingo Systems (`078fac3f0858379e6ceae8f4c5874059`)
- **Auth:** API key `rdb_lab_mpingo_2026` via `X-API-Key` header or `Authorization: Bearer` header

### Neon PostgreSQL
- **Project:** `bold-mouse-18187324`
- **Region:** US East 1 (N. Virginia), PostgreSQL 17
- **Branch creation:** ~3 seconds per lab
- **Password:** Returned in `connection_uris[0].connection_uri` from branch creation API
- **Fallback:** `reveal_password` endpoint if password not in create response

### D1 Database: `realitydb-labs`
- **ID:** `1fa51a0c-c851-4cec-8e91-ac1ee2079ff8`
- **Tables:** `labs`, `snapshots`, `published_labs`, `forks`, `saved_queries`

### R2 Bucket: `realitydb-templates`
- **Contents:**
  - `templates/banking-5k.sql` (953 KB, 16 tables, lifecycle + temporal rules)
  - `templates/banking-10k.sql` (1.8 MB)
  - `templates/banking-50k.sql` (9.1 MB)
  - `templates/banking-100k.sql` (18.2 MB)

### Telemetry Worker
- **URL:** `https://realitydb-telemetry.eddy-078.workers.dev`
- **D1:** `realitydb-telemetry` (ID: `bcc7b1a1-81f9-4671-a0bd-d5beca95f9b6`)
- **DO NOT MODIFY**

### Other Deployed Workers (on Mpingo Systems account)
- `realitydb-sandbox` — Cloudflare Pages, SQL learning environment
- `realitydb-studio` — Cloudflare Pages, schema designer
- `realitydb-enterprise-api` — scaffold only
- `realitydb-neon-worker` — scaffold only (empty src)

---

## LAB API ENDPOINTS (18 total, all live)

### Core Lab Management
```
POST   /v1/labs                    → Create lab (Neon branch + seed from R2)
GET    /v1/labs                    → List labs (?all=true for expired)
GET    /v1/labs/:id                → Get lab details + connection string
PATCH  /v1/labs/:id/ttl            → Extend TTL
DELETE /v1/labs/:id                → Delete lab + destroy Neon branch
POST   /v1/labs/:id/share          → Get shareable read-only connection
```

### Snapshots & Queries
```
POST   /v1/labs/:id/snapshot       → Create snapshot (SQL dump to R2, returns table/row counts)
GET    /v1/labs/:id/snapshots      → List snapshots
POST   /v1/labs/:id/queries        → Save a query
GET    /v1/labs/:id/queries        → List saved queries
```

### Gallery (Publishing Pipeline)
```
POST   /v1/publish                 → Publish snapshot to gallery
GET    /v1/gallery                 → Browse published labs (?tag=, ?template=, ?q=)
GET    /v1/gallery/:slug           → View published lab (increments view count)
POST   /v1/gallery/:slug/fork      → Fork a published lab
```

### Export & CI
```
GET    /v1/labs/:id/export?format=notebook  → Download Jupyter .ipynb
POST   /v1/labs/ci                          → Minimal CI endpoint (2h TTL, auto-named)
```

### System
```
GET    /health                     → { status: "ok", service: "realitydb-lab-api" }
CRON   0 * * * *                   → Hourly cleanup of expired labs
```

---

## CLI LAB COMMANDS (14 commands, published @realitydb/cli@2.32.1)

```
realitydb lab create <template> [--rows N] [--ttl Xh] [--name alias]
realitydb lab list [--all]
realitydb lab connect <name>
realitydb lab extend <name> --ttl <duration>
realitydb lab delete <name>
realitydb lab snapshot <name> --name <snapshot-name> [--description text]
realitydb lab snapshots <name>
realitydb lab publish --snapshot <id> --title <text> [--authors] [--tags] [--license]
realitydb lab gallery [--tag X] [--template X] [-q search]
realitydb lab fork <slug> [--name alias]
realitydb lab query:save <name> --name <qname> --sql <query>
realitydb lab query:list <name>
realitydb lab query:run <name> --sql <query> [--save qname]
realitydb lab share <name>
```

---

## SANDBOX REPO (`C:\Users\HP\Documents\realitydb-sandbox\`)

### Existing Files Relevant to SimLab
```
src/CloudSandbox.tsx          — Cloud sandbox UI component (needs Lab API connection)
src/cloudSandboxService.ts    — Service layer (needs to call Lab API instead of local)
src/DataStorefront.tsx         — Data storefront UI (574 lines, needs pricing + Lab API)
src/dataStorefrontService.ts   — Storefront service layer
src/TemplateGallery.tsx        — Template browsing (reusable)
src/App.tsx                    — Main app router
```

### Workers in Sandbox Repo
```
workers/neon/       — EMPTY (just .wrangler/tmp, no source)
workers/stripe/     — Stripe payment worker (check if functional)
workers/enterprise-api/  — Enterprise API scaffold
workers/ai-tutor/   — AI tutor Cloudflare Worker
workers/lti/        — LTI integration scaffold
workers/api-gateway/ — API gateway scaffold
```

### Build & Deploy
```powershell
cd C:\Users\HP\Documents\realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true
```

---

## YOUR TASKS (Infrastructure Only)

### Task 1: Connect Sandbox UI to Lab API

**Inspect first, report before changing:**
```powershell
Get-Content C:\Users\HP\Documents\realitydb-sandbox\src\CloudSandbox.tsx
Get-Content C:\Users\HP\Documents\realitydb-sandbox\src\cloudSandboxService.ts
Get-Content C:\Users\HP\Documents\realitydb-sandbox\src\DataStorefront.tsx
```

**Goal:** Update `cloudSandboxService.ts` to call the live Lab API:
```typescript
const LAB_API = 'https://realitydb-lab-api.eddy-078.workers.dev';

async function createLab(template: string, rows: number) {
  const res = await fetch(`${LAB_API}/v1/labs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ template, rows, ttl: '4h', name: `sandbox-${Date.now()}` })
  });
  return res.json();
}
```

**CloudSandbox flow:**
1. User selects template (banking) + row count (5k/10k/50k/100k)
2. Calls Lab API to create lab
3. Shows progress/loading state
4. Displays connection string + lab info
5. Opens SQL editor connected to the Neon branch
6. User can run queries, save queries, take snapshots

**Do NOT install `@realitydb/engine` in the sandbox repo.** The Lab API handles all generation.

### Task 2: Gallery Page

Build a gallery browsing page that calls `GET /v1/gallery`:

**UI Requirements:**
- Card grid with title, author, template, row count, views, forks, tags
- Search/filter by tag and template
- Each card shows: Fork button, Notebook download link, View details
- Fork button calls `POST /v1/gallery/:slug/fork` and shows new connection string
- Notebook download links to `GET /v1/labs/:id/export?format=notebook`

**Route:** Add as a new tab/page in the sandbox app, accessible at `/gallery`

### Task 3: Data Store with Pricing Tiers

Update `DataStorefront.tsx` to show tiered pricing:

**Free (5K rows):** Available without auth for all templates
**Core ($49/mo):** 10K-50K rows
**Compliance ($199/mo):** 100K+ rows
**One-time purchase:** Individual datasets (e.g., $49 for 100K banking, $149 for 100K oncology)

Add D1 table for purchases:
```sql
CREATE TABLE IF NOT EXISTS dataset_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template TEXT NOT NULL,
  rows INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

Add store endpoints to Lab API Worker:
```
GET  /v1/store              → List available datasets with prices
GET  /v1/store/:template    → Dataset details + 5-row preview
POST /v1/store/:template/buy → Initiate purchase (can be stubbed for now)
```

Pricing config:
```json
{
  "banking": { "5k": 0, "10k": 4900, "50k": 4900, "100k": 7900 },
  "oncology": { "5k": 0, "10k": 4900, "50k": 9900, "100k": 14900 },
  "healthcare": { "5k": 0, "10k": 4900, "50k": 9900, "100k": 14900 },
  "supply-chain": { "5k": 0, "10k": 4900, "50k": 4900, "100k": 7900 }
}
```

### Task 4: Review Checklist

Before marking any task complete, verify:

**Lab API:**
- [ ] `GET /health` → `{ status: "ok" }`
- [ ] `POST /v1/labs` → creates lab, returns connection string with password
- [ ] `GET /v1/labs` → lists active labs
- [ ] `DELETE /v1/labs/:id` → deletes Neon branch
- [ ] `POST /v1/labs/:id/snapshot` → returns table count, row count, template
- [ ] `GET /v1/labs/:id/export?format=notebook` → valid .ipynb JSON
- [ ] `POST /v1/labs/ci` → minimal JSON for CI pipelines
- [ ] `GET /v1/gallery` → returns published labs
- [ ] `POST /v1/gallery/:slug/fork` → creates new lab from published data
- [ ] CRON cleanup runs hourly

**Sandbox UI:**
- [ ] CloudSandbox connects to Lab API (not PGlite) for cloud mode
- [ ] Template selector shows available templates with row count options
- [ ] Lab creation shows progress, then connection string
- [ ] SQL editor works against live Neon connection
- [ ] Gallery page displays published labs
- [ ] Fork button creates a new lab
- [ ] DataStorefront shows pricing tiers

**General:**
- [ ] No `@realitydb/engine` installed in sandbox repo
- [ ] No modifications to `apps/cli/` or `packages/engine/` in databox repo
- [ ] Worker deploys without errors
- [ ] Sandbox builds and deploys to Cloudflare Pages

---

## CRITICAL RULES

1. **Do NOT modify `apps/cli/`, `packages/engine/`, or `workers/telemetry/`** in the databox repo
2. **Do NOT run `pnpm add` or `pnpm remove` in `apps/cli/`** — this breaks the engine workspace junction
3. **Do NOT install `@realitydb/engine` in the sandbox repo** — Lab API handles generation
4. Only modify: `workers/lab-api/src/index.ts` (add endpoints), sandbox repo files
5. Report what you find in sandbox files BEFORE making changes
6. If you need Neon credentials or R2 uploads, prompt the developer

## CREDENTIALS

| Service | Value |
|---------|-------|
| Lab API URL | `https://realitydb-lab-api.eddy-078.workers.dev` |
| Lab API Key | `rdb_lab_mpingo_2026` |
| Neon Project | `bold-mouse-18187324` |
| D1 realitydb-labs | `1fa51a0c-c851-4cec-8e91-ac1ee2079ff8` |
| R2 bucket | `realitydb-templates` |
| Cloudflare Account | Mpingo Systems (`078fac3f0858379e6ceae8f4c5874059`) |
| Sandbox Pages project | `realitydb-sandbox` |
| Sandbox deploy | `npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true` |

## START HERE

1. Read `CLAUDE.md` in the databox repo
2. Inspect sandbox files: `CloudSandbox.tsx`, `cloudSandboxService.ts`, `DataStorefront.tsx`
3. Report what each file currently does
4. Then proceed with Task 1 (connect to Lab API)
