# RealityDB

> Production-like data before production exists.

RealityDB is a developer tool that instantly populates your database with
realistic, schema-aware data. One command, realistic environments.

## Install

```bash
npm install -g realitydb
```

## Quick Start

```bash
realitydb scan              # Understand your schema
realitydb seed --seed 42    # Populate with realistic data
realitydb reset --confirm   # Clear and start fresh
```

Or use npx without installing:

```bash
npx realitydb scan
npx realitydb seed --template saas --records 1000 --seed 42
```

## Features

- **Schema Intelligence** — Automatically understands your database structure
- **Domain Templates** — SaaS, e-commerce, education with realistic distributions
- **Timeline Generation** — Datasets spanning months with growth curves
- **Scenario Injection** — Payment failures, churn spikes, fraud patterns
- **Reality Packs** — Portable, shareable environment packages
- **Deterministic** — Same seed = same data, every time

## Templates

```bash
realitydb seed --template saas --records 1000 --seed 42
realitydb seed --template ecommerce --records 1000 --seed 42
realitydb seed --template education --records 1000 --seed 42
```

## Timeline & Scenarios

```bash
realitydb seed --template saas --timeline 12-months --seed 42
realitydb seed --template saas --scenario payment-failures --scenario-intensity high
```

## Reality Packs

```bash
realitydb pack export --template saas --name my-saas-env --seed 42
realitydb pack import ./my-saas-env.databox-pack.json --confirm
```

## Configuration

Create `realitydb.config.json` (also reads `seedforge.config.json` and `databox.config.json` for backward compatibility):

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgres://user:pass@localhost:5432/mydb"
  },
  "seed": {
    "defaultRecords": 5000,
    "batchSize": 1000,
    "randomSeed": 42
  },
  "template": "saas"
}
```

## Prerequisites

- Node.js 20+
- PostgreSQL database

## Commands

| Command | Description |
|---------|-------------|
| `realitydb scan` | Scan and display database schema |
| `realitydb seed` | Generate and insert realistic data |
| `realitydb reset` | Clear seeded data |
| `realitydb export` | Export dataset to JSON/CSV/SQL files |
| `realitydb templates` | List available domain templates |
| `realitydb scenarios` | List available scenarios |
| `realitydb pack export` | Export environment as Reality Pack |
| `realitydb pack import` | Import Reality Pack into database |

## License

MIT
