# RealityDB Platform Overview

## What is RealityDB?

RealityDB is a synthetic data platform that generates production-realistic database environments from schema definitions. It consists of two products that work together:

**RealityDB Studio** — A visual design workbench where you define database schemas, configure data generation strategies, and preview synthetic data before committing to generation. Available at [studio.realitydb.dev](https://studio.realitydb.dev).

**RealityDB CLI** — A command-line engine that executes schema definitions at scale, generating millions of rows with correct foreign key relationships, temporal ordering, lifecycle state machines, and weighted distributions. Available via `npm install -g realitydb`.

## Architecture

```
RealityDB Studio (design + preview)
       |
       | exports
       v
  RealityDB Template (.json)
       |
       | executes
       v
  RealityDB CLI (generation engine)
       |
       | outputs
       v
  PostgreSQL / MySQL / CSV / JSON
```

The contract between Studio and CLI is a **RealityDB Template** — a JSON file that describes tables, columns, generation strategies, foreign key relationships, lifecycle rules, and temporal dependencies.

## Core Concepts

### Templates
A template tells the CLI how to generate data for each column. Instead of random noise, each column gets a **strategy** — a rule that produces domain-realistic values:

- `uuid` — UUIDs for primary keys
- `full_name` — realistic person names
- `email` — valid email addresses
- `enum` — values from a defined set with optional weighted distribution
- `timestamp` — dates with optional temporal dependencies
- `float` / `integer` — numbers within specified ranges
- `foreign_key` — values that reference another table's primary key

### Lifecycle Rules
Enum columns can have lifecycle rules that null dependent fields based on state. For example, when an order's status is "cancelled", the `shipped_at` field is automatically set to NULL — because cancelled orders were never shipped.

### Temporal Dependencies
Timestamp columns can depend on other timestamps. For example, `delivered_at` must always be after `shipped_at`, and `shipped_at` must always be after `created_at`. The engine enforces these constraints automatically.

### Weighted Distributions
Enum values can have weights that control their distribution. Instead of uniform random selection, you can specify that 60% of orders are "delivered", 20% are "shipped", 10% are "pending", and 10% are "returned" — matching real-world patterns.

### Foreign Key Integrity
The engine generates data in dependency order (parent tables first), ensuring every foreign key reference points to a real row in the parent table. Zero orphan references, guaranteed.

## Key Commands

| Command | What It Does |
|---------|-------------|
| `realitydb run --pack <file> --connection <url>` | Create schema + seed data in one command |
| `realitydb capture --name <name> --safe` | Capture live database state with PII masking |
| `realitydb load <file> --confirm` | Restore a captured environment |
| `realitydb seed --template <file>` | Seed an existing database with generated data |
| `realitydb analyze` | Auto-infer generation strategies from a live schema |
| `realitydb scan` | Introspect and display database schema |
| `realitydb mask` | Detect and mask PII in your database |
| `realitydb audit verify <file>` | Verify audit log integrity |

## Scale Performance

Verified at scale with zero violations:

| Metric | Result |
|--------|--------|
| 2 million rows, 5 tables | 89.4 seconds |
| 2.7 million rows, 7 industry templates | 129 seconds |
| Weighted enum accuracy | Exact match to specified weights |
| Lifecycle rule compliance | 100% (zero violations) |
| Temporal ordering violations | Zero |
| Foreign key orphans | Zero |

## Industry Templates

Studio ships with 7 production-quality domain templates:

1. **SaaS Subscription Platform** — organizations, users, subscriptions, payments
2. **E-Commerce Marketplace** — customers, products, orders, shipments
3. **FinTech Banking** — accounts, transactions, fraud alerts
4. **Logistics & Supply Chain** — suppliers, purchase orders, shipments, inventory
5. **Healthcare Systems** — patients, appointments, encounters, billing
6. **Cyber-Security Intelligence** — access logs, login attempts, security alerts
7. **AI Event-Stream Systems** — users, events, inference logs, drift alerts

Each template includes lifecycle rules, temporal dependencies, weighted distributions, and foreign key chains specific to its industry.

## Getting Started

### Quickest Path (Studio + CLI)
1. Visit [studio.realitydb.dev](https://studio.realitydb.dev)
2. Load a domain template or design your own schema
3. Click Export, then RealityDB Template
4. Run: `realitydb run --pack template.json --connection "postgresql://user:pass@host:5432/db"`

### CLI Only
```bash
npm install -g realitydb
realitydb init          # Interactive setup wizard
realitydb scan          # See your schema
realitydb seed          # Generate data
```

### Bug Reproduction
```bash
realitydb capture --name bug-4821 --safe    # Capture with PII masking
# Share the .realitydb-pack.json file with your teammate
realitydb load bug-4821.realitydb-pack.json --confirm  # Reproduce locally
```
