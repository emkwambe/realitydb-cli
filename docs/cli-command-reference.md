# RealityDB CLI Command Reference

## Installation

```bash
npm install -g realitydb
realitydb --version  # 2.0.0
```

## Global Options

These options apply to all commands:

| Option | Description |
|--------|-------------|
| `--config <path>` | Path to config file (default: `realitydb.config.json`) |
| `--ci` | CI mode: JSON output, no prompts, proper exit codes |
| `--verbose` | Enable verbose output |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

## Config File Format

```json
{
  "database": {
    "connectionString": "postgresql://user:password@host:5432/database"
  }
}
```

---

## realitydb run

Create schema and seed database from a Studio-exported template in one command.

```bash
realitydb run --pack <path> --connection <url> [options]
```

| Option | Required | Description |
|--------|----------|-------------|
| `--pack <path>` | Yes | Path to Studio template JSON |
| `--connection <url>` | Yes | Database connection string |
| `--records <count>` | No | Rows per table (overrides template) |
| `--seed <number>` | No | Random seed for reproducibility |
| `--drop-existing` | No | Drop and recreate tables if they exist |
| `--dry-run` | No | Preview DDL and plan without executing |

**Examples:**
```bash
# Basic run
realitydb run --pack template.json --connection "postgresql://localhost:5432/mydb"

# With specific row count and seed
realitydb run --pack template.json --connection "..." --records 50000 --seed 42

# Preview without executing
realitydb run --pack template.json --connection "..." --dry-run

# Recreate existing tables
realitydb run --pack template.json --connection "..." --drop-existing
```

---

## realitydb seed

Seed an existing database with generated data.

```bash
realitydb seed [options]
```

| Option | Description |
|--------|-------------|
| `--records <count>` | Number of records per table |
| `--template <name\|path>` | Template name or path to .json file |
| `--seed <number>` | Random seed for reproducibility |
| `--timeline <duration>` | Timeline duration (e.g., "12-months") |
| `--scenario <names>` | Scenarios to apply (comma-separated) |
| `--scenario-intensity <level>` | low, medium, or high |
| `--lifecycle` | Enable lifecycle simulation |
| `--auto-template` | Analyze, generate template, and seed in one step |

**Examples:**
```bash
# Seed with a built-in template
realitydb seed --template saas --records 10000 --seed 42

# Seed with a custom template file
realitydb seed --template ./my-template.json --records 5000

# Auto-analyze and seed
realitydb seed --auto-template --records 1000
```

---

## realitydb capture

Capture live database state into a Reality Pack.

```bash
realitydb capture [options]
```

| Option | Description |
|--------|-------------|
| `--name <name>` | Name for the pack (required) |
| `--description <text>` | Pack description |
| `--tables <list>` | Comma-separated list of tables |
| `--output <dir>` | Output directory (default: current) |
| `--safe` | Enable PII masking |
| `--safe-mode <mode>` | mask (default), tokenize, or redact |
| `--max-rows <count>` | Max rows per table |
| `--around <col=val>` | Capture rows related to a specific entity |

**Examples:**
```bash
# Full capture with PII masking
realitydb capture --name bug-4821 --safe

# Capture specific tables with row limit
realitydb capture --name debug-orders --safe --tables "orders,payments" --max-rows 500

# Capture around a specific entity
realitydb capture --name user-issue --safe --around "user_id=abc-123"

# Capture with tokenization (deterministic masking)
realitydb capture --name audit-set --safe --safe-mode tokenize
```

---

## realitydb load

Load a Reality Pack into the database.

```bash
realitydb load <file> [options]
```

| Option | Description |
|--------|-------------|
| `--confirm` | Confirm import operation (required for actual load) |
| `--show-ddl` | Display schema DDL without importing |
| `--preview` | Preview pack contents without importing |

**Examples:**
```bash
# Preview a pack
realitydb load bug-4821.realitydb-pack.json --preview

# Show DDL for manual schema creation
realitydb load bug-4821.realitydb-pack.json --show-ddl

# Load into database
realitydb load bug-4821.realitydb-pack.json --confirm
```

