# RealityDB CLI Documentation

> **Version 2.19.0** · Causally-correct synthetic data for developers
> 
> BSL-1.1 License · © 2026 Mpingo Systems LLC

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Pricing & Tiers](#pricing--tiers)
5. [Commands Reference](#commands-reference)
   - [init](#init)
   - [run](#run)
   - [generate](#generate)
   - [export](#export)
   - [seed](#seed)
   - [scan](#scan)
   - [analyze](#analyze)
   - [reset](#reset)
   - [mask](#mask)
   - [simulate](#simulate)
   - [capture](#capture)
   - [load](#load)
   - [pack](#pack)
   - [pack:info](#packinfo)
   - [pack:validate](#packvalidate)
   - [upgrade](#upgrade)
   - [audit](#audit)
   - [login / logout / status](#login--logout--status)
6. [Template Formats](#template-formats)
7. [Generation Strategies](#generation-strategies)
8. [Lifecycle Rules](#lifecycle-rules)
9. [Workflows](#workflows)
10. [Performance](#performance)
11. [Ecosystem](#ecosystem)
12. [Troubleshooting](#troubleshooting)

---

## Overview

RealityDB generates synthetic data where cancelled orders have `NULL shipped_at`, every foreign key points to a real parent row, and `--seed 42` gives identical output on every machine, every time.

**What makes RealityDB different from other data generators:**

- **FK integrity** — tables are seeded in topological (dependency) order. Every foreign key reference points to a real parent row. Zero orphans at 2M+ rows, guaranteed.
- **Lifecycle rules** — state machines are enforced. A cancelled order never has a shipped_at date. A trial subscription started after signup. A closed account has no pending transactions. *(Core tier)*
- **Temporal ordering** — `shipped_at` is always after `created_at`. `delivered_at` is always after `shipped_at`. Timestamps follow causal chains, not random generation.
- **Weighted distributions** — 95% of orders are delivered, 5% cancelled. Not uniform random. Production-realistic ratios derived from real data patterns.
- **Deterministic** — `--seed 42` produces the exact same dataset on every machine, every run, every environment. CI-native debugging built in.

---

## Installation

```bash
npm install -g @realitydb/cli
```

Requires Node.js 20+.

Verify installation:

```bash
realitydb --version
realitydb status
```

---

## Quick Start

```bash
# 1. Create a template from a preset
realitydb init --domain saas --quick

# 2. Generate 5,000 rows to a JSON file
realitydb run --pack realitydb-saas-template.json --rows 5000 -o saas-data.json

# 3. Generate SQL with CREATE TABLE + INSERT
realitydb run --pack realitydb-saas-template.json --rows 5000 --format sql --drop-tables -o saas.sql

# 4. Seed directly into PostgreSQL (Core tier)
realitydb seed --pack realitydb-saas-template.json --rows 5000 \
  --connection postgresql://user:pass@localhost:5432/mydb \
  --create-tables --drop-tables
```

---

## Pricing & Tiers

| Tier | Price | Monthly Rows | Overage | Key Features |
|------|-------|-------------|---------|-------------|
| **Free** | $0 | 50,000 | — | `--seed`, FK integrity, temporal ordering, all templates, `generate`, `run`, `export`, `init`, `scan`, `pack` |
| **Core** | $49/mo | 500,000 | $20 per 1M rows | Everything in Free + lifecycle rules, `seed`, `mask`, `simulate`, `capture`, `load`, `analyze`, `audit`, `reset` |

**Lifecycle rules are the primary upgrade trigger.** Free tier users encounter them naturally when they need state-machine-correct test data (e.g., cancelled orders without shipped_at). The upgrade is self-serve via `realitydb upgrade` — no sales call required.

**Monthly usage tracking:** Row usage is tracked cumulatively per calendar month. The counter resets on the 1st of each month. Usage is stored locally at `~/.realitydb/usage.json`.

---

## Commands Reference

### init

Create a new RealityDB template interactively or from a preset.

```bash
# Interactive mode
realitydb init

# Quick mode with preset
realitydb init --domain saas --quick
realitydb init --domain ecommerce -o my-store.json --quick
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --domain <type>` | Preset: `saas`, `ecommerce`, `healthcare`, `education` | — |
| `-o, --output <file>` | Output file path | `realitydb-{domain}-template.json` |
| `--quick` | Skip interactive prompts | — |

**Presets:**

| Domain | Tables | Description |
|--------|--------|-------------|
| `saas` | 6 | Organizations, users, plans, subscriptions, invoices, sessions |
| `ecommerce` | 6 | Customers, products, orders, order_items, payments, reviews |
| `healthcare` | 6 | Facilities, providers, patients, encounters, diagnoses, billing |
| `education` | 6 | Departments, teachers, courses, students, enrollments, grades |

Interactive mode also supports "Custom" which creates a minimal starter template.

---

### run

Generate synthetic data from a RealityPack template.

```bash
realitydb run --pack template.json --rows 5000
realitydb run --pack template.json --rows 10000 --format sql --drop-tables -o output.sql
realitydb run --pack template.json --rows 5000 --format csv
realitydb run --pack template.json --rows 5000 --seed 42
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --pack <file>` | RealityPack JSON file *(required)* | — |
| `-r, --rows <number>` | Total rows to generate | `10000` |
| `-o, --output <file>` | Output file path | auto-generated |
| `-f, --format <type>` | `json`, `sql`, or `csv` | `json` |
| `-s, --seed <number>` | Deterministic seed | random |
| `--drop-tables` | Include `DROP TABLE IF EXISTS` (SQL only) | — |
| `--schema-only` | Output only `CREATE TABLE` (SQL only) | — |
| `--data-only` | Output only `INSERT` statements (SQL only) | — |

**Format details:**

- **JSON** — Streaming output. Handles 2M+ rows without memory issues. Single file with `meta` and `data` sections.
- **SQL** — PostgreSQL-compatible. Includes `CREATE TABLE` with FK constraints and batched `INSERT` statements (100 rows per INSERT). Add `--drop-tables` for idempotent scripts.
- **CSV** — Creates a directory with one `.csv` file per table. Each file has headers.

**Tier limits:** Free tier: 50,000 rows/month cumulative. Core tier: 500,000 rows/month.

---

### generate

Alias for `run`. Identical behavior and options.

```bash
realitydb generate --pack template.json --rows 5000 -o data.json
```

---

### export

Alias for `run` with `--output` required. Ensures you always specify where the file goes.

```bash
realitydb export --pack template.json --rows 5000 --format sql -o output.sql
```

---

### seed

*(Core tier)* Generate data and insert directly into a PostgreSQL database.

```bash
realitydb seed --pack template.json --rows 5000 \
  --connection postgresql://user:pass@localhost:5432/mydb \
  --create-tables --drop-tables

# Custom batch size for performance tuning
realitydb seed --pack template.json --rows 100000 \
  --connection postgresql://... --batch-size 1000 --create-tables
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --pack <file>` | RealityPack JSON file *(required)* | — |
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `-r, --rows <number>` | Total rows to generate | `10000` |
| `--create-tables` | Create tables from pack schema before inserting | — |
| `--drop-tables` | Drop and recreate tables before inserting | — |
| `--batch-size <number>` | Rows per INSERT batch | `100` |
| `-s, --seed <number>` | Deterministic seed | random |

**Performance benchmarks:**

| Dataset | Tables | Rows | Batch Size | Insert Speed |
|---------|--------|------|-----------|-------------|
| Restaurant | 14 | 1K | 100 | 3,582 rows/sec |
| Restaurant | 14 | 50K | 500 | 5,593 rows/sec |
| Supply Chain | 24 | 100K | 1000 | 13,022 rows/sec |

Larger batch sizes improve throughput. For 50K+ rows, use `--batch-size 500` or `1000`.

---

### scan

Reverse-engineer a live PostgreSQL database into a RealityPack template.

```bash
realitydb scan --connection postgresql://user:pass@localhost:5432/mydb -o scanned.json
realitydb scan --connection postgresql://... --schema myschema -o scanned.json
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `-o, --output <file>` | Output file path | auto-generated |
| `--schema <name>` | PostgreSQL schema to scan | `public` |

**What it detects:**

- All tables in the schema
- Column names, types, and constraints
- Primary keys
- Foreign key relationships
- Estimated row counts

**Strategy inference:** The scan command infers generation strategies from column names and types: `email` columns get the `email` strategy, `status` columns get `enum`, `price` columns get `float` with appropriate ranges, etc.

**Output format:** Studio v4.3.0 JSON — compatible with both the CLI and RealityDB Studio. Tables include auto-grid positions for visual layout.

**Round-trip verified:** You can scan a database, generate data from the scanned pack, and seed it back. The schema structure, FK relationships, and data types are preserved exactly.

---

### analyze

*(Core tier)* Sample live data to suggest optimal generation strategies with real distributions.

```bash
realitydb analyze --connection postgresql://user:pass@localhost:5432/mydb -o strategies.json
realitydb analyze --connection postgresql://... --sample 200 --table customers
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `-o, --output <file>` | Save strategy report to file | — |
| `--schema <name>` | PostgreSQL schema | `public` |
| `--sample <number>` | Sample size per table | `100` |
| `--table <name>` | Analyze a single table | — |

**What it detects (that scan doesn't):**

- Enum distributions with real weights (e.g., `active: 85%, frozen: 11%, closed: 4%`)
- Numeric ranges from actual min/max values
- Email and phone patterns from data content
- Boolean column detection
- UUID patterns
- Null rate per column
- Confidence level per suggestion (high/medium/low)

Use `analyze` to enrich a scanned pack with data-driven strategies for more realistic generation.

---

### reset

*(Core tier)* Drop tables that were created by `seed`.

```bash
# Preview what would be dropped (safe default)
realitydb reset --pack template.json --connection postgresql://...

# Actually drop tables
realitydb reset --pack template.json --connection postgresql://... --confirm
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --pack <file>` | RealityPack JSON file *(required)* | — |
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `--confirm` | Actually drop the tables | — |

Tables are dropped in reverse FK order (children first, parents last) using `CASCADE`.

Without `--confirm`, the command only shows what would be dropped — safe by default.

---

### mask

*(Core tier)* Scan a database for PII and replace it with realistic fakes.

```bash
# Dry run — see what would be masked (no changes)
realitydb mask --connection postgresql://... --dry-run --mode gdpr

# Apply masking with audit log
realitydb mask --connection postgresql://... --confirm --mode gdpr -o audit.json --seed 42
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `--mode <type>` | Compliance mode: `gdpr`, `hipaa`, `strict` | `gdpr` |
| `--dry-run` | Scan only, show detections | — |
| `--confirm` | Apply masking to database | — |
| `-o, --output <file>` | Save audit log to file | — |
| `--schema <name>` | PostgreSQL schema | `public` |
| `-s, --seed <number>` | Deterministic seed | random |

**Safety:** One of `--dry-run`, `--confirm`, or `--output` is required. The command never modifies data silently.

**16 PII categories detected:**

| Category | Compliance Level | Replacement |
|----------|-----------------|-------------|
| Full Name | GDPR | Realistic fake names |
| Email | GDPR | `user{n}@example.com` |
| Phone | GDPR | Formatted fake numbers |
| Address | GDPR | Generic addresses |
| City | GDPR | Common city names |
| Postal Code | GDPR | Valid format codes |
| Credit Card | GDPR | Masked format `****-****-****-XXXX` |
| Bank Account | GDPR | Masked format |
| SSN | HIPAA | Partial mask `***-**-XXXX` |
| Date of Birth | HIPAA | Randomized dates |
| Medical Record | HIPAA | Formatted IDs |
| IP Address | STRICT | Private range IPs |
| Username | STRICT | Generic usernames |
| Password Hash | STRICT | `[REDACTED]` |
| Notes/Comments | STRICT | Compliance notice |
| Device ID | STRICT | Formatted device IDs |

**Compliance modes:**

- **GDPR** — Detects personal data (names, emails, phones, addresses, financial)
- **HIPAA** — Everything in GDPR + protected health information (SSN, DOB, medical records)
- **STRICT** — Everything in HIPAA + operational data (IPs, usernames, passwords, notes, device IDs)

---

### simulate

*(Core tier)* Generate data across a timeline with scenario injection.

```bash
# List available scenarios
realitydb simulate --list-scenarios

# 12-month timeline with fraud spike
realitydb simulate --pack template.json --scenario fraud-spike \
  --timeline 12-months --rows 10000 --intensity high --format sql -o simulation.sql

# Multiple scenarios combined
realitydb simulate --pack template.json --scenario fraud-spike,payment-failures \
  --timeline 6-months --rows 5000 -o crisis.json
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --pack <file>` | RealityPack JSON file | — |
| `--scenario <names>` | Comma-separated scenario names | — |
| `--timeline <duration>` | Duration: `12-months`, `6-months`, `4-weeks`, `30-days` | `12-months` |
| `-r, --rows <number>` | Total rows to generate | `10000` |
| `-o, --output <file>` | Output file path | auto-generated |
| `-f, --format <type>` | `json` or `sql` | `json` |
| `--intensity <level>` | `low`, `medium`, `high` | `medium` |
| `-s, --seed <number>` | Deterministic seed | random |
| `--list-scenarios` | List all available scenarios | — |

**Built-in scenarios:**

| Scenario | Description | Affected Tables |
|----------|-------------|----------------|
| `fraud-spike` | 60% of fraud alerts in a 2-week window, elevated risk scores | fraud_alerts, fraud-related |
| `churn-wave` | 30% of subscriptions cancel in one month | subscriptions, accounts |
| `holiday-rush` | 50% of orders in Nov-Dec with higher values | orders, order-related |
| `data-breach` | Audit log spike + mass security alerts in 3-day window | audit_logs, notifications |
| `seasonal-enrollment` | 65% of student registrations in Aug-Sep | students, enrollments |
| `payment-failures` | Payment failure rate jumps to 25% in a 1-month window | payments, transactions |

**Timeline distribution:** Timestamps follow an S-curve (sigmoid) distribution — growth starts slow, accelerates in the middle, then plateaus. This produces more realistic temporal patterns than uniform random distribution.

**Intensity levels:** `low` = 1.5x multiplier, `medium` = 3x, `high` = 5x on the affected metrics.

---

### capture

*(Core tier)* Snapshot a live database state into a portable file for bug reproduction.

```bash
# Capture with PII masking (safe to share)
realitydb capture --name bug-4821 \
  --connection postgresql://user:pass@localhost:5432/mydb --safe

# Capture specific tables only
realitydb capture --name bug-4821 --connection postgresql://... \
  --tables customers,orders,payments --limit 500
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --name <id>` | Bug identifier *(required)* | — |
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `--safe` | Mask PII in captured data | — |
| `--schema <name>` | PostgreSQL schema | `public` |
| `--tables <list>` | Comma-separated table names | all tables |
| `--limit <number>` | Max rows per table | `1000` |

**Output:** `{name}.realitydb-pack.json` — contains schema definition + actual row data. Share this file with a colleague for instant bug reproduction.

**Safe mode:** When `--safe` is enabled, PII columns (names, emails, phones, SSNs, etc.) are automatically masked in the captured data before writing the file. Safe to share via Slack, email, or git.

---

### load

*(Core tier)* Restore a captured RealityDB pack into a database.

```bash
# Preview what would be loaded
realitydb load bug-4821.realitydb-pack.json --connection postgresql://...

# Load with table recreation
realitydb load bug-4821.realitydb-pack.json --connection postgresql://... \
  --drop-tables --confirm
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `<file>` | RealityDB pack file to load *(required)* | — |
| `-c, --connection <url>` | PostgreSQL connection string *(required)* | — |
| `--confirm` | Confirm data insertion | — |
| `--drop-tables` | Drop and recreate tables before loading | — |

Without `--confirm`, shows what would be loaded without making changes.

---

### pack

List RealityDB pack files in the current directory.

```bash
realitydb pack
```

Searches for JSON files containing `realitydb`, `template`, `pack`, or `schema` in the filename. Shows name, version, table count, and relationship count for each.

---

### pack:info

Show detailed information about a RealityDB pack.

```bash
realitydb pack:info --pack template.json
```

Displays: table names, column counts, primary keys, foreign keys, enum values, and validation status. Confirms whether the pack is ready for generation.

---

### pack:validate

Validate a RealityDB pack file for errors and warnings.

```bash
realitydb pack:validate --pack template.json
```

**Checks:**

- Tables exist and have columns
- No duplicate table names
- Primary keys present
- FK targets exist in the pack
- Enum strategies have values defined
- All columns have strategies assigned

Returns exit code 1 if errors found (useful for CI pipelines).

---

### upgrade

Open the Stripe checkout page for plan upgrade.

```bash
realitydb upgrade
realitydb upgrade --plan team
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--plan <type>` | `pro`, `team`, `enterprise` | `pro` |

Opens the payment page in your default browser. After purchasing, authenticate with your new API key: `realitydb login --api-key <key>`.

---

### audit

View operation history.

```bash
realitydb audit
realitydb audit --since 2026-04-01
realitydb audit --command seed --limit 20
realitydb audit --clear
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--since <date>` | Show entries since date (YYYY-MM-DD) | — |
| `--command <cmd>` | Filter by command name | — |
| `--limit <number>` | Max entries to show | `50` |
| `--clear` | Clear the audit log | — |

Audit log is stored locally at `~/.realitydb/audit.log`.

---

### login / logout / status

Manage authentication.

```bash
# Authenticate
realitydb login --api-key rdb_your_key_here

# Check current status
realitydb status
realitydb status --json  # Machine-readable output

# Log out
realitydb logout
```

Credentials are stored at `~/.realitydb/license.json`.

---

## Template Formats

The CLI supports two template formats, auto-detected on load.

### Studio v4.3.0 Format

Exported from RealityDB Studio. Tables as array with explicit IDs and `fkTarget` references.

```json
{
  "version": "4.3.0",
  "tables": [
    {
      "id": "tbl-01",
      "name": "orders",
      "columns": [
        {
          "id": "tbl-01-c1",
          "name": "id",
          "type": "uuid",
          "isPK": true,
          "strategy": "uuid"
        },
        {
          "id": "tbl-01-c2",
          "name": "customer_id",
          "type": "uuid",
          "isFK": true,
          "fkTarget": { "tableId": "tbl-02", "columnId": "tbl-02-c1" }
        },
        {
          "id": "tbl-01-c3",
          "name": "status",
          "type": "string",
          "strategy": "enum",
          "options": {
            "values": ["delivered", "shipped", "cancelled"],
            "weights": [60, 30, 10],
            "lifecycleRules": [
              { "value": "cancelled", "nullFields": ["shipped_at", "delivered_at"] }
            ]
          }
        }
      ],
      "position": { "x": 0, "y": 0 }
    }
  ],
  "relationships": [
    {
      "id": "rel-01",
      "sourceTableId": "tbl-02",
      "sourceColumnId": "tbl-02-c1",
      "targetTableId": "tbl-01",
      "targetColumnId": "tbl-01-c2",
      "type": "one-to-many"
    }
  ]
}
```

### CLI Object Format

Tables as an object keyed by name with `foreignKey` references.

```json
{
  "name": "restaurant",
  "tables": {
    "orders": {
      "columns": {
        "id": { "strategy": "uuid" },
        "customer_id": {
          "strategy": "uuid",
          "foreignKey": { "table": "customers", "column": "id" }
        },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["delivered", "cancelled"],
            "weights": [95, 5]
          }
        }
      }
    }
  }
}
```

Both formats are normalized internally by the engine. The Studio format is recommended for new templates as it includes positions for visual layout.

---

## Generation Strategies

| Strategy | Output Example | Options |
|----------|---------------|---------|
| `uuid` | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | — |
| `enum` | `"delivered"` | `values`, `weights`, `lifecycleRules` |
| `integer` | `42` | `min`, `max` |
| `float` | `19.99` | `min`, `max` |
| `timestamp` | `2026-01-15T08:30:00.000Z` | `dependsOn`, `dependencyRule` |
| `email` | `alex4821@gmail.com` | — |
| `company_name` | `"Harbor Grill"` | — |
| `full_name` | `"Maria Garcia"` | — |
| `phone` | `+12025551234` | — |
| `boolean` | `true` | — |
| `text` | `"mock_text_abc123"` | — |
| `random_string` | `"xK9mP2qR"` | — |

---

## Lifecycle Rules

*(Core tier feature)*

Lifecycle rules enforce state-machine logic in generated data. They ensure that certain columns are set to `NULL` when a row is in a specific state.

**Example:** A cancelled order should never have a `shipped_at` or `delivered_at` timestamp.

```json
{
  "name": "status",
  "strategy": "enum",
  "options": {
    "values": ["delivered", "shipped", "processing", "cancelled"],
    "weights": [60, 20, 15, 5],
    "lifecycleRules": [
      { "value": "cancelled", "nullFields": ["shipped_at", "delivered_at"] },
      { "value": "processing", "nullFields": ["shipped_at", "delivered_at"] }
    ]
  }
}
```

**How it works:** When the engine generates a row and the `status` column is `"cancelled"`, it automatically sets `shipped_at` and `delivered_at` to `NULL` — regardless of what the timestamp strategy would have generated.

**On Free tier:** Lifecycle rules are silently stripped from templates. The CLI shows a warning: "4 lifecycle rule(s) skipped (Core feature). Cancelled orders may have shipped_at values."

---

## Workflows

### New Project Setup

```bash
realitydb init --domain ecommerce --quick
realitydb run --pack realitydb-ecommerce-template.json --rows 5000 --format sql -o seed.sql
psql -d mydb -f seed.sql
```

### Reverse-Engineer Existing Database

```bash
realitydb scan --connection postgresql://... -o my-schema.json
realitydb analyze --connection postgresql://... -o strategies.json
# Edit my-schema.json with strategy suggestions from strategies.json
realitydb run --pack my-schema.json --rows 10000 -o data.json
```

### Bug Reproduction

```bash
# Developer A captures the bug
realitydb capture --name bug-4821 --connection postgresql://... --safe

# Developer B reproduces it
realitydb load bug-4821.realitydb-pack.json --connection postgresql://... --drop-tables --confirm
```

### CI/CD Pipeline

```bash
# In your CI script
realitydb run --pack test-data.json --rows 1000 --seed 42 --format sql -o seed.sql
psql -d test_db -f seed.sql
npm test
```

The `--seed 42` ensures identical data on every CI run. Share seeds in PR comments for reproducible bugs.

### GDPR Compliance

```bash
# Dry run first
realitydb mask --connection postgresql://staging-db... --dry-run --mode gdpr

# Apply masking with audit trail
realitydb mask --connection postgresql://staging-db... --confirm --mode gdpr -o audit.json
```

### Load Testing

```bash
# Generate a large dataset
realitydb simulate --pack template.json --rows 500000 --timeline 12-months --format sql -o load-test.sql

# Seed directly
realitydb seed --pack template.json --rows 500000 --connection postgresql://... --batch-size 1000
```

### AI-Powered Schema Design

1. Open RealityDB Studio at `studio.realitydb.dev`
2. Click "Generate with AI"
3. Describe your domain: "Hospital management system with patients, doctors, appointments, billing"
4. Select complexity: Simple / Standard / Complex
5. AI generates a full schema with tables, FKs, enums, lifecycle rules
6. Export as Studio Pack or RealityDB Template
7. Run: `realitydb run --pack exported-schema.json --rows 10000`

---

## Performance

Generation benchmarks (Node.js 22, Windows 11):

| Dataset | Tables | Rows | Format | Time | Speed |
|---------|--------|------|--------|------|-------|
| Restaurant | 14 | 5K | JSON | 0.04s | 125,000 rows/sec |
| Restaurant | 14 | 2M | JSON | 9.5s | 210,000 rows/sec |
| Restaurant | 14 | 2M | SQL | 10.8s | 185,000 rows/sec |
| Supply Chain | 24 | 5K | SQL | 0.10s | 50,000 rows/sec |
| Supply Chain | 24 | 2M | JSON | 29.5s | 68,000 rows/sec |
| Banking | 16 | 10K | SQL | 0.26s | 38,462 rows/sec |

Seeding benchmarks (PostgreSQL via pg driver):

| Dataset | Tables | Rows | Batch Size | Insert Speed |
|---------|--------|------|-----------|-------------|
| Restaurant | 14 | 50K | 500 | 5,593 rows/sec |
| Supply Chain | 24 | 100K | 1000 | 13,022 rows/sec |

All benchmarks include FK resolution, lifecycle rules, and weighted distributions.

---

## Ecosystem

| Product | URL | Description |
|---------|-----|-------------|
| **CLI** | [npm](https://www.npmjs.com/package/@realitydb/cli) | Command-line tool for data generation |
| **Engine** | [GitHub](https://github.com/emkwambe/databox/tree/main/packages/engine) | Standalone generation engine (zero Node.js deps, runs in Workers/browser) |
| **Sandbox** | [sandbox.realitydb.dev](https://sandbox.realitydb.dev) | Browser-based SQL learning with 19 industry templates |
| **Studio** | [studio.realitydb.dev](https://studio.realitydb.dev) | Visual schema designer with AI generation (internal preview) |

---

## Troubleshooting

**"Cannot find module 'pg'"**
The `seed`, `scan`, `analyze`, `mask`, `capture`, `load`, and `reset` commands require the `pg` PostgreSQL driver. Install it globally or in your project: `npm install pg`.

**Connection timeout when scanning Supabase**
Use the Session Pooler connection string (port 5432) instead of Direct Connection (which may use IPv6). Find it in Supabase Dashboard → Settings → Database → Connection string.

**"Free tier limit exceeded"**
Monthly cumulative row usage exceeded 50,000. Usage resets on the 1st of each month. Upgrade to Core ($49/mo) for 500,000 rows/month: `realitydb upgrade`.

**Lifecycle rules not working**
Lifecycle rules are a Core tier feature. On Free tier, they are silently stripped with a warning. Upgrade to Core for state-machine enforcement.

**Mojibake in console output**
If emojis display as garbled characters, set your terminal encoding: `chcp 65001` (Windows) or ensure your terminal supports UTF-8.

**"Module not found" errors**
Run from the CLI's installation directory or ensure `@realitydb/cli` is installed globally: `npm install -g @realitydb/cli`.

---

*RealityDB CLI v2.19.0 · BSL-1.1 License · © 2026 Mpingo Systems LLC*

*GitHub: [github.com/emkwambe/databox](https://github.com/emkwambe/databox) · NPM: [@realitydb/cli](https://www.npmjs.com/package/@realitydb/cli)*
