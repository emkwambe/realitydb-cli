# RealityDB Pack Requirements Standard
## Version 2.0 — July 2026
## Authority: Supersedes QUALITY-STANDARDS.md v1.0, DATA-QUALITY-STANDARD.md v1.0, DATA-GENERATION-WISDOM.md v1.0
## Rule: NO pack ships without passing ALL requirements. Zero exceptions.

---

## The Three Quality Layers

Every pack must pass all three layers in order. Passing Layer 1 and 2 but
failing Layer 3 is what shipped clinical trial sites named "Stone Oven Bakery"
at 100/100 assessor score. The assessor cannot catch semantic contamination.
A human must.

```
Layer 1 — Structural Integrity    measured by: examine assess
Layer 2 — Distributional Realism  measured by: CV audit + citation review
Layer 3 — Semantic Correctness    measured by: human real-data inspection
```

---

## LAYER 1 — Structural Integrity Requirements

### PR-001: FK Integrity — 100% — HARD STOP
Every foreign key value in every child table references a real, existing row
in the parent table. Zero orphaned records. Zero dangling references.

Verification:
```bash
realitydb examine assess dataset.sql --pack pack.json --json
# "fkIntegrity": 1.0  — required
```

Failure signature: A JOIN between parent and child returns fewer rows than
the child table. PostgreSQL FK constraint INSERT fails on load.

### PR-002: Primary Key Uniqueness — 100% — HARD STOP
No duplicate primary keys in any table. Every id column generates unique UUIDs.

Verification:
```bash
realitydb examine assess dataset.sql --json
# "pkUniqueness": 1.0  — required
```

### PR-003: Enum Validity — 100% — HARD STOP
Every generated enum value is a member of the declared values list.
No out-of-range values, no null where not nullable.

Verification:
```bash
realitydb examine assess dataset.sql --json
# "enumValidity": 1.0  — required
```

### PR-004: Temporal Logic — 95+ — HARD STOP
Child timestamps do not precede parent timestamps.
Events that happen later have later timestamps.

Required orderings (non-exhaustive):
  created_at < updated_at < deleted_at
  order_placed_at < shipped_at < delivered_at
  diagnosis_date < treatment_start < treatment_end
  consent_date < enrollment_date < first_dose_date
  claim_submitted_at < paid_date
  parent.created_at <= child.created_at

Verification:
```bash
realitydb examine assess dataset.sql --json
# "temporalLogic": >= 0.95  — required
# Target: 1.0 (100%) for EU enterprise packs
```

CRITICAL: Assess the ENFORCED baseline, not the raw generated file.
The enforcer script fixes temporal ordering. Always assess after enforcer runs.

### PR-005: Overall Quality Score — 97+ — HARD STOP
Composite assessor score across all structural dimensions.

```bash
realitydb examine assess dataset.sql --pack pack.json
# Overall: >= 97/100  — required
# Privacy: 100/100    — required (synthetic provenance)
# EU packs: >= 98/100 — stricter threshold
```

### PR-006: No Mock Placeholders — HARD STOP
Zero occurrences of placeholder strings in generated data.

Forbidden patterns (all must return 0 matches):
```powershell
$content = Get-Content dataset.sql -Raw
@('mock_past_date','mock_future_date','mock_template','mock_city',
  'mock_state','mock_ip','mock_number','sample_text_','val_X_Y') |
  ForEach-Object {
    if ($content -match $_) { Write-Host "FAIL: $_" -ForegroundColor Red }
  }
```

### PR-007: Smoke Test — 149/149 — HARD STOP
The full CLI smoke test must pass after any pack change.

```powershell
cd C:\Users\HP\Documents\databox\apps\cli
node smoke-test.cjs
# Required: 149 passed / 0 failed
```

### PR-008: _realitydb_meta Watermark — Required
Every generated file must contain the provenance watermark table.

```bash
grep "_realitydb_meta" dataset.sql
# Must return at least one match
```

