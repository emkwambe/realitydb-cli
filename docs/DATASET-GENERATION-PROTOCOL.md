# RealityDB Dataset Generation Protocol

> **Classification:** Internal — Mpingo Systems LLC
> **Version:** 1.0
> **Date:** April 24, 2026
> **Purpose:** No dataset ships without passing every gate in this protocol.
> **Save to:** `C:\Users\HP\Documents\realitydb-internal\DATASET-GENERATION-PROTOCOL.md`

---

## Protocol Overview

Every dataset that enters the RealityDB ecosystem (CLI built-in, R2 Store, SimLab, Enterprise catalog) must pass through 7 gates before release. Skipping a gate is a defect.

```
GATE 1: Schema Design Review
     ↓
GATE 2: Enum Research & Citation
     ↓
GATE 3: Pack Validation (Doctor)
     ↓
GATE 4: Generation & Inspection
     ↓
GATE 5: Quality Assessment (Score ≥ 95)
     ↓
GATE 6: Compliance Scan
     ↓
GATE 7: Smoke Test & Publish
```

---

## GATE 1: Schema Design Review

**Goal:** The schema models a real-world domain accurately. Tables, columns, and relationships reflect how the domain actually works — not how a textbook describes it.

### Checklist

- [ ] **Domain research completed** — Read at least 2 industry-specific sources (whitepapers, database schemas from open-source projects, regulatory documents)
- [ ] **Table count appropriate** — Small domain: 5-10 tables. Medium: 11-20. Large: 21-40. Enterprise: 40+
- [ ] **Primary keys defined** — Every table has `id UUID PRIMARY KEY`
- [ ] **Foreign keys documented** — Every child table references a valid parent. Document the FK chain:
  ```
  Example: orders.customer_id → customers.id
           order_items.order_id → orders.id
           shipments.order_id → orders.id
  ```
- [ ] **No circular FKs** — A cannot reference B which references A
- [ ] **Column types appropriate** — UUIDs for IDs, VARCHAR for text, TIMESTAMP for dates, DECIMAL for money, INTEGER for counts, BOOLEAN for flags
- [ ] **Column names follow convention** — snake_case, descriptive, no abbreviations (use `created_at` not `crt_dt`)
- [ ] **Temporal columns present** — At minimum: `created_at`. Ideally: `created_at`, `updated_at`, `deleted_at` (soft delete)
- [ ] **Status/lifecycle columns present** — Enum columns that represent state machines (e.g., `status: pending → active → completed → cancelled`)
- [ ] **No redundant tables** — Every table serves a distinct purpose. No duplicate schemas with different names

### Schema Complexity Tiers

| Tier | Tables | Columns | FKs | Example |
|---|---|---|---|---|
| Starter | 3-6 | 15-30 | 2-5 | Universal, FinTech |
| Standard | 7-15 | 30-70 | 5-15 | Healthcare, Banking |
| Complex | 16-25 | 70-150 | 15-30 | Supply Chain, Oncology, Telecom |
| Enterprise | 25+ | 150+ | 30+ | Full Banking Ecosystem |

---

## GATE 2: Enum Research & Citation

**Goal:** Every enum column has values and weights backed by real-world research. No uniform distributions unless the domain genuinely has uniform distribution.

### Procedure

1. **Identify all enum columns** in the pack:
   ```powershell
   node -e "
   const p = JSON.parse(require('fs').readFileSync('pack.json','utf-8'));
   for (const [t,td] of Object.entries(p.tables)) {
     for (const [c,cd] of Object.entries(td.columns)) {
       if (cd.strategy === 'enum') {
         console.log(t + '.' + c + ': ' + (cd.options?.values?.length || 0) + ' values ' + (cd.options?.weights ? 'WEIGHTED' : 'UNIFORM'));
       }
     }
   }
   "
   ```

