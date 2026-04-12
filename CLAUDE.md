# RealityDB — Claude Code Implementation Prompt

> **Date:** April 12, 2026 · **Current CLI:** @realitydb/cli@2.30.3 (32 commands)
> **Repo:** github.com/emkwambe/databox · **Monorepo:** pnpm workspaces
> **Deploy this prompt as CLAUDE.md in the repo root for Claude Code to reference**

---

## CRITICAL BUILD RULES

Before writing ANY code, internalize these:

1. **Windows PowerShell only.** All commands use absolute paths. Never `cd` first.
2. **Build order:** `packages/engine` → `apps/cli` (engine MUST build before CLI)
3. **BOM-free UTF-8:** Use `[System.IO.File]::WriteAllText()` for all file writes
4. **Line endings:** Windows uses `\r\n`. All string replacements must account for this.
5. **Engine is bundled:** Never add `@realitydb/engine` to CLI's `package.json` dependencies. tsup bundles it.
6. **Test before publish:** Always `node dist/index.js <command>` locally before `npm publish`
7. **Verify after deploy:** Always `npm install -g @realitydb/cli@latest && realitydb --version`

---

## REPO STRUCTURE

```
C:\Users\HP\Documents\databox\
├── apps/
│   └── cli/                    # @realitydb/cli (npm package)
│       ├── src/
│       │   ├── index.ts        # Commander.js program + run handler
│       │   ├── gate.ts         # 4-tier pricing enforcement
│       │   ├── telemetry.ts    # Anonymous usage telemetry
│       │   ├── auth/license.ts # API key management
│       │   └── commands/       # One file per command
│       │       ├── scan.ts     # DB introspection + --infer-enums --detect-pii --estimate-cardinality
│       │       ├── tune.ts     # weightTuneCommand + ruleAddCommand
│       │       ├── validate.ts # 7 quality checks
│       │       ├── menu.ts     # Interactive navigator
│       │       ├── enhanced-status.ts  # Analytics dashboard
│       │       ├── audit-export.ts     # Signed compliance export
│       │       └── ... (split, anomaly, explain, benchmark, etc.)
│       ├── tsup.config.ts
│       └── package.json
├── packages/
│   └── engine/                 # @realitydb/engine (internal, bundled)
│       └── src/
│           ├── engine.ts       # Core: topologicalSort, distributeRows, distributeRowsVariable, generateData, buildCardinalityMap
│           ├── generators.ts   # Strategy implementations (uuid, email, enum, timestamp, etc.)
│           ├── types.ts        # NormalizedTable, NormalizedColumn interfaces
│           └── index.ts        # Exports
├── workers/
│   └── telemetry/              # Cloudflare Worker (DEPLOYED)
│       ├── src/index.ts        # POST /v1/telemetry, GET /v1/telemetry/stats
│       └── wrangler.toml       # D1: realitydb-telemetry (bcc7b1a1-81f9-4671-a0bd-d5beca95f9b6)
├── docs/
│   ├── LAB-DESIGN.md           # SimLab architecture (Neon + Cloudflare Worker)
│   ├── SIMLAB-VISION-AUDIT.md  # 36 templates, 9 verticals, phase roadmap
│   ├── COMMAND-DICTIONARY.md   # Customer-facing guide (32 commands, 11 workflows)
│   ├── TELEMETRY-DESIGN.md     # D1 schema + dashboard queries
│   └── RESEARCH.md             # Whitepaper (DAG resolution, privacy pipeline)
└── realitydb-internal/         # Not in git
    ├── NEXT-CHAT-HANDOVER.md
    ├── COMPLIANCE-STRATEGY.md
    └── go-to-market-plan.md
```

---

## INFRASTRUCTURE (ALREADY DEPLOYED)

