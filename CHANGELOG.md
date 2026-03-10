# Changelog

## v0.1.2 (2026-03-10)

### Fix

- Complete rebrand cleanup to RealityDB.
- Config example renamed to `realitydb.config.example.json`.
- Fix description encoding (em-dash replaced with ASCII dash).
- Update `.gitignore` with `realitydb` config and export directory entries.

## v0.1.1 (2026-03-10)

### Fix

- Rebrand CLI from seedforge to realitydb — package name, bin command, all output strings, config file name, error messages, and documentation now use `realitydb`.
- Config file lookup: `realitydb.config.json` (with fallback to `seedforge.config.json` and `databox.config.json`).

## v0.1.0 (2026-03-10)

Initial release.

### Features

- **Schema Intelligence** — `realitydb scan` introspects your PostgreSQL database, detects tables, columns, primary keys, foreign keys, and computes safe insertion order via topological sort.
- **Data Seeding** — `realitydb seed` generates realistic, schema-aware data and inserts it into your database in a single transaction.
- **Domain Templates** — Three built-in templates with realistic distributions:
  - **SaaS** — users, plans, subscriptions, payments
  - **E-commerce** — customers, products, orders, order items
  - **Education** — teachers, classes, students, enrollments, grades, attendance
- **Timeline Generation** — `--timeline 12-months` generates data spanning months with S-curve, linear, or exponential growth models.
- **Scenario Injection** — `--scenario payment-failures` injects controlled anomalies:
  - Payment failures, churn spikes, fraud patterns, data quality issues
  - Three intensity levels: low, medium, high
- **Reality Packs** — `realitydb pack export` saves a complete environment (schema + plan + dataset) as a portable JSON file. `realitydb pack import` loads it into any compatible database.
- **File Export** — `realitydb export` writes datasets to JSON, CSV, or SQL files.
- **Deterministic** — Same seed produces identical data every time.
- **Safe by Default** — Destructive commands (`reset`, `pack import`) require `--confirm`.