2. **For EACH enum column, research the real-world distribution:**

   | Column type | Where to research | Example source |
   |---|---|---|
   | Payment methods | Visa/Mastercard annual reports, Statista | Visa: 35% credit, 28% debit (2024) |
   | Transaction status | Payment processor documentation | Visa: 14% CNP decline rate |
   | HTTP status codes | Cloudflare Radar, observability platforms | Industry: ~95% 2xx |
   | Country distribution | World Bank, UN data | US: 27% of global e-commerce |
   | Error types | Sentry/Datadog industry reports | NullPointer: 25%, Timeout: 18% |
   | User roles | SaaS industry benchmarks | Admin: 5%, User: 80%, Manager: 15% |
   | Order status | NRF, Shopify reports | NRF: 16.9% return rate (2024) |
   | Gender | Census data, WHO | Varies by country, ~51% female globally |
   | Currency | SWIFT, BIS Triennial Survey | USD: 44%, EUR: 16%, GBP: 6% (BIS 2022) |

3. **Document the citation** — Add a comment in the pack JSON:
   ```json
   {
     "strategy": "enum",
     "options": {
       "values": ["completed", "pending", "failed", "refunded", "cancelled"],
       "weights": [0.72, 0.08, 0.14, 0.04, 0.02],
       "_citation": "Visa Inc. CNP decline rate 14%; NRF 2024 return rate 16.9% (split: 4% refund + 2% cancel); remaining 72% completed"
     }
   }
   ```

4. **Verify weights sum to 1.0** (±0.01 tolerance):
   ```powershell
   node -e "
   const p = JSON.parse(require('fs').readFileSync('pack.json','utf-8'));
   for (const [t,td] of Object.entries(p.tables)) {
     for (const [c,cd] of Object.entries(td.columns)) {
       if (cd.options?.weights) {
         const sum = cd.options.weights.reduce((a,b) => a+b, 0);
         const ok = Math.abs(sum - 1.0) < 0.01;
         console.log(t + '.' + c + ': sum=' + sum.toFixed(3) + (ok ? ' ✓' : ' ✗ INVALID'));
       }
     }
   }
   "
   ```

### Enum Quality Rules

- **NEVER use uniform distribution** unless the domain genuinely has equal probability (e.g., coin flip, dice roll)
- **Minimum 5 values** for any enum with more than 3 real-world options
- **Maximum 30 values** — beyond this, use a different strategy (e.g., `text` with patterns)
- **Weights MUST be documented** with a `_citation` field
- **Review weights with domain expert** if available (e.g., healthcare enums reviewed by someone with clinical data knowledge)

---

## GATE 3: Pack Validation (Doctor)

**Goal:** The pack file is structurally valid, CLI-compatible, and free of known engine bugs.

### Procedure

```powershell
# 1. Doctor check
realitydb comply doctor --pack pack.json

# Expected: 0 critical, 0 warnings
# If studio-v4 format detected:
realitydb comply doctor --pack pack.json --fix --output pack-ready.json
```

### Checklist

- [ ] **Format: studio-export** (CLI-compatible). If studio-v4, run `--fix`
- [ ] **0 critical issues**
- [ ] **0 warnings** (or documented exceptions)
- [ ] **FK references validated** — All foreign keys point to existing tables
- [ ] **Date strategies validated** — All timestamp columns have `past_date` or `future_date` strategy
- [ ] **No `dependsOn` properties** — Known engine bug. Remove with JSON-based script (NEVER regex):
  ```powershell
  node safe-fix-dependson.cjs input.json output.json
  ```
- [ ] **Pack file is valid JSON** — Verify:
  ```powershell
  node -e "JSON.parse(require('fs').readFileSync('pack.json','utf-8')); console.log('VALID')"
  ```

---

## GATE 4: Generation & Inspection

**Goal:** The generated data contains real-looking values, correct FK references, and no mock placeholders.

### Procedure

