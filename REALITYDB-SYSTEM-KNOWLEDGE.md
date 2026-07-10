# RealityDB Platform — System Knowledge Base
**Single source of truth for all commands, capabilities, architecture, and processes**

> Version: auto-generated from CLI v2.40.2 + Studio commit 9b898a7  
> Last updated: July 10, 2026  
> Maintained by: Mpingo Systems LLC  
> Rule: This document is updated in the same commit as any feature change.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Repository Map](#2-repository-map)
3. [CLI Command Reference](#3-cli-command-reference)
4. [Engine Pack Format Specification](#4-engine-pack-format-specification)
5. [Quality Assessment System (SQR)](#5-quality-assessment-system-sqr)
6. [Studio AI Pipeline](#6-studio-ai-pipeline)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Development Conventions](#8-development-conventions)
9. [Known Issues and Open Work](#9-known-issues-and-open-work)
10. [Session History and Decision Log](#10-session-history-and-decision-log)

---

## 1. Platform Overview

RealityDB is a synthetic data generation and SQL learning ecosystem built by Mpingo Systems LLC (Charlotte, NC). It generates realistic, schema-aware, statistically grounded synthetic datasets for development, testing, compliance, and education.

**Tagline:** Precision Tools built to stay.

**Core value proposition:**
- Generate production-scale synthetic data that passes statistical quality assessment
- Domain packs encode real-world distributions backed by published citations
- Full pipeline: describe domain → AI drafts pack → validate → generate → assess → certify

**Product lineup (May 2026):**

| Product | Status | URL | Description |
|---|---|---|---|
| RealityDB CLI | ✅ Live | npm: `realitydb` | Core generation engine, 52 commands |
| Studio | ✅ Live | studio.realitydb.dev | Visual pack designer + AI generation |
| Sandbox | ✅ Live | sandbox.realitydb.dev | Browser SQL learning environment |
| SimLab | ✅ Live | realitydb-lab-api.eddy-078.workers.dev | Disposable database branches |
| SafeSQL | ✅ Live (v0.9.1, Sprint 12 complete) | safesqlpro.dev | Pre-execution SQL semantic validation — 33 detectors (D1–D36) + custom rules, 334 tests; self-serve account delete (Stripe+Supabase+Clerk); REST API, GitHub Action (+ CI/CD test workflow), CLI, dbt, VS Code ext, Slack alerts, real teams model, team analytics, approval workflow, SOC2 audit log, schema connector (PostgreSQL + BigQuery + Snowflake), query library, blog, legal pages; Stripe live-mode (checkout→webhook plan sync, 6 events, billing portal + **Clerk-JWT-hardened**); NL custom-rule authoring (Layer 2 only); weekly email digest (Resend + cron); pricing ROI calculator; Clerk prod keys baked into build — Product Hunt launch-ready. Note: browser checkout/portal routed via `safesql.pages.dev` (custom-domain outbound 502 workaround, Sprint 12) |
| Data Store | 📋 Planned | — | Pack marketplace |
| RealityDB Assess | 📋 Planned | — | B2B compliance assessment service |
| HireSQL | 📋 Planned | — | SQL hiring tool |

---

## 2. Repository Map

### `github.com/emkwambe/databox` — CLI + Engine monorepo

```
databox/
├── packages/
│   ├── engine/          # @realitydb/engine — core row generator
│   │   └── src/
│   │       ├── engine.ts          # topological sort, row distribution
│   │       ├── generators.ts      # per-strategy value generators
│   │       ├── output-sql.ts      # SQL DDL + INSERT formatters
│   │       ├── output-csv.ts
│   │       ├── output-json.ts
│   │       ├── normalize.ts       # pack JSON normalizer
│   │       └── types.ts
│   └── templates/       # @realitydb/templates — built-in TypeScript templates
│       └── src/domains/ # saas, ecommerce, fintech, healthcare, education
│                        # NOTE: these are OLD format, differ from R2 JSON packs
├── apps/
│   └── cli/
│       ├── src/
│       │   ├── index.ts           # main command router + SQL generation (H9)
│       │   ├── commands/          # 52 command implementations
│       │   │   ├── assess.ts      # examine assess (H7v2 chunk-parse)
│       │   │   ├── run.ts         # seed to database (legacy)
│       │   │   ├── generate.ts    # generate CSV/JSON/Parquet
│       │   │   └── [49 others]
│       │   ├── packs/             # 9 marketplace packs (engine format JSON)
│       │   │   ├── fintech.json        # 99/100
│       │   │   ├── healthcare.json     # 100/100
│       │   │   ├── oncology.json       # 100/100
│       │   │   ├── supply-chain.json   # 100/100
│       │   │   ├── telecom.json        # 99/100
│       │   │   ├── universal.json      # 100/100
│       │   │   ├── eu-banking.json     # 99/100 (SEPA/PSD2/MiFID II/DORA)
│       │   │   ├── eu-healthcare.json  # 99/100 (ICD-10/EHDS/GDPR Art.9)
│       │   │   └── eu-telecom.json     # 99/100 (BEREC/EECC/GDPR consent)
│       │   └── crypto/            # Ed25519 certification
│       ├── smoke-test.cjs         # 215/215 integration tests
│       └── dist/                  # compiled output
└── realitydb-internal/            # private design docs (not in repo)
    ├── PACK-AUTHORING-PROMPT.md   # AI prompt + 10-section guardrail checklist
    ├── AGENTIC-SYSTEM-DESIGN.md   # Human vs Agent framework applied to RealityDB
    ├── demo_library.json          # canonical reference pack v3.1.0 (100/100)
    └── [other design docs]
```

**Critical build rule:**  
NEVER run `pnpm add` or `pnpm remove` in `apps/cli/`. Breaks `@realitydb/engine` workspace junction.  
Restore: `New-Item -ItemType Junction -Path databox\node_modules\@realitydb\engine -Target databox\packages\engine -Force`

**Build order:** `pnpm --filter engine build` → `pnpm --filter cli build`

### `github.com/emkwambe/realityDB-sutudio` — Studio frontend

```
realityDB-sutudio/
├── src/
│   ├── App.tsx                    # main layout, export handlers
│   ├── Sidebar.tsx                # domain templates, AI trigger
│   ├── SchemaCanvas.tsx           # React Flow canvas
│   ├── Inspector.tsx              # table/column property editor
│   ├── PreviewPanel.tsx           # ghost data preview + export
│   ├── store.ts                   # Zustand state (tables, relationships)
│   ├── types.ts                   # Table, Column, Relationship types
│   ├── templates.ts               # hardcoded domain templates
│   ├── components/
│   │   ├── AIGenerateModal.tsx    # NEW: AI pack generation modal
│   │   └── AIGeneratorModal.tsx   # OLD: kept for reference, not used
│   └── services/
│       ├── aiPipeline.ts          # NEW: 4-agent provider-agnostic pipeline
│       ├── exportCLI.ts           # pack export (patched: engine format)
│       ├── importCLI.ts           # pack import
│       └── smartDefaults.ts       # column default suggestions
├── .env.local                     # VITE_ANTHROPIC_API_KEY, VITE_AI_PROVIDER
└── vite.config.ts
```

---

## 3. CLI Command Reference

**CLI version:** 2.38.0  
**npm package:** `realitydb`  
**Install:** `npm install -g realitydb`

### Command Trinity: Examine / Comply / Attest

```
realitydb examine   # data quality assessment
realitydb comply    # compliance reporting
realitydb attest    # certification
```

### Core Generation Commands

#### `realitydb run`
Generate synthetic data from a pack file.

```bash
realitydb run \
  --pack <path-or-name> \
  --rows <number> \
  --format <sql|csv|json> \
  --output <path> \
  --seed <number> \
  [--drop-tables] \
  [--data-only] \
  [--schema-only] \
  [--mask-pii] \
  [--cardinality-scale <float>] \
  [--min-confidence <LOW|MEDIUM|HIGH|VERY_HIGH>]
```

**Built-in pack names:** `fintech`, `healthcare`, `oncology`, `supply-chain`, `telecom`, `universal`, `eu-banking`, `eu-healthcare`, `eu-telecom`

**H9 note:** SQL generation now uses streaming write — no V8 512MB string limit. 5M rows in 34s.

**H8 note:** `--min-confidence` exits code 2 if confidence below threshold (CI/CD gate).

```bash
# Generate 5M rows (H9 streaming)
node --max-old-space-size=16384 $(which realitydb) run \
  --pack oncology --rows 5000000 --format sql --output big.sql

# CI gate: fail if not HIGH confidence
realitydb run --pack healthcare --rows 100000 --format sql \
  --output test.sql --min-confidence HIGH
```

---

#### `realitydb examine assess`
Assess quality of a generated SQL or CSV file.

```bash
realitydb examine assess <file> \
  [--pack <path>] \
  [--json] \
  [--output <report-path>] \
  [--min-confidence <level>]
```

**Scoring system (SQR v1.0):**
- Fidelity (completeness, diversity, correlations)
- Structure (FK integrity, PK uniqueness, temporal logic, enums, cardinality)
- Privacy (k-anonymity, PII detection, exact match rate)

**H7v2 note:** Files up to ~400MB assessed via chunk-parse (no V8 string limit).  
**H8 note:** Confidence banner shows root rows + Poisson CV%.

**Confidence levels:**

| Level | Root rows | CV | Use |
|---|---|---|---|
| LOW | < 500 | ±14% | Dev only |
| MEDIUM | 500–5K | ±3–7% | Marketplace |
| HIGH | 5K–50K | ±1% | Academic |
| VERY_HIGH | > 50K | < 1% | Enterprise |

---

#### `realitydb pack:validate`
Validate a pack file against engine format rules.

```bash
realitydb pack:validate --pack <path>
```

Checks: strategies, match keys, FK wiring, enum weights, temporal pairs, relationships.  
Target: 0 errors, 0 warnings before generate.

---

#### `realitydb explain`
Show row distribution plan before generating.

```bash
realitydb explain --pack <path> --rows <number>
```

Use to verify budget math before large generations.

---

### Examine Commands (Quality)

| Command | Description |
|---|---|
| `examine assess` | Full SQR quality report |
| `examine profile` | Statistical profile of columns |
| `examine diff` | Compare two datasets |
| `examine scan` | Detect schema from existing data |
| `examine scan:infer` | Infer pack JSON from SQL schema |
| `examine temporal` | Check timestamp ordering |
| `examine anomaly` | Detect anomalies in generated data |
| `examine bias` | EU AI Act Article 10(f) bias examination — demographic coverage, distribution skew (Gini), proxy detection |

---

### Comply Commands (Compliance)

| Command | Description |
|---|---|
| `comply report` | Generate compliance report (hipaa/gdpr/pci/soc2/eu-ai-act/dora) |
| `comply scan` | Scan for compliance issues |
| `comply doctor` | Auto-fix compliance issues in pack |

**Compliance frameworks (`comply report --framework`):** `hipaa`, `gdpr`, `pci`, `soc2`, `eu-ai-act`, `dora`

```bash
realitydb comply report \
  --file dataset.sql \
  --framework hipaa \
  --output report.html
```

---

### Attest Commands (Certification)

| Command | Description |
|---|---|
| `attest certify` / `certify` | Sign dataset with Ed25519 |
| `attest verify` / `verify` | Verify certificate |

```bash
# Certify a dataset
realitydb certify dataset.sql --pack template.json --embed

# Verify
realitydb verify dataset.sql
```

---

### SimLab Commands (Disposable databases)

| Command | Description |
|---|---|
| `lab create` | Create Neon sandbox branch |
| `lab list` | List active labs |
| `lab connect` | Get connection string |
| `lab extend` | Extend lab expiry |
| `lab delete` | Delete lab |
| `lab snapshot` | Snapshot lab state |
| `lab publish` | Publish lab to gallery |
| `lab gallery` | Browse public labs |
| `lab fork` | Fork a published lab |
| `lab query:save` | Save a query to lab |
| `lab query:list` | List saved queries |
| `lab query:run` | Run a saved query |
| `lab share` | Generate shareable URL |

---

### Pack Management Commands

| Command | Description |
|---|---|
| `pack:validate` | Validate pack format |
| `pack list` / `packs` | List available packs |
| `pack init` | Scaffold new pack |
| `init` | Interactive pack creator |
| `doctor` | Auto-fix pack issues |
| `tune` | Tune pack distributions |
| `capture` | Capture schema from database |
| `scan:infer` | Infer pack from SQL |
| `convert` | Convert between formats |

---

### Other Commands

| Command | Description |
|---|---|
| `menu` | Interactive command browser |
| `status` | Platform status + license |
| `benchmark` | Performance benchmark |
| `mask` | PII masking |
| `pii-scan` | Detect PII in dataset |
| `split` | Split dataset by table |
| `merge` | Merge datasets |
| `simulate` | Time-series simulation |
| `scenarios` | Load test scenarios |
| `ci` | Generate CI/CD config |
| `login` / `logout` | Auth |
| `upgrade` | Upgrade CLI |

---

## 4. Engine Pack Format Specification

**Version:** v2.38.0 (engine format, not Studio format)

### Top-level structure

```json
{
  "name": "domain-name",
  "version": "1.0.0",
  "description": "...",
  "_meta": { ... },
  "tables": { ... },
  "relationships": [ ... ]
}
```

**Forbidden top-level keys:** `generationConfig`, `simulation`, `domain`, `primaryKey`

### Table format

```json
"patients": {
  "match": "patients",
  "columns": {
    "id": { "strategy": "uuid" },
    "status": {
      "strategy": "enum",
      "options": { "values": ["active","inactive"], "weights": [80, 20] }
    },
    "doctor_id": {
      "strategy": "uuid",
      "foreignKey": { "table": "doctors", "column": "id" }
    },
    "amount": {
      "strategy": "float",
      "options": { "distribution": "normal", "mean": 150, "stddev": 40, "min": 0, "max": 1000 }
    },
    "created_at": { "strategy": "past_date" }
  }
}
```

### Supported strategies

```
uuid, enum, float, integer, timestamp, past_date, future_date,
string, full_name, email, phone, company_name, ip_address,
random_string, zip_code, city, state, street_address, template
```

**Forbidden strategies:** `boolean`, `decimal`, `number`, `name`, `text`, `auto_increment`, `foreign_key`, `money`

### Relationships format

```json
"relationships": [
  {
    "targetTable": "appointments",
    "sourceTable": "patients",
    "cardinality": { "strategy": "poisson", "mean": 3.2, "min": 1, "max": 12 }
  }
]
```

**Critical rules:**
1. `sourceTable` required — without it, cardinality scoring returns 0/0
2. `mean` must fit row budget: `root_rows = total_rows / (1 + sum_of_all_means)`
3. Sub-1.0 mean allowed for sparse relationships
4. Only one `past_date` column per table (no dual timestamp pairs)

### _meta block

```json
"_meta": {
  "version": "1.0.0",
  "domain": "Healthcare",
  "datasheet_standard": "Gebru et al. 2018 — Datasheets for Datasets",
  "target_assess_score": "97+/100",
  "citations": [
    {
      "field": "patients.insurance_type weights",
      "claim": "Private insurance 49%, Medicare 19%",
      "source": "KFF Health Insurance Coverage 2024",
      "url": "https://kff.org"
    }
  ]
}
```

---

## 5. Quality Assessment System (SQR)

**SQR = Synthetic Quality Report v1.0**

### Scoring pillars

| Pillar | Weight | Key metrics |
|---|---|---|
| Fidelity | 1/3 | Completeness ≥90%, distribution diversity ≥70%, correlation stability |
| Structure | 1/3 | FK integrity 100%, PK uniqueness 100%, temporal 0 violations, enum validity, cardinality |
| Privacy | 1/3 | k-anonymity ≥5, exact match 0%, PII detection |

### Marketplace pack scores (May 2026)

| Pack | Score | Confidence | Root tables |
|---|---|---|---|
| demo_library.json | 100/100 | HIGH | libraries |
| healthcare.json | 100/100 | HIGH | patients, doctors, departments, medications |
| oncology.json | 100/100 | HIGH | patients, sites, clinical_trials |
| supply-chain.json | 100/100 | HIGH | suppliers, products, warehouses, carriers, customers, routes |
| universal.json | 100/100 | HIGH | users, errors |
| fintech.json | 99/100 | HIGH | customers, merchants |
| telecom.json | 99/100 | HIGH | subscribers, plans, cell_towers, device_inventory |
| eu-banking.json | 99/100 | HIGH | customers, currencies |
| eu-healthcare.json | 99/100 | HIGH | patients, providers, icd10_codes |
| eu-telecom.json | 99/100 | HIGH | subscribers, network_sites |

### EU Enterprise Packs (July 2026)

Three packs purpose-built for European enterprises:
`eu-banking` (SEPA/PSD2/MiFID II/DORA), `eu-healthcare` (ICD-10/EHDS/GDPR Art.9),
`eu-telecom` (BEREC/EECC/GDPR consent). All score 99/100 with FK 100%,
Temporal 100%, Privacy 100%.

| Pack | Domain | Tables | Score | Frameworks | Commit |
|---|---|---|---|---|---|
| `eu-banking` | EU Banking | 11 | 99/100 | SEPA, PSD2, MiFID II, DORA | `87af33d` |
| `eu-healthcare` | EU Healthcare | 14 | 99/100 | ICD-10, EHDS, GDPR Article 9 | `2b73b9f` |
| `eu-telecom` | EU Telecom | 12 | 99/100 | BEREC, EECC, GDPR consent | `a51ea5b` |

`comply report` supports: `hipaa`, `gdpr`, `pci`, `soc2`, `eu-ai-act`, `dora`.
`examine bias` produces EU AI Act Article 10(f) bias examination reports.
Full pack specs: `realitydb-internal/EU-{BANKING,HEALTHCARE,TELECOM}-PACK-SPEC.md`.

### Sandbox template scores (audited 2026-05-09)

Effective score = (Fidelity + Structure) / 2 — sandbox templates ship realistic PII intentionally so the Privacy pillar is excluded. Full audit at `realitydb-internal/03-sandbox/SANDBOX-DATASET-AUDIT-REPORT.md`.

| Template | Rows | Effective | Confidence |
|---|---:|---:|---|
| ecommerce | 27,650 | 100 | HIGH |
| healthcare | 50,200 | 100 | VERY_HIGH |
| cybersecurity | 490 | 100 | LOW |
| blog-starter | 1,220 | 100 | MEDIUM |
| fintech | 25,700 | 99 | HIGH |
| saas | 26,680 | 99 | HIGH |
| education | 17,700 | 99 | HIGH |
| ecommerce-starter | 3,350 | 99 | MEDIUM |
| kenya-cbc | 7,330 | 98 | HIGH |
| ai-events | 655 | 97 | MEDIUM |
| oncology | 21,736 | 97 | HIGH |
| saas-starter | 904 | 97 | MEDIUM |
| logistics | 560 | 97 | HIGH |
| mpesa | 6,650 | 97 | HIGH |
| sacco | 8,124 | 97 | HIGH |
| sql-traps | 9,120 | 96 | HIGH (intentional bugs) |
| va-healthcare | — | — | hidden (`comingSoon`) |
| dod-logistics | — | — | hidden |
| cdc-epidemiology | — | — | hidden |

All 16 visible sandbox templates score ≥95 effective. Structure pillar is 100 across the board.

### Score targets by audience

| Audience | Min score | Min confidence |
|---|---|---|
| Development | 95/100 | LOW |
| Marketplace | 97/100 | MEDIUM |
| Academic | 99/100 | HIGH |
| Enterprise / regulated | 100/100 | VERY_HIGH |

---

## 6. Studio AI Pipeline

**Repo:** `github.com/emkwambe/realityDB-sutudio`  
**Commit:** 9b898a7  
**URL:** studio.realitydb.dev

### How it works

```
User describes domain (text + complexity)
        ↓
Researcher agent  → fetches domain statistics + citations
        ↓
Drafter agent     → produces engine-format pack JSON
        ↓  (PACK-AUTHORING-PROMPT.md as system prompt)
Validator         → checks 12 hard rules client-side
        ↓  (up to 3 retries with specific fix instructions)
Scorer            → estimates quality score
        ↓
packToCanvas()    → converts pack to React Flow tables + relationships
        ↓
importSchema()    → loads into canvas
        ↓
Human reviews + edits on canvas
        ↓
Export for CLI    → downloads engine-format pack JSON
        ↓
CLI: validate → generate → assess → certify
```

### Provider configuration

```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_AI_PROVIDER=claude   # claude | openai | gemini
```

### Key files

| File | Purpose |
|---|---|
| `src/services/aiPipeline.ts` | 4-agent pipeline, validation, packToCanvas |
| `src/components/AIGenerateModal.tsx` | Modal UI with live progress stages |
| `src/services/exportCLI.ts` | Canvas → engine pack JSON (corrected strategy map) |
| `src/services/importCLI.ts` | Engine pack JSON → canvas |

### Known limitations (May 2026)

- Temporal: AI occasionally generates dual `past_date` columns (started_at + created_at) → fix in system prompt pending
- Cardinality: All tables export as roots (equal rows) because canvas FK edges don't wire to `convertToCliTemplate` relationships block → fix pending
- React Flow edge warnings: handle ID mismatch between pack FK names and canvas node IDs → cosmetic only

---

## 7. Deployment Architecture

### CLI

- **Package:** `realitydb` on npm
- **Version:** 2.38.0
- **Install:** `npm install -g realitydb`

### Studio

- **Host:** Cloudflare Pages
- **URL:** studio.realitydb.dev
- **Repo:** github.com/emkwambe/realityDB-sutudio
- **Build:** `npm run build` → `dist/`
- **Deploy:** automatic on push to main (Cloudflare Pages CI)

### Sandbox

- **Host:** Cloudflare Pages
- **URL:** sandbox.realitydb.dev
- **Deploy:** `wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true`

### SimLab

- **API Worker:** realitydb-lab-api.eddy-078.workers.dev
- **Neon project:** bold-mouse-18187324
- **D1 database:** realitydb-labs (1fa51a0c)
- **R2 bucket:** realitydb-templates

### Landing page

- **URL:** realitydb.dev
- **Host:** Cloudflare Pages

### Payments

**Primary processor — Dodo Payments**
- **Business ID:** `bus_0Ncmo4Hc4s7QRoViHC7Fj`
- **Checkout endpoint:** `POST /v1/checkout` (validates `product_id`, returns `{ checkout_url, session_id }`)
- **Webhook endpoint:** `https://realitydb-lab-api.eddy-078.workers.dev/v1/webhooks/dodo`
  (Standard Webhooks HMAC-SHA256; verifies `webhook-id`/`webhook-timestamp`/`webhook-signature`, 401 on invalid)
- **API host:** `https://test.dodopayments.com` (test mode), real endpoint is `POST /checkouts`
- **Secrets (Worker):** `DODO_API_KEY`, `DODO_WEBHOOK_SECRET` (stored verbatim; `whsec_` portion base64-decoded for HMAC)
- **Status:** Code live (commit `63ab911`, `workers/lab-api/src/index.ts`). Product IDs need live/test-mode alignment to complete checkout (gate 3).

**Secondary processor — Stripe (preserved as fallback)**
- **Account:** `acct_1TLxaa6sezd2LSNW`
- **Endpoints (intact):** `/v1/stripe/setup`, `/v1/stripe/checkout`, `/v1/stripe/portal`, `/v1/stripe/webhook`
- **Status:** Code preserved; Stripe webhook and checkout endpoints intact.

#### Dodo Products (10 total)

| Key | Product ID | Price |
|---|---|---|
| `data_monthly` | `pdt_0NinRP4Mk686aNnADhRhU` | $19/mo |
| `data_annual` | `pdt_0NinRP3HWCLjw69NznlTi` | $190/yr |
| `professional_monthly` | `pdt_0NinRP43pfFk2k5DOihBs` | $49/mo |
| `professional_annual` | `pdt_0NinRP3KWaA3RrS38e7c2` | $490/yr |
| `enterprise_eu_monthly` | `pdt_0NinRP3IFyP7lyd5oDtcO` | €499/mo |
| `enterprise_eu_annual` | `pdt_0NinROrXFUYjVQcupdjhQ` | €4,990/yr |
| `credits_starter` | `pdt_0NinTleLnhc6LEfp5rvtp` | $9 |
| `credits_standard` | `pdt_0NinTldSfH9IE844neEoz` | $29 |
| `credits_research` | `pdt_0NinTlXhKqrkfPuALgsKP` | $79 |
| `credits_eu_compliance` | `pdt_0NinTldTP8FAK3o4ky97P` | €299 |

#### Pricing Tiers

| Tier | Price | Includes |
|---|---|---|
| Community | $0 | 10K rows/run, 3 runs/day, no compliance commands |
| Data | $19/mo | Unlimited generation, ML commands, buyer watermark |
| Professional | $49/mo | `comply report`, `examine bias`, `attest sign` |
| Enterprise EU | €499/mo | On-premise, DPA, SEPA, dedicated support |

#### Pending

- Dodo business verification (submitted, 1–2 business days)
- Product ID alignment (live mode vs test mode) — required to complete gate 3 checkout
- Magic link auth system (not yet built)
- Buyer watermark embedding in generation output (not yet built)
- Pricing page at `realitydb.dev/pricing` (not yet built)
- `/verify/:generation_id` endpoint (not yet built)

---

## 8. Development Conventions

### Environment

- **OS:** Windows 11, PowerShell 7.6.1
- **Node:** v22.18.0
- **Package manager:** pnpm (workspace monorepo)

### PowerShell rules

```powershell
# Always use absolute paths
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "..."

# BOM-free UTF-8 file writes
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))

# Never cd + relative — always absolute
# PowerShell Select-String: no -Recurse, pipe from Get-ChildItem instead
# -LiteralPath for paths with brackets
# Git lock: Remove-Item .git\index.lock -Force
```

### Build order (always)

```
schema → generators → templates → core → cli
pnpm --filter engine build
pnpm --filter cli build
```

### Backups

```
C:\Users\HP\Documents\realitydb-backups\
C:\Users\HP\Documents\realitydb-internal\engine-backups\
```

### Smoke test (run before every publish)

```powershell
cd C:\Users\HP\Documents\databox\apps\cli
node smoke-test.cjs
# Must show: ✅ Passed: 215 ❌ Failed: 0
```

### Git conventions

```
feat: new feature
fix: bug fix
chore: tooling/config
docs: documentation only
refactor: no behavior change

Examples from this project:
feat: H9 streaming SQL generator — 5M rows no crash
feat: AI pack pipeline — provider-agnostic agent, 95/100 assess
fix: H7v2 chunk-parse assessor + CRLF boundary fix
```

---

## 9. Known Issues and Open Work

### Engine (databox)

| ID | Issue | Priority | Estimate |
|---|---|---|---|
| H7v3 | Assess fails on files >400MB — needs line-by-line streaming SQL parser | High | 4h |
| — | Temporal dual-timestamp fix in AI system prompt | High | 30m |
| — | Relationship cardinality wiring in packToCanvas/convertToCliTemplate | High | 1h |
| — | `templates` CLI command broken (unknown command) | Medium | 1h |
| — | Built-in TypeScript templates (packages/templates/) out of sync with R2 packs | Medium | 2h |

### Studio (realityDB-sutudio)

| ID | Issue | Priority | Estimate |
|---|---|---|---|
| — | React Flow edge handle ID mismatch (cosmetic warnings) | Low | 1h |
| — | All canvas tables export as roots — FK→relationship block not wired | High | 1h |
| — | AI generates started_at + created_at dual timestamps in some domains | High | 30m |

### Platform

| ID | Issue | Priority | Estimate |
|---|---|---|---|
| — | ~~SimLab page shows hardcoded templates~~ — ✅ resolved in SimLab Phase 1: dynamic `/v1/store` fetch, 11 templates incl. EU trilogy (commit `62cbe5b`, 2026-07-10) | Done | — |
| — | Data Store preview API returns [] | Medium | 2h |
| — | EUR pricing not in Stripe | Low | 30m |
| — | realityDB Packs repo not pushed to GitHub (private) | Medium | 30m |

### SafeSQL (safesql)

| ID | Issue | Priority | Estimate |
|---|---|---|---|
| — | Stripe webhook endpoint not yet registered in Stripe dashboard; STRIPE_WEBHOOK_SECRET on Pages is a placeholder. Webhook URL: `https://safesql.realitydb.dev/api/stripe/webhook` | High | 15m |
| — | Anthropic key bundled client-side (`anthropic-dangerous-direct-browser-access`); should be proxied through `/api/explain` Function | Medium | 2h |
| — | Bundle size 2.99MB (PGlite WASM dominates) — split sandbox into a lazy-loaded route | Low | 2h |
| — | Optional: switch from Universal SSL to dedicated Google CA cert once propagated | Low | — |

---

## 10. Session History and Decision Log

### July 10, 2026 — SimLab Phase 1 shipped (honest UI + dynamic templates)

**Sandbox commit:** `62cbe5b` (`github.com/emkwambe/realitydb-sandbox`, `main`) — file `src/components/SimLabV3.jsx` (+144 / −33).

**What shipped:**
- `TEMPLATE_API_ID` hardcoded map removed; templates now fetched dynamically from `GET /v1/store` on mount (`availableTemplates` state + `formatTemplateLabel()` helper).
- **11 templates** now display, including the EU trilogy (`eu-banking`, `eu-healthcare`, `eu-telecom`); stats tile is driven by the live template count (no more hardcoded "8 templates / 6 domains").
- "Coming soon" error buttons on the Scenario, ML split, and Anomaly tabs replaced with **CLI command display boxes** — each shows the exact `realitydb simulate|split|anomaly` command reflecting current UI state, a copy-to-clipboard button, and an Install-CLI link.
- What-if tab: coming-soon error toast neutralized; added a Phase 6 roadmap note (create two labs and compare manually for now).

**Architecture decision:** ADR-001 (SimLab execution architecture) committed at `a635079` in `databox` (`docs/architecture/ADR-001-simlab-execution.md`) — shared infrastructure-neutral simulation engine; CLI and hosted SimLab as adapters; async jobs; Neon for interactive state; R2 for artifacts; six-phase implementation plan.

**Live:** `sandbox.realitydb.dev` deployed with Phase 1 changes (bundle `index-CfyC74Nv.js`; Cloudflare Pages). Verified: 11 templates incl. EU trilogy, dynamic stats, CLI command boxes on all three tabs, copy buttons.

**Next:** Phase 2 — extract the simulation engine into `packages/simulation-core/` (define the `SimulationOperation` interface; no React, CLI, or HTTP code inside).

### July 10, 2026 — CLI v2.40.2 security release

**CLI version:** 2.40.2 (was 2.40.1) — published to npm `@realitydb/cli` on 2026-07-10.

**Security fix — hardcoded `LAB_API_KEY` removed from CLI source** (`apps/cli/src/commands/lab.ts`):
- `getApiKey()` now checks the `REALITYDB_API_KEY` env var first
- falls back to the license file (`~/.realitydb/config`)
- throws a helpful message if neither is present (`realitydb auth login` or set `REALITYDB_API_KEY`)
- no credentials in the published npm package (verified: `rdb_lab_mpingo_2026` absent from `dist/index.js`)
- Commits: `736a56a` (fix), `3b40584` (npm pkg fix). Smoke test 215/215.

**`LAB_API_KEY` rotated 2026-07-10:**
- old key `rdb_lab_mpingo_2026` is now invalid
- new key stored in Cloudflare Worker secrets only (never in source)
- Lab API Worker redeployed: version `6332916e`

**npm token — granular access token created 2026-07-10:**
- name: `realitydb-cli-publish-2026`
- scope: `@realitydb` (read and write)
- expires: 2026-08-09 — **rotate before expiry**

**Pending security items:**
- Magic link auth + JWT for CLI entitlement gating
- Rate limiting on `/v1/labs` endpoint
- Input validation on pack JSON files
- Third-party pen test before enterprise DPA signing

### May 4, 2026 — SafeSQL Sprint 2 closeout

**Repos:**
- `safesql` main → `84d6b0a` (pushed to github.com/emkwambe/safesql)

**Sprint 2 shipped:**
- B1: Clerk auth wired (publishable key in `VITE_CLERK_PUBLISHABLE_KEY`)
- B2: Supabase client lazily created with Clerk JWT via `accessToken` callback;
  `SupabaseAuthBridge` pipes `clerk.session.getToken()` into the Supabase client
- B3: Persistence layer + free-tier counters
  - 4 tables (`users`, `schemas`, `validations`, `sandboxes`) with RLS scoped by
    `auth.jwt() ->> 'sub'`
  - `roll_usage_period(uuid)` rolls counters at the start of each calendar month
  - AFTER INSERT triggers on `validations` + `sandboxes` bump the per-user
    monthly counter atomically (so client can't bypass the gate by skipping
    the increment)
  - Schema deploy gotcha: pasting `schema.sql` into the Supabase SQL editor
    landed only the table portion the first time; the trigger/function blocks
    silently failed. Fix committed as `supabase/triggers.sql` (idempotent
    re-runnable patch) + `supabase/verify-triggers.sql` (DDL + diagnostic in
    one transaction). Verified end-to-end via PostgREST: validations.INSERT
    bumps `users.validations_this_month` 0 → 1.
- B4: Free-tier upgrade gate (50 validations/month, 5 sandbox runs/month)
  - `useAppUser` hook with `isOverValidationLimit` / `isOverSandboxLimit`
  - `UsageMeter` in editor header, color-coded at 80% and 100%
  - Validate button disabled when over limit; `UpgradeBanner` overlays the editor
- C1-C3 (Sprint 2): in-browser PGlite sandbox + ground-truth row count
- D1: Cloudflare Pages production deploy at `safesql.pages.dev`
- D2: Custom domain `safesql.realitydb.dev`
  - CNAME `safesql.realitydb.dev` → `safesql.pages.dev` (proxied)
  - Custom domain registered via Pages API (wrangler has no domain CLI);
    Google CA cert provisioned, status `active`
  - `SITE_URL` Pages secret → `https://safesql.realitydb.dev` (Stripe
    success/cancel URLs)

**Decisions / gotchas to remember:**
- Wrangler `pages secret put` can silently set an empty string. If a Function
  reports a secret as missing despite `pages secret list` showing it, re-set
  it explicitly via stdin pipe and redeploy.
- Pages secrets only take effect on the *next* deployment — `secret put` alone
  does not refresh running Functions.
- Custom domains added via the Pages API serve traffic immediately under the
  parent zone's Universal SSL while the per-domain Google CA cert provisions
  in the background.
- SafeSQL is positioned as B2B infrastructure (DevTools budget), NOT
  education — the product line table now reflects this.

### May 3, 2026 — Marathon session

**Commits:**
- `databox` main → `53ba354`
- `realityDB-sutudio` main → `9b898a7`

**CLI shipped:**
- H9: streaming SQL generator (5M rows, 34s, 612MB)
- H7v2: chunk-parse assessor (up to 400MB)
- H8: scale-aware confidence scoring + `--min-confidence` flag
- H6: BUILT_IN_PACKS descriptions consolidated
- M6: dead code removed from engine.ts
- All 6 marketplace packs rebuilt to 97-100/100 at HIGH confidence
- demo_library.json v3.1.0 — canonical reference pack
- PACK-AUTHORING-PROMPT.md — 353-line AI prompt + 10-section guardrail
- AGENTIC-SYSTEM-DESIGN.md — framework applied to RealityDB

**Studio shipped:**
- aiPipeline.ts — 4-agent provider-agnostic pipeline
- AIGenerateModal.tsx — new modal with live progress stages
- exportCLI.ts patched — engine format output, corrected strategy map
- Full loop tested: SaaS domain → 95/100 assess score

**Decisions made:**
- AI should output engine-format pack JSON directly, bypassing convertToCliTemplate conversion
- Provider-agnostic via VITE_AI_PROVIDER env var (claude/openai/gemini)
- Human-in-the-loop should only trigger on genuine judgment requirements, not rule-based checks
- Agentic system design: 13/18 operations agent-owned, 5 human-owned

### April 2026 — CLI v2.36.0

- 52 commands organized into Examine/Comply/Attest trinity
- Ed25519 certification system shipped
- SimLab fully deployed (14 CLI lab commands)
- 12 npm versions published (v2.32.2 → v2.36.0)
- smoke test 29/29 → 158/158

### March 2026 — Platform foundation

- CLI v2.0.0 on npm
- Studio v0.2.0 deployed
- Sandbox v1.0 deployed with 9 templates
- Phase 1 complete (Auth, Progress DB, Progress UI, Stripe, AI Tutor, Integration)

---

## Appendix A — Quick Reference Card

```bash
# New pack from scratch
realitydb init

# Validate before generate
realitydb pack:validate --pack my-pack.json

# Check row distribution before generating
realitydb explain --pack my-pack.json --rows 100000

# Generate
realitydb run --pack my-pack.json --rows 100000 --format sql --output data.sql

# Assess quality
realitydb examine assess data.sql --pack my-pack.json

# Full pipeline one-liner
realitydb run --pack my-pack.json --rows 100000 --format sql -o data.sql && \
realitydb examine assess data.sql --pack my-pack.json

# Comply report
realitydb comply report --file data.sql --framework hipaa

# Certify
realitydb certify data.sql --pack my-pack.json --embed
```

## Appendix B — Pack Quality Gates

```
Development:  score ≥ 95, any confidence
Marketplace:  score ≥ 97, confidence ≥ MEDIUM, citations required
Academic:     score ≥ 99, confidence ≥ HIGH, all distributions cited
Enterprise:   score = 100, confidence = VERY_HIGH, named human sign-off
```

## Appendix C — File Locations (Windows)

```
CLI source:       C:\Users\HP\Documents\databox\apps\cli\src\
Engine source:    C:\Users\HP\Documents\databox\packages\engine\src\
CLI packs:        C:\Users\HP\Documents\databox\apps\cli\src\packs\
Studio source:    C:\Users\HP\Documents\realityDB-sutudio\src\
Internal docs:    C:\Users\HP\Documents\realitydb-internal\
Backups:          C:\Users\HP\Documents\realitydb-internal\engine-backups\
Staging output:   C:\Users\HP\Documents\realityDB-staging\
RealityDB Packs:  C:\Users\HP\Documents\realityDB Packs\
```

---

*This document is the single source of truth for the RealityDB platform.*  
*Update it in the same commit as any feature, fix, or architectural decision.*  
*If the code and this document disagree, the code is wrong or this document is stale — fix both.*

## Supabase Integration (May 11, 2026) — v2.38.0

Commands shipped:
  realitydb seed:supabase    — generate supabase/seed.sql or seed directly
  realitydb examine scan:supabase — infer pack JSON from live Supabase schema
  realitydb examine supabase — assess data quality of live database

Tested on MathPivot (qpoiufyjancwijjkiaui, us-west-2):
  124 tables, 1604 columns, 206 FKs scanned in 3.6s
  9,983 rows generated in 0.27s at 36,974 rows/sec
  Assessment: 89/100 (FK integrity 0% — engine limitation)

Session pooler format (IPv4-compatible):
  postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

Known limitation: FK integrity 0% on scanned packs
  Fix sprint: realitydb-internal\01-cli-engine\FK-AWARE-SPRINT-PROMPT.md
  Root cause: engine.ts:252 only tracks colName === 'id'
  Fix: track all PK columns + normalize table name lookups

Commits: b506904, fb4b9c6, 1b7b769, current
