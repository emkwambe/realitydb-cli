# RealityDB — Claude Code Directive

## Read CLAUDE.md in repo root first. It has the full architecture.

---

## COMPLETED INFRASTRUCTURE (Do NOT rebuild any of this)

### Lab API Worker (`realitydb-lab-api.eddy-078.workers.dev`)
- **Source:** `workers/lab-api/src/index.ts` (single-file Hono Worker, 15 endpoints)
- **D1:** `realitydb-labs` (ID: `1fa51a0c-c851-4cec-8e91-ac1ee2079ff8`)
  - Tables: `labs`, `snapshots`, `published_labs`, `forks`, `saved_queries`
- **R2:** `realitydb-templates`
  - Contents: `templates/banking-5k.sql`, `banking-10k.sql`, `banking-50k.sql`, `banking-100k.sql`
- **Neon:** Project `bold-mouse-18187324` (PostgreSQL 17, US East 1)
- **Secrets set:** `NEON_API_KEY`, `NEON_PROJECT_ID`, `LAB_API_KEY` (`rdb_lab_mpingo_2026`)
- **CRON:** Hourly expired lab cleanup active
- **Gallery:** 1 published lab live

### Telemetry Worker (`realitydb-telemetry.eddy-078.workers.dev`)
- D1: `realitydb-telemetry` (ID: `bcc7b1a1-81f9-4671-a0bd-d5beca95f9b6`)

### CLI (`@realitydb/cli@2.32.0` on npm)
- 41+ commands including 14 lab commands
- Smoke test: 29/29 green (`apps/cli/smoke-test.cjs`)
- **Do NOT modify `apps/cli/` or `packages/engine/`** — CLI and engine are maintained by the developer

### Sandbox (`sandbox.realitydb.dev`)
- Separate repo: `C:\Users\HP\Documents\realitydb-sandbox\`
- PGlite-based SQL learning environment
- Has `CloudSandbox.tsx`, `DataStorefront.tsx`, `cloudSandboxService.ts`
- Engine is NOT installed in sandbox (`@realitydb` package not present)
- Workers exist but are scaffolds only: `workers/neon/` (empty), `workers/stripe/`, `workers/enterprise-api/`, `workers/ai-tutor/`

### Cloudflare Account
- Account: Mpingo Systems (`078fac3f0858379e6ceae8f4c5874059`)
- Domain: `realitydb.dev`
- Workers deployed: `realitydb-lab-api`, `realitydb-telemetry`, `realitydb-sandbox`, `realitydb-studio`, `realitydb-enterprise-api`, `realitydb-neon-worker`

---

## YOUR TASKS (Infrastructure Only)

### Task 1: Sandbox ↔ Lab API Integration

The Sandbox at `sandbox.realitydb.dev` has existing UI components for cloud sandboxes but they are NOT connected to the Lab API. Your job:

1. **Inspect existing UI:**
   - `C:\Users\HP\Documents\realitydb-sandbox\src\CloudSandbox.tsx` — what does it do currently?
   - `C:\Users\HP\Documents\realitydb-sandbox\src\cloudSandboxService.ts` — what API does it call?
   - `C:\Users\HP\Documents\realitydb-sandbox\src\DataStorefront.tsx` — what does this render?

2. **Connect to Lab API:**
   - Update `cloudSandboxService.ts` to call `https://realitydb-lab-api.eddy-078.workers.dev/v1/labs`
   - CloudSandbox should: create lab → show connection string → let user run SQL → show results
   - DataStorefront should: show available templates (banking at 5k/10k/50k/100k) → one-click create

3. **Do NOT install `@realitydb/engine` in the sandbox.** The Lab API handles all data generation via pre-generated SQL in R2. The sandbox just needs HTTP calls to the Lab API.

### Task 2: Lab Gallery UI

Build a gallery page in the sandbox that displays published labs from `GET /v1/gallery`. Allow:
- Browse published labs with title, author, template, rows, view count, fork count
- One-click fork via `POST /v1/gallery/:slug/fork`
- View saved queries for a published lab

Gallery should be accessible at `sandbox.realitydb.dev/gallery` or as a tab in the existing UI.

### Task 3: Jupyter Notebook Export Endpoint

Add a new endpoint to the Lab API Worker:

```
GET /v1/labs/:id/export?format=notebook
```

