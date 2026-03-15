# CI/CD Integration Guide

Use RealityDB in your test pipeline to get deterministic, realistic test fixtures that are identical across every CI run.

## Why RealityDB in CI?

Traditional test fixtures are either:
- **Hand-written**: Tedious, incomplete, and drift from production schema
- **Production snapshots**: Privacy risk, bloated, non-deterministic

RealityDB generates schema-aware fixtures from a seed number. Same seed = same data, every time, on every machine.

## GitHub Actions

### Basic Setup

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Seed test data
        run: npx realitydb seed --template saas --seed 42 --ci
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
```

### The `--ci` Flag

The `--ci` flag changes RealityDB's behavior for CI environments:

1. **JSON output** instead of human-readable formatting
2. **No interactive prompts**
3. **Proper exit codes** (non-zero on failure)
4. **Machine-parseable results**

```bash
realitydb seed --template saas --seed 42 --ci
```

Output:

```json
{
  "success": true,
  "command": "seed",
  "version": "1.5.1",
  "timestamp": "2026-03-15T02:30:00.000Z",
  "durationMs": 245,
  "data": {
    "database": "postgresql://postgres:***@localhost:5432/test",
    "template": "saas",
    "seed": 42,
    "recordsPerTable": 500,
    "totalRows": 1850,
    "tables": [
      { "name": "organizations", "rowsInserted": 150, "batchCount": 2, "durationMs": 8 },
      { "name": "users", "rowsInserted": 500, "batchCount": 5, "durationMs": 15 },
      { "name": "subscriptions", "rowsInserted": 600, "batchCount": 6, "durationMs": 18 },
      { "name": "payments", "rowsInserted": 600, "batchCount": 6, "durationMs": 20 }
    ],
    "timelineUsed": false,
    "lifecycleUsed": false,
    "scenariosApplied": [],
    "scenarioReport": null
  }
}
```

### Parse CI Output in Tests

You can capture and assert against the seed output:

```bash
# Capture output
SEED_RESULT=$(npx realitydb seed --template saas --seed 42 --ci)

# Assert success
echo "$SEED_RESULT" | jq -e '.success == true'

# Assert minimum row count
echo "$SEED_RESULT" | jq -e '.data.totalRows >= 1000'

# Assert all tables were seeded
echo "$SEED_RESULT" | jq -e '.data.tables | length >= 4'
```

## Config File for CI

Create a separate config file for CI:

```json
// realitydb.ci.config.json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgresql://postgres:test@localhost:5432/test"
  },
  "seed": {
    "defaultRecords": 100,
    "randomSeed": 42,
    "batchSize": 50
  },
  "template": "saas"
}
```

Use it:

```bash
realitydb seed --config realitydb.ci.config.json --ci
```

## MySQL in CI

```yaml
services:
  mysql:
    image: mysql:8
    env:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: test
    ports:
      - 3306:3306
    options: >-
      --health-cmd "mysqladmin ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

```json
{
  "database": {
    "client": "mysql",
    "connectionString": "mysql://root:test@localhost:3306/test"
  }
}
```

## Scenarios for Edge Case Testing

Inject specific failure patterns into your test data:

```yaml
- name: Seed with payment failures
  run: |
    npx realitydb seed \
      --template saas \
      --seed 42 \
      --scenario payment-failures \
      --scenario-intensity high \
      --ci
```

Available scenarios:
- `payment-failures` — inject failed/declined payment statuses
- `churn-spike` — simulate user churn patterns
- `fraud-spike` — inject suspicious transaction patterns
- `data-quality` — introduce realistic data quality issues
- `seasonal-traffic` — simulate seasonal usage patterns
- `data-migration` — simulate post-migration data artifacts
- `system-outage` — simulate gaps from service interruptions

## Timeline Mode for Time-Series Tests

Generate data distributed across a time period:

```yaml
- name: Seed with 12-month timeline
  run: |
    npx realitydb seed \
      --template saas \
      --seed 42 \
      --timeline 12-months \
      --lifecycle \
      --ci
```

This produces data with:
- Realistic temporal distribution (S-curve growth)
- Parent records always created before child records
- Lifecycle state transitions (trial -> active -> churned) with causal side effects

## Deterministic Fixtures for Snapshot Testing

Because `--seed 42` always produces identical data, you can write snapshot tests against it:

```javascript
// test/fixtures.test.js
import { pool } from './db';

test('seed 42 produces expected user count', async () => {
  const result = await pool.query('SELECT count(*) FROM users');
  expect(result.rows[0].count).toBe('500');
});

test('seed 42 produces expected status distribution', async () => {
  const result = await pool.query(
    "SELECT status, count(*) FROM users GROUP BY status ORDER BY status"
  );
  // Deterministic: same seed = same distribution
  expect(result.rows).toMatchSnapshot();
});
```

## Reset Between Test Suites

```yaml
- name: Reset database
  run: npx realitydb reset --confirm --ci

- name: Re-seed with different scenario
  run: |
    npx realitydb seed \
      --template saas \
      --seed 42 \
      --scenario churn-spike \
      --ci
```

## Best Practices

1. **Pin your seed** — Always use `--seed` for reproducibility. Document which seeds your team uses.
2. **Use `--ci` flag** — Machine-parseable output, proper exit codes, no interactive prompts.
3. **Keep record counts small in CI** — Use `--records 100` instead of 1000. Tests don't need large datasets.
4. **Run migrations first** — RealityDB needs the schema to exist before seeding.
5. **Use `--config`** — Separate CI config from local dev config. Keep connection strings in env vars.
6. **Reset between test suites** — If suites need different data shapes, `reset --confirm` clears everything.
7. **Cache the install** — `npx realitydb` downloads on every run. Install globally in your CI image or add as a devDependency.
