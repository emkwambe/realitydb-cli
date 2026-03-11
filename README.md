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

## Schema Analysis

Auto-detect column semantics and generate a custom template from your schema:

```bash
realitydb analyze                              # Analyze schema and print report
realitydb analyze --output my-template.json    # Generate a template file
```

The analyzer reads your schema, samples existing data (up to 1000 rows per table), and detects:
- Column types: emails, phones, URLs, IP addresses, slugs, usernames
- Enum-like columns with real value distributions from your data
- Numeric ranges (min/max/mean) from actual values
- Status columns with weighted distributions
- Country, currency, rating, and percentage columns
- Null rates and boolean distributions

The generated template is ready to use immediately:

```bash
realitydb seed --template ./my-template.json --seed 42
```

## Data Masking

Detect and mask PII in your database for compliance (GDPR, HIPAA):

```bash
realitydb mask --dry-run                          # Preview PII detection
realitydb mask --output ./masked --mode gdpr      # Export masked data to files
realitydb mask --confirm --mode hipaa             # Mask in-place (database)
realitydb mask --confirm --audit-log audit.json   # Write with compliance audit trail
```

Compliance modes:
- **gdpr** (default) — masks names, emails, phones, addresses, free text fields
- **hipaa** — adds medical records, diagnoses, prescriptions
- **strict** — maximum coverage including quasi-identifiers (age, gender, salary)

Primary keys and foreign keys are never masked. Tables are processed in dependency order to preserve referential integrity. Deterministic masking with `--seed` ensures reproducible results.

## Education & Classroom Mode

Curated datasets and exercises for SQL courses and analytics bootcamps:

```bash
realitydb classroom                          # List available courses
realitydb classroom start sql-101            # Load course into your database
realitydb classroom status                   # Show progress across all courses
realitydb classroom complete sql-101 ex-3    # Mark exercise as completed
realitydb classroom reset sql-101            # Reset course progress
realitydb classroom create my-course         # Scaffold a custom course
```

Built-in courses:

| Course | Level | Exercises | Description |
|--------|-------|-----------|-------------|
| `sql-101` | Beginner | 10 | SELECT, WHERE, JOIN, GROUP BY, subqueries |
| `analytics-intro` | Intermediate | 8 | Aggregation, window functions, CTEs |
| `data-modeling` | Intermediate | 6 | Normalization, relationships, constraints |

Each course creates its own tables (prefixed with `classroom_`), inserts realistic seed data, and provides exercises with progressive difficulty. Track your completion with `classroom status`.

Create custom courses as JSON files with `classroom create`, add your own schema, seed data, and exercises.

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
| `seasonal-traffic` | Holiday/weekend traffic peaks and troughs |
| `data-migration` | Encoding artifacts, format changes, null spikes |
| `system-outage` | Data gap followed by recovery burst |

Intensity levels: `low`, `medium`, `high`.

### Composing Scenarios

Apply multiple scenarios in sequence:

```bash
realitydb seed --template saas --scenario "fraud-spike,payment-failures" --scenario-intensity high
```

Conflicts between scenarios targeting the same tables are detected and reported.

### Timeline-Scheduled Scenarios

Schedule scenarios at specific points in your timeline:

```bash
realitydb seed --template saas --timeline 12-months \
  --scenario-schedule "fraud-spike:month-6,churn-spike:month-9"
```

Each scenario only affects rows within its scheduled time window. Use ranges: `fraud-spike:month-3-5`.

### Custom Scenarios

Create your own scenarios as JSON files:

```bash
realitydb scenarios create my-scenario    # Scaffold a .scenario.json file
```

Then use it:

```bash
realitydb seed --template saas --scenario "./my-scenario.scenario.json"
```

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
| `realitydb mask` | Detect and mask PII for compliance |
| `realitydb classroom` | Education mode with courses and exercises |
| `realitydb classroom start` | Load a course into your database |
| `realitydb classroom status` | Show exercise completion progress |
| `realitydb classroom complete` | Mark an exercise as completed |
| `realitydb classroom create` | Scaffold a custom course JSON file |
| `realitydb analyze` | Analyze schema and auto-detect column strategies |
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
| `realitydb scenarios create` | Scaffold a custom scenario JSON file |

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
