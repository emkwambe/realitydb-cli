# RealityDB — Comprehensive Resource Map & Development Guide

> **Classification:** Internal — Mpingo Systems LLC
> **Version:** 3.0
> **Date:** June 28, 2026
> **Purpose:** Upload this file at the start of ANY new chat that touches RealityDB.
> **Rule:** Read EVERYTHING before writing ANY code or running ANY command.

---

## PART 1: WHO WE ARE

**Company:** Mpingo Systems LLC (Raleigh, NC)
**Tagline:** "Precision Tools built to stay."
**Founder:** Eddy Mkwambe — mathematician, veteran educator, dual MS degrees
**Stripe:** acct_1TLxaa6sezd2LSNW
**EIN:** 42-2880605
**Address:** 4030 Wake Forest Rd Ste 349, Raleigh NC 27609

---

## PART 2: THE REALITYDB ECOSYSTEM

### 2.1 Core Product

**RealityDB** is a deterministic synthetic data generation engine. It generates production-quality test data from JSON schema templates — with full FK integrity, temporal ordering, weighted enum distributions, and cryptographic provenance.

**Not a toy faker.** Every dataset scores 95-100/100 on our own quality assessment. Every enum has research-backed weights with peer-reviewed citations. Every FK references a real parent row.

### 2.2 Product Surface Area

| Product | URL | Stack | Status |
|---|---|---|---|
| **CLI** | npm: `@realitydb/cli` | TypeScript, tsup, turbo | v2.38.0 (pending publish) |
| **Engine** | `packages/engine` in monorepo | TypeScript | Core generator |
| **Studio** | studio.realitydb.dev | Cloudflare Pages | v0.2.0 |
| **Sandbox** | sandbox.realitydb.dev | Cloudflare Pages | v1.0 |
| **Landing** | realitydb.dev | Cloudflare Pages | Live |
| **Lab API** | realitydb-lab-api.eddy-078.workers.dev | Cloudflare Workers | Live |
| **Data Store** | store.realitydb.dev (pending deploy) | Workers + D1 + R2 + Stripe | Built, not deployed |

### 2.3 The Examine / Comply / Attest Trinity

| Pillar | Purpose | Commands |
|---|---|---|
| **Examine** | Detect — measure quality | `examine assess`, `examine profile`, `examine diff` |
| **Comply** | Fix — enforce rules | `comply scan`, `comply doctor`, `comply temporal`, `comply report` |
| **Attest** | Prove — certify origin | `attest sign`, `attest verify`, `attest stamp` |

---

## PART 3: REPOSITORY MAP

### 3.1 Main Repo: `github.com/emkwambe/databox` (PRIVATE)

```
C:\Users\HP\Documents\databox\
├── apps/
│   └── cli/
│       ├── src/
│       │   ├── index.ts              ← THE ACTUAL `run` command handler (~line 155)
│       │   ├── commands/
│       │   │   ├── assess.ts         ← Quality scoring + synthetic provenance
│       │   │   ├── doctor.ts         ← Pack format conversion + validation
│       │   │   ├── temporal.ts       ← Temporal ordering + lifecycle fix (NEW v2.38.0)
│       │   │   ├── comply-report.ts  ← Compliance reports
│       │   │   ├── scan.ts           ← Database introspection
│       │   │   ├── pii-scan.ts       ← PII detection
│       │   │   └── run.ts            ← ⚠️ DEAD CODE for --pack workflow (old seeder)
│       │   ├── packs/                ← 6 bundled JSON templates
│       │   │   ├── universal.json
│       │   │   ├── healthcare.json
│       │   │   ├── oncology.json
│       │   │   ├── supply-chain.json
│       │   │   ├── telecom.json
│       │   │   └── fintech.json
│       │   └── auth/
│       │       └── license.ts        ← Auth + row metering
│       ├── smoke-test.cjs            ← 146+ auto-scaling tests
│       ├── package.json              ← v2.38.0 (pending)
│       └── tsup.config.ts            ← Build config
├── packages/
│   └── engine/
│       ├── src/
│       │   └── generators.ts         ← ALL data generation strategies
│       └── package.json              ← v2.38.0 (pending)
├── workers/
│   └── lab-api/                      ← SimLab + Store backend
│       ├── src/index.ts
│       └── wrangler.toml
├── docs/                             ← Pushed to GitHub for reference
│   ├── NEW-CHAT-GENERATION-GUIDE.md
│   ├── QUALITY-STANDARDS.md
│   ├── DATASET-GENERATION-PROTOCOL.md
│   └── NEW-CHAT-PROMPTS.md
└── tools/
    └── generate-template-sql.js      ← Dogfood pipeline
```

