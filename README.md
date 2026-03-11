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

Or use npx without installing:

```bash
npx realitydb seed --template saas --records 1000 --seed 42
```

## What You Get

Before:
```
=# SELECT count(*) FROM users;
 0
=# SELECT count(*) FROM subscriptions;
 0
```

After `realitydb seed --template saas --records 500 --seed 42`:
```
  plans:          500 rows (12ms)
  users:          500 rows (15ms)
  subscriptions:  500 rows (18ms)
  payments:       500 rows (20ms)

Seed complete. 2000 rows inserted in 0.1s
```

65% of subscriptions are active, 12% trialing, 10% canceled -- matching real SaaS distributions.

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
realitydb seed --template healthcare --records 200 --seed 42
```

Each template includes weighted distributions matching real-world data. Fintech accounts are 35% checking, 25% savings. Healthcare encounters are 35% office visits, 15% telehealth.

## Custom Templates

Create your own domain template as a JSON file:

```bash
realitydb templates init                              # Scaffold a template file
realitydb templates validate ./realitydb.template.json # Validate it
realitydb seed --template ./realitydb.template.json    # Use it
```

Template JSON format:

```json
{
  "name": "my-domain",
  "version": "1.0",
  "description": "My custom domain template",
  "tables": {
    "orders": {
      "match": ["orders", "*order*"],
      "columns": {
        "status": {
          "strategy": "enum",
          "options": { "values": ["pending", "shipped", "delivered"], "weights": [0.2, 0.3, 0.5] }
        },
        "total": { "strategy": "money", "options": { "min": 500, "max": 50000 } }
      }
    }
  }
}
```

Place templates in `~/.realitydb/templates/` for name-based lookup: `realitydb seed --template my-domain`.

## Lifecycle Simulation

Generate causally-connected data where entity states are consistent across tables:

```bash
realitydb seed --template saas --lifecycle --seed 42
```

With `--lifecycle`, a "canceled" user always has:
- `canceled_at` timestamp set
- A failed payment record
- Subscription status = "canceled"

An "active" user always has:
- Valid subscription with `status = "active"`
- Successful payment history
- No `canceled_at`

Enterprise plan users automatically get 2x more payment records (longer tenure).

Available lifecycles: `saas` (user signup → trial → active → churn), `fintech` (account opened → active → frozen/closed).

## Timeline Generation

Generate data that spans months with realistic growth curves:

```bash
realitydb seed --template saas --timeline 12-months --seed 42
```

Supports S-curve, linear, and exponential growth models. Timestamps are spread across the timeline so your dashboards and reports look real.

## Scenario Injection

Inject controlled anomalies to test edge cases:

```bash
realitydb seed --template saas --scenario payment-failures --scenario-intensity high
```

| Scenario | What it does |
|----------|-------------|
| `payment-failures` | Failed/declined payment patterns |
| `churn-spike` | Subscription cancellation surge |
| `fraud-spike` | Suspicious transaction patterns |
| `data-quality` | Nulls, duplicates, encoding issues |

Intensity levels: `low`, `medium`, `high`.

## Environment Reproduction

Capture a live database and share it with teammates:

```bash
# Developer A hits a bug
realitydb capture --name bug-4821

# Share via GitHub Gist (one command)
realitydb share bug-4821.realitydb-pack.json --gist

# Developer B loads from URL — reproduces instantly
realitydb load https://gist.github.com/user/abc123 --confirm
```

Or share the file directly:

```bash
# Send the .realitydb-pack.json file to Developer B
realitydb load bug-4821.realitydb-pack.json --confirm
```

Capture specific tables:

```bash
realitydb capture --name user-issue --tables users,subscriptions
```

Captured packs include schema DDL so the receiver can create tables from scratch.

## CI/CD Integration

```bash
npx realitydb seed --ci --template saas --records 500 --seed 42
```

The `--ci` flag outputs structured JSON, skips interactive prompts, and uses proper exit codes (0/1). See [examples/github-actions](./examples/github-actions) for a complete GitHub Actions workflow.

```yaml
# .github/workflows/test.yml
- name: Seed test data
  run: npx realitydb seed --ci --template saas --records 500 --seed 42 --config realitydb.ci.json
```

## Reality Packs

Export generated environments as portable JSON files:

```bash
realitydb pack export --template saas --name staging-env --seed 42
realitydb pack import ./staging-env.realitydb-pack.json --confirm
```

Packs are self-contained: schema, generation plan, and dataset in one file.

## Commands

| Command | Description |
|---------|-------------|
| `realitydb scan` | Inspect database schema |
| `realitydb seed` | Generate and insert realistic data |
| `realitydb reset` | Clear seeded data |
| `realitydb export` | Export data to JSON/CSV/SQL files |
| `realitydb capture` | Snapshot live database into a Reality Pack |
| `realitydb load` | Load a Reality Pack into the database |
| `realitydb share` | Share a Reality Pack (file info or Gist upload) |
| `realitydb packs list` | List available demo packs |
| `realitydb pack export` | Generate and export as Reality Pack |
| `realitydb pack import` | Import a Reality Pack |
| `realitydb templates` | List available domain templates |
| `realitydb templates init` | Scaffold a custom template JSON file |
| `realitydb templates validate` | Validate a custom template file |
| `realitydb scenarios` | List available scenarios |

All commands support `--ci` for JSON output.

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

## License

MIT