Returns a `.ipynb` JSON file containing:
- Markdown cell: Title, template, seed, description
- Markdown cell: Schema (table names + column list as markdown table)
- Code cell: `pip install psycopg2-binary pandas` setup
- Code cell: Connection example using `pd.read_sql()`
- Code cells: Each saved query as a separate cell
- Markdown cell: Reproducibility info (template + seed = identical data)
- Markdown cell: BibTeX citation for RealityDB

Implementation: all in `workers/lab-api/src/index.ts` — add a new route.

### Task 4: CI Integration Endpoint

Add to Lab API Worker:

```
POST /v1/labs/ci
Body: { "template": "banking", "rows": 5000 }
Response: { "connectionString": "...", "labId": "...", "expiresAt": "..." }
```

Simplified endpoint for CI pipelines — no auth header needed (uses API key in body), returns minimal JSON for `DATABASE_URL` extraction.

### Task 5: Template Upload Automation

Create a script at `workers/lab-api/scripts/upload-templates.sh` that:
1. Takes a template directory and row count as arguments
2. Runs the CLI `run` command to generate SQL
3. Uploads to R2 via `wrangler r2 object put`

**Do NOT modify the CLI.** Just call it as an external tool.

```powershell
# Example usage (PowerShell):
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\pack.json" --rows 5000 --format sql --drop-tables --seed 42 -o template-5k.sql
npx wrangler r2 object put realitydb-templates/templates/template-5k.sql --file template-5k.sql --remote
```

---

## DO NOT TOUCH

- `apps/cli/` — ALL CLI code (commands, gate.ts, telemetry.ts, index.ts)
- `packages/engine/` — Core data generation engine
- `workers/telemetry/` — Deployed and working
- Any npm publish or version bumps

## WHAT YOU CAN MODIFY

- `workers/lab-api/src/index.ts` — Add new endpoints (notebook export, CI endpoint)
- `C:\Users\HP\Documents\realitydb-sandbox\src/` — Sandbox UI components
- `C:\Users\HP\Documents\realitydb-sandbox\workers/` — Sandbox worker scaffolds
- New scripts in `workers/lab-api/scripts/`
- Documentation files

## BUILD & DEPLOY RULES

### Lab API Worker
```powershell
cd C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler deploy
```

### Sandbox
```powershell
cd C:\Users\HP\Documents\realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true
```

### Testing
- Lab API health: `curl https://realitydb-lab-api.eddy-078.workers.dev/health`
- Lab create test: `Invoke-RestMethod -Uri "https://realitydb-lab-api.eddy-078.workers.dev/v1/labs" -Method POST -ContentType "application/json" -Body '{"template":"banking","rows":5000,"ttl":"1h","name":"test","apiKey":"rdb_lab_mpingo_2026"}'`
- Always delete test labs after: `Invoke-RestMethod -Uri "https://realitydb-lab-api.eddy-078.workers.dev/v1/labs/<id>" -Method DELETE -Headers @{"X-API-Key"="rdb_lab_mpingo_2026"}`

## TEMPLATE DATASET QUALITY STATUS

Only Banking templates are currently in R2. The developer will generate and upload new high-quality templates (with lifecycle rules, temporal ordering, enum weights) — this is NOT your task. When new templates are uploaded, they will follow the naming convention `templates/{domain}-{rows}k.sql`.

Available row counts: 5k, 10k, 50k, 100k.
Available templates (planned): banking, fintech, oncology, healthcare, supply-chain, cybersecurity, education.

## KEY CREDENTIALS

| Service | Value |
|---------|-------|
| Lab API URL | `https://realitydb-lab-api.eddy-078.workers.dev` |
| Lab API Key | `rdb_lab_mpingo_2026` |
| Neon Project | `bold-mouse-18187324` |
| D1 realitydb-labs | `1fa51a0c-c851-4cec-8e91-ac1ee2079ff8` |
| R2 bucket | `realitydb-templates` |
| Cloudflare Account | Mpingo Systems (`078fac3f0858379e6ceae8f4c5874059`) |

## START HERE

1. Read `CLAUDE.md` in repo root
2. Inspect `C:\Users\HP\Documents\realitydb-sandbox\src\CloudSandbox.tsx` and `cloudSandboxService.ts`
3. Report what they currently do before making changes
4. Then proceed with Task 1 (Sandbox ↔ Lab API connection)
