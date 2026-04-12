# RealityDB CLI — Command Dictionary & Workflow Guide

> **Current Version:** 2.19.1 · **Published:** April 7, 2026
> **Install:** `npm install -g @realitydb/cli@latest`

---

## First: Update to Latest Version

If you see `error: unknown command 'simulate'` or similar, your CLI is outdated.

```bash
npm install -g @realitydb/cli@latest
realitydb --version
# Should show: 2.19.1 or higher
```

---

## Quick Reference — All 19 Commands

| Command | Tier | One-Line Description |
|---------|------|---------------------|
| `realitydb init` | Free | Create a new template from a preset |
| `realitydb run` | Free | Generate data to JSON, SQL, or CSV |
| `realitydb generate` | Free | Alias for `run` |
| `realitydb export` | Free | Alias for `run` (output required) |
| `realitydb scan` | Free | Reverse-engineer a live database into a template |
| `realitydb analyze` | Core | Sample live data for strategy suggestions |
| `realitydb seed` | Core | Generate + insert directly into PostgreSQL |
| `realitydb reset` | Core | Drop tables created by `seed` |
| `realitydb mask` | Core | Detect and mask PII in a database |
| `realitydb simulate` | Core | Generate data across a timeline with scenarios |
| `realitydb capture` | Core | Snapshot a database state for bug reproduction |
| `realitydb load` | Core | Restore a captured snapshot into a database |
| `realitydb pack` | Free | List template packs in current directory |
| `realitydb pack:info` | Free | Inspect a template pack |
| `realitydb pack:validate` | Free | Validate a template pack |
| `realitydb upgrade` | Free | Open Stripe checkout for Core plan |
| `realitydb audit` | Core | View operation history |
| `realitydb login` | Free | Authenticate with API key |
| `realitydb logout` | Free | Clear credentials |
| `realitydb status` | Free | Show current plan and features |

---

## Workflow 1: Generate Data from a Preset (Quickest Start)

**Use when:** You need test data fast and don't have an existing database.

```bash
# Step 1: Create a template from a preset
# Replace "saas" with: saas, ecommerce, healthcare, or education
realitydb init --domain saas --quick

# Step 2: Generate 5,000 rows to JSON
realitydb run --pack realitydb-saas-template.json --rows 5000 -o my-data.json

# Step 3: Or generate SQL (PostgreSQL-compatible)
realitydb run --pack realitydb-saas-template.json --rows 5000 --format sql --drop-tables -o my-data.sql

# Step 4: Or generate CSV (one file per table)
realitydb run --pack realitydb-saas-template.json --rows 5000 --format csv -o my-data-csv
```

**Reproducible output (same data every time):**
```bash
realitydb run --pack realitydb-saas-template.json --rows 5000 --seed 42 -o deterministic.json
```

---

## Workflow 2: Generate Data from Your Own Template

**Use when:** You have a RealityPack JSON file (exported from Studio or hand-crafted).

```bash
# Step 1: Inspect the template
realitydb pack:info --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH"

# Step 2: Validate it
realitydb pack:validate --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH"

# Step 3: Generate data
realitydb run \
  --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH" \
  --rows 10000 \
  --format sql \
  --drop-tables \
  -o "REPLACE_WITH_YOUR_OUTPUT_FILE_NAME.sql"
```

**Example with real paths:**
```bash
realitydb run \
  --pack "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" \
  --rows 10000 \
  --format sql \
  --drop-tables \
  -o banking-demo.sql
```

---

## Workflow 3: Reverse-Engineer an Existing Database

**Use when:** You have a PostgreSQL database and want to generate matching test data.

```bash
# Step 1: Scan the database to create a template
realitydb scan \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  -o scanned-template.json

# Step 2: (Optional) Analyze for real data distributions
realitydb analyze \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  -o analysis-report.json

# Step 3: Inspect what was found
realitydb pack:info --pack scanned-template.json

# Step 4: Generate data from the scanned template
realitydb run --pack scanned-template.json --rows 10000 --format sql -o test-data.sql
```

**Connection string format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE

# Local PostgreSQL:
postgresql://postgres:postgres@localhost:5432/mydb

# Supabase (use Session Pooler, port 5432):
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-west-2.pooler.supabase.com:5432/postgres

# Docker:
postgresql://postgres:postgres@localhost:54322/postgres
```

---

## Workflow 4: Seed Directly into a Database

**Use when:** You want data inserted directly — no SQL files. *(Core tier required)*

```bash
# Step 1: Seed with table creation (fresh database)
realitydb seed \
  --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH" \
  --rows 10000 \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --create-tables \
  --drop-tables \
  --batch-size 500

# Step 2: Verify
# Connect to your database and check row counts

# Step 3: Clean up when done
realitydb reset \
  --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH" \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --confirm
```

**Performance tip:** Use `--batch-size 500` or `--batch-size 1000` for large datasets. Default is 100.

---

## Workflow 5: Timeline Simulation with Scenarios

**Use when:** You need data that spans months with injected anomalies (fraud spikes, churn waves, etc.). *(Core tier required)*

```bash
# Step 1: See available scenarios
realitydb simulate --list-scenarios

# Output:
#   fraud-spike       — Concentrated burst of fraud alerts in a 2-week window
#   churn-wave        — 30% of subscriptions cancel in one month
#   holiday-rush      — 3x orders in Nov-Dec with a January drop
#   data-breach       — Mass password resets and audit log spike
#   seasonal-enrollment — Student registrations peak in Aug-Sep
#   payment-failures  — Payment failure rate jumps to 25%

# Step 2: Generate a 12-month timeline with a scenario
realitydb simulate \
  --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH" \
  --scenario fraud-spike \
  --timeline 12-months \
  --rows 50000 \
  --intensity high \
  --format sql \
  -o simulation.sql

