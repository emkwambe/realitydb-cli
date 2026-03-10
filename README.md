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

## Environment Reproduction

Capture and share database environments for debugging:

```bash
# Capture current database state
realitydb capture --name bug-4821

# Share with teammate
# (send the .realitydb-pack.json file)

# Teammate loads the environment
realitydb load bug-4821.realitydb-pack.json --confirm
```

Capture specific tables:
```bash
realitydb capture --name user-issue --tables users,subscriptions
```

## CI/CD Integration

RealityDB works seamlessly in CI pipelines:

```bash
# GitHub Actions / any CI
npx realitydb seed --ci --template saas --records 500 --seed 42
```

CI mode outputs JSON and uses proper exit codes:
```bash
# Parse CI output
RESULT=$(npx realitydb seed --ci --template saas --seed 42)
echo $RESULT | jq '.data.totalRows'
```

The `--ci` flag:
- Outputs structured JSON (machine-readable)
- Skips interactive prompts
- Uses proper exit codes (0 = success, 1 = failure)
- No decorative formatting

See [examples/github-actions](./examples/github-actions) for a complete workflow.

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
| `realitydb capture` | Capture live database state into a Reality Pack |
| `realitydb share` | Share a Reality Pack file |
| `realitydb load` | Load a Reality Pack into the database |
| `realitydb pack export` | Export environment as Reality Pack |
| `realitydb pack import` | Import Reality Pack into database |

## License

MIT