| Service | URL / ID | Account |
|---------|----------|---------|
| Telemetry Worker | `https://realitydb-telemetry.eddy-078.workers.dev` | Mpingo Systems (078fac3f) |
| Telemetry D1 | `bcc7b1a1-81f9-4671-a0bd-d5beca95f9b6` | Same |
| Sandbox (Cloudflare Pages) | `sandbox.realitydb.dev` | Same |
| Sandbox Repo | `C:\Users\HP\Documents\realitydb-sandbox\` | Local (has workers/neon, workers/stripe, workers/enterprise-api, workers/ai-tutor) |
| Studio | `studio.realitydb.dev` | Same |
| Studio Repo | `C:\Users\HP\Documents\realityDB-sutudio\` | github.com/emkwambe/realityDB-sutudio |
| EduNode Supabase | `postgresql://postgres.cfpongyknrdrudetjhdq:ips5nwzGLL3KpQqP@aws-0-us-west-2.pooler.supabase.com:5432/postgres` | Supabase |
| npm | `@realitydb/cli@2.30.3` | npmjs.com/~emkwambe |
| Anthropic API | `$env:ANTHROPIC_API_KEY` in PowerShell $PROFILE | Anthropic |

---

## ENGINE ARCHITECTURE (packages/engine/src/engine.ts)

### Key Functions
- `normalizeTables(pack)` — Converts any pack format (Studio v4.3.0 or CLI) into normalized `{ tables, relationships }`
- `topologicalSort(tables)` — Orders by FK dependencies (roots first)
- `distributeRows(ordered, totalRows)` — Fixed 2:1 root/child (backward compat when no cardinality)
- `distributeRowsVariable(ordered, totalRows, pack)` — Uses cardinality configs. Caps: 20x parent, 40% max per table, deficit redistribution
- `buildCardinalityMap(pack)` — Resolves both ID-based (`tbl-01`) and name-based (`patients`) formats
- `generateData(ordered, rowsPerTable, pack)` — Main loop: FK resolution, lifecycle rules, temporal ordering, enum weights

### How Cardinality Works
1. `scan --estimate-cardinality` runs `SELECT fk_col, COUNT(*) GROUP BY fk_col` per FK
2. Stored as `relationships[].cardinality = { strategy: "poisson", mean: 9.4, min: 1, max: 20 }`
3. `distributeRowsVariable()` reads configs, allocates proportionally
4. No config = falls back to `distributeRows()` (backward compat)

### How PII Detection Works
1. `scan --detect-pii` checks column names + samples data with regex
2. Exclusion list: `stripe_`, `subscription_`, `multiplier`, etc.
3. Stored as `col.pii = { category: "email", confidence: "high" }`
4. `run --mask-pii` reads metadata, replaces: email→masked_xxx@example.com, name→REDACTED, phone→555-000-XXXX

---

## TASK 1: Build RealityDB SimLab (Cloudflare Worker + Neon + CLI)

### Architecture
```
realitydb lab create banking --rows 10000 --ttl 24h
    │
    ▼
CLI → POST https://lab-api.realitydb.dev/v1/labs
    │
    ▼
Cloudflare Worker (workers/lab-api/):
  1. Authenticate (validate API key)
  2. Create Neon branch (instant, ~2s)
  3. Fetch pre-generated SQL from R2
  4. Execute SQL against branch
  5. Store metadata in D1
  6. Return connection string
    │
    ▼
User gets: postgresql://lab_abc123:pass@ep-xyz.neon.tech/neondb
```

### MVP Seeding Strategy
Pre-generate SQL files for each template at fixed row counts (5k, 10k, 50k, 100k). Store in Cloudflare R2. Worker fetches and executes — no engine-in-Worker complexity.

### CRITICAL DESIGN DECISION: Pre-Generated SQL (MVP) vs Dynamic Generation (Post-MVP)

| Aspect | MVP (Pre-Generated) | Post-MVP (Dynamic) |
|--------|---------------------|---------------------|
| How it works | Worker fetches `.sql` from R2, executes on Neon branch | Worker runs RealityDB engine via WASM, streams to Neon |
| Complexity | Low — fetch file + execute SQL | High — WASM bundle, memory management, chunked generation |
| Reliability | High — tiny failure surface | Risky — engine-in-Worker introduces multiple failure points |
| Latency | Fast — SQL execution only | Slower — engine init + generation + execution |
| Flexibility | Limited to pre-generated row counts (5k/10k/50k/100k) | Full — any row count, any custom pack |
| Time to ship | 2-3 weeks | 4-6 weeks |

