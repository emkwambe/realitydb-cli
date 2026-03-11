# Changelog

## v1.0.0 (2026-03-11)

### Features

- `realitydb analyze` — intelligent schema analysis with auto-detection of column semantics
- Column pattern detector: emails, phones, URLs, IP addresses, slugs, usernames, countries, currencies, ratings, percentages, statuses, enums
- Sample data analyzer: reads existing rows to learn real distributions (value frequencies, numeric ranges, null rates, boolean ratios)
- Auto-generated templates: `--output my-template.json` creates a ready-to-use template from analysis
- `--sample-size <N>` controls how many rows to sample per table (default 1000)
- Confidence-scored analysis report showing detection quality per column
- CI mode JSON output for `realitydb analyze`

## v0.11.0 (2026-03-11)

### Features

- Advanced scenario composition: apply multiple scenarios in sequence with conflict detection
- Timeline-scheduled scenarios: `--scenario-schedule "fraud-spike:month-6,churn-spike:month-9"`
- Custom scenarios as JSON files: `realitydb scenarios create my-scenario` scaffolds a template
- `realitydb scenarios create <name>` command to scaffold custom scenario files
- Scenario result reporter: detailed per-scenario injection reports in both interactive and CI modes
- 3 new built-in scenarios:
  - `seasonal-traffic` — holiday/weekend traffic peaks and troughs
  - `data-migration` — encoding artifacts, format changes, null spikes
  - `system-outage` — data gap followed by recovery burst
- 7 total built-in scenarios available
- `--scenario-schedule` flag for seed, export, and pack export commands

## v0.10.0 (2026-03-11)

### Features

- `realitydb generate` — pure data generation without database connection
- Data science mode: generate million-row datasets for ML training and analytics testing
- SQL schema parser: `--schema schema.sql` defines tables from DDL without a live database
- JSON schema support: `--schema schema.json` for inline column definitions with distributions
- Statistical distribution controls: normal, uniform, zipf, exponential, log-normal
- Cross-column correlations: `--correlations` enables statistical relationships (e.g., age correlates with income)
- Output formats: JSON, CSV, Parquet (NDJSON)
- Streaming generation with constant memory — 1M rows in under 60 seconds
- Default demo schema (users + transactions) when no schema file is provided
- Configurable per-column distributions with mean, stddev, lambda, exponent, min/max bounds
- Distribution config via template overrides in schema JSON

## v0.9.0 (2026-03-11)

### Features

- Lifecycle simulation engine for causally-connected data generation
- `realitydb seed --template saas --lifecycle` generates coherent entity stories
- State machine walks entities through lifecycle: signup → trial → active → churned
- Cross-table correlations: enterprise users get 2x payments, churned users always have failed payment
- SaaS lifecycle: 5 states (trial 12%, active 65%, churned 10%, past_due 8%, paused 5%)
- Fintech lifecycle: 4 states (active 82%, frozen 5%, closed 8%, pending_review 5%)
- Frozen accounts always have fraud alerts; closed accounts always have settlements
- `--lifecycle` flag is opt-in — existing generation behavior unchanged without it
- Deterministic lifecycle simulation with seed support

## v0.8.0 (2026-03-11)

### Features

- `realitydb share <file> --gist` uploads Reality Pack to GitHub Gist and returns shareable URL
- `realitydb load <url> --confirm` downloads and imports a pack from any URL (Gist, direct JSON)
- `realitydb packs list` shows available demo packs with template, persona, and row counts
- Pack compression via gzip for sharing (5-10x size reduction)
- Gist upload requires GITHUB_TOKEN; graceful error message with setup instructions when missing
- URL download resolves GitHub Gist URLs to raw content automatically
- Pack validation on download — rejects non-Reality-Pack content before importing

## v0.5.0 (2026-03-11)

### Features

- Custom Template API: create domain templates as JSON files without modifying source
- `realitydb seed --template ./my-template.json` loads custom templates from file
- `realitydb templates init` scaffolds a new template JSON file
- `realitydb templates validate <file>` validates custom template structure
- User template directory: place templates in `~/.realitydb/templates/` for name-based lookup
- Template resolution: file path > built-in > user directory
- All 17 column strategy kinds supported in custom templates

## v0.4.1 (2026-03-10)

### Fix

- Rename pack file extension from `.databox-pack.json` to `.realitydb-pack.json`
- Clean up remaining `databox` references in user-facing output
- Backward compatible: existing `.databox-pack.json` files still load correctly

## v0.4.0 (2026-03-10)

### Features

- Fintech domain template (accounts, transactions, fraud alerts, settlements, chargebacks)
- Healthcare domain template (patients, providers, encounters, diagnoses, billing)
- 5 domain templates total

## v0.3.0 (2026-03-10)

### Features

- `realitydb capture` -- snapshot live database into Reality Pack
- `realitydb share` -- share Reality Pack with teammates
- `realitydb load` -- load Reality Pack into database
- Schema DDL included in captured packs
- Selective table capture with `--tables` flag
- CI mode support for all new commands

## v0.2.0 (2026-03-10)

### Features

- CI mode with `--ci` flag for all commands
- JSON output for machine-readable pipeline integration
- CI-safe reset (no --confirm needed with --ci)
- GitHub Actions example workflow
- Docker Compose example

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
