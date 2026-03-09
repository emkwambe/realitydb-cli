# DataBox

> Production-like data before production exists.

DataBox is a developer tool that instantly populates your database with
realistic, schema-aware data. One command, realistic environments.

## Quick Start

```bash
npx databox scan              # Understand your schema
npx databox seed --seed 42    # Populate with realistic data
npx databox reset --confirm   # Clear and start fresh
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
databox seed --template saas --records 1000 --seed 42
databox seed --template ecommerce --records 1000 --seed 42
databox seed --template education --records 1000 --seed 42
```

## Timeline & Scenarios

```bash
databox seed --template saas --timeline 12-months --seed 42
databox seed --template saas --scenario payment-failures --scenario-intensity high
```

## Reality Packs

```bash
databox pack export --template saas --name my-saas-env --seed 42
databox pack import ./my-saas-env.databox-pack.json --confirm
```

## Configuration

Create `databox.config.json`:
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
| `databox scan` | Scan and display database schema |
| `databox seed` | Generate and insert realistic data |
| `databox reset` | Clear seeded data |
| `databox export` | Export dataset to JSON/CSV/SQL files |
| `databox templates` | List available domain templates |
| `databox scenarios` | List available scenarios |
| `databox pack export` | Export environment as Reality Pack |
| `databox pack import` | Import Reality Pack into database |

## License

MIT
