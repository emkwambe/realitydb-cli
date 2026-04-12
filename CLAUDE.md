# RealityDB — Claude Code Context Summary

## Read CLAUDE.md first
The repo root contains `CLAUDE.md` with full architecture details. Read it before making any changes.

## Platform Overview
RealityDB is a synthetic data generation platform with 4 products:
- **CLI** (`@realitydb/cli@2.32.0`) — 41+ commands including 14 lab commands. Published on npm.
- **Studio** (`studio.realitydb.dev`) — Visual schema designer, exports pack JSON
- **Sandbox** (`sandbox.realitydb.dev`) — Browser SQL learning environment (PGlite)
- **Simulation Lab** — Disposable PostgreSQL databases via Neon (just shipped)

## Monorepo Structure (`C:\Users\HP\Documents\databox`)
```
databox/
├── packages/engine/        # @realitydb/engine — zero-dep data generation core
│   └── src/
│       ├── engine.ts       # topologicalSort, distributeRows, generateData, buildCardinalityMap
│       └── generators.ts   # Strategy implementations (uuid, email, enum, timestamp, etc.)
├── apps/cli/               # @realitydb/cli — Commander.js CLI
│   ├── src/
│   │   ├── index.ts        # All command registrations (41+ commands)
│   │   ├── gate.ts         # 4-tier pricing: Free/Core/Compliance/Enterprise
│   │   ├── telemetry.ts    # Anonymous usage telemetry
│   │   └── commands/
│   │       ├── lab.ts      # 14 lab commands (create/list/connect/extend/delete/snapshot/publish/fork/gallery/query:save/list/run/share)
│   │       ├── login.ts    # Auth commands
│   │       └── seed.ts     # Database seeding
│   ├── smoke-test.cjs      # 29 tests — run before every publish
│   └── dist/index.js       # Built output (tsup)
├── workers/
│   ├── lab-api/            # Cloudflare Worker — Lab API
│   │   ├── src/index.ts    # Hono router, 15 endpoints, Neon integration
│   │   ├── wrangler.toml   # D1 + R2 bindings
│   │   └── templates/      # Pre-generated SQL files
│   └── telemetry/          # Cloudflare Worker — Usage analytics
├── CLAUDE.md               # Full architecture reference
└── CLAUDE-CODE-STARTER.md  # Session starter for infrastructure work
```

## Deployed Infrastructure

| Service | URL / ID | Account |
|---------|----------|---------|
| Lab API Worker | `https://realitydb-lab-api.eddy-078.workers.dev` | Mpingo Systems (078fac3f) |
| Telemetry Worker | `https://realitydb-telemetry.eddy-078.workers.dev` | Same |
| D1: realitydb-labs | `1fa51a0c-c851-4cec-8e91-ac1ee2079ff8` | Same |
| D1: realitydb-telemetry | `bcc7b1a1-81f9-4671-a0bd-d5beca95f9b6` | Same |
| R2: realitydb-templates | `banking-5k.sql` uploaded | Same |
| Neon Project | `bold-mouse-18187324` (PostgreSQL 17, US East 1) | Neon |
| Lab API Key | `rdb_lab_mpingo_2026` | Stored as Worker secret |
| Sandbox (Pages) | `sandbox.realitydb.dev` | Same |
| Studio (Pages) | `studio.realitydb.dev` | Same |
| npm | `@realitydb/cli@2.32.0` | npmjs.com/~emkwambe |

## Lab API Endpoints (all deployed and working)

```
GET    /health                    → { status: "ok" }
POST   /v1/labs                   → Create lab (Neon branch + seed from R2)
GET    /v1/labs                   → List labs (?all=true for expired)
GET    /v1/labs/:id               → Get lab details
PATCH  /v1/labs/:id/ttl           → Extend TTL
DELETE /v1/labs/:id               → Delete lab + Neon branch
POST   /v1/labs/:id/share         → Get shareable connection string
POST   /v1/labs/:id/snapshot      → Create snapshot (data dump to R2)
GET    /v1/labs/:id/snapshots     → List snapshots
POST   /v1/labs/:id/queries       → Save a query
GET    /v1/labs/:id/queries       → List saved queries
POST   /v1/publish                → Publish snapshot to gallery
GET    /v1/gallery                → Browse published labs (?tag=, ?template=, ?q=)
GET    /v1/gallery/:slug          → View published lab (increments views)
POST   /v1/gallery/:slug/fork     → Fork a published lab
CRON   0 * * * *                  → Cleanup expired labs (hourly)
```

