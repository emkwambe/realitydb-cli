# RealityDB CLI

Generate production-realistic databases with FK integrity, lifecycle rules, and temporal ordering.

```bash
npm install -g @realitydb/cli
```

## What it does

RealityDB generates synthetic data where cancelled orders have `NULL shipped_at`, every foreign key points to a real parent row, and `--seed 42` gives identical output every time.

## Usage

```bash
# Generate to JSON
realitydb run --pack template.json --rows 5000

# Generate to SQL (CREATE TABLE + INSERT)
realitydb run --pack template.json --rows 5000 --format sql --drop-tables -o output.sql

# Generate to CSV (one file per table)
realitydb run --pack template.json --rows 5000 --format csv

# Seed directly into PostgreSQL
realitydb seed --pack template.json --rows 5000 \
  --connection postgresql://user:pass@localhost:5432/mydb \
  --create-tables --drop-tables
```

## Commands

| Command | Description |
|---------|-------------|
| `run` | Generate data to JSON, SQL, or CSV files |
| `seed` | Generate and insert directly into PostgreSQL |
| `login` | Authenticate with API key |
| `status` | Show current plan and features |
| `logout` | Clear stored credentials |

## Performance

| Dataset | Tables | Rows | Speed |
|---------|--------|------|-------|
| Restaurant | 14 | 2M | 210K rows/sec |
| Supply Chain | 24 | 2M | 68K rows/sec |

## Links

- [Sandbox](https://sandbox.realitydb.dev) — Try SQL queries in the browser
- [GitHub](https://github.com/emkwambe/databox) — Source code

## License

BSL-1.1 — Mpingo Systems LLC