### 3.2 Other Repos

| Repo | Purpose |
|---|---|
| `github.com/emkwambe/realityDB-sutudio` | Studio web app |
| `github.com/emkwambe/realitydb-sandbox` | Sandbox (Pages) at `C:\Users\HP\Documents\realitydb-sandbox` |
| `github.com/emkwambe/realitydb-store` | Data Store Worker (NEW — not yet pushed) |

### 3.3 Internal Docs (not on GitHub)

```
C:\Users\HP\Documents\realitydb-internal\
├── NEW-CHAT-GENERATION-GUIDE.md       ← Step-by-step + NEVER-DO rules
├── QUALITY-STANDARDS.md               ← 6 moats definition + counter-example risks
├── DATASET-GENERATION-PROTOCOL.md     ← 7-gate quality system
├── PRODUCT-CLARITY-MATRIX.md          ← Products → personas mapping
├── ONCOLOGY-VARIANTS-RESEARCH.md      ← Cited distributions for 5 oncology variants
├── FINANCIAL-VARIANTS-RESEARCH.md     ← Cited distributions for 10 financial variants
├── NEW-CHAT-PROMPTS.md                ← Copy-paste prompts for 5 scenarios
├── NEW-CHAT-OPS-GUIDE.md             ← Infrastructure reference
└── ENTERPRISE-PRICING-SPEC.md        ← Corporate tiers
```

---

## PART 4: TEMPLATE INVENTORY

### 4.1 Templates in R2 (13 total)

| # | Slug | Domain | Tables | Cols | Score | Enums | R2 Sizes |
|---|---|---|---|---|---|---|---|
| 1 | `universal` | Cross-Industry | 6 | 50 | 100 | UNIFORM ⚠️ | 5k, 10k |
| 2 | `healthcare` | Healthcare | 14 | 68 | 99 | UNIFORM ⚠️ | 5k, 10k |
| 3 | `oncology` | Healthcare | 20 | 100 | 100 | UNIFORM ⚠️ | 5k, 10k |
| 4 | `supply-chain` | Logistics | 24 | 120 | 100 | UNIFORM ⚠️ | 5k, 10k |
| 5 | `telecom` | Telecom | 21 | 105 | 100 | UNIFORM ⚠️ | 5k, 10k |
| 6 | `fintech` | Finance | 5 | 25 | 95 | UNIFORM ⚠️ | 5k, 10k |
| 7 | `banking` | Finance | 16 | 80 | 95 | UNIFORM ⚠️ | 5k, 10k |
| 8 | `iot-sensors` | IoT | 5 | 25 | 96 | UNIFORM ⚠️ | 5k, 10k |
| 9 | `breast-cancer` | Oncology | 12 | 85 | 99 | WEIGHTED ✅ | 5k, 10k |
| 10 | `lung-cancer` | Oncology | 14 | 105 | 99 | WEIGHTED ✅ | 5k, 10k |
| 11 | `clinical-trial` | Oncology | 15 | 113 | 100 | WEIGHTED ✅ | 5k, 10k |
| 12 | `rwd-ehr` | Healthcare | 16 | 125 | 99 | WEIGHTED ✅ | 5k, 10k |
| 13 | `immuno-oncology` | Oncology | 12 | 103 | 99 | WEIGHTED ✅ | 5k, 10k |

**Templates 1-8:** Older, uniform enum distributions — need research-backed weights backported.
**Templates 9-13:** Oncology v2 — ALL enums weighted with `_citation` fields. This is the quality standard.

### 4.2 Templates in CLI (6 bundled)

universal, healthcare, oncology, supply-chain, telecom, fintech

### 4.3 Templates in D1 Store Catalog

All 13 templates seeded in `realitydb-store` D1 database (e223a9f3-bf1b-46f2-ab79-250f9a5bad3f).

### 4.4 Pack Files Location

