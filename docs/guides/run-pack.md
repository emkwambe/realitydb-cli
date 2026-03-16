# Guide: One-Command Database Setup with `realitydb run`

## Overview

`realitydb run --pack` is the fastest way to go from a schema design to a fully populated database. One command creates the tables and seeds them with production-realistic data.

## Prerequisites

- Node.js 20+
- PostgreSQL (local, Docker, or cloud)
- RealityDB CLI: `npm install -g realitydb`

## The Workflow

### Step 1: Design Your Schema

Option A — Use RealityDB Studio at [studio.realitydb.dev](https://studio.realitydb.dev):
1. Add tables using the sidebar or load a domain template
2. Define columns with appropriate strategies (uuid, email, enum, timestamp, etc.)
3. Draw relationships between tables (FK connections)
4. Configure lifecycle rules and temporal dependencies
5. Click Export, then RealityDB Template

Option B — Write a template JSON manually:
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "description": "My application schema",
  "tables": {
    "users": {
      "match": "users",
      "columns": {
        "id": { "strategy": "uuid" },
        "email": { "strategy": "email" },
        "name": { "strategy": "full_name" },
        "role": {
          "strategy": "enum",
          "options": {
            "values": ["admin", "member", "viewer"],
            "weights": [10, 70, 20]
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    },
    "posts": {
      "match": "posts",
      "columns": {
        "id": { "strategy": "uuid" },
        "user_id": {
          "strategy": "uuid",
          "foreignKey": { "table": "users", "column": "id" }
        },
        "title": { "strategy": "text" },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["draft", "published", "archived"],
            "weights": [20, 70, 10]
          }
        },
        "published_at": {
          "strategy": "timestamp",
          "options": {
            "dependsOn": "created_at",
            "dependencyRule": "after"
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    }
  },
  "generationConfig": {
    "database": { "client": "postgres" },
    "seed": { "defaultRecords": 1000, "randomSeed": 42 }
  }
}
```

### Step 2: Create a Database

```bash
createdb my_app_dev
# Or with Docker:
docker run -d --name my-pg -e POSTGRES_PASSWORD=secret -p 5432:5432 postgres:16
docker exec my-pg createdb -U postgres my_app_dev
```

### Step 3: Run

```bash
realitydb run \
  --pack my-template.json \
  --connection "postgresql://postgres:secret@localhost:5432/my_app_dev" \
  --records 10000 \
  --seed 42
```

Output:
```
RealityDB Run
========================================
Pack: my-template.json
Database: postgresql://postgres:****@localhost:5432/my_app_dev
Records per table: 10000
Seed: 42

Creating schema...
  Created table: users (5 columns)
  Created table: posts (6 columns)

Seeding data...
  users: 10000 rows inserted (10 batches, 450ms)
  posts: 10000 rows inserted (10 batches, 380ms)

RealityDB Run Complete
========================================
Schema: 2 tables created
Data: 20000 total rows in 2.1s
```

## Command Options

| Option | Required | Description |
|--------|----------|-------------|
| `--pack <path>` | Yes | Path to Studio template or hand-written JSON |
| `--connection <url>` | Yes | PostgreSQL connection string |
| `--records <count>` | No | Rows per table (overrides template default) |
| `--seed <number>` | No | Random seed for reproducibility |
| `--drop-existing` | No | Drop and recreate tables if they exist |
| `--dry-run` | No | Preview DDL and plan without executing |

## Dry Run Mode

Preview what would happen without touching the database:

```bash
realitydb run --pack template.json --connection "..." --dry-run
```

This prints the DDL statements and generation plan. Useful for reviewing before committing to a production-like environment.

## Reproducibility

Using the same `--seed` value with the same template always produces identical data:

```bash
# These two commands produce exactly the same dataset:
realitydb run --pack template.json --connection "..." --seed 42
realitydb run --pack template.json --connection "..." --seed 42
```

This is critical for test suites — your assertions can depend on specific generated values.

## Lifecycle Rules in Action

When your template defines lifecycle rules:
```json
"status": {
  "strategy": "enum",
  "options": {
    "values": ["pending", "shipped", "delivered", "returned"],
    "weights": [20, 30, 40, 10],
    "lifecycleRules": [
      { "value": "returned", "nullFields": ["shipped_at"] },
      { "value": "pending", "nullFields": ["shipped_at"] }
    ]
  }
}
```

The engine automatically:
- Sets `shipped_at` to NULL for all "returned" and "pending" orders
- Ensures `shipped_at` is always AFTER `created_at` for shipped/delivered orders
- Distributes statuses according to the specified weights

## Integrating with CI/CD

```yaml
# GitHub Actions example
- name: Setup test database
  run: |
    npm install -g realitydb
    realitydb run \
      --pack ./fixtures/test-template.json \
      --connection ${{ secrets.TEST_DB_URL }} \
      --records 1000 \
      --seed 42
```

## Troubleshooting

**"Pack file not found"** — Check the path to your template JSON file.

**"Tables already exist"** — Use `--drop-existing` to recreate tables, or seed into a fresh database.

**"Connection refused"** — Verify your database is running and the connection string is correct.

**"Unknown strategy"** — Check that all column strategies are valid CLI strategies (uuid, email, full_name, phone, enum, timestamp, integer, float, boolean, text, money, company_name, address, foreign_key).
