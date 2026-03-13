# RealityDB Local Testing Plan

## Prerequisites

1. **Node.js 20+** installed
2. **PostgreSQL** running locally (Docker recommended)
3. **pnpm** installed globally

### Database Setup (Docker)

```powershell
docker run --name realitydb-test -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=testdb -p 5432:5432 -d postgres:16
```

### Build

```powershell
pnpm install
pnpm build
```

Verify: **zero errors**, output shows `8 successful, 8 total`.

### Config File

Create `realitydb.config.json` in the repo root:

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://postgres:testpass@localhost:5432/testdb"
  },
  "seed": {
    "defaultRecords": 100,
    "batchSize": 500,
    "randomSeed": 42
  },
  "template": "saas"
}
```

### Run CLI

All commands use:

```powershell
node apps/cli/dist/index.js <command>
```

Or create an alias:

```powershell
Set-Alias realitydb "node apps/cli/dist/index.js"
```

---

## Phase 1: Core Platform (H1)

### Test 1.1 — Version Banner

```powershell
realitydb
```

**Expected:** `RealityDB v1.3.0 — Developer Reality Platform`

### Test 1.2 — Schema Scan

```powershell
realitydb scan
```

**Expected:** Lists all tables in your database (may be empty initially). No errors.

### Test 1.3 — Seed with Template

```powershell
realitydb seed --template saas --records 50 --seed 42
```

**Expected:**
- Creates tables: plans, users, subscriptions, payments
- Inserts 50 rows per table (200 total)
- Shows `Seed complete. 200 rows in X.Xs`

### Test 1.4 — Deterministic Seed

```powershell
realitydb reset --confirm
realitydb seed --template saas --records 50 --seed 42
```

**Expected:** Identical output to Test 1.3 (same seed = same data).

### Test 1.5 — Other Templates

```powershell
realitydb reset --confirm
realitydb seed --template ecommerce --records 30 --seed 42
```

```powershell
realitydb reset --confirm
realitydb seed --template fintech --records 30 --seed 42
```

```powershell
realitydb reset --confirm
realitydb seed --template healthcare --records 30 --seed 42
```

```powershell
realitydb reset --confirm
realitydb seed --template education --records 30 --seed 42
```

**Expected:** Each template creates its own set of tables with appropriate data. All 5 templates work.

### Test 1.6 — Export

```powershell
realitydb seed --template saas --records 20 --seed 42
realitydb export --format json --output ./test-export
realitydb export --format csv --output ./test-export-csv
realitydb export --format sql --output ./test-export-sql
```

**Expected:** Files created in each output directory (one per table). Verify contents look reasonable.

### Test 1.7 — CI Mode

```powershell
realitydb scan --ci
realitydb seed --template saas --records 10 --seed 42 --ci
```

**Expected:** Structured JSON output (parseable, no human-readable banners).

### Test 1.8 — Reset

```powershell
realitydb reset --confirm
realitydb scan
```

**Expected:** All seeded tables are cleared (0 rows).

---

## Phase 2: Environment Reproduction (H1-S3)

### Test 2.1 — Capture

```powershell
realitydb seed --template saas --records 20 --seed 42
realitydb capture --name test-capture
```

**Expected:** Creates `test-capture.realitydb-pack.json` in current directory.

### Test 2.2 — Load

```powershell
realitydb reset --confirm
realitydb load test-capture.realitydb-pack.json --confirm
```

**Expected:** Data restored from the pack file.

### Test 2.3 — Share Info

```powershell
realitydb share test-capture.realitydb-pack.json
```

**Expected:** Shows pack info (name, tables, row counts). Does NOT upload (no `--gist`).

---

## Phase 3: Custom Templates (H2-S1)

### Test 3.1 — Template List

```powershell
realitydb templates
```

**Expected:** Lists all 5 built-in templates (saas, ecommerce, education, fintech, healthcare).

### Test 3.2 — Template Init

```powershell
realitydb templates init
```

**Expected:** Creates a `realitydb.template.json` scaffold file.

### Test 3.3 — Template Validate

```powershell
realitydb templates validate realitydb.template.json
```

**Expected:** Validation passes (or shows specific errors to fix).

### Test 3.4 — Seed with Custom Template

```powershell
realitydb reset --confirm
realitydb seed --template ./realitydb.template.json --records 20 --seed 42
```

**Expected:** Seeds using the custom template file.

---

## Phase 4: Demo Mode & Packs (H2-S3, H2-S4)

### Test 4.1 — Packs List

```powershell
realitydb packs list
```

**Expected:** Lists available demo packs.

### Test 4.2 — Pack Export

```powershell
realitydb pack export --name test-pack --template saas --records 20 --seed 42
```

**Expected:** Creates `test-pack.realitydb-pack.json`.

### Test 4.3 — Pack Import

```powershell
realitydb reset --confirm
realitydb pack import test-pack.realitydb-pack.json --confirm
```

**Expected:** Data imported from the pack.

---

## Phase 5: Timeline & Scenarios (H1 + H3-S3)

### Test 5.1 — Timeline Seed

```powershell
realitydb reset --confirm
realitydb seed --template saas --timeline 6-months --records 100 --seed 42
```

**Expected:** Data spread across 6 months with growth curve. Timestamps in the data span the timeline.

### Test 5.2 — Scenario Injection

```powershell
realitydb scenarios
```

**Expected:** Lists 7 scenarios (payment-failures, churn-spike, fraud-spike, data-quality, seasonal-traffic, data-migration, system-outage).

```powershell
realitydb reset --confirm
realitydb seed --template saas --scenario payment-failures --scenario-intensity high --records 100 --seed 42
```

**Expected:** Seed with scenario report showing affected rows.

### Test 5.3 — Multiple Scenarios

```powershell
realitydb reset --confirm
realitydb seed --template saas --scenario "payment-failures,churn-spike" --scenario-intensity medium --records 100 --seed 42
```

**Expected:** Both scenarios applied. Scenario report shows both.

### Test 5.4 — Scenario Schedule

```powershell
realitydb reset --confirm
realitydb seed --template saas --timeline 12-months --scenario-schedule "fraud-spike:month-6,churn-spike:month-9" --records 200 --seed 42
```

**Expected:** Scenarios applied at their scheduled time windows.

### Test 5.5 — Custom Scenario Scaffold

```powershell
realitydb scenarios create my-test-scenario
```

**Expected:** Creates `my-test-scenario.scenario.json` scaffold file.

---

## Phase 6: Lifecycle Simulation (H3-S1)

### Test 6.1 — Lifecycle Mode

```powershell
realitydb reset --confirm
realitydb seed --template saas --lifecycle --records 50 --seed 42
```

**Expected:**
- Users with `status=canceled` have `canceled_at` set and failed payments
- Users with `status=active` have successful payment history
- Cross-table consistency

---

## Phase 7: Data Science Mode (H3-S2)

### Test 7.1 — Generate (No DB Required)

```powershell
realitydb generate --records 500 --format json --output ./test-generated --seed 42
```

**Expected:** Creates JSON files in `./test-generated/` without touching the database.

### Test 7.2 — Generate CSV

```powershell
realitydb generate --records 500 --format csv --output ./test-generated-csv --seed 42
```

**Expected:** CSV files generated.

---

## Phase 8: Schema Analysis (H4-S1)

### Test 8.1 — Analyze

```powershell
realitydb seed --template saas --records 50 --seed 42
realitydb analyze
```

**Expected:** Shows analysis report with detected column types (emails, names, statuses, money fields), confidence scores, null rates.

### Test 8.2 — Analyze with Template Output

```powershell
realitydb analyze --output auto-template.json
```

**Expected:** Creates `auto-template.json` — a valid template generated from analysis.

### Test 8.3 — Use Generated Template

```powershell
realitydb reset --confirm
realitydb seed --template ./auto-template.json --records 30 --seed 42
```

**Expected:** Seeds using the auto-generated template. Full roundtrip.

---

## Phase 9: Data Masking (H4-S2)

### Test 9.1 — Mask Dry Run

```powershell
realitydb seed --template saas --records 50 --seed 42
realitydb mask --dry-run
```

**Expected:** Shows PII detection report without modifying data. Lists columns detected as PII with categories and confidence.

### Test 9.2 — Mask with Compliance Modes

```powershell
realitydb mask --dry-run --mode gdpr
realitydb mask --dry-run --mode hipaa
realitydb mask --dry-run --mode strict
```

**Expected:** `strict` flags more columns than `gdpr`. `hipaa` adds medical-specific categories.

### Test 9.3 — Mask to File

```powershell
realitydb mask --output ./masked-data --mode gdpr
```

**Expected:** Creates masked data files in `./masked-data/`. Original DB unchanged.

### Test 9.4 — Mask with Audit Log

```powershell
realitydb mask --output ./masked-audit --audit-log audit.json --mode gdpr
```

**Expected:** Creates `audit.json` with compliance proof (per-column masking records).

### Test 9.5 — Mask In-Place (Caution)

```powershell
realitydb mask --confirm --mode gdpr --seed 42
```

**Expected:** Modifies data in database. Re-scan to verify PII replaced with synthetic values.

### Test 9.6 — Safety Check

```powershell
realitydb mask
```

**Expected:** Error — requires `--dry-run`, `--output`, or `--confirm`. Safety check works.

---

## Phase 10: Classroom Mode (H4-S3)

### Test 10.1 — List Courses

```powershell
realitydb classroom
realitydb classroom list
```

**Expected:** Lists 3 courses: sql-101, analytics-intro, data-modeling with difficulty and exercise counts.

### Test 10.2 — Start Course

```powershell
realitydb classroom start sql-101
```

**Expected:** Creates `classroom_*` tables, inserts seed data, shows exercise count.

### Test 10.3 — Check Status

```powershell
realitydb classroom status
realitydb classroom status sql-101
```

**Expected:** Shows progress bars. 0% completion initially.

### Test 10.4 — Complete Exercise

```powershell
realitydb classroom complete sql-101 select-basics
realitydb classroom status sql-101
```

**Expected:** Progress updates to 10% (1/10 exercises).

### Test 10.5 — Reset Progress

```powershell
realitydb classroom reset sql-101
realitydb classroom status sql-101
```

**Expected:** Progress reset to 0%.

### Test 10.6 — Custom Course Scaffold

```powershell
realitydb classroom create my-course
```

**Expected:** Creates `my-course.course.json` scaffold file.

### Test 10.7 — Try Exercises

After starting sql-101, run these queries against your database to verify the course data works:

```sql
-- Exercise: select-basics
SELECT * FROM classroom_customers;