The watermark records: generator version, generation timestamp, seed value,
template name, and dataset hash. This is the Article 10(b) provenance record.

---

## LAYER 2 — Distributional Realism Requirements

### PR-009: No Uniform Distributions — Required
Every enum column with 3+ values must have non-uniform weights unless
the domain genuinely has equal probability.

Almost nothing in business data is genuinely uniform. The following are
legitimate exceptions — all others require research-backed weights:
- Calendar period enums (months, quarters) — genuinely uniform
- Named reference entities (product names, warehouse names) — uniform by design
- Binary symmetric columns (inbound/outbound SMS direction) — genuinely ~50/50
- Geographic trade lanes in global logistics — balanced by design

CV test: CV = (max_weight - min_weight) / mean_weight
- CV below 0.30: requires written justification or it is a defect
- CV 0.30–0.80: acceptable for most business distributions
- CV above 0.80: strong Pareto — correct for fraud rates, rare events

Audit command:
```powershell
$pack = Get-Content pack.json -Raw | ConvertFrom-Json
foreach ($tableEntry in $pack.tables) {
  foreach ($tableName in $tableEntry.PSObject.Properties.Name) {
    $table = $tableEntry.$tableName
    foreach ($colName in $table.columns.PSObject.Properties.Name) {
      $col = $table.columns.$colName
      if ($col.strategy -eq "enum" -and $col.options.weights) {
        $w = $col.options.weights
        $max = ($w | Measure-Object -Maximum).Maximum
        $min = ($w | Measure-Object -Minimum).Minimum
        $mean = ($w | Measure-Object -Average).Average
        $cv = if ($mean -gt 0) { ($max - $min) / $mean } else { 0 }
        if ($cv -lt 0.30) {
          Write-Host "LOW CV: $tableName.$colName cv=$([Math]::Round($cv,2))" -ForegroundColor Yellow
        }
      }
    }
  }
}
```

### PR-010: Citation Requirement — Required
Every non-trivial distribution must have a documented citation in the pack
spec document (COMPANY-PACK-SPEC.md) and a _citation field in the pack JSON.

Citation format:
```json
{
  "strategy": "enum",
  "options": {
    "values": ["completed", "pending", "failed", "refunded"],
    "weights": [72, 8, 14, 6],
    "_citation": "Visa Inc. CNP decline rate 14%; NRF 2024 return 6%; remaining completed"
  }
}
```

Acceptable primary sources:
- Government: CDC, FDA, FRB, FDIC, FinCEN, OCC, BIS, WHO, ITU, ECB, EBA
- Professional bodies: ASCO, IASLC, HFMA, ISM, GSMA, ACFE, FFIEC, BEREC
- Research firms: McKinsey, Gartner, Deloitte, PwC, Tufts CSDD, TransCelerate
- Industry: Stripe Atlas, Nilson Report, DHL, Ericsson, J.D. Power, GSMA

Not acceptable:
- Wikipedia, general web articles, AI-generated statistics
- Estimates without methodology documentation
- Any source that cannot be linked to a specific published report

### PR-011: Universal Distribution Rules — Required

Status columns (active/inactive pattern):
- Active state dominates: 75–90%
- Closed/cancelled: 5–15%
- Suspended/frozen: 3–8%

Severity columns (low/medium/high/critical):
- Low: 35–50%, Medium: 25–35%, High: 12–22%, Critical: 5–10%

Boolean fraud/risk flags:
- is_fraud: true 1, false 99  (Nilson Report: global fraud ~0.077%)
- is_flagged: true 8, false 92
- is_high_risk: true 10, false 90

Geographic distributions (US-primary datasets):
- US: 50–65%, UK/CA/AU: 8–12% each, DE/FR: 5–8% each

Currency (US-primary): USD 65, GBP 12, CAD 10, AUD 5, EUR 8

### PR-012: Float Distribution Bounds — Required
All float columns must have explicit min and max set.
Unbounded distributions generate outliers that break temporal logic.

