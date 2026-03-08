# DataBox Phase 2 Blueprint — Schema Engine

**Project:** DataBox — Developer Reality Platform  
**Phase:** 2 of 8 — Schema Engine  
**Status:** DRAFT  
**Depends on:** Phase 1 (COMPLETE ✅ — 19/19 + 34/34 + 13/13 compliance)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 2 Objective

Build the schema intelligence layer — the brain of DataBox. After Phase 2, `databox scan` connects to a real PostgreSQL database, introspects its structure, normalizes it into the internal schema model, and prints a human-readable summary.

At the end of Phase 2, the following must be true:

1. `@databox/db` connects to PostgreSQL using the `pg` driver.
2. `@databox/schema` introspects tables, columns, and foreign keys from Postgres metadata.
3. A normalized internal schema model (`DatabaseSchema`, `TableSchema`, `ColumnSchema`, `ForeignKeySchema`) exists and is the **only** representation other packages consume.
4. `databox scan` reads `databox.config.json`, connects to a real Postgres database, and prints a schema summary.
5. The schema model can populate the `GenerationPlan` contract defined in Phase 1.
6. A dependency graph is built from foreign keys and a topological sort produces safe insertion order.

**Phase 2 does NOT include:** Data generation, database writes, templates, or CLI commands beyond `scan`.

---

## Phase 2 Prerequisites

Before Sprint 2A begins, Eddy must have a PostgreSQL instance available for testing. Options:

| Option | Setup |
|--------|-------|
| Local Postgres | Install PostgreSQL 16, create database `databox_dev` |
| Docker | `docker run -d --name databox-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=databox_dev -p 5432:5432 postgres:16` |
| Supabase local | Use existing Supabase CLI if preferred |
| Cloud Postgres | Any accessible Postgres instance |

A test schema must exist with at least 3-4 related tables. Example seed SQL:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMP NOT NULL DEFAULT now(),
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded'
);
```

This gives us: `users → subscriptions ← plans`, `subscriptions → payments` — enough to test FK detection and dependency ordering.

---

## Phase 2 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Postgres client wrapper | `packages/db/src/client.ts` |
| D2 | Normalized schema types | `packages/schema/src/types.ts` |
| D3 | Table introspection | `packages/schema/src/introspection/getTables.ts` |
| D4 | Column introspection | `packages/schema/src/introspection/getColumns.ts` |
| D5 | Foreign key introspection | `packages/schema/src/introspection/getForeignKeys.ts` |
| D6 | Schema normalizer | `packages/schema/src/normalizer.ts` |
| D7 | Schema validator | `packages/schema/src/validator.ts` |
| D8 | Dependency graph + topological sort | `packages/core/src/planning/dependencyGraph.ts` |
| D9 | Scan pipeline orchestrator | `packages/core/src/scanPipeline.ts` |
| D10 | Wired `databox scan` command | `apps/cli/src/commands/scan.ts` |
| D11 | databox.config.json for test database | repo root |
| D12 | Test SQL seed file | `tests/fixtures/seed.sql` |

---

## Phase 2 Sprints

Phase 2 is divided into **3 sprints**.

---

### Sprint 2A — Postgres Client + Normalized Schema Types + Introspection Queries

**Objective:** Connect to Postgres, define the internal schema model, and implement raw introspection queries for tables, columns, and foreign keys.

#### Sprint 2A Prompt (for Claude Code)

```
Read: docs/phase1-blueprint.md, docs/architecture-guardrails.md,
      packages/db/src/index.ts, packages/schema/src/index.ts,
      packages/core/src/planning/types.ts, packages/shared/src/index.ts

Reference: docs/phase2-blueprint.md

CONTEXT:
Phase 1 is complete. The monorepo builds with 8 packages, CLI is wired with
stub commands, Generation Plan types are defined in @databox/core, config
loader exists in @databox/config, and shared utilities (logger, seeded PRNG,
Result type) exist in @databox/shared.

