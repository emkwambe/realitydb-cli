# SeedForge

> Production-like data before production exists.

SeedForge is a developer tool that instantly populates your database with
realistic, schema-aware data. One command, realistic environments.

## Install

```bash
npm install -g seedforge
```

## Quick Start

```bash
seedforge scan              # Understand your schema
seedforge seed --seed 42    # Populate with realistic data
seedforge reset --confirm   # Clear and start fresh
```

Or use npx without installing:

```bash
npx seedforge scan
npx seedforge seed --template saas --records 1000 --seed 42
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
seedforge seed --template saas --records 1000 --seed 42
seedforge seed --template ecommerce --records 1000 --seed 42
seedforge seed --template education --records 1000 --seed 42
```

## Timeline & Scenarios

```bash
seedforge seed --template saas --timeline 12-months --seed 42
seedforge seed --template saas --scenario payment-failures --scenario-intensity high
```

## Reality Packs

```bash
seedforge pack export --template saas --name my-saas-env --seed 42
seedforge pack import ./my-saas-env.databox-pack.json --confirm
```

## Configuration

Create `seedforge.config.json` (also reads `databox.config.json` for backward compatibility):

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
| `seedforge scan` | Scan and display database schema |
| `seedforge seed` | Generate and insert realistic data |
| `seedforge reset` | Clear seeded data |
| `seedforge export` | Export dataset to JSON/CSV/SQL files |
| `seedforge templates` | List available domain templates |
| `seedforge scenarios` | List available scenarios |
| `seedforge pack export` | Export environment as Reality Pack |
| `seedforge pack import` | Import Reality Pack into database |

## License

MIT