Standard bounds by type:
- Consumer transaction amounts: mean 85, stddev 140, min 0.50, max 15000
- Retail account balances: mean 8000, stddev 12000, min 0, max 250000
- B2B invoice amounts: mean 45000, stddev 35000, min 500, max 500000
- Fraud risk scores (0–100): mean 42, stddev 28, min 0, max 100
- Supplier lead time (days): mean 18, stddev 8, min 3, max 90

### PR-013: Temporal Window Standard — Required
Standard temporal window: 24 months.
Production standard: 2024-05-01 to 2026-05-01.

Rules:
- Root tables (customers, suppliers): 36–48 month window acceptable
- Event tables (transactions, claims, visits): exactly 24 months
- Scorecard/snapshot tables: match the event window exactly
- Do NOT add created_at to event tables — they have natural timestamps
  - WRONG: deliveries with promised_date, delivered_at, AND created_at
  - CORRECT: deliveries with promised_date and delivered_at only
  - Reason: created_at on event tables causes temporal logic failures

---

## LAYER 3 — Semantic Correctness Requirements

This layer cannot be automated. A human must inspect actual row values.

### PR-014: Entity Name Check — Required
Generate 300 rows and verify domain-appropriate entity names.

Clinical packs — must NOT contain in sites, trials, or medication columns:
```powershell
Select-String inspect.sql -Pattern "Pizza|Grill|Cafe|Restaurant|Bakery|Kitchen|Tap|Fork|Diner"
# Required: zero matches in domain-inappropriate tables
```

Supply chain packs — supplier and manufacturer names must be industrial:
- Acceptable: "Precision Industrial Corp", "Advanced Manufacturing Ltd"
- Not acceptable: "Firebird Pizza", "Golden Plate"

Telecom packs — device model names must be real handsets:
- Acceptable: "Galaxy S24 Ultra", "iPhone 15 Pro"
- Not acceptable: "The Local Table", "Luna Restaurant"

Root cause: The company_name generator routes by tableName as of commit c397e3c.
If contamination appears, add the table to the routing table in generators.ts
or convert the column to an explicit enum in the pack JSON.

### PR-015: Referential Logic Check — Required
Spot-read 10 rows from each domain-sensitive table and verify each row makes
sense as a real-world entity.

Known failure modes that pass structural gates:
- Patient date_of_birth in the future (fix: minYearsAgo 18, maxYearsAgo 100)
- Medication drug_class clinically impossible for the medication name
  (Metformin classified as ARB — both are wrong)
- Supplier country mismatched with supplier currency
  (Zhonghe Industrial in Mexico with CNY currency)
- Clinical site named after a food establishment

### PR-016: Domain Vocabulary Check — Required
Enum values must use correct domain terminology.

Healthcare: ICD categories, CTCAE severity grades (G1–G5), ECOG status (0–4)
Financial: BSA/AML terminology, CARC denial codes, SEPA payment types
Clinical: RECIST criteria (CR/PR/SD/PD/NE), ICH E6 GCP terminology
Supply chain: Incoterms (FOB, CIF, DAP), ISO supplier rating grades (A/B/C/D/F)
AML: BSA activity types, FinCEN SAR categories, CTR threshold references

### PR-017: Cardinality Ratio Check — Required
Parent–child row ratios must be realistic. Not flat 1:1 everywhere.

Research-backed cardinality targets:
| Relationship               | Ratio      | Source                        |
|----------------------------|------------|-------------------------------|
| customers → orders         | 1:3–1:10   | Shopify avg 4.2 orders/year   |
| orders → order_items       | 1:2–1:5    | NRF avg basket 3.1 items      |
| patients → appointments    | 1:4–1:12   | CMS avg 6.2 visits/year       |
| patients → prescriptions   | 1:5–1:20   | CDC avg 12.6 rx/year          |
| suppliers → purchase_orders| 1:30–1:80  | Deloitte CPO Survey 2024      |
| subscribers → usage_records| 1:20–1:100 | ITU telecom benchmarks        |
| trials → subjects          | 1:50–1:500 | ClinicalTrials.gov Phase I–III|