```
C:\Users\HP\Documents\realityDB Packs\
├── Universal\
├── Banking\
├── healthcare\
├── Oncology\
├── Oncology_v.2\
│   ├── breast-cancer-v1.json / breast-cancer-ready.json / breast-cancer-{5k,10k}.sql
│   ├── lung-cancer-v1.json / lung-cancer-ready.json / lung-cancer-{5k,10k}.sql
│   ├── clinical-trial-v1.json / clinical-trial-ready.json / clinical-trial-{5k,10k}.sql
│   ├── rwd-ehr-v1.json / rwd-ehr-ready.json / rwd-ehr-{5k,10k}.sql
│   └── immuno-oncology-v1.json / immuno-oncology-ready.json / immuno-oncology-{5k,10k}.sql
├── Finance_v1\                    ← AML in progress (new chat building it)
├── Supply Chain & Logistics\
├── Telecommunications\
├── fintech\
└── IOTSensors\
```

### 4.5 Financial Variants (10 planned, research complete)

| Priority | Variant | Status | Tables | Research |
|---|---|---|---|---|
| P1 | AML (Smurfing/Layering) | 🔨 In progress | 9 | FinCEN FY2024 |
| P1 | Credit Risk & Default | Planned | 4 | FICO, Fed Reserve |
| P2 | Impossible Travel Fraud | Planned | 4 | Nilson Report |
| P2 | Insurance Lifecycle | Planned | 4 | NAIC |
| P2 | SaaS Billing | Planned | 4 | Industry benchmarks |
| P3 | Wealth Management | Planned | 5 | Vanguard |
| P3 | POS/CPP Fraud | Planned | 4 | Nilson, FBI |
| P3 | Mortgage Servicing | Planned | 4 | MBA, Fed Reserve |
| P4 | Trade Surveillance | Planned | 3 | SEC, CFTC |
| P4 | KYB/UBO | Planned | 3 | FATF, EU AMLD5 |

---

## PART 5: THE 6 MOATS (Quality Standards)

**Rule: NO dataset ships without ALL 6 moats. A customer only needs ONE counter-example.**

| Moat | Standard | How Verified | Engine Status |
|---|---|---|---|
| 1. FK Integrity | 100% referential integrity | `examine assess` | ✅ Engine handles |
| 2. Temporal Ordering | All timestamps causally ordered | `comply temporal --dry-run` | ✅ Fixed post-gen |
| 3. Lifecycle States | No impossible state+timestamp combos | `comply temporal --fix` (69 rules) | ✅ Fixed post-gen |
| 4. Cardinality Ratios | Realistic parent:child ratios | Manual inspection | ⚠️ Assess reports 0/0 |
| 5. Provenance | `_realitydb_meta` watermark embedded | `examine assess` | ✅ Engine handles |
| 6. Quality Score | Overall ≥95, Privacy 100 | `examine assess` | ✅ Assess handles |

### Lifecycle Rules (69 total)

- **9 healthcare/general** — cancelled→shipped_at=NULL, deceased→last_known_date NOT NULL, etc.
- **60 financial** — SAR, account, loan, policy, claim, subscription, order, mortgage, entity, card, dispute, portfolio, KYC lifecycle rules

All in `apps/cli/src/commands/temporal.ts` → `LIFECYCLE_RULES` array.

---

## PART 6: THE 7-GATE PROTOCOL

Every dataset goes through 7 gates before publishing:

```
Gate 1: Schema Review        — Tables, columns, FKs, relationships
Gate 2: Enum Research         — Every enum has weights + _citation
Gate 3: Doctor Check          — comply doctor --fix (format, FKs, strategies)
Gate 4: Generate + Inspect    — run --rows 500, check for mock values
Gate 4.5: Temporal Fix        — comply temporal --fix (NEW)
Gate 5: Quality Assessment    — examine assess (must be ≥95/100)
Gate 6: Compliance Scan       — comply scan --tier full
Gate 7: Upload to R2          — wrangler r2 object put
```

---

## PART 7: DATA GENERATION STEP-BY-STEP

### 7.1 Template Formats

| Format | Structure | Used by |
|---|---|---|
| **Studio v4** | `{ tables: [...], relationships: [...] }` with `fkTarget` | Studio export, schema authoring |
| **Studio export** | `{ tables: { name: { columns: {...} } } }` with `foreignKey` | CLI `--pack` |

