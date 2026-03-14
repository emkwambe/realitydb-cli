# RealityDB

> Production-Fidelity Data. Zero Compliance Risk.

The only schema-aware engine that generates deterministic, production-scale environments for high-compliance engineering. Supports PostgreSQL and MySQL.

**Designed for SOC2 · GDPR · HIPAA development pipelines**

[![npm version](https://img.shields.io/npm/v/realitydb.svg)](https://www.npmjs.com/package/realitydb)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

```bash
# Install
npm install -g realitydb

# Interactive setup (recommended for first time)
realitydb init

# Or connect directly
realitydb scan                                    # Inspect your schema
realitydb seed --template saas --seed 42          # Populate with realistic data
realitydb reset --confirm                         # Clear and start fresh
```

## The Problem

Cloning production data into development environments is a multi-million dollar liability. Every copy of customer PII is a breach waiting to happen. Empty databases mean broken dashboards, untestable features, and demos that look like prototypes.

## The Solution

RealityDB reads your database schema, infers generation strategies for every column, and produces realistic synthetic data with correct foreign key relationships — in under a second. No real PII. Deterministic output. Works with any PostgreSQL or MySQL schema.

```
$ realitydb seed --template saas --records 500 --seed 42

Autonomous Schema Inference · 6 tables · 9 foreign keys

  organizations: 150 rows (8 industries)
  users:         500 rows (4 roles, 4 statuses)
  plans:         50 rows  (5 tiers)
  subscriptions: 600 rows (5 lifecycle states)
  invoices:      1500 rows (5 billing statuses)
  payments:      1500 rows (4 methods)

Seed complete. 4,300 rows in 0.4s · deterministic · FK-safe
```

## Database Support

| Database | Status | Connection String |
|----------|--------|-------------------|
| PostgreSQL | Full support | `postgres://user:pass@localhost:5432/mydb` |
| MySQL | Full support | `mysql://user:pass@localhost:3306/mydb` |

Auto-detected from connection string. No configuration needed.

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://user:pass@localhost:5432/mydb"
  }
}
```

## Domain Intelligence

Five industry templates with deep relational logic, lifecycle state machines, and statistically validated distributions.

### SaaS — Multi-Tenant Subscription Logic

Organization hierarchies · Role-based access · Tiered billing cycles · Invoice lifecycle · Payment method distribution

```bash
realitydb seed --template saas --records 500 --seed 42
```

### E-commerce — Full-Cycle Marketplace Simulation

Hierarchical category trees · Product catalog with ratings · Order fulfillment pipelines · Review authenticity signals

```bash
realitydb seed --template ecommerce --records 500 --seed 42
```

### Education — Multi-Tier SIS Dependency Mapping

Teacher-class-student relational chains · Grade distribution curves · Attendance state machines · Assignment type weighting

```bash
realitydb seed --template education --records 500 --seed 42
```

### Fintech — Audit-Ready Transactional Flows

Fraud-alert simulation · Validated settlement logic · Deterministic chargebacks · 12-category transaction classification

```bash
realitydb seed --template fintech --records 500 --seed 42
```

### Healthcare — HIPAA-Compliant Longitudinal Data

Clinical encounter coherence · Medication lifecycle tracking · Reproducible vitals history · Population-accurate blood type distribution

```bash
realitydb seed --template healthcare --records 500 --seed 42
```

## Core Capabilities

### Autonomous Schema Inference

Point RealityDB at any database — no template needed. It reads every table, column, foreign key, and constraint, then infers generation strategies automatically.

```bash
realitydb scan      # See what RealityDB discovers
realitydb seed      # Generate data using inference alone
```

### Reproducible State Engine

Same seed produces identical data across machines, environments, and time. Debug a specific data state. Share it with a teammate. Reproduce it in CI.

```bash
realitydb seed --seed 42    # Same output every time, everywhere
```

### Temporal Consistency & Audit Simulation

Data spans months with S-curve growth. Timestamps are causally coherent — subscriptions start after user signups. Audit trails look real.

```bash
realitydb seed --template saas --timeline 12-months --seed 42
```

### Lifecycle Simulation

Entities walk through realistic state machines. A "canceled" user has a failed payment, a canceled subscription, and a `canceled_at` timestamp — all consistent.

```bash
realitydb seed --template saas --lifecycle --seed 42
```

### Controlled Anomaly Injection

Inject payment failures, churn spikes, fraud patterns, data quality issues, system outages, and migration artifacts at configurable intensity levels.

```bash
realitydb seed --template saas --scenario payment-failures --scenario-intensity high
realitydb seed --template saas --scenario "fraud-spike,churn-spike" --scenario-intensity medium
realitydb seed --template saas --timeline 12-months --scenario-schedule "fraud-spike:month-6,churn-spike:month-9"
```

| Scenario | Description |
|----------|-------------|
| `payment-failures` | Failed/declined payment patterns |
| `churn-spike` | Subscription cancellation surge |
| `fraud-spike` | Suspicious transaction patterns |
| `data-quality` | Nulls, duplicates, encoding issues |
| `seasonal-traffic` | Holiday/weekend traffic peaks |
| `data-migration` | Format changes, encoding artifacts |
| `system-outage` | Data gap followed by recovery burst |

### PII Detection & Masking

Scan existing databases for personally identifiable information. Three compliance modes with audit logs.

```bash
realitydb mask --dry-run                          # Preview PII detection
realitydb mask --output ./masked --mode gdpr      # Export masked data
realitydb mask --confirm --mode hipaa             # Mask in-place
```

### Environment Reproduction

Capture a live database state into a portable Reality Pack. Share it. Load it on another machine. Bug reproduction in one command.

```bash
realitydb capture --name bug-4821
realitydb load bug-4821.realitydb-pack.json --confirm
```

### Schema Analysis & Custom Templates

Auto-generate a template from any schema, then enrich it with your domain knowledge.

```bash
realitydb analyze --output my-template.json       # Generate from schema
realitydb seed --template ./my-template.json      # Use custom template
```

### DB-Free Generation

Generate data without a database connection. Parse SQL schema files and export directly.

```bash
realitydb generate --records 1000000 --format csv --seed 42
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Seed test data
  run: npx realitydb seed --ci --template saas --records 500 --seed 42