---

## LAYER 3B — EU Compliance Requirements (EU Enterprise Packs Only)

Apply these additional requirements for packs designated as EU enterprise packs
(eu-banking.json, eu-healthcare.json, eu-telecom.json and future EU packs).

### PR-018: Article 10(a) Design Rationale — Required
Pack spec document must include a Design Rationale section explaining:
- Why each table was included and what it models
- Why each major distribution was chosen over alternatives
- What the dataset IS designed to simulate
- What the dataset is NOT designed to simulate

### PR-019: Article 10(b) Provenance Documentation — Required
Pack spec must document the generation provenance chain:
- Generator version (from _realitydb_meta)
- Pack version (from pack JSON version field)
- Seed value used (for reproducibility)
- Enforcer script version and git commit hash
- Assessment report ID and scores

### PR-020: Article 10(d) Explicit Limitations — Required
Pack spec must include an explicit Limitations section:
```
This dataset simulates [domain] under [conditions].
It does NOT simulate: [specific exclusions].
Known limitations:
  - [limitation 1 with mitigation]
  - [limitation 2 with mitigation]
This data is appropriate for: [use cases]
This data is NOT appropriate for: [excluded use cases]
```

### PR-021: Article 10(e) Suitability Evidence — Required
EU enterprise packs must score 98+ (not 97+) on examine assess.
Assessment report must be retained alongside the dataset.

```bash
realitydb examine assess dataset.sql --pack pack.json --json --output assess-report.json
# Overall: >= 98/100 for EU packs
```

### PR-022: Article 10(f) Bias Examination — Required
Run anomaly scan and document demographic subgroup coverage.

```bash
realitydb anomaly --pack pack.json --mode bias-scan
realitydb comply report --file dataset.sql --framework eu-ai-act --json
```

Must document: age bracket coverage, gender distribution, geographic coverage.
Must verify: no demographic group has zero representation.
Must cite: primary source for each demographic weight decision.

### PR-023: GDPR Data Protection by Design — Required
EU packs must include a one-page Data Protection by Design statement confirming:
- No personal data was used as input at any stage
- All values are generated from mathematical models
- The _realitydb_meta watermark confirms synthetic origin
- Generation ran entirely on local infrastructure

---

## The Eight-Gate Publication Pipeline

```
GATE 1: Schema Design Review        PR-001 to PR-003 (structure)
GATE 2: Enum Research & Citation    PR-009 to PR-011 (distributions)
GATE 3: Pack Validation             pack:validate 0 errors
GATE 4: Generation & Inspection     PR-014 to PR-017 (semantic)
GATE 5: Quality Assessment          PR-004 to PR-008 (assessor)
GATE 6: Compliance Scan             comply scan + comply report
GATE 7: Smoke Test                  PR-007 (149/149)
GATE 8: EU Compliance (EU packs)    PR-018 to PR-023
```

Run the pipeline in order. Do not skip gates. Do not advance to the next
gate if the current gate has an unresolved hard stop.

### Gate 1 — Schema Design Review
```powershell
# Verify pack is valid JSON
node -e "JSON.parse(require('fs').readFileSync('pack.json','utf-8')); console.log('VALID JSON')"

# List all tables and FK relationships
realitydb pack:info --pack pack.json
```

Checklist:
- [ ] Domain research completed (minimum 2 primary sources)
- [ ] Every table has id UUID as primary key
- [ ] FK chain documented: child.parent_id → parent.id
- [ ] No circular FK references
- [ ] Column names in snake_case, descriptive, no abbreviations
- [ ] created_at NOT on event tables (only on root/reference tables)
- [ ] Status/lifecycle columns present where domain has state machines