```powershell
# 1. Generate a small sample (100 rows) for inspection
realitydb run --pack pack.json --rows 100 --format sql --seed 42 -o sample-100.sql

# 2. Inspect the first INSERT block
$lines = Get-Content sample-100.sql
$ins = ($lines | Select-String "INSERT INTO" | Select-Object -First 1).LineNumber
for ($i = $ins; $i -le ($ins + 5); $i++) { Write-Host $lines[$i-1].Substring(0, [Math]::Min(150, $lines[$i-1].Length)) }
```

### Inspection Checklist

- [ ] **No mock placeholders** — Search for these MUST-NOT-APPEAR strings:
  ```powershell
  $content = Get-Content sample-100.sql -Raw
  $mocks = @('mock_past_date', 'mock_future_date', 'mock_template', 'mock_', 'sample_text_')
  foreach ($m in $mocks) {
    if ($content -match $m) { Write-Host "FAIL: Found '$m'" -ForegroundColor Red }
    else { Write-Host "PASS: No '$m'" -ForegroundColor Green }
  }
  ```
- [ ] **Dates are ISO 8601** — Values look like `2025-03-09T21:00:18.525Z`
- [ ] **Names look realistic** — Values like `Maria Ali`, `Chen Smith`, not `user_123`
- [ ] **Emails follow template** — Values like `user_47390@example.dev`
- [ ] **UUIDs are unique** — No duplicate primary keys
- [ ] **FK values reference existing parents** — Spot-check 3 child rows
- [ ] **Enum values match the pack definition** — No values outside the defined set
- [ ] **Numbers are in expected ranges** — Amounts between min/max, not 0 or negative
- [ ] **Boolean distribution looks right** — Not all TRUE or all FALSE
- [ ] **`_realitydb_meta` table embedded** — Watermark present for provenance

### Generate Production Sizes

Only after inspection passes:
```powershell
# Generate 5K (free tier)
realitydb run --pack pack.json --rows 5000 --format sql --seed 42 -o template-5k.sql

# Generate 10K (paid tier)
realitydb run --pack pack.json --rows 10000 --format sql --seed 42 -o template-10k.sql
```

---

## GATE 5: Quality Assessment (Score ≥ 95)

**Goal:** The dataset scores 95/100 or higher on the SQR v1.0 assessment.

### Procedure

```powershell
realitydb examine assess template-5k.sql
```

### Score Requirements

| Pillar | Minimum | Target | Action if below |
|---|---|---|---|
| **Overall** | 95 | 100 | DO NOT SHIP. Fix and re-assess |
| **Fidelity** | 90 | 100 | Check distribution diversity, completeness |
| **Structure** | 95 | 100 | Check FK integrity, PK uniqueness, temporal logic |
| **Privacy** | 100 | 100 | Must be 100 for synthetic data (_realitydb_meta present) |

### Common Score Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| PK uniqueness < 100% | Missing `"strategy": "uuid"` on id columns | Add explicit `"strategy": "uuid"` |
| Distribution diversity low | Too few enum values or uniform distribution | Add more values + weights |
| Fidelity < 90 | Columns with low Shannon entropy | Increase value variety |
| Privacy < 100 | `_realitydb_meta` not detected | Regenerate with latest CLI (v2.37.4+) |
| Structure < 95 | FK referencing non-existent rows | Check pack FK definitions |

---

## GATE 6: Compliance Scan

**Goal:** The dataset passes PII scan and generates clean compliance reports.

### Procedure

```powershell
# 1. PII Scan (full tier — 46 patterns)
realitydb comply scan template-5k.sql --tier full

# 2. EU AI Act compliance report
realitydb comply report --file template-5k.sql --framework eu-ai-act

# 3. HIPAA scan (for healthcare domains)
realitydb comply report --file template-5k.sql --framework hipaa
```

### Checklist

- [ ] **PII scan: synthetic provenance verified** — Should show "PII-shaped column(s) — synthetic provenance verified"
- [ ] **PII scan: no UNEXPECTED PII** — All flagged columns are intentionally PII-shaped (email, name, address in a users table)
- [ ] **EU AI Act report generated** — Report ID assigned, Articles 10/11/12/50 mapped
- [ ] **HIPAA report generated** (healthcare domains only)
- [ ] **No real PII in the data** — Verify names are synthetic (not copied from any real source)

