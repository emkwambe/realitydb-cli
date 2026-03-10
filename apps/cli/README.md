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

## Commands

| Command | Description |
|---------|-------------|
| `realitydb scan` | Inspect database schema |
| `realitydb seed` | Generate and insert realistic data |
| `realitydb reset` | Clear seeded data |
| `realitydb export` | Export data to JSON/CSV/SQL files |
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

Full documentation: [github.com/emkwambe/databox](https://github.com/emkwambe/databox)

## License

MIT