-- Exercise: where-filter
SELECT * FROM classroom_customers WHERE country = 'US';

-- Exercise: inner-join
SELECT c.name, o.order_date, o.total
FROM classroom_orders o
JOIN classroom_customers c ON o.customer_id = c.id;
```

---

## Phase 11: System Simulation (H4-S4)

### Test 11.1 — List Profiles

```powershell
realitydb simulate profiles
```

**Expected:** Lists 3 profiles: saas-startup, ecommerce-peak, api-service.

### Test 11.2 — Run Simulation

```powershell
realitydb simulate run --profile saas-startup --events 500 --seed 42 --output events.json
```

**Expected:** Creates `events.json` with 500+ events (correlations add more). Shows simulation report with event counts by source/type.

### Test 11.3 — NDJSON Output

```powershell
realitydb simulate run --profile ecommerce-peak --events 200 --seed 42 --output stream.ndjson --format ndjson
```

**Expected:** Creates `stream.ndjson` with one JSON object per line.

### Test 11.4 — Webhook Simulation

```powershell
realitydb simulate webhooks --source stripe --events 100 --seed 42 --output stripe-hooks.json
realitydb simulate webhooks --source github --events 50 --seed 42 --output github-hooks.json
```

**Expected:** Creates webhook event files. Stripe events have payment_intent, subscription, invoice types. GitHub events have push, pull_request, issues types.

### Test 11.5 — Different Profiles

```powershell
realitydb simulate run --profile api-service --events 1000 --seed 42 --output api-traffic.json
```

**Expected:** API traffic events with HTTP methods, status codes, latency values.

### Test 11.6 — Duration Override

```powershell
realitydb simulate run --profile saas-startup --events 200 --duration 1-hour --seed 42 --output hourly.json
```

**Expected:** Events compressed into a 1-hour window instead of the default 1-day.

---

## Phase 12: Cross-Feature Integration

### Test 12.1 — Full Pipeline

```powershell
realitydb reset --confirm
realitydb seed --template saas --timeline 6-months --lifecycle --scenario payment-failures --records 200 --seed 42
realitydb analyze --output full-template.json
realitydb capture --name full-test
realitydb export --format json --output ./full-export
realitydb mask --dry-run --mode strict
```

**Expected:** All commands work together. Timeline + lifecycle + scenario + analyze + capture + export + mask on the same dataset.

### Test 12.2 — CI Pipeline

```powershell
realitydb seed --template saas --records 50 --seed 42 --ci
realitydb scan --ci
realitydb analyze --ci
realitydb mask --dry-run --ci
realitydb simulate run --profile saas-startup --events 100 --seed 42 --ci
realitydb classroom list --ci
```

**Expected:** All commands output valid JSON in CI mode.

---

## Cleanup

```powershell
# Remove test files
Remove-Item -Force test-capture.realitydb-pack.json -ErrorAction SilentlyContinue
Remove-Item -Force test-pack.realitydb-pack.json -ErrorAction SilentlyContinue
Remove-Item -Force realitydb.template.json -ErrorAction SilentlyContinue
Remove-Item -Force auto-template.json -ErrorAction SilentlyContinue
Remove-Item -Force events.json, stream.ndjson, stripe-hooks.json, github-hooks.json, api-traffic.json, hourly.json -ErrorAction SilentlyContinue
Remove-Item -Force full-template.json, full-test.realitydb-pack.json -ErrorAction SilentlyContinue
Remove-Item -Force audit.json -ErrorAction SilentlyContinue
Remove-Item -Force *.scenario.json, *.course.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force test-export, test-export-csv, test-export-sql -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force test-generated, test-generated-csv -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force masked-data, masked-audit, full-export -ErrorAction SilentlyContinue