OBJECTIVE:
Build the Postgres connection layer and schema introspection engine.

REQUIREMENTS:

--- Postgres Client (packages/db) ---

1. Install `pg` and `@types/pg` as dependencies of @databox/db
2. src/client.ts:
   - createPostgresClient(connectionString: string) → pg.Pool
   - testConnection(pool: pg.Pool) → Promise<boolean>
   - closeConnection(pool: pg.Pool) → Promise<void>
   - All functions must handle errors gracefully with clear messages
3. src/index.ts — re-export client functions

--- Normalized Schema Types (packages/schema) ---

4. src/types.ts — internal schema model (THE canonical representation):

   DatabaseSchema {
     tables: TableSchema[]
     foreignKeys: ForeignKeySchema[]
     tableCount: number
     foreignKeyCount: number
   }

   TableSchema {
     name: string
     schema: string (default "public")
     columns: ColumnSchema[]
     primaryKey: PrimaryKeySchema | null
     estimatedRowCount: number
   }

   ColumnSchema {
     name: string
     dataType: string
     udtName: string
     isNullable: boolean
     hasDefault: boolean
     defaultValue: string | null
     maxLength: number | null
     isPrimaryKey: boolean
     isUnique: boolean
     ordinalPosition: number
   }

   PrimaryKeySchema {
     columnName: string
     constraintName: string
   }

   ForeignKeySchema {
     constraintName: string
     sourceTable: string
     sourceColumn: string
     targetTable: string
     targetColumn: string
   }

5. src/index.ts — re-export all schema types

--- Introspection Queries (packages/schema) ---

6. src/introspection/getTables.ts:
   - getTables(pool: pg.Pool, schemaName?: string) → Promise<RawTableInfo[]>
   - Query information_schema.tables for BASE TABLE in given schema
   - Default schema: "public"

7. src/introspection/getColumns.ts:
   - getColumns(pool: pg.Pool, schemaName?: string) → Promise<RawColumnInfo[]>
   - Query information_schema.columns
   - Include: column_name, data_type, udt_name, is_nullable, column_default,
     character_maximum_length, ordinal_position, table_name

8. src/introspection/getForeignKeys.ts:
   - getForeignKeys(pool: pg.Pool, schemaName?: string) → Promise<RawForeignKeyInfo[]>
   - Query information_schema.key_column_usage + referential_constraints +
     constraint_column_usage to get source table/column → target table/column

9. src/introspection/getPrimaryKeys.ts:
   - getPrimaryKeys(pool: pg.Pool, schemaName?: string) → Promise<RawPrimaryKeyInfo[]>
   - Query information_schema.table_constraints + key_column_usage
     where constraint_type = 'PRIMARY KEY'

10. src/introspection/index.ts — re-export all introspection functions

--- Raw Types ---

11. Raw introspection types (RawTableInfo, RawColumnInfo, RawForeignKeyInfo,
    RawPrimaryKeyInfo) must be defined in src/introspection/rawTypes.ts
    These are INTERNAL to @databox/schema — never exported to other packages.
    Only the normalized DatabaseSchema types cross package boundaries.

CONSTRAINTS:
- pg Pool must NOT be created or stored globally — pass it as argument
- Raw SQL queries must use parameterized queries where applicable
- Raw introspection types stay inside @databox/schema (never exported)
- Normalized schema types ARE exported (they are the cross-package contract)
- Do NOT implement the normalizer yet (Sprint 2B)
- Do NOT modify CLI commands yet (Sprint 2C)
- Do NOT import from @databox/core (schema package must not depend on core)
- Commit with message: "feat: add postgres client and schema introspection engine"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify @databox/db exports createPostgresClient, testConnection, closeConnection
3. Verify @databox/schema exports DatabaseSchema, TableSchema, ColumnSchema, ForeignKeySchema
4. Verify introspection functions exist and accept pg.Pool as first argument
Report: build status, exported symbols
```

#### Sprint 2A Checklist

```
## Sprint 2A — Postgres Client + Schema Types + Introspection