---

## realitydb scan

Scan and display database schema.

```bash
realitydb scan
```

Displays: tables, columns, primary keys, foreign keys, and safe insertion order. No options required beyond the global `--config`.

---

## realitydb analyze

Analyze database schema and auto-suggest generation strategies.

```bash
realitydb analyze [options]
```

| Option | Description |
|--------|-------------|
| `--output <file>` | Generate a template JSON from analysis |
| `--sample-size <count>` | Rows to sample per table (default: 1000) |
| `--unsafe-analyze` | Disable PII sanitization |
| `--auto-template` | Generate template file automatically |

**Examples:**
```bash
# Analyze and generate a template
realitydb analyze --output my-template.json

# Analyze with larger sample
realitydb analyze --output template.json --sample-size 5000
```

---

## realitydb mask

Detect and mask PII in your database.

```bash
realitydb mask [options]
```

| Option | Description |
|--------|-------------|
| `--tokenize` | Use deterministic tokenization |
| `--token-map <file>` | Path for encrypted token map |
| `--deep-scan` | Enable deep scanning of free-text fields |
| `--dry-run` | Preview detection without modifying data |

---

## realitydb audit

Audit log operations for compliance.

```bash
realitydb audit <subcommand>
```

| Subcommand | Description |
|------------|-------------|
| `verify <file>` | Verify audit log hash chain integrity |
| `summary <file>` | Print compliance summary from audit log |
| `re-identify [options]` | Decrypt token map to reveal original PII mappings |

---

## realitydb reset

Reset seeded data (truncate tables).

```bash
realitydb reset --confirm
```

**Warning:** This is destructive. The `--confirm` flag is required.

---

## realitydb init

Interactive setup wizard that walks through connection, scanning, and seeding.

```bash
realitydb init
```

No options — it's a guided interactive flow.

---

## realitydb export

Export generated data to files (without a database).

```bash
realitydb export [options]
```

| Option | Description |
|--------|-------------|
| `--format <format>` | json, csv, or sql |
| `--output <dir>` | Output directory |
| `--records <count>` | Records per table |
| `--seed <number>` | Random seed |
| `--template <name>` | Template to use |

---

## Template JSON Format Reference

```json
{
  "name": "template-name",
  "version": "1.0.0",
  "description": "Template description",
  "tables": {
    "table_name": {
      "match": "table_name",
      "columns": {
        "column_name": {
          "strategy": "strategy_name",
          "options": {},
          "foreignKey": { "table": "parent_table", "column": "parent_col" }
        }
      }
    }
  },
  "generationConfig": {
    "database": { "client": "postgres" },
    "seed": { "defaultRecords": 1000, "randomSeed": 42 }
  }
}
```

### Valid Strategies

| Strategy | Generates | Options |
|----------|-----------|---------|
| `uuid` | UUID v4 values | — |
| `email` | Email addresses | — |
| `full_name` | Person full names | — |
| `first_name` | First names | — |
| `last_name` | Last names | — |
| `phone` | Phone numbers | — |
| `address` | Street addresses | — |
| `company_name` | Company names | — |
| `money` | Currency amounts | `min`, `max` |
| `integer` | Integers | `min`, `max` |
| `float` | Decimal numbers | `min`, `max` |
| `boolean` | true/false | — |
| `timestamp` | Date/time values | `mode` (past/future), `dependsOn`, `dependencyRule` |
| `enum` | Values from a set | `values`, `weights`, `lifecycleRules` |
| `text` | Random text | `mode` (short/medium/long) |
| `foreign_key` | References parent table | `referencedTable`, `referencedColumn` |
| `custom` | Custom generator | varies |

### Lifecycle Rules

```json
"lifecycleRules": [
  { "value": "cancelled", "nullFields": ["shipped_at", "delivered_at"] }
]
```

When the enum generates "cancelled", the specified fields are set to NULL in that row.

### Temporal Dependencies

```json
"options": {
  "dependsOn": "created_at",
  "dependencyRule": "after"
}
```

Ensures this timestamp is always after the referenced column's value.