# Stop Docker
docker stop realitydb-test
docker rm realitydb-test
```

---

## Test Summary Checklist

| # | Area | Tests | Pass? |
|---|------|-------|-------|
| 1 | Version & Help | 1.1 | |
| 2 | Scan | 1.2 | |
| 3 | Seed (5 templates) | 1.3–1.5 | |
| 4 | Deterministic | 1.4 | |
| 5 | Export (JSON/CSV/SQL) | 1.6 | |
| 6 | CI Mode | 1.7 | |
| 7 | Reset | 1.8 | |
| 8 | Capture & Load | 2.1–2.3 | |
| 9 | Custom Templates | 3.1–3.4 | |
| 10 | Packs | 4.1–4.3 | |
| 11 | Timeline | 5.1 | |
| 12 | Scenarios (7 types) | 5.2–5.5 | |
| 13 | Lifecycle | 6.1 | |
| 14 | Data Science Generate | 7.1–7.2 | |
| 15 | Schema Analysis | 8.1–8.3 | |
| 16 | Data Masking | 9.1–9.6 | |
| 17 | Classroom | 10.1–10.7 | |
| 18 | Simulation | 11.1–11.6 | |
| 19 | Integration | 12.1–12.2 | |

**Total: 45+ test cases across 19 areas**