# Step 3: Combine multiple scenarios
realitydb simulate \
  --pack "REPLACE_WITH_YOUR_TEMPLATE_FILE_PATH" \
  --scenario fraud-spike,payment-failures \
  --timeline 6-months \
  --rows 10000 \
  -o combined-crisis.json
```

**Timeline options:** `12-months`, `6-months`, `4-weeks`, `30-days`
**Intensity options:** `low` (1.5x), `medium` (3x), `high` (5x)

---

## Workflow 6: PII Masking for Compliance

**Use when:** Your staging database contains real customer data and you need to mask it. *(Core tier required)*

```bash
# Step 1: Dry run — see what would be masked (NO changes made)
realitydb mask \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --dry-run \
  --mode gdpr

# Step 2: Review the output — it shows every PII column detected

# Step 3: Apply masking with audit trail
realitydb mask \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --confirm \
  --mode gdpr \
  -o gdpr-audit-log.json \
  --seed 42
```

**Compliance modes:**
- `gdpr` — names, emails, phones, addresses, financial data
- `hipaa` — everything in GDPR + SSN, DOB, medical records
- `strict` — everything in HIPAA + IPs, usernames, passwords, notes

---

## Workflow 7: Bug Reproduction (Capture & Load)

**Use when:** You need to share a database state with a teammate for debugging. *(Core tier required)*

```bash
# Developer A: Capture the bug environment
realitydb capture \
  --name "REPLACE_WITH_BUG_ID" \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --safe

# This creates: REPLACE_WITH_BUG_ID.realitydb-pack.json
# The --safe flag masks PII before saving (safe to share via Slack/email)

# Developer B: Load the captured state
realitydb load \
  "REPLACE_WITH_BUG_ID.realitydb-pack.json" \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  --drop-tables \
  --confirm
```

---

## Workflow 8: Authentication & Plan Management

```bash
# Check your current plan
realitydb status

# Log in with your API key
realitydb login --api-key "REPLACE_WITH_YOUR_API_KEY_FROM_REALITYDB_DASHBOARD"

# Upgrade to Core ($49/month)
realitydb upgrade

# Log out
realitydb logout

# View operation history
realitydb audit
realitydb audit --since 2026-04-01
realitydb audit --command seed --limit 20
```

---

## Fixing Common Issues

### "error: unknown command 'simulate'"
Your CLI is outdated. Update:
```bash
npm install -g @realitydb/cli@latest
```

### Dates show "mock_past_date_248" instead of real dates
Your template has date/timestamp columns using the wrong strategy. The column strategy should be `timestamp`, not `text` or `random_string`.

**Fix in your template JSON:**
```json
// WRONG — generates garbage like "mock_past_date_248"
{ "name": "created_at", "strategy": "text" }

// RIGHT — generates real ISO timestamps
{ "name": "created_at", "strategy": "timestamp" }

// For dates that depend on another column:
{
  "name": "shipped_at",
  "strategy": "timestamp",
  "options": {
    "dependsOn": "created_at",
    "dependencyRule": "after"
  }
}
```

To fix an existing template, open the JSON file and change all date/time columns from `"strategy": "text"` to `"strategy": "timestamp"`.

Alternatively, scan your database fresh:
```bash
realitydb scan \
  --connection "REPLACE_WITH_YOUR_POSTGRESQL_CONNECTION_STRING" \
  -o fixed-template.json
```

The scan auto-detects timestamp columns and assigns the correct strategy.

### "Free tier limit exceeded"
You've used 50,000 rows this month. Options:
```bash
# Check your usage
realitydb status

# Upgrade to Core ($49/month, 500K rows)
realitydb upgrade
```

### "Cannot find module 'pg'"
The `seed`, `scan`, `analyze`, `mask`, `capture`, `load`, and `reset` commands need the PostgreSQL driver:
```bash
npm install -g pg
```

### Connection timeout on Supabase
Use the **Session Pooler** connection string (port 5432), NOT Direct Connection:
```
postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```
Find it in Supabase Dashboard → Settings → Database → Connection string → Session Pooler.

### Mojibake / garbled emoji in terminal
Set your terminal encoding:
```bash
# Windows PowerShell
chcp 65001

# Or run with Node directly
node path\to\dist\index.js run --pack template.json --rows 1000
```

---

## SQL Format Options

```bash
# Full SQL (CREATE TABLE + INSERT)
realitydb run --pack template.json --rows 5000 --format sql -o full.sql

# With DROP TABLE (idempotent — safe to run multiple times)
realitydb run --pack template.json --rows 5000 --format sql --drop-tables -o idempotent.sql

# Schema only (no data)
realitydb run --pack template.json --format sql --schema-only -o schema.sql

# Data only (no CREATE TABLE)
realitydb run --pack template.json --rows 5000 --format sql --data-only -o inserts.sql
```

---

## Pricing

| Tier | Price | Monthly Rows | Commands |
|------|-------|-------------|----------|
| **Free** | $0 | 50,000 | `init`, `run`, `generate`, `export`, `scan`, `pack`, `pack:info`, `pack:validate`, `upgrade`, `login`, `logout`, `status` |
| **Core** | $49/mo | 500,000 | Everything in Free + `seed`, `reset`, `mask`, `analyze`, `simulate`, `capture`, `load`, `audit` + lifecycle rules |

**Upgrade:** `realitydb upgrade` → instant Stripe checkout. No sales call.

**Lifecycle rules** (Core only) ensure state-machine correctness: cancelled orders have NULL shipped_at, planned interventions have NULL outcome_summary, etc. Free tier strips these rules with a warning.

---

*RealityDB CLI Command Dictionary v1.0*
*© 2026 Mpingo Systems LLC · npm: @realitydb/cli*
