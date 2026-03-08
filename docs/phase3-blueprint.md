# DataBox Phase 3 Blueprint — Generator Core

**Project:** DataBox — Developer Reality Platform  
**Phase:** 3 of 8 — Generator Core  
**Status:** DRAFT  
**Depends on:** Phase 2 (COMPLETE ✅ — 19/19 + 24/24 + 21/21 + live scan verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 3 Objective

Build the data generation engine — the heart of DataBox. After Phase 3, the system can read a database schema, infer how to generate realistic data for each column, build a Generation Plan, and produce a complete in-memory dataset with valid foreign key references and deterministic output.

At the end of Phase 3, the following must be true:

1. Column strategy inference automatically maps `ColumnSchema` → `ColumnStrategy` using name heuristics and data types.
2. Primitive generators produce realistic values for all 18 strategy kinds (uuid, email, first_name, etc.).
3. A Generation Plan builder transforms `DatabaseSchema` + `DataboxConfig` into a complete `GenerationPlan`.
4. A dataset generation engine executes the plan and produces rows in FK-safe order.
5. All generation is deterministic — same schema + same config + same seed = identical dataset.
6. The generated dataset is an in-memory structure ready for database insertion (Phase 4).

**Phase 3 does NOT include:** Database writes, CLI `seed` command wiring, domain templates, or distribution overrides.

---

## Phase 3 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Column strategy inference | `packages/generators/src/strategyInference.ts` |
| D2 | Primitive generators (all 18 kinds) | `packages/generators/src/primitives/` |
| D3 | Generator registry | `packages/generators/src/registry.ts` |
| D4 | FK reference resolver | `packages/generators/src/foreignKeyResolver.ts` |
| D5 | Generation Plan builder | `packages/core/src/planning/buildPlan.ts` |
| D6 | Dataset generation engine | `packages/generators/src/engine.ts` |
| D7 | Generated dataset types | `packages/generators/src/types.ts` |
| D8 | Determinism verification test script | `tests/determinism-check.ts` |

---

## Phase 3 Sprints

Phase 3 is divided into **3 sprints**.

---

### Sprint 3A — Strategy Inference + Primitive Generators

**Objective:** Build the intelligence that maps columns to generation strategies and the generators that produce realistic values for each strategy kind.

#### Sprint 3A Prompt (for Claude Code)

```
Read: packages/schema/src/types.ts, packages/core/src/planning/types.ts,
      packages/generators/src/index.ts, packages/shared/src/random.ts,
      packages/shared/src/index.ts, docs/architecture-guardrails.md

CONTEXT:
Phase 2 is complete. DataBox can scan a live Postgres database and produce
a normalized DatabaseSchema with tables, columns, foreign keys, and safe
insertion order. The Generation Plan contract (GenerationPlan, TableGenerationPlan,
ColumnGenerationPlan, ColumnStrategy) is defined in @databox/core.

Now we build the generation engine.

OBJECTIVE:
Implement column strategy inference and all 18 primitive generators.

REQUIREMENTS:

--- Generator Types (packages/generators) ---

1. src/types.ts:
   - GeneratedDataset {
       tables: Map<string, GeneratedTable>
       generatedAt: string
       seed: number
       totalRows: number
     }
   - GeneratedTable {
       tableName: string
       columns: string[]
       rows: GeneratedRow[]
       rowCount: number
     }
   - GeneratedRow = Record<string, unknown>
   - GeneratorFunction = (ctx: GeneratorContext) => unknown
   - GeneratorContext {
       seed: SeededRandom (from @databox/shared)
       rowIndex: number
       tableName: string
       columnName: string
       allGeneratedTables: Map<string, GeneratedTable>
     }

2. src/index.ts — re-export all types

--- Strategy Inference (packages/generators) ---

3. src/strategyInference.ts:
   - inferColumnStrategy(column: ColumnSchema, tableForeignKeys: ForeignKeySchema[]) → ColumnStrategy
   - Inference rules (checked in this priority order):
     a. If column is a FK source → { kind: "foreign_key" }
     b. Column name heuristics:
        - name contains "email" → { kind: "email" }
        - name is "first_name" or "fname" → { kind: "first_name" }
        - name is "last_name" or "lname" → { kind: "last_name" }
        - name is "full_name" or "name" (and table is person-like) → { kind: "full_name" }
        - name contains "phone" → { kind: "phone" }
        - name contains "address" or "street" → { kind: "address" }
        - name contains "company" or "organization" → { kind: "company_name" }
        - name contains "amount" or "price" or "cost" or "total" → { kind: "money", min: 100, max: 100000 }
        - name contains "status" → { kind: "enum", values: ["active", "inactive", "pending"], weights: [0.7, 0.15, 0.15] }
        - name is "currency" → { kind: "enum", values: ["USD", "EUR", "GBP"], weights: [0.7, 0.2, 0.1] }
        - name is "interval" → { kind: "enum", values: ["monthly", "yearly", "weekly"], weights: [0.6, 0.3, 0.1] }
     c. Data type fallbacks:
        - uuid → { kind: "uuid" }
        - varchar/text + short maxLength (<=10) → { kind: "text", mode: "short" }
        - varchar/text → { kind: "text", mode: "medium" }
        - integer/int4 → { kind: "integer", min: 0, max: 10000 }
        - numeric/decimal/float → { kind: "float", min: 0, max: 10000 }
        - boolean/bool → { kind: "boolean", trueWeight: 0.5 }
        - timestamp/timestamptz → { kind: "timestamp", mode: "past" }
        - date → { kind: "timestamp", mode: "past" }
     d. Ultimate fallback → { kind: "text", mode: "short" }

   - inferTableStrategies(table: TableSchema, foreignKeys: ForeignKeySchema[]) → ColumnStrategy[]
     Convenience function that infers strategies for all columns in a table.

--- Primitive Generators (packages/generators) ---

4. src/primitives/ — one file per generator category:

   src/primitives/uuid.ts
   - generateUuid(ctx) → string (v4 UUID using seeded random, NOT crypto.randomUUID)

   src/primitives/text.ts
   - generateEmail(ctx) → string (realistic: first.last@domain.com pattern)
   - generateFirstName(ctx) → string (pick from names list, ~100 names)
   - generateLastName(ctx) → string (pick from surnames list, ~100 names)
   - generateFullName(ctx) → string (first + last combination)
   - generatePhone(ctx) → string (format: +1-XXX-XXX-XXXX)
   - generateAddress(ctx) → string (number + street name + city pattern)
   - generateCompanyName(ctx) → string (pick from list + suffix like Inc/LLC/Corp)
   - generateText(ctx, mode: "short"|"medium"|"long") → string

   src/primitives/numeric.ts
   - generateInteger(ctx, min, max) → number
   - generateFloat(ctx, min, max) → number
   - generateMoney(ctx, min, max) → number (integer, represents cents)
   - generateBoolean(ctx, trueWeight) → boolean

   src/primitives/temporal.ts
   - generateTimestamp(ctx, mode: "past"|"recent"|"timeline") → string (ISO format)
     - past: random timestamp within last 2 years
     - recent: random timestamp within last 30 days
     - timeline: placeholder for future time evolution (use "past" for now)

   src/primitives/enum.ts
   - generateEnum(ctx, values: string[], weights?: number[]) → string
     - If weights provided, use weighted random selection
     - If no weights, uniform random

   src/primitives/index.ts — re-export all generator functions

5. ALL generators must use ctx.seed (SeededRandom) for randomness — NEVER Math.random()
6. ALL generators must be pure functions of their inputs (deterministic)

--- Generator Registry (packages/generators) ---

7. src/registry.ts:
   - createGeneratorRegistry() → GeneratorRegistry
   - GeneratorRegistry maps ColumnStrategy.kind → GeneratorFunction
   - getGenerator(strategy: ColumnStrategy) → GeneratorFunction
   - Registry must handle all 18 strategy kinds
   - Unknown kinds should throw a clear error

CONSTRAINTS:
- ALL randomness must come from SeededRandom (from @databox/shared)
- No use of Math.random(), crypto.randomUUID(), or Date.now() for generation
- Generators must NOT access the database
- Generators must NOT import from @databox/db
- Strategy inference may import types from @databox/schema (ColumnSchema, ForeignKeySchema)
- Do NOT build the plan builder yet (Sprint 3B)
- Do NOT build the dataset engine yet (Sprint 3B)
- Do NOT modify CLI commands
- Commit with message: "feat: add strategy inference and primitive generators"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify inferColumnStrategy is exported from @databox/generators
3. Verify all 18 generator kinds have implementations
4. Verify registry maps all strategy kinds
5. Write a quick inline test: create SeededRandom(42), generate 5 emails,
   regenerate with seed 42 — confirm identical output
Report: build status, determinism test result, exported symbols
```

#### Sprint 3A Checklist

```
## Sprint 3A — Strategy Inference + Primitive Generators

### Strategy Inference (5 points)
- [ ] inferColumnStrategy exported from @databox/generators
- [ ] FK columns correctly identified as foreign_key strategy
- [ ] Name heuristics work (email, first_name, phone, amount, status, etc.)
- [ ] Data type fallbacks work (uuid, varchar, integer, boolean, timestamp)
- [ ] inferTableStrategies convenience function works

### Primitive Generators — Text (7 points)
- [ ] generateUuid produces valid v4-format UUIDs
- [ ] generateEmail produces realistic user@domain.com patterns
- [ ] generateFirstName picks from name list
- [ ] generateLastName picks from surname list
- [ ] generateFullName combines first + last
- [ ] generatePhone produces formatted phone numbers
- [ ] generateAddress produces street address strings

### Primitive Generators — Numeric (4 points)
- [ ] generateInteger produces integers within min/max range
- [ ] generateFloat produces floats within min/max range
- [ ] generateMoney produces integer cents within range
- [ ] generateBoolean respects trueWeight probability

### Primitive Generators — Other (3 points)
- [ ] generateTimestamp produces ISO timestamps in correct time range
- [ ] generateEnum respects weighted selection
- [ ] generateText produces strings of appropriate length per mode

### Generator Registry (2 points)
- [ ] Registry maps all 18 strategy kinds to generators
- [ ] Unknown strategy kind throws clear error

### Determinism (2 points)
- [ ] All generators use SeededRandom, never Math.random()
- [ ] Same seed produces identical output (verified)

### Architecture (2 points)
- [ ] No imports from @databox/db in generators package
- [ ] Strategy inference imports only types from @databox/schema

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add strategy inference and primitive generators"

Score: __/27 PASS
Gate: ALL must be ✅ to proceed to Sprint 3B
```

---

### Sprint 3B — Generation Plan Builder + Dataset Engine + FK Resolver

**Objective:** Build the plan builder that transforms schema into a GenerationPlan, the FK resolver that links child rows to parent rows, and the dataset engine that executes the plan to produce a complete in-memory dataset.

#### Sprint 3B Prompt (for Claude Code)

```
Read: packages/generators/src/strategyInference.ts,
      packages/generators/src/registry.ts,
      packages/generators/src/types.ts,
      packages/generators/src/primitives/index.ts,
      packages/core/src/planning/types.ts,
      packages/core/src/planning/dependencyGraph.ts,
      packages/core/src/planning/topologicalSort.ts,
      packages/schema/src/types.ts,
      packages/config/src/types.ts,
      packages/shared/src/random.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 3A is complete. We have strategy inference that maps ColumnSchema to
ColumnStrategy, 18 primitive generators, and a registry that resolves
strategy kinds to generator functions. All generators are deterministic
using SeededRandom.

OBJECTIVE:
Build the Generation Plan builder, FK reference resolver, and dataset
generation engine.

REQUIREMENTS:

--- Generation Plan Builder (packages/core) ---

1. src/planning/buildPlan.ts:
   - buildGenerationPlan(schema: DatabaseSchema, config: DataboxConfig) → GenerationPlan
   - For each table in schema:
     a. Determine row count (config.seed.defaultRecords, or template override if present)
     b. For each column, call inferColumnStrategy to get ColumnStrategy
     c. For FK columns, populate foreignKeyRef with referenced table/column
     d. Build TableGenerationPlan with dependencies from FK graph
   - Compute tableOrder using topological sort
   - Set reproducibility with config.seed.randomSeed and strategy version
   - Set planId as deterministic hash of schema + config
   - Return complete GenerationPlan matching the V1 contract

2. src/planning/validatePlan.ts:
   - validateGenerationPlan(plan: GenerationPlan) → PlanValidationResult
   - PlanValidationResult { valid: boolean, warnings: string[], errors: string[] }
   - Checks:
     a. Every FK reference target table exists in plan
     b. tableOrder contains all enabled tables
     c. No table has 0 rowCount (unless explicitly disabled)
     d. Every column has a valid strategy kind

3. src/planning/index.ts — re-export buildPlan and validatePlan

--- FK Reference Resolver (packages/generators) ---

4. src/foreignKeyResolver.ts:
   - resolveForeignKey(ctx: GeneratorContext, ref: ForeignKeyReferencePlan) → unknown
   - Looks up the referenced table in ctx.allGeneratedTables
   - Based on selectionMode:
     - "uniform": pick random row from referenced table, return the referenced column value
     - "weighted": placeholder (use uniform for now)
     - "parent-linked": placeholder (use uniform for now)
   - If referenced table not yet generated, throw clear error
     (this should never happen if tableOrder is correct)

--- Dataset Generation Engine (packages/generators) ---

5. src/engine.ts:
   - generateDataset(plan: GenerationPlan) → GeneratedDataset
   - Flow:
     a. Create SeededRandom from plan.reproducibility.randomSeed
     b. Create generator registry
     c. Initialize empty dataset (Map of table name → GeneratedTable)
     d. Iterate tables in plan.tableOrder
     e. For each table:
        - For each row (0 to table.rowCount):
          - For each column:
            - Build GeneratorContext with current seed, rowIndex, tableName, columnName, allGeneratedTables
            - If strategy is foreign_key: use resolveForeignKey
            - If column has defaultValueMode "db_default" or "fixed": use fixed value
            - Otherwise: get generator from registry, call it with context
          - Collect row as GeneratedRow
        - Store GeneratedTable in dataset
     f. Return GeneratedDataset with metadata (generatedAt, seed, totalRows)

   - CRITICAL: Tables MUST be generated in plan.tableOrder sequence
     (parent tables before child tables, so FK references resolve)

6. src/index.ts — re-export engine, foreignKeyResolver, and all types

--- Integration Validation Script ---

7. tests/generation-test.ts (a simple script, not a test framework):
   - Import introspectDatabase from @databox/schema
   - Import buildGenerationPlan from @databox/core
   - Import generateDataset from @databox/generators
   - Import createPostgresClient, closeConnection from @databox/db
   - Import loadConfig from @databox/config
   - Flow:
     a. Load config
     b. Connect to DB
     c. Introspect schema
     d. Build generation plan
     e. Generate dataset with seed 42
     f. Print summary: table names, row counts, sample row from each table
     g. Generate dataset again with seed 42
     h. Compare: confirm datasets are identical (determinism check)
     i. Close connection
   - This script validates the entire Phase 3 pipeline

CONSTRAINTS:
- ALL randomness from SeededRandom — no Math.random()
- Dataset engine must NOT write to database (in-memory only)
- Dataset engine must NOT import from @databox/db
- Plan builder MAY import from @databox/schema (types) and @databox/generators (inferColumnStrategy)
- FK resolver must throw clear error if referenced table not yet generated
- Generation must follow plan.tableOrder exactly
- Do NOT modify CLI commands (Phase 4 wires seed command)
- Commit with message: "feat: add generation plan builder and dataset engine"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Run tests/generation-test.ts against live DB:
   npx tsx tests/generation-test.ts
3. Verify dataset summary prints correct table names and row counts
4. Verify determinism: two runs with seed 42 produce identical datasets
Report: build status, dataset summary output, determinism result
```

#### Sprint 3B Checklist

```
## Sprint 3B — Plan Builder + Dataset Engine + FK Resolver

### Generation Plan Builder (6 points)
- [ ] buildGenerationPlan accepts DatabaseSchema + DataboxConfig
- [ ] Returns complete GenerationPlan matching V1 contract
- [ ] Column strategies inferred for every column
- [ ] FK columns have foreignKeyRef populated
- [ ] tableOrder computed via topological sort
- [ ] reproducibility section includes randomSeed and strategyVersion

### Plan Validator (3 points)
- [ ] validateGenerationPlan returns valid/warnings/errors
- [ ] Detects FK target table missing from plan
- [ ] Detects table with 0 rowCount

### FK Reference Resolver (3 points)
- [ ] resolveForeignKey picks from referenced table's generated rows
- [ ] Uniform selection mode works
- [ ] Throws clear error if referenced table not yet generated

### Dataset Engine (6 points)
- [ ] generateDataset accepts GenerationPlan and returns GeneratedDataset
- [ ] Tables generated in plan.tableOrder sequence
- [ ] FK columns reference valid parent row values
- [ ] All rows have correct column count
- [ ] totalRows in metadata matches sum of all table row counts
- [ ] Engine does NOT access database (in-memory only)

### Determinism (2 points)
- [ ] Same plan + seed 42 produces identical dataset on two runs
- [ ] tests/generation-test.ts confirms determinism

### Architecture (3 points)
- [ ] @databox/generators does NOT import from @databox/db
- [ ] Plan builder imports types from @databox/schema and functions from @databox/generators
- [ ] No circular package dependencies

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add generation plan builder and dataset engine"

Score: __/25 PASS
Gate: ALL must be ✅ to close Phase 3
```

---

## Phase 3 Architecture Compliance Matrix

| # | Guardrail | Sprint 3A | Sprint 3B | Status |
|---|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | No CLI changes | No CLI changes | ☐ |
| 2 | Schema Normalized Once | Inference reads ColumnSchema only | Plan builder reads DatabaseSchema only | ☐ |
| 3 | Separate Planning from Execution | Inference is pre-planning | Plan built before generation executes | ☐ |
| 4 | Deterministic Generation | All generators use SeededRandom | Engine reproduces identical datasets | ☐ |
| 5 | Dependency Safety | N/A | Engine follows tableOrder for FK safety | ☐ |
| 6 | Reality Packs Core Artifact | N/A | GeneratedDataset is exportable structure | ☐ |
| 7 | Domain Templates First-Class | Strategy inference is template-overridable | Plan builder accepts template overrides | ☐ |
| 8 | Simulation Extensible | Generator registry is extensible | Engine processes plan, not hardcoded logic | ☐ |
| 9 | Configuration Explicit | N/A | Plan builder reads DataboxConfig | ☐ |
| 10 | Testability Non-Negotiable | All generators are pure functions | Engine testable with mock plans | ☐ |
| 11 | Performance Must Scale | N/A | N/A (batch writes in Phase 4) | ☐ |
| 12 | Safe by Default | Generators are read-only | Engine is in-memory only, no DB writes | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | ☐ |

---

## Phase 3 Demo Walkthrough

After all sprints pass, Eddy runs the integration test:

```powershell
# 1. Ensure Docker Postgres is running with seed schema
docker ps  # verify databox-pg is running

# 2. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 3. Run generation test
npx tsx tests/generation-test.ts

# Expected output:
# - Generation Plan summary (4 tables, row counts, insertion order)
# - Dataset summary (table names, row counts, sample row per table)
# - Determinism check: PASS (two runs with seed 42 are identical)
```

---

## Phase 3 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 3A checklist | 27/27 ✅ |
| Sprint 3B checklist | 25/25 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | Generation test produces deterministic dataset |
| Git | 2 commits on feature branch |

**Phase 3 is COMPLETE when all criteria are met.**  
**Phase 4 (Database Writer) begins only after Phase 3 is fully verified.**

---

## What Phase 4 Will Build On

Phase 4 will:

- Implement batch insert writer in `@databox/db`
- Build the seed pipeline in `@databox/core` (scan → plan → generate → write)
- Wire `databox seed` CLI command end-to-end
- Wire `databox reset` with safe truncation
- Wire `databox export` to JSON/CSV/SQL
- Add `databox seed` demo with the live SaaS test schema

The `GeneratedDataset` from Phase 3 is the input to Phase 4's database writer.  
The `GenerationPlan` from Phase 3 defines what gets written and in what order.