### Gate 2 — Enum Research and Citation
```powershell
# Audit all enum columns for uniform distributions
# Run the CV audit script from PR-009

# Verify all weights have citations
node -e "
const p = JSON.parse(require('fs').readFileSync('pack.json','utf-8'));
let missing = 0;
for (const [t,td] of Object.entries(p.tables[0] || p.tables)) {
  for (const [c,cd] of Object.entries(td.columns || {})) {
    if (cd.strategy === 'enum' && cd.options?.weights && !cd.options?._citation) {
      console.log('MISSING CITATION: ' + t + '.' + c);
      missing++;
    }
  }
}
console.log(missing === 0 ? 'ALL CITED' : missing + ' missing citations');
"
```

Checklist:
- [ ] CV audit: all flags reviewed, justified or fixed
- [ ] Every weighted enum has _citation field
- [ ] Citations link to primary sources (not Wikipedia)
- [ ] Universal distribution rules applied (PR-011)
- [ ] Float bounds set on all float columns (PR-012)
- [ ] Temporal window set correctly (PR-013)

### Gate 3 — Pack Validation
```bash
realitydb pack:validate --pack pack.json
# Required: 0 errors, 0 warnings
realitydb comply doctor --pack pack.json
# Required: 0 critical issues
```

### Gate 4 — Generation and Semantic Inspection
```bash
# Generate inspection sample
realitydb run --pack pack.json --rows 300 --format sql --seed 42 -o inspect.sql

# Check for mock placeholders (PR-006)
# Check for entity name contamination (PR-014)
# Spot-read 10 rows per domain-sensitive table (PR-015)
# Verify domain vocabulary (PR-016)
# Spot-check cardinality ratios (PR-017)
```

Checklist:
- [ ] Zero mock placeholder strings
- [ ] No restaurant names in industrial/clinical columns
- [ ] Dates are ISO 8601 format
- [ ] Names look realistic for the domain
- [ ] Enum values match pack definitions
- [ ] Numbers in expected ranges
- [ ] Parent timestamps precede child timestamps
- [ ] _realitydb_meta watermark present

### Gate 5 — Quality Assessment
```bash
# Generate production dataset
realitydb run --pack pack.json --rows 50000 --format sql --seed 42 -o baseline.sql

# Assess (ENFORCED baseline for Atelier packs, raw for CLI packs)
realitydb examine assess baseline.sql --pack pack.json --json --output assess-report.json
```

Required scores:
| Pillar      | CLI Pack | EU Enterprise Pack |
|-------------|----------|--------------------|
| FK integrity| 100%     | 100%               |
| Enum valid  | 100%     | 100%               |
| Temporal    | 95%+     | 98%+               |
| Overall     | 97+/100  | 98+/100            |
| Privacy     | 100/100  | 100/100            |

### Gate 6 — Compliance Scan
```bash
# PII scan
realitydb comply scan baseline.sql
# Expected: synthetic provenance confirmed, no unexpected PII

# EU AI Act report
realitydb comply report --file baseline.sql --framework eu-ai-act \
  --output eu-aiact-report.json --json

# GDPR report (all packs)
realitydb comply report --file baseline.sql --framework gdpr \
  --output gdpr-report.json --json

# HIPAA report (healthcare/clinical packs only)
realitydb comply report --file baseline.sql --framework hipaa \
  --output hipaa-report.json --json
```

### Gate 7 — Smoke Test
```powershell
cd C:\Users\HP\Documents\databox\apps\cli
node smoke-test.cjs
# Required: 149/149 — Safe to publish
```

### Gate 8 — EU Compliance Documentation (EU packs only)
- [ ] Article 10(a) Design Rationale section written in pack spec
- [ ] Article 10(b) Provenance chain documented
- [ ] Article 10(d) Limitations section written in pack spec
- [ ] Article 10(e) Assessment report retained (98+ score)
- [ ] Article 10(f) Bias examination completed
- [ ] GDPR Data Protection by Design statement written
- [ ] compliance@realitydb.dev contact confirmed active

---

## What to Commit

Pack JSON:
  src/packs/[name].json           source of truth — always edit here
  dist/packs/[name].json          rebuild with npm run build — do not edit directly

Documentation:
  docs/packs/[NAME]-SPEC.md       pack specification with design rationale,
                                  limitations, citations (required)