---

## GATE 7: Smoke Test & Publish

**Goal:** Automated smoke test passes. Data uploaded to correct locations.

### Pre-Publish Smoke Test

```powershell
# Run the full smoke test
Set-Location C:\Users\HP\Documents\databox\apps\cli
node smoke-test.cjs

# Expected: ALL TESTS PASSED (29/29 or more)
# If ANY test fails: DO NOT PUBLISH
```

### Upload to R2

```powershell
Set-Location C:\Users\HP\Documents\databox\workers\lab-api

# Upload 5K
npx wrangler r2 object put realitydb-templates/templates/{name}-5k.sql \
  --file template-5k.sql --remote

# Upload 10K
npx wrangler r2 object put realitydb-templates/templates/{name}-10k.sql \
  --file template-10k.sql --remote

# Verify upload
npx wrangler r2 object get realitydb-templates/templates/{name}-5k.sql \
  --remote --file /tmp/verify.sql 2>&1
```

### Add to Store Catalog

```powershell
# Add to DATASET_PRICING in Lab API
# Add to TEMPLATE_META in DataStorePage.tsx
# Add to TEMPLATE_META in SimLabPage.tsx
# Deploy Lab API: npx wrangler deploy
# Deploy Sandbox: npm run build && npx wrangler pages deploy dist
```

### Add to CLI (if bundled)

```powershell
# Copy pack to CLI packs directory
Copy-Item pack.json C:\Users\HP\Documents\databox\apps\cli\src\packs\{name}.json

# Add to BUILT_IN_PACKS in index.ts
# Rebuild: npx tsup && npm run postbuild
# Run smoke test: node smoke-test.cjs
# Bump version and publish: npm publish
```

### Final Verification

```powershell
# Verify store returns the new template
curl -s https://realitydb-lab-api.eddy-078.workers.dev/v1/store | python -c "
import sys,json
d=json.load(sys.stdin)
for x in d['datasets']: print(x['template'])
"

# Verify CLI can generate from built-in name
realitydb run --pack {name} --rows 100 --format sql --seed 42 -o /tmp/verify.sql

# Verify no mock values in output
node -e "const c=require('fs').readFileSync('/tmp/verify.sql','utf-8'); console.log('mock_ found:', c.includes('mock_')); console.log('sample_text found:', c.includes('sample_text'))"
```

### Commit & Push

```powershell
Set-Location C:\Users\HP\Documents\databox
git add .
git commit -m "feat: add {name} template — {N} tables, {score}/100 quality

Domain: {domain}
Tables: {N}
Columns: {M}
FKs: {K}
Quality: {score}/100 (Fidelity {f}, Structure {s}, Privacy {p})
Enum distributions: research-backed with citations
CLI v{version}"
git push origin main
```

---

## Dataset Variant Strategy

For each domain, we produce multiple schema variants at increasing complexity:

```
Variant A: Core (starter)
├── 5-10 tables
├── Essential entities only
├── Basic FK relationships
└── Good for learning, quick prototyping

Variant B: Standard (production-like)
├── 11-20 tables
├── Adds supporting entities (audit, analytics, settings)
├── Complex FK chains
└── Good for staging, integration testing

Variant C: Full (enterprise)
├── 21+ tables
├── Complete domain model
├── Cross-cutting concerns (compliance, audit, analytics)
└── Good for enterprise testing, compliance proof
```

### Naming Convention

```
{domain}-{variant}-{version}.json

Examples:
  banking-core-v1.json        (Variant A: 10 tables)
  banking-standard-v1.json    (Variant B: 20 tables)
  banking-full-v1.json        (Variant C: 35 tables)
  healthcare-core-v1.json     (Variant A: 8 tables)
  healthcare-standard-v1.json (Variant B: 14 tables)
  healthcare-full-v1.json     (Variant C: 30 tables)
```