### Postgres Client (4 points)
- [ ] pg and @types/pg installed in @databox/db
- [ ] createPostgresClient accepts connectionString, returns pg.Pool
- [ ] testConnection returns Promise<boolean>
- [ ] closeConnection gracefully closes pool

### Schema Types (7 points)
- [ ] DatabaseSchema type exported from @databox/schema
- [ ] TableSchema type exported with all fields
- [ ] ColumnSchema type exported with all fields (including udtName, ordinalPosition)
- [ ] PrimaryKeySchema type exported
- [ ] ForeignKeySchema type exported with source/target table/column
- [ ] Raw types (RawTableInfo etc.) are NOT exported from package index
- [ ] No imports from @databox/core in @databox/schema

### Introspection Functions (5 points)
- [ ] getTables queries information_schema.tables
- [ ] getColumns queries information_schema.columns with all required fields
- [ ] getForeignKeys resolves source→target relationships
- [ ] getPrimaryKeys detects PRIMARY KEY constraints
- [ ] All functions accept pg.Pool as first argument (no global state)

### Build (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] No circular dependencies between packages

### Git (1 point)
- [ ] Commit with message "feat: add postgres client and schema introspection engine"

Score: __/19 PASS
Gate: ALL must be ✅ to proceed to Sprint 2B
```

---

### Sprint 2B — Schema Normalizer + Dependency Graph + Topological Sort

**Objective:** Transform raw introspection results into the normalized `DatabaseSchema`, build a foreign key dependency graph, and compute topological insertion order.

#### Sprint 2B Prompt (for Claude Code)

```
Read: packages/schema/src/types.ts, packages/schema/src/introspection/index.ts,
      packages/schema/src/introspection/rawTypes.ts,
      packages/core/src/planning/types.ts, packages/shared/src/types.ts,
      docs/architecture-guardrails.md

Reference: docs/phase2-blueprint.md

CONTEXT:
Sprint 2A is complete. We have a Postgres client in @databox/db, normalized
schema types in @databox/schema, and raw introspection queries for tables,
columns, foreign keys, and primary keys. Raw types are internal to schema package.

OBJECTIVE:
Build the normalizer that transforms raw introspection output into the
canonical DatabaseSchema model, and the dependency graph with topological sort
for FK-safe insertion order.

REQUIREMENTS:

--- Schema Normalizer (packages/schema) ---

1. src/normalizer.ts:
   - normalizeSchema(raw: { tables, columns, foreignKeys, primaryKeys }) → DatabaseSchema
   - Combines raw introspection results into normalized DatabaseSchema
   - Assigns columns to their parent tables
   - Attaches primary key info to each table
   - Sets isPrimaryKey flag on relevant columns
   - Computes tableCount and foreignKeyCount
   - Tables with no columns should be excluded with a warning

2. src/validator.ts:
   - validateSchema(schema: DatabaseSchema) → ValidationResult
   - ValidationResult { valid: boolean, warnings: string[], errors: string[] }
   - Checks:
     a. Every FK source table exists in schema
     b. Every FK target table exists in schema
     c. Every FK source/target column exists in its table
     d. No duplicate table names
     e. Tables have at least one column
   - Warnings (non-blocking): tables with no primary key, nullable FK columns

--- Introspect All (packages/schema) ---

3. src/introspectDatabase.ts:
   - introspectDatabase(pool: pg.Pool, schemaName?: string) → Promise<DatabaseSchema>
   - Calls all 4 introspection functions
   - Passes results through normalizeSchema
   - Runs validateSchema, logs warnings
   - Returns the normalized DatabaseSchema
   - This is the SINGLE entry point other packages use for schema access

4. src/index.ts — export introspectDatabase, all types, validateSchema

--- Dependency Graph (packages/core) ---