CLI only accepts studio-export. Convert with: `comply doctor --fix`

### 7.2 Available Generator Strategies

| Strategy | Output | Options |
|---|---|---|
| `uuid` | `a1b2c3d4-...` | — |
| `full_name` | `Maria Patel` | — |
| `email` | `alex1234@gmail.com` | — |
| `template` | Pattern-based | `pattern` or `template`: `MRN-{{rowIndex}}`, `fp_{{number}}_{{number}}` |
| `enum` | Weighted random pick | `values[]`, `weights[]`, `_citation` |
| `past_date` | ISO timestamp | `minYearsAgo`, `maxYearsAgo` |
| `future_date` | ISO timestamp | `minDaysAhead`, `maxDaysAhead` |
| `integer` / `int` | Whole number | `min`, `max` |
| `number` / `float` / `decimal` / `money` | Decimal | `min`, `max`, `precision` |
| `boolean` | true/false | `trueWeight` |
| `company_name` | Business name | — |
| `phone` | +1XXXXXXXXXX | — |
| `city` | City name | — |
| `state` | State code | — |
| `zip_code` | 5-digit code | — |
| `street_address` | 1234 Main St | — |
| `ip_address` | 10.x.x.x | — |
| `random_string` | word-word-number | — |

**Template tokens:** `{{rowIndex}}`, `{{number}}`, `{{firstName}}`, `{{domain}}`

### 7.3 Studio v4 Schema Template

```json
{
  "tables": [
    {
      "id": "tbl-001",
      "name": "table_name",
      "columns": [
        { "id": "tbl-001-c1", "name": "id", "type": "uuid", "isPK": true, "isFK": false, "nullable": false, "strategy": "uuid", "options": {} },
        { "id": "tbl-001-c2", "name": "parent_id", "type": "uuid", "isPK": false, "isFK": true, "nullable": false, "strategy": "uuid", "options": {}, "fkTarget": { "tableId": "tbl-XXX", "columnId": "tbl-XXX-c1" } },
        { "id": "tbl-001-c3", "name": "status", "type": "enum", "isPK": false, "isFK": false, "nullable": false, "strategy": "enum", "options": {
          "values": ["active", "inactive"],
          "weights": [80, 20],
          "_citation": "Source: describe where the weights come from"
        }}
      ],
      "position": { "x": 100, "y": 100 }
    }
  ],
  "relationships": [
    { "id": "rel-001", "sourceTableId": "tbl-XXX", "sourceColumnId": "tbl-XXX-c1", "targetTableId": "tbl-YYY", "targetColumnId": "tbl-YYY-cN", "type": "one-to-many", "semantic": "connection" }
  ],
  "version": "1.0.0"
}
```

### 7.4 Full Generation Pipeline (PowerShell)

```powershell
# ── STEP 0: Version check ──
realitydb --version  # MUST be 2.37.7+ (or 2.38.0)
# If older: npm i -g @realitydb/cli

# ── GATE 3: Doctor + fix ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply doctor --pack "path\to\schema-v1.json" --fix --output "path\to\ready.json"

# ── GATE 4: Generate + inspect ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 500 --format sql --seed 42 -o "path\to\inspect.sql"

# Mock value check (ALL must be PASS)
$content = Get-Content "path\to\inspect.sql" -Raw
@('mock_past_date','mock_future_date','mock_template','sample_text_','mock_city','mock_state','mock_ip','mock_number') | ForEach-Object {
  if ($content -match $_) { Write-Host "FAIL: $_" -ForegroundColor Red }
  else { Write-Host "PASS: No $_" -ForegroundColor Green }
}

# val_X_Y check (template leak pattern)
if ($content -match '\bval_\d{1,5}_\d{1,5}\b') { Write-Host "FAIL: val_X_Y pattern found" -ForegroundColor Red }
else { Write-Host "PASS: No val_X_Y" -ForegroundColor Green }

# ── GATE 4.5: Temporal fix ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply temporal "path\to\inspect.sql" --fix -o "path\to\inspect-fixed.sql"

# ── GATE 5: Quality assessment ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js examine assess "path\to\inspect-fixed.sql"
# MUST: Overall ≥ 95, Privacy = 100

# ── GATE 6: Generate production sizes ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 5000 --format sql --seed 42 -o "path\to\template-5k.sql"
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 10000 --format sql --seed 42 -o "path\to\template-10k.sql"

# Temporal fix on production sizes
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply temporal "path\to\template-5k.sql" --fix
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply temporal "path\to\template-10k.sql" --fix

# ── GATE 7: Upload to R2 ──
Set-Location C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler r2 object put realitydb-templates/templates/{name}-5k.sql --file "path\to\template-5k.sql" --remote
npx wrangler r2 object put realitydb-templates/templates/{name}-10k.sql --file "path\to\template-10k.sql" --remote
```

