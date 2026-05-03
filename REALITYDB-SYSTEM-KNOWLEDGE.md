# RealityDB Platform — System Knowledge Base
**Single source of truth for all commands, capabilities, architecture, and processes**

> Version: auto-generated from CLI v2.38.0 + Studio commit 9b898a7  
> Last updated: May 3, 2026  
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
| Data Store | 📋 Planned | — | Pack marketplace |
| RealityDB Assess | 📋 Planned | — | B2B compliance assessment service |
| SafeSQL Pro | 📋 Planned | safesql.dev | SQL skill assessment |
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
│       │   ├── packs/             # 6 marketplace packs (engine format JSON)
│       │   │   ├── fintech.json        # 99/100
│       │   │   ├── healthcare.json     # 100/100
│       │   │   ├── oncology.json       # 100/100
│       │   │   ├── supply-chain.json   # 100/100
│       │   │   ├── telecom.json        # 99/100
│       │   │   └── universal.json      # 100/100
│       │   └── crypto/            # Ed25519 certification
│       ├── smoke-test.cjs         # 158/158 integration tests
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

**Built-in pack names:** `fintech`, `healthcare`, `oncology`, `supply-chain`, `telecom`, `universal`

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

---

### Comply Commands (Compliance)

| Command | Description |
|---|---|
| `comply report` | Generate compliance report (hipaa/sox/gdpr/pci) |
| `comply scan` | Scan for compliance issues |
| `comply doctor` | Auto-fix compliance issues in pack |

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
# Must show: ✅ Passed: 158 ❌ Failed: 0
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
| — | SimLab page shows 4 built-in templates, should show all 7 R2 templates | Medium | 1h |
| — | Data Store preview API returns [] | Medium | 2h |
| — | EUR pricing not in Stripe | Low | 30m |
| — | realityDB Packs repo not pushed to GitHub (private) | Medium | 30m |

---

## 10. Session History and Decision Log

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