### R2 Key Convention

```
templates/{domain}-{size}.sql          (default variant — typically Standard)
templates/{domain}-core-{size}.sql     (Core variant)
templates/{domain}-full-{size}.sql     (Full variant)
```

---

## Quality Scorecard Template

After completing all 7 gates, fill in this scorecard and save it with the template:

```
╔══════════════════════════════════════════════╗
║  REALITYDB DATASET QUALITY SCORECARD         ║
╠══════════════════════════════════════════════╣
║  Template: {name}                            ║
║  Domain:   {domain}                          ║
║  Variant:  {A/B/C}                           ║
║  Version:  {version}                         ║
║  Date:     {date}                            ║
║  CLI:      v{cli_version}                    ║
╠══════════════════════════════════════════════╣
║  Schema                                      ║
║  ├── Tables:    {N}                          ║
║  ├── Columns:   {M}                          ║
║  ├── FKs:       {K}                          ║
║  └── Enums:     {E} (all weighted: Y/N)      ║
╠══════════════════════════════════════════════╣
║  Quality (SQR v1.0)                          ║
║  ├── Overall:   {score}/100                  ║
║  ├── Fidelity:  {f}/100                      ║
║  ├── Structure: {s}/100                      ║
║  └── Privacy:   {p}/100                      ║
╠══════════════════════════════════════════════╣
║  Compliance                                  ║
║  ├── PII scan:     PASS / {N} columns        ║
║  ├── EU AI Act:    PASS (Report ID: {id})    ║
║  ├── HIPAA:        PASS / N/A                ║
║  └── Provenance:   _realitydb_meta embedded  ║
╠══════════════════════════════════════════════╣
║  Gates                                       ║
║  ├── G1 Schema Review:     ☑                 ║
║  ├── G2 Enum Research:     ☑                 ║
║  ├── G3 Pack Validation:   ☑                 ║
║  ├── G4 Generation Check:  ☑                 ║
║  ├── G5 Quality ≥ 95:      ☑                 ║
║  ├── G6 Compliance Scan:   ☑                 ║
║  └── G7 Smoke Test:        ☑                 ║
╠══════════════════════════════════════════════╣
║  Locations                                   ║
║  ├── R2:    templates/{name}-5k.sql          ║
║  ├── R2:    templates/{name}-10k.sql         ║
║  ├── CLI:   src/packs/{name}.json            ║
║  ├── Store: DATASET_PRICING['{name}']        ║
║  └── npm:   @realitydb/cli@{version}         ║
╠══════════════════════════════════════════════╣
║  Approved by: {name}                         ║
║  Date: {date}                                ║
╚══════════════════════════════════════════════╝
```

---

## Appendix: Domain Research Sources

### Where to find real-world data for enum distributions

| Category | Sources |
|---|---|
| **Payments** | Visa Annual Report, Mastercard Insights, Stripe Radar reports, FIS Global Payments Report |
| **E-commerce** | NRF (National Retail Federation), Shopify annual reports, Statista, Baymard Institute |
| **Healthcare** | WHO ICD-10 statistics, CMS.gov, HIPAA Journal, FDA adverse event database |
| **HTTP/API** | Cloudflare Radar, Akamai SOTI, Postman API reports, Google Web Fundamentals |
| **Finance** | BIS (Bank for International Settlements), SWIFT, Federal Reserve reports |
| **Telecom** | ITU statistics, GSMA Intelligence, FCC reports |
| **IoT** | Gartner IoT reports, IEEE papers, Siemens/ABB industrial reports |
| **Supply Chain** | Gartner Supply Chain reports, WTO trade data, UN Comtrade |
| **Demographics** | US Census, World Bank Open Data, UN Population Division |
| **Error Rates** | Sentry annual reports, Datadog State of APM, PagerDuty incident reports |

---

*Mpingo Systems LLC — Precision Tools built to stay.*
*"Every row tells a story. Every table mirrors reality."*