---

## PART 8: INFRASTRUCTURE

### 8.1 Cloudflare (Main Account — accessed via wrangler CLI)

| Service | Resource | ID/Name |
|---|---|---|
| **Workers** | Lab API | `realitydb-lab-api.eddy-078.workers.dev` |
| **R2** | Templates bucket | `realitydb-templates` |
| **Pages** | Sandbox | `sandbox.realitydb.dev` |
| **Pages** | Studio | `studio.realitydb.dev` |
| **Pages** | Landing | `realitydb.dev` |
| **Pages** | Mpingo | `mpingo.ai` |

### 8.2 Cloudflare (MCP-Connected Account)

| Service | Resource | ID |
|---|---|---|
| **D1** | realitydb-store | `e223a9f3-bf1b-46f2-ab79-250f9a5bad3f` |

D1 Store has 6 tables: customers, orders, order_items, api_keys, downloads, templates (13 seeded).

### 8.3 RealityDB Data Store Worker (NEW — not yet deployed)

| File | Location | Purpose |
|---|---|---|
| `store-index.ts` | Worker source | API + landing + Stripe checkout + R2 downloads |
| `store-wrangler.toml` | Config | D1 + R2 bindings |
| `DEPLOY.md` | Guide | Step-by-step deployment |

**Purchase flow:** Browse → Stripe Checkout → Webhook confirms → D1 records order → Download from R2

### 8.4 Stripe

| Key | Value |
|---|---|
| Account | `acct_1TLxaa6sezd2LSNW` |
| Dashboard | dashboard.stripe.com |
| Webhook endpoint | `https://store.realitydb.dev/api/webhook/stripe` (pending) |
| Required secrets | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

### 8.5 npm

| Package | Current | Pending |
|---|---|---|
| `@realitydb/cli` | 2.37.7 | 2.38.0 (temporal command + engine fixes) |

---

## PART 9: NEVER-DO RULES

### Build Rules

1. **NEVER run `pnpm add/remove` in `apps/cli/`** — breaks workspace junction
2. **NEVER edit `commands/run.ts` for `--pack` changes** — the handler is in `index.ts` (~line 155)
3. **NEVER skip turbo cache clearing after engine changes:**
   ```powershell
   npx turbo daemon stop
   Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force
   Remove-Item "C:\Users\HP\Documents\databox\.turbo" -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item "C:\Users\HP\Documents\databox\apps\cli\dist" -Recurse -Force
   npm run build
   ```
4. **NEVER publish without smoke test** — `npm test` in `apps/cli/` (146+ tests)
5. **NEVER use `cd` in PowerShell** — always absolute paths
6. **NEVER use `Set-Content` or `Out-File`** — adds BOM. Use `[System.IO.File]::WriteAllText()`

### Data Quality Rules

7. **NEVER publish with mock placeholders** — `mock_past_date`, `mock_template`, `sample_text_`, `val_X_Y`
8. **NEVER publish with uniform enum distributions** — every enum needs `weights[]` + `_citation`
9. **NEVER publish without `--seed` flag** — data must be reproducible
10. **NEVER publish datasets scoring < 95/100**
11. **NEVER publish without `_realitydb_meta` watermark**
12. **NEVER skip `comply temporal --fix`** — Gate 4.5 is mandatory

### CLI Version Rule

13. **ALWAYS verify CLI version before generating:**
    ```powershell
    realitydb --version  # Must be ≥ 2.37.7
    ```
    The global CLI was v2.32.0 (produces mock data). Updated to v2.37.7. If wrong: `npm i -g @realitydb/cli`

---

## PART 10: GAP CLASSIFICATION

Three sources of data quality issues:

| Source | Fix location | Examples |
|---|---|---|
| **Engine gap** | `packages/engine/src/generators.ts` | No `conditional` strategy, no `chain` generator, no `pool` strategy |
| **Template gap** | The `.json` pack file | Missing column, wrong FK, uniform weights, wrong strategy |
| **Command gap** | The CLI command used | Wrong version, missing `--seed`, wrong pack file, wrong format |

### Known Engine Gaps (P0)

| Gap | Affects | Fix |
|---|---|---|
| `conditional` strategy | Amount-class correlation, lifecycle states | Add to `generators.ts` |
| `chain` generator | Layering graph, temporal sequencing | Add to `generators.ts` |
| `pool` strategy | Shared device/document/IP signals | Add to `generators.ts` |
| Cardinality measurement | Assess reports "0/0" | Fix in `assess.ts` |

### Mitigation

`comply temporal --fix` mitigates Moats 2 and 3 post-generation. Engine gaps are real but customers never see them if the pipeline is followed correctly.

---

## PART 11: DATA STORE PRODUCT (Opportunity A from Research)

### Revenue Model

| Size | Standard | Research-Backed |
|---|---|---|
| 5K | Free | Free |
| 10K | $4.99 | $9.99 |
| 50K | $14.99 | $24.99 |
| 100K | $19.99 | $49.99 |

### API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/templates` | GET | None | List all templates |
| `/api/templates/:slug` | GET | None | Template details + pricing |
| `/api/checkout` | POST | None | Create Stripe checkout session |
| `/api/webhook/stripe` | POST | Stripe sig | Payment confirmation |
| `/api/download/:token` | GET | Token | Download from R2 |
| `/api/orders?email=` | GET | None | Customer order history |

### Deployment

```powershell
Set-Location C:\Users\HP\Documents\realitydb-store
npm install
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler deploy
```

---

## PART 12: PRODUCT ROADMAP

### Immediate (In Progress)

- [ ] AML financial variant (new chat building it)
- [ ] CLI v2.38.0 publish (temporal command + engine fixes)
- [ ] Deploy Data Store Worker to store.realitydb.dev
- [ ] Add oncology v2 to Store catalog UI (Sandbox DataStorePage + SimLabPage)

### Q3 2026

- [ ] Credit Risk, Impossible Travel, Insurance, SaaS Billing variants
- [ ] D1 Seeder CLI (Opportunity A — `npx d1-seed`)
- [ ] Backport research-backed enum weights to 8 older templates
- [ ] Engine: `conditional` strategy

### Q4 2026

- [ ] Wealth Management, POS/CPP, Mortgage, Trade Surveillance, KYB/UBO variants
- [ ] Synthetic Company Catalog for Workers AI evaluation (Opportunity B)
- [ ] AI Evaluation Dataset Service (Opportunity D)
- [ ] Engine: `chain` and `pool` strategies

### Q1 2027

- [ ] WAF Traffic Generator (Opportunity C — requires security expertise)
- [ ] Enterprise tier with custom schemas
- [ ] Workers Launchpad application

---

## PART 13: QUICK REFERENCE COMMANDS

```powershell
# ── Version check ──
realitydb --version

# ── Doctor check + fix ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply doctor --pack "pack.json" --fix --output "ready.json"

# ── Generate ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "ready.json" --rows 5000 --format sql --seed 42 -o "output.sql"

# ── Temporal fix ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply temporal "output.sql" --fix --verbose

# ── Assess ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js examine assess "output.sql"

# ── PII scan ──
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply scan "output.sql" --tier full

# ── Upload to R2 ──
Set-Location C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler r2 object put realitydb-templates/templates/{name}-{size}.sql --file "path.sql" --remote

# ── Rebuild CLI (after engine changes) ──
npx turbo daemon stop
Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force
Remove-Item "C:\Users\HP\Documents\databox\apps\cli\dist" -Recurse -Force
Set-Location C:\Users\HP\Documents\databox
npm run build

# ── Smoke test ──
Set-Location C:\Users\HP\Documents\databox\apps\cli
npm test

# ── Update global CLI ──
npm i -g @realitydb/cli

# ── Deploy Workers ──
Set-Location C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler deploy

# ── Deploy Sandbox ──
Set-Location C:\Users\HP\Documents\realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true
```

---

*Mpingo Systems LLC — Precision Tools built to stay.*
*"Read this guide. Follow the protocol. Ship quality."*