5. src/planning/dependencyGraph.ts:
   - buildDependencyGraph(foreignKeys: ForeignKeySchema[]) → DependencyGraph
   - DependencyGraph { nodes: string[], edges: Array<{ from: string, to: string }> }
   - Each edge represents: "from" table depends on "to" table (to must be inserted first)

6. src/planning/topologicalSort.ts:
   - topologicalSort(graph: DependencyGraph) → TopologicalResult
   - TopologicalResult { order: string[], hasCycle: boolean, cycleNodes?: string[] }
   - Uses Kahn's algorithm (BFS-based, deterministic)
   - If cycle detected: return hasCycle: true with involved nodes
   - If no cycle: return safe insertion order

7. src/planning/index.ts — re-export dependencyGraph and topologicalSort

--- Integration ---

8. @databox/core may import from @databox/schema (ForeignKeySchema type only)
   @databox/schema must NOT import from @databox/core

CONSTRAINTS:
- normalizeSchema must be a pure function (no side effects, no DB access)
- validateSchema must be a pure function
- topologicalSort must be deterministic (same input = same output)
- dependencyGraph must handle self-referencing tables (table FK to itself)
- Do NOT modify CLI commands yet (Sprint 2C)
- Do NOT touch @databox/db beyond importing types
- Commit with message: "feat: add schema normalizer, validator, and dependency graph"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify introspectDatabase is exported from @databox/schema
3. Verify topologicalSort is exported from @databox/core
4. Verify normalizeSchema handles empty input without crashing
Report: build status, exported functions list
```

#### Sprint 2B Checklist

```
## Sprint 2B — Normalizer + Dependency Graph + Topological Sort

### Schema Normalizer (6 points)
- [ ] normalizeSchema transforms raw data into DatabaseSchema
- [ ] Columns are correctly assigned to parent tables
- [ ] Primary keys detected and isPrimaryKey flag set on columns
- [ ] tableCount and foreignKeyCount computed correctly
- [ ] Tables with no columns excluded with warning
- [ ] normalizeSchema is a pure function (no DB access, no side effects)

### Schema Validator (5 points)
- [ ] validateSchema returns ValidationResult with valid/warnings/errors
- [ ] Detects FK source table not in schema
- [ ] Detects FK target table not in schema
- [ ] Detects duplicate table names
- [ ] Warns on tables with no primary key

### Introspect Database (3 points)
- [ ] introspectDatabase calls all 4 introspection functions
- [ ] Passes through normalizer and validator
- [ ] Exported from @databox/schema as single entry point

### Dependency Graph (4 points)
- [ ] buildDependencyGraph creates nodes and edges from ForeignKeySchema[]
- [ ] topologicalSort returns correct insertion order
- [ ] topologicalSort detects cycles and reports cycleNodes
- [ ] Handles self-referencing tables without crashing

### Architecture (3 points)
- [ ] @databox/schema does NOT import from @databox/core
- [ ] @databox/core imports only types from @databox/schema
- [ ] All new functions are pure and testable

### Build (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] No circular package dependencies

### Git (1 point)
- [ ] Commit with message "feat: add schema normalizer, validator, and dependency graph"

Score: __/24 PASS
Gate: ALL must be ✅ to proceed to Sprint 2C
```

---

### Sprint 2C — Wire `databox scan` End-to-End

**Objective:** Connect the scan CLI command to the real scan pipeline. Running `databox scan` reads config, connects to Postgres, introspects the schema, computes insertion order, and prints a formatted summary.

#### Sprint 2C Prompt (for Claude Code)

```
Read: apps/cli/src/commands/scan.ts, apps/cli/src/cli.ts,
      packages/core/src/index.ts, packages/core/src/planning/index.ts,
      packages/schema/src/index.ts, packages/db/src/index.ts,
      packages/config/src/index.ts, packages/shared/src/logger.ts,
      docs/architecture-guardrails.md

Reference: docs/phase2-blueprint.md