```

The `--ci` flag outputs structured JSON and uses proper exit codes.

## Init Wizard

First-time setup with guided prompts:

```bash
realitydb init
```

The wizard walks you through:
1. Database connection (PostgreSQL or MySQL)
2. Schema discovery
3. Template auto-detection
4. Configuration file generation
5. Optional first seed

## Configuration

Create `realitydb.config.json` (or run `realitydb init`):

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://user:pass@localhost:5432/mydb"
  },
  "seed": {
    "defaultRecords": 100,
    "batchSize": 500,
    "randomSeed": 42
  }
}
```

MySQL:

```json
{
  "database": {
    "client": "mysql",
    "connectionString": "mysql://user:pass@localhost:3306/mydb"
  }
}
```

## All Commands

| Command | Description |
|---------|-------------|
| `realitydb init` | Interactive setup wizard |
| `realitydb scan` | Inspect database schema |
| `realitydb seed` | Generate and insert realistic data |
| `realitydb reset --confirm` | Clear all seeded data |
| `realitydb export` | Export to JSON/CSV/SQL files |
| `realitydb analyze` | Auto-detect column strategies |
| `realitydb generate` | DB-free generation from SQL schema |
| `realitydb mask` | PII detection and masking |
| `realitydb capture` | Snapshot database to Reality Pack |
| `realitydb load` | Load a Reality Pack |
| `realitydb share` | Share Reality Pack info |
| `realitydb pack export/import` | Reality Pack operations |
| `realitydb templates` | List/init/validate templates |
| `realitydb scenarios` | List/create scenarios |
| `realitydb classroom` | SQL courses and exercises |
| `realitydb simulate` | Behavior simulation and webhooks |

## Requirements

- Node.js 20+
- PostgreSQL 14+ or MySQL 8+

## Links

- **Website:** [realitydb.dev](https://realitydb.dev)
- **npm:** [npmjs.com/package/realitydb](https://www.npmjs.com/package/realitydb)
- **GitHub:** [github.com/emkwambe/databox](https://github.com/emkwambe/databox)

## License

MIT — [Mpingo Systems](https://github.com/emkwambe)