Assessment evidence (Atelier packs):
  [name]-50k-baseline.sql         enforced baseline (NOT raw generated)
  [name]-assess-heuristic.json    quality report
  [name]-assess-pack-aware.json   quality report

Commit message format:
  feat(pack): [name] v1.0 — N tables, domain description, XX/100 quality
  
  Tables: N | FKs: K | Enums: E (all cited)
  FK integrity: 100% | Temporal: 100% | Overall: XX/100
  Sources: [primary sources used]

---

## Known Limitations (Documented Engine Gaps)

These are known engine limitations. They do not block publication but must
be disclosed in pack spec Limitations sections.

**Per-row correlated enum limitation:**
medications.name and medications.drug_class are independently sampled.
Individual rows may show clinically impossible combinations (Amlodipine/SSRI).
The aggregate distribution across 1000+ rows is clinically defensible.
Fix requires a correlated/derived enum engine feature (ENGINE-V2-DESIGN.md).

**Root table cardinality variance:**
Root tables declared with N rows may generate significantly more.
Enforcer script normalizes duplicate root rows post-generation.
Fix requires engine v2 rowBudget feature (ENGINE-V2-DESIGN.md).

**supply-chain.customers.name context routing:**
The customers table is not in the tableName routing table in generators.ts.
B2B customer names may pull from the default (restaurant) pool.
Fix: convert customers.name to an explicit enum in supply-chain.json.

**Lifecycle state machine enforcement:**
The engine does not enforce state machine rules during generation.
A cancelled order CAN have a shipped_at date in raw output.
The enforcer script patches this for Atelier packs.
For CLI built-in packs: lifecycle rules are declared in pack JSON but
the current engine strips them with a warning (Core tier feature).

---

## Quick Reference — Requirement IDs

| ID     | Requirement              | Layer | Hard Stop? |
|--------|--------------------------|-------|------------|
| PR-001 | FK Integrity 100%        | 1     | YES        |
| PR-002 | PK Uniqueness 100%       | 1     | YES        |
| PR-003 | Enum Validity 100%       | 1     | YES        |
| PR-004 | Temporal Logic 95%+      | 1     | YES        |
| PR-005 | Overall Score 97+        | 1     | YES        |
| PR-006 | No Mock Placeholders     | 1     | YES        |
| PR-007 | Smoke Test 149/149       | 1     | YES        |
| PR-008 | _realitydb_meta Present  | 1     | YES        |
| PR-009 | No Uniform Distributions | 2     | Required   |
| PR-010 | Citation Requirement     | 2     | Required   |
| PR-011 | Universal Dist. Rules    | 2     | Required   |
| PR-012 | Float Bounds             | 2     | Required   |
| PR-013 | Temporal Window          | 2     | Required   |
| PR-014 | Entity Name Check        | 3     | Required   |
| PR-015 | Referential Logic Check  | 3     | Required   |
| PR-016 | Domain Vocabulary        | 3     | Required   |
| PR-017 | Cardinality Ratios       | 3     | Required   |
| PR-018 | Art.10(a) Design Rationale| EU   | EU packs   |
| PR-019 | Art.10(b) Provenance     | EU    | EU packs   |
| PR-020 | Art.10(d) Limitations    | EU    | EU packs   |
| PR-021 | Art.10(e) 98+ Score      | EU    | EU packs   |
| PR-022 | Art.10(f) Bias Exam      | EU    | EU packs   |
| PR-023 | GDPR DPbD Statement      | EU    | EU packs   |

---

*RealityDB Pack Requirements Standard v2.0*
*Mpingo Systems LLC — Charlotte, NC*
*Supersedes: QUALITY-STANDARDS.md v1.0, DATA-QUALITY-STANDARD.md v1.0,*
*DATA-GENERATION-WISDOM.md v1.0, DATASET-GENERATION-PROTOCOL.md v1.0*
*Effective: July 2026*
*"A customer only needs ONE counter-example. We give them ZERO."*
