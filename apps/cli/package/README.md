# RealityDB

> Production-like data before production exists.

RealityDB populates your PostgreSQL database with realistic, schema-aware data. Point it at your schema, pick a domain template, and get thousands of rows that look like they came from a real application. Deterministic seeds mean the same command always produces the same data.

## Quick Start

```bash
npm install -g realitydb

realitydb scan                                    # Inspect your schema
realitydb seed --template saas --seed 42          # Populate with realistic data
realitydb reset --confirm                         # Clear and start fresh
```

## Domain Templates

| Template | Description | Tables |
|----------|-------------|--------|
| `saas` | Subscription business | users, plans, subscriptions, payments |
| `ecommerce` | Online store | customers, products, orders, order_items |
| `education` | School system | teachers, classes, students, enrollments, grades, attendance |
| `fintech` | Financial services | accounts, transactions, fraud_alerts, settlements, chargebacks |
| `healthcare` | Medical system | patients, providers, encounters, diagnoses, billing |

```bash
realitydb seed --template fintech --records 200 --seed 42
```

Each template includes weighted distributions matching real-world data.

## Key Features

```bash
# Timeline generation -- data spanning months
realitydb seed --template saas --timeline 12-months --seed 42

# Scenario injection -- controlled anomalies
realitydb seed --template saas --scenario payment-failures --scenario-intensity high

# Environment reproduction -- capture and share
realitydb capture --name bug-4821
realitydb load bug-4821.realitydb-pack.json --confirm

# CI mode -- JSON output, proper exit codes
npx realitydb seed --ci --template saas --records 500 --seed 42
```

## Data Science Mode

Generate large-scale datasets for ML training, analytics testing, and data pipelines — no database required.

```bash
# Generate 1M rows with default demo schema
realitydb generate --records 1000000 --format csv

# Generate from your SQL schema
realitydb generate --schema schema.sql --records 100000 --format parquet

# Generate from JSON schema with distribution controls
realitydb generate --schema custom.json --records 500000 --correlations --seed 42
```

### Statistical Distributions

Define per-column distributions in your JSON schema:

```json
{
  "tables": [{
    "name": "users",
    "columns": [
      { "name": "age", "type": "integer", "distribution": { "type": "normal", "mean": 35, "stddev": 12, "min": 18, "max": 85 } },
      { "name": "income", "type": "numeric", "distribution": { "type": "log-normal", "mu": 10.5, "sigma": 0.8, "min": 15000, "max": 500000 } },
      { "name": "login_count", "type": "integer", "distribution": { "type": "zipf", "exponent": 1.2, "min": 1, "max": 1000 } }
    ]
  }],
  "correlations": [
    { "source": "age", "target": "income", "coefficient": 0.6 }
  ]
}
```

Supported distributions: `normal`, `uniform`, `zipf`, `exponential`, `log-normal`.

### Output Formats

| Format | Flag | Description |
|--------|------|-------------|
| JSON | `--format json` | NDJSON (newline-delimited JSON), one object per line |
| CSV | `--format csv` | Standard CSV with headers |
| Parquet | `--format parquet` | NDJSON with `.parquet.ndjson` extension (convert via DuckDB/pyarrow) |

## Commands

| Command | Description |
|---------|-------------|
| `realitydb scan` | Inspect database schema |
| `realitydb seed` | Generate and insert realistic data |
| `realitydb reset` | Clear seeded data |
| `realitydb export` | Export data to JSON/CSV/SQL files |
| `realitydb generate` | Generate large-scale datasets (no DB required) |
| `realitydb capture` | Snapshot live database into a Reality Pack |
| `realitydb load` | Load a Reality Pack into the database |
| `realitydb share` | Display Reality Pack info for sharing |
| `realitydb pack export` | Generate and export as Reality Pack |
| `realitydb pack import` | Import a Reality Pack |
| `realitydb templates` | List available domain templates |
| `realitydb scenarios` | List available scenarios |

## Configuration

Create `realitydb.config.json`:

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://user:pass@localhost:5432/mydb"
  },
  "seed": {
    "defaultRecords": 1000,
    "batchSize": 1000,
    "randomSeed": 42
  },
  "template": "saas"
}
```

## Requirements

- Node.js 20+
- PostgreSQL

Full documentation: [github.com/emkwambe/realitydb-cli](https://github.com/emkwambe/realitydb-cli)

## License

MIT