CONTEXT:
Sprint 2A built the Postgres client and introspection queries.
Sprint 2B built the normalizer, validator, dependency graph, and topological sort.
Now we wire everything together through the scan pipeline and CLI.

OBJECTIVE:
Implement the scan pipeline in @databox/core and wire it to the `databox scan`
CLI command so it produces real output from a live Postgres database.

REQUIREMENTS:

--- Scan Pipeline (packages/core) ---

1. src/scanPipeline.ts:
   - scanDatabase(config: DataboxConfig) → Promise<ScanResult>
   - ScanResult {
       schema: DatabaseSchema,
       insertionOrder: string[],
       hasCycles: boolean,
       cycleNodes?: string[],
       warnings: string[]
     }
   - Flow:
     a. Create Postgres pool from config.database.connectionString
     b. Test connection (fail fast with clear error if unreachable)
     c. Call introspectDatabase from @databox/schema
     d. Build dependency graph from schema.foreignKeys
     e. Run topological sort
     f. Close connection
     g. Return ScanResult
   - Must close connection even if errors occur (try/finally)

2. src/index.ts — export scanPipeline and ScanResult

--- CLI Scan Command (apps/cli) ---

3. src/commands/scan.ts:
   - Load config using loadConfig from @databox/config
   - Call scanDatabase from @databox/core
   - Print formatted output:

     DataBox Schema Scan
     ═══════════════════════════════════════
     Database: [connection string, masked password]
     Tables: [count]
     Foreign Keys: [count]

     Tables:
       users (4 columns, PK: id)
       plans (4 columns, PK: id)
       subscriptions (6 columns, PK: id)
       payments (6 columns, PK: id)

     Foreign Key Relationships:
       subscriptions.user_id → users.id
       subscriptions.plan_id → plans.id
       payments.subscription_id → subscriptions.id

     Safe Insertion Order:
       1. users
       2. plans
       3. subscriptions
       4. payments

     Scan complete. Ready for seed.

   - If connection fails: print clear error with config path
   - If cycles detected: print warning with involved tables
   - Mask password in connection string output (show postgres://user:****@host)

4. apps/cli must add @databox/core, @databox/config, @databox/schema as
   workspace dependencies in its package.json

--- Config Integration ---

5. Create databox.config.json at repo root (gitignored):
   {
     "database": {
       "client": "postgres",
       "connectionString": "postgres://postgres:postgres@localhost:5432/databox_dev"
     },
     "seed": {
       "defaultRecords": 5000,
       "batchSize": 1000,
       "environment": "dev",
       "randomSeed": 42
     },
     "template": "saas"
   }

6. Update .gitignore to include databox.config.json (contains credentials)

--- Test Fixture ---

7. Create tests/fixtures/seed.sql with the 4-table SaaS schema:
   users, plans, subscriptions, payments (exact SQL from Phase 2 blueprint prerequisites)

CONSTRAINTS:
- Scan pipeline must close DB connection in all code paths (try/finally)
- Password must be masked in all CLI output
- CLI scan command must NOT contain business logic (call scanPipeline only)
- If no databox.config.json found, print helpful error pointing to example file
- Do NOT implement seed, reset, or export logic
- Do NOT generate any data
- Commit with message: "feat: wire databox scan end-to-end with live postgres"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Create test database and run seed.sql
3. Run: node apps/cli/dist/index.js scan
4. Verify output shows tables, FKs, and insertion order
Report: build status, full scan output
```

#### Sprint 2C Checklist

```
## Sprint 2C — Wire databox scan End-to-End

### Scan Pipeline (5 points)
- [ ] scanDatabase accepts DataboxConfig and returns ScanResult
- [ ] ScanResult includes schema, insertionOrder, hasCycles, warnings
- [ ] Connection closed in all code paths (try/finally)
- [ ] Fails fast with clear error if DB unreachable
- [ ] Exported from @databox/core

### CLI Scan Command (6 points)
- [ ] Loads config from databox.config.json
- [ ] Prints table count and FK count
- [ ] Prints each table with column count and PK
- [ ] Prints FK relationships (source.col → target.col)
- [ ] Prints safe insertion order (numbered list)
- [ ] Masks password in connection string output

### Config & Fixtures (3 points)
- [ ] databox.config.json exists at root (or .example version)
- [ ] databox.config.json added to .gitignore
- [ ] tests/fixtures/seed.sql contains 4-table SaaS schema

### Architecture (4 points)
- [ ] CLI scan command contains NO business logic (delegates to scanPipeline)
- [ ] @databox/core imports from @databox/schema and @databox/db (types/functions)
- [ ] @databox/schema does NOT import from @databox/core
- [ ] Workspace dependencies declared in apps/cli/package.json

### Build (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] No circular package dependencies

### Git (1 point)
- [ ] Commit with message "feat: wire databox scan end-to-end with live postgres"

Score: __/21 PASS
Gate: ALL must be ✅ to close Phase 2
```

---

## Phase 2 Architecture Compliance Matrix

| # | Guardrail | Sprint 2A | Sprint 2B | Sprint 2C | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | N/A | scan delegates to scanPipeline | ☐ |
| 2 | Schema Normalized Once | Raw types internal, normalized types exported | normalizeSchema is single transform | CLI never sees raw types | ☐ |
| 3 | Separate Planning from Execution | N/A | Dependency graph produces plan data | Scan builds plan info, no execution | ☐ |
| 4 | Deterministic Generation | N/A | Topological sort is deterministic | N/A | ☐ |
| 5 | Dependency Safety | N/A | FK graph + topological sort | Insertion order in scan output | ☐ |
| 6 | Reality Packs Core Artifact | Schema model supports future pack metadata | N/A | N/A | ☐ |
| 7 | Domain Templates First-Class | N/A | N/A | N/A (Phase 6) | ☐ |
| 8 | Simulation Extensible | N/A | N/A | N/A | ☐ |
| 9 | Configuration Explicit | N/A | N/A | Config loaded from databox.config.json | ☐ |
| 10 | Testability Non-Negotiable | Pure introspection functions | Pure normalizer + validator + sort | Pipeline testable with mock pool | ☐ |
| 11 | Performance Must Scale | N/A | N/A | N/A | ☐ |
| 12 | Safe by Default | N/A | N/A | Scan is read-only (no writes) | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | No extra features | ☐ |

---

## Phase 2 Demo Walkthrough

After all sprints pass, Eddy runs end-to-end verification:

```powershell
# 1. Ensure test database exists with seed schema
# (run seed.sql against databox_dev)

# 2. Create config file
# Copy databox.config.example.json to databox.config.json
# Update connectionString if needed

# 3. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 4. Run scan
node apps/cli/dist/index.js scan

# Expected output:
# - Table list with column counts
# - FK relationships
# - Safe insertion order
# - "Scan complete. Ready for seed."
```

---

## Phase 2 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 2A checklist | 19/19 ✅ |
| Sprint 2B checklist | 24/24 ✅ |
| Sprint 2C checklist | 21/21 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | `databox scan` produces correct output from live DB |
| Git | 3 commits on feature branch |

**Phase 2 is COMPLETE when all criteria are met.**  
**Phase 3 (Generator Core) begins only after Phase 2 is fully verified.**

---

## What Phase 3 Will Build On

Phase 3 will:

- Implement column strategy inference (reading ColumnSchema → choosing ColumnStrategy)
- Build primitive generators (email, name, uuid, timestamp, money, enum, etc.)
- Create the Generation Plan builder (schema → plan using the V1 contract from Phase 1)
- Implement the dataset generation engine (plan → in-memory dataset)
- Wire deterministic generation via the seeded PRNG from @databox/shared

The normalized DatabaseSchema from Phase 2 feeds directly into Phase 3's strategy inference.  
The dependency graph and topological sort from Phase 2 define the table generation order in Phase 3.