**Decision: Pre-generated SQL for MVP.** This is a strategic simplification, not a compromise. Ship fast, iterate later.

### Post-MVP Evolution Roadmap

| Phase | Feature | Depends On | Priority |
|-------|---------|------------|----------|
| MVP | `lab create/list/connect/extend/delete/share` | Pre-gen SQL + Neon + D1 | P0 |
| MVP+1 | `lab snapshot` — save state before destructive testing | Neon Time Travel API | P1 |
| MVP+2 | `lab logs <name>` — stream Worker logs for debugging | Worker log forwarding | P1 |
| MVP+3 | `lab ci init` — generate GitHub/GitLab YAML for lab-in-CI | Template YAML generator | P1 |
| V2 | `lab split` — create train/val/test branch triplets | Neon branching × 3 | P1 |
| V2 | `lab simulate` — inject fraud-spike/churn-wave into live lab | Engine in Worker (WASM) | P2 |
| V2 | `lab audit` / `lab report` — compliance trail per lab | D1 audit table | P1 |
| V2 | `lab analyze privacy` — k-anonymity/l-diversity on lab data | Statistical library in Worker | P2 |
| V3 | Dynamic generation via WASM engine | `generateDataChunked()` + WASM build | P2 |
| V3 | Team lab visibility — org-level lab management | Supabase RLS + org model | P2 |

### Resilience & Cost Safety

| Risk | Mitigation |
|------|-----------|
| CRON cleanup fails → orphaned Neon branches | Circuit breaker: if cleanup skips >3 cycles, send alert via Cloudflare Worker email. Also run manual cleanup command: `realitydb lab gc --force` |
| Neon free tier exhausted (10 branches, 190 compute hours) | Gate by tier. Free=1 lab/4h TTL. Auto-suspend on idle. Monitor via telemetry. |
| R2 pre-gen SQL files outdated after template update | CI pipeline: re-generate SQL on template change, upload to R2. Include version hash in filename. |
| Lab actively in use when TTL expires | Warn at <1h remaining (CLI shows warning on `lab connect`). `lab extend` doesn't interrupt connections. |

### EXISTING INFRASTRUCTURE (in realitydb-sandbox repo)
The Sandbox repo at `C:\Users\HP\Documents\realitydb-sandbox\` already has:
- `workers/neon/` — Neon worker scaffold (CHECK THIS FIRST before creating new)
- `workers/stripe/` — Stripe payment worker
- `workers/enterprise-api/` — Enterprise API worker
- `workers/ai-tutor/` — AI tutor Cloudflare Worker
- `src/CloudSandbox.tsx` — Cloud sandbox UI component
- `src/DataStorefront.tsx` — Data storefront UI (proto custom data cart)
- `src/TemplateGallery.tsx` — Template browsing UI
- `src/sandbox.ts` — Local sandbox engine (PGlite/WASM)

**IMPORTANT:** Before building `lab-api`, inspect `workers/neon/` in the Sandbox repo — it may already have Neon branch creation logic. Reuse, don't rebuild.

### Files to Create (in databox monorepo)
```
# Only if workers/neon in sandbox repo doesn't cover lab API:
workers/lab-api/
├── src/
│   ├── index.ts          # Hono router
│   ├── neon.ts           # Neon branch API client (or import from sandbox workers/neon)
│   ├── auth.ts           # API key validation
│   ├── seed.ts           # Fetch SQL from R2, execute via @neondatabase/serverless
│   └── cleanup.ts        # CRON: delete expired labs
├── wrangler.toml         # D1 + R2 bindings
└── package.json

# CLI commands (always create in databox repo):
apps/cli/src/commands/lab.ts  # lab create/list/connect/extend/delete/share
```

### D1 Schema (labs metadata)
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
```

