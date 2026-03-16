# Guide: Bug Reproduction Packs

## The Problem

A bug happens in production. The developer sees the error in logs but cannot reproduce it locally because the local database has different data, different relational states, and different timing. Without the exact data context, reproducing timing-dependent bugs, race conditions, and relational integrity issues becomes guesswork.

## The Solution

RealityDB lets you capture a live database's state, automatically mask sensitive data, and share it as a portable file. A teammate can recreate the exact environment locally with one command.

## The Workflow

### 1. Developer Encounters a Bug

The bug is in the order processing pipeline. Orders with a specific combination of status and payment state are failing.

### 2. Capture the State

```bash
realitydb capture \
  --name bug-4821 \
  --safe \
  --config production.config.json \
  --output ./bug-packs/
```

This captures:
- Full database schema (tables, columns, types, constraints)
- Row data for every table (or specific tables with `--tables`)
- PII is automatically detected and masked (emails, names, phones, financial data)

Output:
```
RealityDB Capture
========================================
Database: postgresql://user:****@prod-host:5432/app_db
Name: bug-4821
Safe mode: mask (PII will be sanitized)

Capturing...
PII detected: 14 columns across 6 tables. Sanitizing...
  Categories: email, phone, name, financial, address

  users: 1200 rows
  orders: 8500 rows
  payments: 12000 rows
  shipments: 6200 rows
  products: 450 rows
  inventory: 450 rows

Captured: ./bug-packs/bug-4821.realitydb-pack.json (2.4 MB)
Privacy: PII sanitized (mask mode). Safe to share.
```

### 3. Share the Pack

The `.realitydb-pack.json` file is safe to share — all PII has been replaced with realistic synthetic data. Share it via Slack, email, Git, or any file transfer.

### 4. Teammate Reproduces Locally

```bash
# Preview what's in the pack
realitydb load bug-4821.realitydb-pack.json --preview

# Load it into a local database
createdb bug_4821_repro
realitydb load bug-4821.realitydb-pack.json \
  --confirm \
  --config local.config.json
```

Output:
```
RealityDB Load
========================================
Database: postgresql://postgres:****@localhost:5432/bug_4821_repro
Pack: bug-4821 (v1.0)
Tables: 6
Total rows: 28800

This pack was captured with PII masking

Loading...
  users: 1200 rows loaded
  orders: 8500 rows loaded
  payments: 12000 rows loaded
  shipments: 6200 rows loaded
  products: 450 rows loaded
  inventory: 450 rows loaded

Bug reproduction environment ready. 6 tables, 28800 rows loaded.
```

The teammate now has an exact replica of the production state (minus PII) and can debug locally.

## Capture Options

| Option | Description |
|--------|-------------|
| `--name <name>` | Name for the pack (required) |
| `--safe` | Enable PII masking (recommended for any shared packs) |
| `--safe-mode <mode>` | Masking mode: `mask` (realistic fakes), `tokenize` (deterministic tokens), `redact` (replaces with [REDACTED]) |
| `--tables <list>` | Comma-separated list of specific tables to capture |
| `--max-rows <count>` | Limit rows captured per table |
| `--around <col=val>` | Capture rows related to a specific entity, following FK chains |
| `--output <dir>` | Output directory for the pack file |
| `--description <text>` | Description stored in pack metadata |

## Safe Modes

### mask (default)
Replaces PII with realistic synthetic data. An email like `john.doe@company.com` becomes `morgan.lee488@demo.net`. The data looks real but isn't. Best for general sharing.

### tokenize
Replaces PII with deterministic tokens. The same input always produces the same token, maintaining referential integrity across tables. Best when you need to correlate masked data across systems.

### redact
Replaces PII with `[REDACTED]`. Simple and obvious. Best when you need to make it crystal clear that data has been sanitized.

## Targeted Capture

### Capture specific tables
```bash
realitydb capture --name bug-4821 --safe --tables "orders,payments,users"
```

### Capture rows around a specific entity
```bash
realitydb capture --name bug-4821 --safe --around "user_id=abc-123-def"
```
This follows FK chains to capture all rows related to user `abc-123-def` across all tables — their orders, payments, shipments, etc.

### Limit row count for large databases
```bash
realitydb capture --name bug-4821 --safe --max-rows 1000
```

## PII Detection

The capture engine detects 16 categories of PII automatically:

| Category | Examples |
|----------|---------|
| email | Email addresses |
| name / person_name | Full names, first/last names |
| phone | Phone numbers |
| street_address | Physical addresses |
| date_of_birth | Birth dates |
| ssn | Social Security Numbers |
| credit_card | Credit card numbers |
| drivers_license | Driver's license numbers |
| passport | Passport numbers |
| medical_mrn | Medical record numbers |
| medical_npi | National Provider Identifiers |
| student_id | Student identification numbers |
| case_number | Legal case numbers |
| vin | Vehicle identification numbers |
| bank_routing | Bank routing numbers |
| financial | Account numbers, balances |

## Loading Options

| Option | Description |
|--------|-------------|
| `--confirm` | Confirm the import operation (required) |
| `--preview` | Show pack contents without importing |
| `--show-ddl` | Display schema DDL without importing |

## Best Practices

1. **Always use `--safe` when sharing packs** — even internal team sharing should use masked data.

2. **Name packs after ticket numbers** — `bug-4821`, `incident-2024-03-15`, `regression-auth-flow`. Makes them findable.

3. **Include a description** — `--description "Order processing fails when payment status is refunded but shipment is in-transit"`. This context helps the person loading the pack.

4. **Use `--around` for targeted captures** — instead of capturing the entire database, capture just the rows related to the problematic entity. Smaller files, faster sharing.

5. **Use `--preview` before loading** — always preview a pack before loading it into your database to understand what you're importing.

6. **Keep packs in your bug tracker** — attach the `.realitydb-pack.json` to the bug ticket. Future developers investigating similar issues can reload the exact state.

## The Developer Experience

What used to be:
```
1. Read the bug report
2. Ask "what was the data state?"
3. Try to manually recreate the conditions
4. Give up and add more logging
5. Wait for it to happen again
```

What it becomes:
```
1. Read the bug report
2. realitydb load bug-4821.realitydb-pack.json --confirm
3. Debug locally with the exact production state
```
