# DataBox Phase 4 Blueprint — Database Writer + Operations

**Project:** DataBox — Developer Reality Platform  
**Phase:** 4 of 8 — Database Writer + Operations  
**Status:** DRAFT  
**Depends on:** Phase 3 (COMPLETE ✅ — 27/27 + 25/25 + determinism verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 4 Objective

Build the database writer and wire all four CLI commands end-to-end. After Phase 4, a developer can run `databox seed` and see their database populated with realistic data, `databox reset` to clear it, and `databox export` to save datasets as JSON/CSV/SQL files.

At the end of Phase 4, the following must be true:

1. `databox seed` scans the DB, builds a plan, generates a dataset, and writes it to Postgres via batched inserts.
2. `databox seed --records 500 --seed 42` produces a smaller deterministic dataset.
3. `databox reset --confirm` safely truncates seeded tables in reverse dependency order.
4. `databox export --format json` generates a dataset and writes it to files without touching the DB.
5. `databox export --format csv` and `--format sql` also work.
6. All writes use transactions — if any insert fails, the entire seed rolls back.
7. The full developer workflow works: `scan → seed → verify → reset → seed again`.

**Phase 4 does NOT include:** Domain templates, distribution overrides, time evolution, or scenario injection.

---

## Phase 4 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Batch insert writer | `packages/db/src/batchInsert.ts` |
| D2 | Table truncation (reset) | `packages/db/src/truncate.ts` |
| D3 | Transaction wrapper | `packages/db/src/transaction.ts` |
| D4 | Seed pipeline | `packages/core/src/seedPipeline.ts` |
| D5 | Reset pipeline | `packages/core/src/resetPipeline.ts` |
| D6 | Export pipeline | `packages/core/src/exportPipeline.ts` |
| D7 | JSON exporter | `packages/generators/src/exporters/json.ts` |
| D8 | CSV exporter | `packages/generators/src/exporters/csv.ts` |
| D9 | SQL exporter | `packages/generators/src/exporters/sql.ts` |
| D10 | Wired `databox seed` command | `apps/cli/src/commands/seed.ts` |
| D11 | Wired `databox reset` command | `apps/cli/src/commands/reset.ts` |
| D12 | Wired `databox export` command | `apps/cli/src/commands/export.ts` |

---

## Phase 4 Sprints

Phase 4 is divided into **3 sprints**.

---

### Sprint 4A — Batch Insert Writer + Transaction Wrapper + Truncation

**Objective:** Build the database write layer — batched inserts with transaction safety, and safe table truncation for reset.

#### Sprint 4A Prompt (for Claude Code)

```
Read: packages/db/src/client.ts, packages/db/src/index.ts,
      packages/generators/src/types.ts,
      packages/core/src/planning/types.ts,
      packages/core/src/planning/topologicalSort.ts,
      packages/schema/src/types.ts,
      docs/architecture-guardrails.md

CONTEXT:
Phase 3 is complete. DataBox can scan a Postgres database, infer column
strategies, build a Generation Plan, and produce a complete in-memory dataset
(GeneratedDataset) with valid FK references and deterministic output.

Now we build the write layer.

OBJECTIVE:
Implement batched database inserts with transaction safety and table truncation.

REQUIREMENTS:

--- Transaction Wrapper (packages/db) ---

1. src/transaction.ts:
   - withTransaction<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>) → Promise<T>
   - Acquires a client from the pool
   - Calls BEGIN
   - Executes fn(client)
   - If fn succeeds: COMMIT and return result
   - If fn throws: ROLLBACK and re-throw error
   - Always releases client back to pool (try/finally)

--- Batch Insert Writer (packages/db) ---

2. src/batchInsert.ts:
   - batchInsertTable(client: pg.PoolClient, table: GeneratedTable, batchSize: number) → Promise<InsertResult>
   - InsertResult { tableName: string, rowsInserted: number, batchCount: number, durationMs: number }
   - Flow:
     a. Build INSERT INTO "tableName" ("col1", "col2", ...) VALUES ($1, $2, ...) statement
     b. Split rows into batches of batchSize
     c. For each batch, execute the INSERT with parameterized values
     d. Use multi-row INSERT (single statement per batch, not per row)
     e. Track and return insert metrics
   - Column names and table names must be quoted with double quotes (SQL injection safe)
   - Values must use parameterized queries ($1, $2, ...) — NEVER string interpolation

   - batchInsertDataset(client: pg.PoolClient, dataset: GeneratedDataset, tableOrder: string[], batchSize: number) → Promise<DatasetInsertResult>
   - DatasetInsertResult { tables: InsertResult[], totalRows: number, totalDurationMs: number }
   - Inserts tables in tableOrder sequence (FK-safe order)
   - Calls batchInsertTable for each table

3. src/index.ts — re-export transaction, batchInsert functions and types

--- Table Truncation (packages/db) ---

4. src/truncate.ts:
   - truncateTables(pool: pg.Pool, tableNames: string[], cascade: boolean) → Promise<TruncateResult>
   - TruncateResult { tablesCleared: string[], durationMs: number }
   - Truncates tables in the given order (should be reverse dependency order)
   - Uses TRUNCATE "tableName" CASCADE if cascade=true
   - Uses TRUNCATE "tableName" if cascade=false
   - Wraps in a transaction
   - Table names must be double-quoted

5. src/index.ts — re-export truncate functions and types

CONSTRAINTS:
- ALL table and column names must be double-quoted in SQL (prevents reserved word conflicts)
- ALL values must use parameterized queries (never string interpolation)
- Multi-row INSERT for performance (not single-row per statement)
- Transaction wrapper must ALWAYS release client (try/finally)
- Truncation must not drop tables — only TRUNCATE
- Do NOT modify CLI commands yet (Sprint 4C)
- Do NOT build pipelines yet (Sprint 4B)
- Commit with message: "feat: add batch insert writer, transaction wrapper, and truncation"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify batchInsertTable, batchInsertDataset, withTransaction, truncateTables exported from @databox/db
Report: build status, exported symbols
```

#### Sprint 4A Checklist

```
## Sprint 4A — Batch Insert + Transaction + Truncation

### Transaction Wrapper (3 points)
- [ ] withTransaction acquires client, runs BEGIN/COMMIT
- [ ] ROLLBACK on error, re-throws
- [ ] Client always released via try/finally

### Batch Insert Writer (7 points)
- [ ] batchInsertTable builds parameterized INSERT statements
- [ ] Multi-row INSERT (not single row per statement)
- [ ] Table and column names double-quoted
- [ ] Values use $1, $2 parameterized queries (no string interpolation)
- [ ] Rows split into configurable batch sizes
- [ ] InsertResult tracks rowsInserted, batchCount, durationMs
- [ ] batchInsertDataset inserts tables in tableOrder sequence

### Truncation (3 points)
- [ ] truncateTables accepts table names and cascade flag
- [ ] Table names double-quoted in SQL
- [ ] Wraps in transaction

### Architecture (2 points)
- [ ] @databox/db imports types from @databox/generators (GeneratedTable only)
- [ ] No business logic in @databox/db (pure database operations)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add batch insert writer, transaction wrapper, and truncation"

Score: __/17 PASS
Gate: ALL must be ✅ to proceed to Sprint 4B
```

---

### Sprint 4B — Seed Pipeline + Reset Pipeline + Export Pipeline + Exporters

**Objective:** Build the orchestration pipelines that connect scanning, planning, generation, and writing into complete workflows. Build JSON/CSV/SQL exporters.

#### Sprint 4B Prompt (for Claude Code)

```
Read: packages/core/src/scanPipeline.ts, packages/core/src/index.ts,
      packages/db/src/batchInsert.ts, packages/db/src/truncate.ts,
      packages/db/src/transaction.ts, packages/db/src/client.ts,
      packages/generators/src/engine.ts, packages/generators/src/types.ts,
      packages/core/src/planning/buildPlan.ts,
      packages/config/src/types.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 4A is complete. We have batched insert writer, transaction wrapper,
and table truncation in @databox/db. The generation engine from Phase 3
produces GeneratedDataset in memory.

OBJECTIVE:
Build seed/reset/export pipelines in @databox/core and dataset exporters
in @databox/generators.

REQUIREMENTS:

--- Seed Pipeline (packages/core) ---

1. src/seedPipeline.ts:
   - seedDatabase(config: DataboxConfig, options?: SeedOptions) → Promise<SeedResult>
   - SeedOptions { records?: number, seed?: number, template?: string }
   - SeedResult {
       schema: DatabaseSchema,
       plan: GenerationPlan,
       insertResult: DatasetInsertResult,
       totalRows: number,
       durationMs: number
     }
   - Flow:
     a. Create Postgres pool from config
     b. Test connection (fail fast)
     c. Introspect schema
     d. Build generation plan (override records/seed from options if provided)
     e. Validate plan (abort if errors)
     f. Generate dataset
     g. Within a transaction: batch insert dataset in tableOrder
     h. Close connection (try/finally)
     i. Return SeedResult with all metadata

2. Must close DB connection in ALL code paths (try/finally at top level)
3. If generation or insertion fails, transaction rolls back — DB stays clean

--- Reset Pipeline (packages/core) ---

4. src/resetPipeline.ts:
   - resetDatabase(config: DataboxConfig) → Promise<ResetResult>
   - ResetResult { tablesCleared: string[], durationMs: number }
   - Flow:
     a. Create Postgres pool
     b. Test connection
     c. Introspect schema (to get table list and FK order)
     d. Compute reverse dependency order (reverse of topological sort)
     e. Truncate tables in reverse order with CASCADE
     f. Close connection (try/finally)
     g. Return ResetResult

--- Export Pipeline (packages/core) ---

5. src/exportPipeline.ts:
   - exportDataset(config: DataboxConfig, options?: ExportOptions) → Promise<ExportResult>
   - ExportOptions { format?: "json" | "csv" | "sql", outputDir?: string, records?: number, seed?: number }
   - ExportResult { format: string, files: string[], totalRows: number, outputDir: string }
   - Flow:
     a. Create Postgres pool
     b. Introspect schema
     c. Build plan (with options overrides)
     d. Generate dataset
     e. Export dataset using appropriate exporter
     f. Close connection (try/finally)
     g. Return ExportResult

--- Exporters (packages/generators) ---

6. src/exporters/json.ts:
   - exportToJson(dataset: GeneratedDataset, outputDir: string) → Promise<string[]>
   - Creates outputDir if it doesn't exist
   - Writes one file per table: {tableName}.json
   - Each file contains array of row objects
   - Returns list of file paths written

7. src/exporters/csv.ts:
   - exportToCsv(dataset: GeneratedDataset, outputDir: string) → Promise<string[]>
   - Writes one file per table: {tableName}.csv
   - Header row with column names
   - Values properly escaped (handle commas, quotes, newlines in data)
   - Returns list of file paths written

8. src/exporters/sql.ts:
   - exportToSql(dataset: GeneratedDataset, outputDir: string, tableOrder: string[]) → Promise<string[]>
   - Writes single file: seed.sql
   - Contains INSERT statements in tableOrder
   - Table and column names double-quoted
   - Values properly escaped for SQL
   - Returns list of file paths written

9. src/exporters/index.ts — re-export all exporters

10. packages/core/src/index.ts — re-export seedPipeline, resetPipeline, exportPipeline

CONSTRAINTS:
- Seed pipeline must wrap ALL inserts in a single transaction
- If any insert fails, entire seed rolls back
- Reset uses reverse dependency order (children before parents)
- Export does NOT write to database (generate + export to files only)
- Exporters must create output directory if it doesn't exist
- SQL exporter must produce valid, runnable SQL
- CSV exporter must handle edge cases (commas in data, null values)
- All pipelines must close DB connection in finally blocks
- Do NOT modify CLI commands yet (Sprint 4C)
- Commit with message: "feat: add seed, reset, and export pipelines with file exporters"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify seedDatabase, resetDatabase, exportDataset exported from @databox/core
3. Verify exportToJson, exportToCsv, exportToSql exported from @databox/generators
Report: build status, exported symbols
```

#### Sprint 4B Checklist

```
## Sprint 4B — Seed/Reset/Export Pipelines + Exporters

### Seed Pipeline (6 points)
- [ ] seedDatabase accepts DataboxConfig + SeedOptions
- [ ] Returns SeedResult with schema, plan, insertResult, totalRows, durationMs
- [ ] Overrides records and seed from SeedOptions
- [ ] All inserts wrapped in single transaction
- [ ] Transaction rolls back on failure
- [ ] DB connection closed in all code paths (try/finally)

### Reset Pipeline (4 points)
- [ ] resetDatabase accepts DataboxConfig
- [ ] Introspects schema to determine table order
- [ ] Truncates in reverse dependency order
- [ ] DB connection closed in all code paths

### Export Pipeline (3 points)
- [ ] exportDataset generates dataset and exports to files
- [ ] Supports format option (json, csv, sql)
- [ ] DB connection closed in all code paths

### JSON Exporter (2 points)
- [ ] Writes one {tableName}.json per table
- [ ] Files contain array of row objects

### CSV Exporter (2 points)
- [ ] Writes one {tableName}.csv per table with header row
- [ ] Handles commas and special characters in values

### SQL Exporter (2 points)
- [ ] Writes single seed.sql file
- [ ] INSERT statements in tableOrder with proper quoting

### Architecture (2 points)
- [ ] Pipelines in @databox/core orchestrate other packages
- [ ] Exporters in @databox/generators (no DB dependency)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add seed, reset, and export pipelines with file exporters"

Score: __/23 PASS
Gate: ALL must be ✅ to proceed to Sprint 4C
```

---

### Sprint 4C — Wire All CLI Commands End-to-End

**Objective:** Connect seed, reset, and export CLI commands to their pipelines. After this sprint, all four commands work against a live database.

#### Sprint 4C Prompt (for Claude Code)

```
Read: apps/cli/src/commands/seed.ts, apps/cli/src/commands/reset.ts,
      apps/cli/src/commands/export.ts, apps/cli/src/commands/scan.ts,
      apps/cli/src/cli.ts,
      packages/core/src/seedPipeline.ts,
      packages/core/src/resetPipeline.ts,
      packages/core/src/exportPipeline.ts,
      packages/config/src/loadConfig.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 4B is complete. Seed, reset, and export pipelines exist in @databox/core.
Exporters for JSON, CSV, and SQL exist in @databox/generators. The database
write layer (batch insert, transaction, truncation) exists in @databox/db.

OBJECTIVE:
Wire all CLI commands to their respective pipelines with proper output formatting.

REQUIREMENTS:

--- databox seed (apps/cli/src/commands/seed.ts) ---

1. Load config (handle missing config with helpful error)
2. Apply CLI options: --records overrides config, --seed overrides config, --template overrides config
3. Call seedDatabase from @databox/core
4. Print formatted output:

   DataBox Seed
   ═══════════════════════════════════════
   Database: postgres://postgres:****@localhost:5432/databox_dev
   Template: saas
   Seed: 42
   Records per table: 5000

   Generating...
     plans: 5000 rows
     users: 5000 rows
     subscriptions: 5000 rows
     payments: 5000 rows

   Writing to database...
     plans: 5000 rows inserted (3 batches, 120ms)
     users: 5000 rows inserted (3 batches, 145ms)
     subscriptions: 5000 rows inserted (3 batches, 180ms)
     payments: 5000 rows inserted (3 batches, 165ms)

   Seed complete. 20000 rows in 1.2s

5. If seed fails: print error, confirm DB was not modified (transaction rollback)
6. Mask password in output

--- databox reset (apps/cli/src/commands/reset.ts) ---

7. Load config
8. If --confirm flag NOT provided: print warning and exit
   "This will delete ALL seeded data. Run with --confirm to proceed."
9. If --confirm provided: call resetDatabase from @databox/core
10. Print formatted output:

    DataBox Reset
    ═══════════════════════════════════════
    Clearing tables...
      payments: cleared
      subscriptions: cleared
      plans: cleared
      users: cleared

    Reset complete. 4 tables cleared in 45ms

11. Mask password in output

--- databox export (apps/cli/src/commands/export.ts) ---

12. Load config
13. Apply CLI options: --format (json|csv|sql), --output (directory), --records, --seed
14. Default format: json, default output: ./.databox
15. Call exportDataset from @databox/core
16. Print formatted output:

    DataBox Export
    ═══════════════════════════════════════
    Format: json
    Output: ./.databox
    Records per table: 5000

    Generating dataset...
    Exporting...
      .databox/plans.json (5000 rows)
      .databox/users.json (5000 rows)
      .databox/subscriptions.json (5000 rows)
      .databox/payments.json (5000 rows)

    Export complete. 4 files written.

17. Mask password in output

--- General CLI Improvements ---

18. All commands must handle errors gracefully:
    - Missing config: point to databox.config.example.json
    - DB connection failure: print connection string (masked) and suggest checking Docker
    - Any other error: print error message, exit with code 1

19. All commands must use the logger from @databox/shared for consistent output

20. Add .databox/ to .gitignore (export output directory)

CONSTRAINTS:
- CLI commands must NOT contain business logic (delegate to pipelines)
- Password masking on all connection string output
- Reset REQUIRES --confirm flag (safe by default)
- Export must NOT write to database
- All error paths must exit cleanly (no unhandled promise rejections)
- Commit with message: "feat: wire seed, reset, and export CLI commands end-to-end"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Run: node apps/cli/dist/index.js seed --records 100 --seed 42
3. Run: node apps/cli/dist/index.js export --format json --records 50
4. Run: node apps/cli/dist/index.js reset --confirm
5. Run: node apps/cli/dist/index.js seed --records 100 --seed 42 (re-seed after reset)
Report: build status, output from each command
```

#### Sprint 4C Checklist

```
## Sprint 4C — Wire All CLI Commands

### databox seed (6 points)
- [ ] Loads config and applies --records, --seed, --template overrides
- [ ] Calls seedDatabase pipeline
- [ ] Prints generation progress (table names, row counts)
- [ ] Prints insert progress (batches, duration per table)
- [ ] Prints total summary (total rows, total time)
- [ ] Masks password in output

### databox reset (4 points)
- [ ] Requires --confirm flag (exits with warning if missing)
- [ ] Calls resetDatabase pipeline
- [ ] Prints tables cleared in reverse dependency order
- [ ] Masks password in output

### databox export (5 points)
- [ ] Supports --format json|csv|sql
- [ ] Supports --output directory option
- [ ] Generates dataset and writes files (no DB writes)
- [ ] Prints file list with row counts
- [ ] Creates output directory if it doesn't exist

### Error Handling (3 points)
- [ ] Missing config prints helpful error with example file reference
- [ ] DB connection failure prints masked connection string
- [ ] All errors exit cleanly with code 1

### Architecture (2 points)
- [ ] CLI commands contain NO business logic (delegate to pipelines)
- [ ] .databox/ added to .gitignore

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: wire seed, reset, and export CLI commands end-to-end"

Score: __/22 PASS
Gate: ALL must be ✅ to close Phase 4
```

---

## Phase 4 Architecture Compliance Matrix

| # | Guardrail | Sprint 4A | Sprint 4B | Sprint 4C | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | Pipelines in core | CLI delegates to pipelines | ☐ |
| 2 | Schema Normalized Once | N/A | Pipelines use DatabaseSchema | N/A | ☐ |
| 3 | Separate Planning from Execution | N/A | Plan built before generation/write | N/A | ☐ |
| 4 | Deterministic Generation | N/A | Seed option flows through pipeline | --seed flag in CLI | ☐ |
| 5 | Dependency Safety | Inserts follow tableOrder | Truncation in reverse order | N/A | ☐ |
| 6 | Reality Packs Core Artifact | N/A | Export produces portable files | Export via CLI | ☐ |
| 7 | Domain Templates First-Class | N/A | Template option in SeedOptions | --template flag | ☐ |
| 8 | Simulation Extensible | N/A | Pipeline reads plan, not hardcoded | N/A | ☐ |
| 9 | Configuration Explicit | N/A | Config flows through all pipelines | CLI loads config | ☐ |
| 10 | Testability Non-Negotiable | DB functions accept client arg | Pipelines accept config arg | N/A | ☐ |
| 11 | Performance Must Scale | Multi-row batched inserts | Configurable batch size | N/A | ☐ |
| 12 | Safe by Default | Transaction rollback on failure | Reset requires confirmation | --confirm required | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | No extra features | ☐ |

---

## Phase 4 Demo Walkthrough

After all sprints pass, Eddy runs the full developer workflow:

```powershell
# 1. Ensure Docker Postgres is running
docker ps  # verify databox-pg

# 2. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 3. Scan (should still work from Phase 2)
node apps/cli/dist/index.js scan

# 4. Seed with 100 rows per table, seed 42
node apps/cli/dist/index.js seed --records 100 --seed 42

# 5. Verify data exists in Postgres
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM users;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM payments;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT email, full_name FROM users LIMIT 5;"

# 6. Export to JSON
node apps/cli/dist/index.js export --format json --records 50

# 7. Verify export files
ls .databox

# 8. Reset
node apps/cli/dist/index.js reset --confirm

# 9. Verify tables are empty
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM users;"

# 10. Re-seed (proves reset + seed cycle works)
node apps/cli/dist/index.js seed --records 100 --seed 42

# 11. Verify determinism: same data as step 4
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT email, full_name FROM users ORDER BY email LIMIT 3;"
```

---

## Phase 4 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 4A checklist | 17/17 ✅ |
| Sprint 4B checklist | 23/23 ✅ |
| Sprint 4C checklist | 22/22 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | Full scan→seed→verify→export→reset→reseed cycle works |
| Git | 3 commits on feature branch |

**Phase 4 is COMPLETE when all criteria are met.**  
**Phase 5 (Domain Intelligence) begins only after Phase 4 is fully verified.**

---

## What Phase 5 Will Build On

Phase 5 will:

- Build the statistical distribution engine (weighted categories, bounded ranges, long-tail distributions)
- Create the SaaS domain template (realistic users, plans, subscriptions, payments patterns)
- Create the e-commerce domain template (customers, products, orders, order_items)
- Add template selection in config and CLI (`--template saas`)
- Override default strategy inference with domain-specific rules

The seed/reset/export workflow from Phase 4 is the delivery mechanism.  
Phase 5 makes the generated data realistic rather than merely plausible.
