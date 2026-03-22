# RealityDB

> Production-Fidelity Data. Zero Compliance Risk.

The only schema-aware engine that generates deterministic, production-scale environments for high-compliance engineering. Supports PostgreSQL and MySQL.

**Designed for SOC2 - GDPR - HIPAA development pipelines**

[![npm version](https://img.shields.io/npm/v/realitydb.svg)](https://www.npmjs.com/package/realitydb)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

```bash
# Install
npm install -g realitydb

# Interactive setup (recommended for first time)
realitydb init

# Or connect and seed in one command
realitydb run --pack my-template.json --connection postgresql://user:pass@host:5432/db --records 5000
```

## Platform

| Product | URL | Description |
|---------|-----|-------------|
| **CLI** | `npm install -g realitydb` | Generate production-realistic data from templates |
| **Studio** | [studio.realitydb.dev](https://studio.realitydb.dev) | Visual schema designer with AI Schema Architect |
| **Sandbox** | [sandbox.realitydb.dev](https://sandbox.realitydb.dev) | Browser-based SQL playground with auto-grading |

## Built-in Templates

| Template | Tables | Description |
|----------|--------|-------------|
| `saas` | 10 | SaaS platform: organizations, users, plans, features, subscriptions, invoices, payments, sessions, events |
| `ecommerce` | 12 | E-commerce: customers, products, orders, payments, refunds, disputes, shipments, sessions, cart items, reviews |
| `fintech` | 10 | Financial platform: accounts, transactions, transfers, cards, authorizations, settlements, fraud alerts, investigations, compliance |
| `healthcare` | 13 | Healthcare network: patients, providers, encounters, diagnoses, procedures, prescriptions, labs, vitals, billing, insurance claims |
| `education` | 6 | K-12 school system: teachers, classes, students, enrollments, grades, attendance |

## Commands

### Setup

```bash
# Interactive wizard - connect, scan, and seed in one step
realitydb init

# Scan your database schema
realitydb scan

# Analyze schema and suggest column strategies
realitydb analyze
```

### Data Generation

```bash
# Seed database with generated data
realitydb seed --records 5000 --template saas

# Seed with timeline simulation (growth over time)
realitydb seed --records 10000 --template ecommerce --timeline 12-months

# Seed with scenarios (fraud spikes, churn events)
realitydb seed --records 5000 --template fintech --scenario fraud-spike --scenario-intensity high

# Reset seeded data
realitydb reset
```

### Schema-to-Data Pipeline

```bash
# Create schema and seed from a Studio-exported template
realitydb run --pack my-template.json --connection postgresql://user:pass@host/db --records 1000

# Dry run - see what would be created
realitydb run --pack my-template.json --connection postgresql://user:pass@host/db --dry-run
```

### Data Export

```bash
# Export as JSON
realitydb export --format json --output ./data --template saas --records 5000

# Export as CSV
realitydb export --format csv --output ./data --template ecommerce --records 10000

# Export as SQL with CREATE TABLE DDL + batched INSERTs
realitydb export --format sql --output ./data --template saas --records 5000

# Control batch size (rows per INSERT statement, default: 50)
realitydb export --format sql --template saas --records 5000 --batch-size 100

# Export with timeline
realitydb export --format csv --template fintech --records 50000 --timeline 24-months
```

SQL export includes a file header (template, seed, timestamp), CREATE TABLE statements scoped to template tables in FK dependency order, and batched `INSERT INTO ... VALUES` statements.

### Data Science Mode

```bash
# Generate large-scale datasets (no database required)
realitydb generate --records 1000000 --format csv

# Generate from your SQL schema
realitydb generate --schema schema.sql --records 100000 --format parquet

# Generate from JSON schema with distribution controls
realitydb generate --schema custom.json --records 500000 --correlations --seed 42
```

### Reality Packs

```bash
# Capture live database state into a Reality Pack
realitydb capture --output ./packs

# Export generated data as Reality Pack
realitydb pack export --template saas --records 5000 --name saas-demo --output ./packs

# Load a Reality Pack into a database
realitydb load ./packs/saas-demo.realitydb-pack.json

# Share pack info
realitydb share ./packs/saas-demo.realitydb-pack.json

# Browse available packs
realitydb packs
```

### Privacy & Compliance

```bash
# Detect and mask PII in your database
realitydb mask --strategy redact

# Audit log operations
realitydb audit
```

### Templates & Scenarios

```bash
# List available templates
realitydb templates

# List available scenarios
realitydb scenarios

# Simulate system behavior
realitydb simulate
```

### Classroom Mode

```bash
# Manage classroom courses and assignments
realitydb classroom
```

## Dogfood Pipeline

RealityDB generates its own Sandbox demo data:

```bash
# 1. Generate a Reality Pack
realitydb pack export --template saas --records 1000 --output ./packs --name saas-sandbox

# 2. Convert to PGLite-compatible SQL
node tools/pack-to-sql.js ./packs/saas-sandbox.realitydb-pack.json ./public/data/saas.sql

# 3. Deploy to Sandbox
npm run build && wrangler pages deploy dist
```

Or use the one-command refresh script:

```powershell
.\tools\refresh-sandbox.ps1
```

## Custom Templates

Create your own template JSON:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "tables": {
    "users": {
      "match": "users",
      "columns": {
        "id": { "strategy": "uuid" },
        "email": { "strategy": "email" },
        "full_name": { "strategy": "full_name" },
        "role": {
          "strategy": "enum",
          "options": {
            "values": ["admin", "member", "viewer"],
            "weights": [10, 70, 20]
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    }
  }
}
```

Then run:

```bash
realitydb run --pack my-app.json --connection postgresql://... --records 5000
```

### Available Strategies

| Strategy | Output | Options |
|----------|--------|---------|
| `uuid` | UUID v4 | - |
| `email` | Realistic email | - |
| `full_name` | Full name (diverse) | - |
| `first_name` | First name | - |
| `last_name` | Last name | - |
| `phone` | Phone number | - |
| `address` | Street address | - |
| `company_name` | Company name | - |
| `text` | Random text | `mode: 'short' \| 'long'` |
| `integer` | Integer | `min, max` |
| `float` | Decimal | `min, max` |
| `money` | Money amount | `min, max` |
| `boolean` | true/false | - |
| `timestamp` | ISO timestamp | `mode: 'past' \| 'recent' \| 'future'` |
| `enum` | Weighted random | `values[], weights[]` |
| `foreign_key` | FK reference | `table, column` |

### Supported Distributions

`normal`, `uniform`, `zipf`, `exponential`, `log-normal`

## Configuration

Create `.realitydb.json` in your project root:

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgresql://user:pass@localhost:5432/mydb"
  },
  "seed": {
    "defaultRecords": 1000,
    "randomSeed": 42
  },
  "template": "saas",
  "export": {
    "defaultFormat": "json",
    "outputDir": "./.realitydb"
  }
}
```

## CI/CD Mode

All commands support `--ci` flag for JSON output and proper exit codes:

```bash
realitydb seed --records 5000 --template saas --ci
# Returns JSON: { "success": true, "tables": 10, "totalRows": 26680, ... }
```

## Architecture

```
packages/
  config/       - Configuration loading
  core/         - Generation planning, export pipelines
  db/           - Database client (PostgreSQL, MySQL)
  generators/   - Data generation engine, strategies
  schema/       - Schema introspection and parsing
  shared/       - Shared types and utilities
  templates/    - Built-in domain templates
apps/
  cli/          - CLI entry point (15 commands)
  studio/       - Visual schema designer (React)
  sandbox/      - Browser SQL playground (React + PGLite)
tools/
  pack-to-sql.js         - Convert Reality Pack to SQL
  generate-template-sql.js - Generate SQL from template
  refresh-sandbox.ps1    - One-command Sandbox refresh
```

## License

MIT