### CLI Commands
```bash
realitydb lab create banking                              # Defaults: 5k rows, 4h TTL
realitydb lab create banking --rows 50000 --ttl 72h --name fraud-testing
realitydb lab list                                        # Show active labs
realitydb lab list --all                                  # Include expired
realitydb lab connect my-test                             # Copy connection string to clipboard
realitydb lab extend my-test --ttl 48h                    # Extend TTL
realitydb lab delete my-test                              # Destroy
realitydb lab share my-test                               # Read-only connection, 24h TTL
```

### Pricing Limits (gate.ts)
| Tier | Active Labs | Max TTL | Rows/Lab |
|------|------------|---------|----------|
| Free | 1 | 4h | 5,000 |
| Core | 5 | 72h | 100,000 |
| Compliance | 10 | 7d | 500,000 |
| Enterprise | Unlimited | 30d | Unlimited |

### Prerequisites
1. Create Neon account at neon.tech
2. Create project: `realitydb-labs`
3. Get API key from Settings → API Keys
4. Store as Cloudflare Worker secret: `npx wrangler secret put NEON_API_KEY`
5. Create R2 bucket: `npx wrangler r2 bucket create realitydb-templates`
6. Create D1 database: `npx wrangler d1 create realitydb-labs`

### CRITICAL ENGINE REQUIREMENT: Chunked Generation
The current `generateData()` generates all rows in memory. For the Worker (128MB limit), add a chunked generator to `packages/engine/src/engine.ts`:

```typescript
export function* generateDataChunked(
  ordered: NormalizedTable[],
  rowsPerTable: Record<string, number>,
  pack: any,
  chunkSize: number = 50000,
): Generator<{ table: string; rows: any[] }> {
  const generatedIds: Record<string, any[]> = {};
  
  for (const table of ordered) {
    const total = rowsPerTable[table.name];
    const ids: any[] = [];
    
    for (let offset = 0; offset < total; offset += chunkSize) {
      const batchSize = Math.min(chunkSize, total - offset);
      const rows = generateBatch(table, batchSize, generatedIds, pack);
      rows.forEach(r => { if (r.id) ids.push(r.id); });
      yield { table: table.name, rows };
    }
    
    generatedIds[table.name] = ids;
  }
}
```

The Worker consumes this:
```typescript
for (const { table, rows } of generateDataChunked(ordered, rowsPerTable, pack)) {
  const sql = generateInsertStatements(table, rows);
  await neon.query(sql);  // Stream to Neon, release memory
}
```

### Worker CPU Limits
- Free plan: 30s CPU per request — sufficient for <100K rows
- Paid plan ($5/mo): 15 min CPU — sufficient for 2M rows
- For >2M rows: Use Cloudflare Durable Objects (long-running tasks)

Add to `wrangler.toml`:
```toml
[durable_objects]
bindings = [
  { name = "GENERATOR", class_name = "DataGenerator" }
]

[[migrations]]
tag = "v1"
new_classes = ["DataGenerator"]
```