## D1 Schema (realitydb-labs)

Tables: `labs`, `snapshots`, `published_labs`, `forks`, `saved_queries`

## Lab Seeding Architecture (MVP — Pre-Generated SQL)

The Lab API uses **pre-generated SQL files** stored in R2, NOT dynamic engine execution:

```
CLI generates SQL → upload to R2 → Lab API fetches from R2 → executes on Neon branch
```

This avoids engine-in-Worker complexity. Templates are pre-generated at fixed row counts (5k, 10k, 50k, 100k).

**Currently in R2:** `templates/banking-5k.sql` only. Need to generate and upload more.

## Key Technical Details

### Neon Integration
- Branch creation returns `connection_uris[0].connection_uri` with password
- Fallback: `reveal_password` endpoint if no password in create response
- SQL seeding: single POST to `https://{host}/sql` with `queries` array (avoids 50 subrequest limit)
- Snapshot: queries each table individually (stays under subrequest limit by parsing row counts from SQL comments)

### Build Rules (CRITICAL)
1. **Build order:** `packages/engine` → `apps/cli` (engine must be built first if changed)
2. **Use `pnpm run build`** in each directory
3. **Never add `@realitydb/engine` to CLI's package.json** — bundled by tsup
4. **Use `[System.IO.File]::WriteAllText()`** for BOM-free UTF-8 on Windows
5. **Account for `\r\n`** in all string replacements
6. **Run `node smoke-test.cjs`** before every publish (29/29 must pass)
7. **Absolute PowerShell paths** — never rely on `cd`

### What You MUST NOT Touch
- `apps/cli/src/index.ts` — CLI command registrations (managed by developer in Claude chat)
- `apps/cli/src/commands/` — CLI command implementations (managed by developer)
- `packages/engine/` — Core engine (managed by developer)
- `apps/cli/src/gate.ts` — Tier pricing (managed by developer)
- `workers/telemetry/` — Already deployed, don't modify

### What You CAN Modify
- `workers/lab-api/` — Lab API Worker code and infrastructure
- Template SQL generation (using existing CLI, not modifying it)
- R2 bucket contents (uploading templates)
- D1 schema additions
- New Cloudflare Workers (if needed for integrations)
- Documentation files

## Current State & What's Next

### ✅ Completed
- 14 lab commands (create, list, connect, extend, delete, snapshot, snapshots, publish, gallery, fork, query:save, query:list, query:run, share)
- Enhanced snapshot output (table count, row count, template, queries count)
- Gallery with 1 published lab
- Smoke test baseline (29/29)

### 🔜 Next Priority: Lab Integrations MVP

1. **Generate + upload remaining template SQL to R2:**
   - Banking: 10k, 50k, 100k (5k already done)
   - Oncology, Restaurant, Supply Chain at 5k each
   ```powershell
   node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 10000 --format sql --drop-tables --seed 42 -o banking-10k.sql
   npx wrangler r2 object put realitydb-templates/templates/banking-10k.sql --file banking-10k.sql --remote
   ```

2. **Jupyter notebook export** (`lab export --format notebook`) — CLI-only, generates `.ipynb` JSON

3. **`--quiet` flag on `lab connect`** — outputs raw connection string only (for CI)

4. **`ci test` command** — one-command ephemeral test runner

5. **`ci init --lab`** — generate GitHub Actions YAML for lab-per-PR

6. **Slack webhook notification** — POST to webhook after lab creation

## Template Packs Available for Generation
Located at `C:\Users\HP\Documents\realityDB Packs\`:
- Banking (16 tables) — `realitydb-studio-pack.json`
- Oncology (20 tables)
- Restaurant (14 tables)
- Supply Chain (24 tables)
- EduNode (30 tables)

## Smoke Test Verification
After ANY change to CLI or engine:
```powershell
cd C:\Users\HP\Documents\databox\apps\cli
node smoke-test.cjs
# Must show 29/29 PASSED
```