### Sandbox Repo Integration
The Sandbox repo (`C:\Users\HP\Documents\realitydb-sandbox\`) already has:
- `workers/neon/` — **Inspect this first.** May already have Neon branch creation.
- `src/sandbox.ts` — PGLite engine. For cloud labs, this needs an HTTP client variant (`cloudSandbox.ts`) that calls the Worker API instead of PGLite.
- `src/CloudSandbox.tsx` — UI component for cloud sandboxes (may already handle the session flow).
- 90% of frontend components are reusable (SQLEditor, ResultsPanel, ChartPanel, SchemaERD, QueryStats).

---

## TASK 2: Dataset Watermarking

Every dataset generated by RealityDB should contain an invisible watermark proving provenance.

### Implementation
Add a `_realitydb_meta` table to every SQL output:

```sql
CREATE TABLE IF NOT EXISTS _realitydb_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO _realitydb_meta (key, value) VALUES
  ('generator', 'RealityDB CLI'),
  ('version', '2.30.3'),
  ('template', 'banking'),
  ('rows', '50000'),
  ('seed', '42'),
  ('generated_at', '2026-04-12T04:00:00Z'),
  ('client_id', 'uuid-here'),
  ('tier', 'core'),
  ('checksum', 'sha256:abc123...'),
  ('license', 'Generated by RealityDB. Commercial redistribution requires Enterprise license.');
```

### Steganographic Watermark (hidden in data)
Additionally, embed a statistical fingerprint in the data itself:
- Row IDs follow a specific UUID v4 pattern seeded by client_id
- Timestamp distribution has a characteristic micro-signature (±0.001s offsets in a Fibonacci-like pattern)
- Enum weight ratios encode a 32-bit client identifier across the first 100 rows

This means even if someone strips `_realitydb_meta`, the data itself can be traced back to the generating account.

### Where to implement
- `apps/cli/src/index.ts` — add `_realitydb_meta` INSERT after data generation in the run handler
- `packages/engine/src/engine.ts` — add UUID micro-signature to `generateData()`

---

## TASK 3: High-Quality Domain Template Variants

Generate pre-built template packs using the existing AI template generation pipeline (`realitydb generate:template`) combined with expert review.

### Pipeline
```bash
# 1. AI generates draft
realitydb generate:template --domain "fraud detection for banking" --tables 16 --output bfsi-fraud-aml.json

# 2. Expert reviews: add lifecycle rules, tune weights, fix cardinality
realitydb tune --pack bfsi-fraud-aml.json --table transactions --column status --values "completed:80,failed:5,fraudulent:15"
realitydb add --pack bfsi-fraud-aml.json --table alerts --column status --trigger resolved --nullify "resolution_notes,resolved_at"

# 3. Validate
realitydb validate --pack bfsi-fraud-aml.json --level strict

# 4. Generate sample + verify
realitydb run --pack bfsi-fraud-aml.json --rows 100000 --format sql --mask-pii --seed 42 -o sample.sql

# 5. Upload to R2 for SimLab
# Templates are stored at: templates/{domain}/{template-name}/template.json
```

### Priority Templates to Build (by revenue impact)

#### P0: BFSI (highest-paying vertical, $12K-60K/yr per customer)
1. `bfsi-fraud-aml` (16 tables) — Transaction laundering, SAR patterns, entity resolution
2. `bfsi-credit-risk` (14 tables) — Loan apps, credit scores, defaults, vintage analysis
3. `bfsi-payments` (12 tables) — Card transactions, chargebacks, 3DS, merchant risk

#### P1: Healthcare (HIPAA unlocks enterprise)
4. `health-ehr-clinical` (22 tables) — Patients, encounters, ICD-10, medications, FHIR
5. `health-claims-billing` (16 tables) — Claims lifecycle, CPT codes, EOBs, provider networks

#### P2: Cybersecurity
6. `cyber-insider-threat` (16 tables) — Employee logs, file access, UEBA scores
7. `cyber-network-ids` (14 tables) — Network flows, firewall, MITRE ATT&CK

### Template Quality Checklist
Every template MUST have:
- [ ] All columns with explicit strategies (no `text` fallbacks)
- [ ] At least 3 lifecycle rules (state machine enforcement)
- [ ] At least 2 temporal rules (chronological ordering)
- [ ] Weighted enums with research-based distributions
- [ ] Variable cardinality configs on all FK relationships
- [ ] PII columns annotated
- [ ] `realitydb validate --level strict` passes
- [ ] 100K row generation verified (zero mock values)

---

## TASK 4: Custom Data Cart (Enterprise Feature)

A web UI where enterprise customers can configure and order custom datasets.

### User Flow
```
1. Customer selects domain → "Banking: Fraud Detection"
2. Configures parameters:
   - Row count: 500K
   - Fraud rate: 15% (adjust slider)
   - Time range: Jan 2024 - Dec 2025
   - Include PII masking: Yes
   - Include anomalies: Yes (3% extreme-value, 2% duplicate)
   - Output format: Parquet
3. Reviews configuration summary
4. Submits order → Stripe payment ($2,500)
5. RealityDB generates dataset → Expert review → Delivers via R2 download link
6. Customer receives: dataset + compliance report + lineage proof
```

### Implementation
- React frontend at `cart.realitydb.dev`
- Cart state stored in Supabase
- Stripe checkout for payment
- Cloudflare Worker processes order queue
- Admin dashboard for expert review queue

### Database Schema (Supabase)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  template TEXT NOT NULL,
  config JSONB NOT NULL,  -- { rows, fraud_rate, time_range, pii_masking, anomalies, format }
  status TEXT DEFAULT 'pending',  -- pending, generating, reviewing, delivered, cancelled
  stripe_payment_id TEXT,
  amount_cents INTEGER,
  dataset_url TEXT,
  compliance_report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT
);
```

---

## TASK 5: Remaining CLI Commands to Build

### P0: Populate audit trail across all commands
Currently only `run` calls `recordOperation()`. Add to: `scan`, `tune`, `add`, `validate`, `seed`, `split`, `anomaly`, `mask`, `capture`, `explain`, `benchmark`, `ci`, `convert`.

### P1: `realitydb watermark`
```bash
realitydb watermark --data output.sql
# Output: checksum, client_id, generation timestamp, template, tier
```

### P2: `realitydb lineage`
```bash
realitydb lineage --pack template.json --data output.sql
# Output: Full provenance chain from schema → rules → generation → output
```

### P3: Menu v2 (interactive execution)
Allow users to execute commands directly from the menu with argument prompting:
```
> 1
📝 scan — Scan a PostgreSQL database

   Connection string: [user types here]
   Infer enums? (y/n): y
   Detect PII? (y/n): y

   Running: realitydb scan --connection "..." --infer-enums --detect-pii -o template.json
```

---

## KNOWN ISSUES (FIX BEFORE BUILDING NEW FEATURES)

| Issue | File | Fix |
|-------|------|-----|
| `past_date` strategy generates mock values | Any template using `past_date` | Replace with `timestamp` in template JSON |
| Audit log entries = 0 for most commands | `apps/cli/src/index.ts` | Add `recordOperation()` to all command handlers |
| `risk_alerts` dominates EduNode at 40% | `packages/engine/src/engine.ts` | Acceptable with current 40% cap; could add per-table max config |
| Menu v1 is read-only | `apps/cli/src/commands/menu.ts` | v2 needs readline argument prompting |

---

## TESTING COMMANDS (Run after every change)

```powershell
# Build
cd C:\Users\HP\Documents\databox\packages\engine; pnpm run build
cd C:\Users\HP\Documents\databox\apps\cli; pnpm run build

# Smoke test
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js --version
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js menu

# Full workflow
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js scan --connection "postgresql://postgres.cfpongyknrdrudetjhdq:ips5nwzGLL3KpQqP@aws-0-us-west-2.pooler.supabase.com:5432/postgres" --infer-enums --detect-pii --estimate-cardinality -o test-scan.json
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js validate --pack test-scan.json --level strict
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack test-scan.json --rows 10000 --format sql --mask-pii -o test.sql
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js analytics

# Backward compat (Banking — no cardinality)
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" --rows 5000 --format sql -o banking-test.sql

# Telemetry check
Invoke-RestMethod -Uri "https://realitydb-telemetry.eddy-078.workers.dev/v1/telemetry/stats" | ConvertTo-Json
```

---

## PUBLISH CHECKLIST

```powershell
cd C:\Users\HP\Documents\databox
git add .
git commit -m "feat: <description>"
git push origin main

cd apps\cli
npm version patch  # or minor for new features
npm publish --access public

npm cache clean --force
npm install -g @realitydb/cli@latest
realitydb --version
```

---

*RealityDB Claude Code Implementation Prompt v1.0 · April 2026 · Mpingo Systems LLC*
