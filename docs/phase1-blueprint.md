# DataBox Phase 1 Blueprint — Foundation

**Project:** DataBox — Developer Reality Platform  
**Phase:** 1 of 8 — Foundation  
**Status:** DRAFT  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 1 Objective

Establish the monorepo scaffold, CLI skeleton, shared types, configuration loader, and the **Generation Plan contract** — the central data structure that every later phase builds against.

At the end of Phase 1, the following must be true:

1. The monorepo builds cleanly with `pnpm` and TypeScript strict mode.
2. `npx databox` prints a version banner and help text.
3. `databox scan`, `databox seed`, `databox reset`, `databox export` exist as stub commands.
4. The Generation Plan V1 types are defined and exported from `packages/core`.
5. The architecture guardrails document lives in `docs/`.
6. All packages compile independently with zero errors.

**Phase 1 does NOT include:** Postgres connection, real data generation, database writes, or template logic.

---

## Phase 1 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Monorepo root config | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json` |
| D2 | CLI scaffold with 4 stub commands | `apps/cli/` |
| D3 | Shared utilities package | `packages/shared/` |
| D4 | Config loader package | `packages/config/` |
| D5 | Core package with Generation Plan types | `packages/core/` |
| D6 | Schema package type shells | `packages/schema/` |
| D7 | Generators package shell | `packages/generators/` |
| D8 | Templates package shell | `packages/templates/` |
| D9 | DB package shell | `packages/db/` |
| D10 | Architecture guardrails doc | `docs/architecture-guardrails.md` |
| D11 | README with setup instructions | `README.md` |

---

## Phase 1 Sprints

Phase 1 is divided into **2 sprints**. Each sprint must reach 100% checklist pass before the next begins.

---

### Sprint 1A — Monorepo Bootstrap + Package Shells

**Objective:** Initialize the monorepo, create all package directories with minimal `package.json` and `tsconfig.json`, and verify the workspace builds.

#### Sprint 1A Prompt (for Claude Code)

```
CONTEXT:
This is the first sprint of DataBox, a Developer Reality Platform.
No prior code exists. We are initializing the monorepo from scratch.

OBJECTIVE:
Bootstrap the DataBox monorepo with pnpm workspace, TypeScript strict mode,
and empty package shells for all 7 packages + 1 app.

REQUIREMENTS:

1. Root files:
   - package.json (name: "databox", private: true, scripts: build, clean, typecheck)
   - pnpm-workspace.yaml (packages: apps/*, packages/*)
   - tsconfig.base.json (strict: true, target: ES2022, module: NodeNext, moduleResolution: NodeNext)
   - turbo.json (pipeline: build, typecheck, clean)
   - .gitignore (node_modules, dist, .env, *.tsbuildinfo)
   - .prettierrc (singleQuote: true, semi: true, trailingComma: "all")

2. App — apps/cli:
   - package.json (name: "@databox/cli", bin: { databox: "./dist/index.js" })
   - tsconfig.json extending root
   - src/index.ts — entry point (placeholder: console.log("DataBox CLI ready"))
   - src/cli.ts — shell (will wire commands in Sprint 1B)

3. Packages — each gets package.json, tsconfig.json, src/index.ts:
   - packages/core (name: "@databox/core")
   - packages/schema (name: "@databox/schema")
   - packages/generators (name: "@databox/generators")
   - packages/templates (name: "@databox/templates")
   - packages/db (name: "@databox/db")
   - packages/config (name: "@databox/config")
   - packages/shared (name: "@databox/shared")

4. Each package src/index.ts exports a placeholder:
   export const VERSION = "0.1.0";

5. docs/ directory with empty architecture-guardrails.md placeholder.

6. examples/ directory with empty .gitkeep.

7. README.md with:
   - Project name and tagline
   - Prerequisites (Node 20+, pnpm 9+)
   - Setup commands (pnpm install, pnpm build)
   - Package map table

CONSTRAINTS:
- TypeScript strict mode in all tsconfig files
- No runtime dependencies yet (only dev dependencies: typescript)
- All packages must compile independently
- Do NOT add any generation logic, database logic, or CLI frameworks yet
- Commit with message: "feat: initialize databox monorepo scaffold"

VERIFICATION:
After completing, run:
1. pnpm install
2. pnpm build
Report: build status for each package (pass/fail)
```

#### Sprint 1A Checklist

```
## Sprint 1A — Monorepo Bootstrap
### Structure (7 points)
- [ ] Root package.json exists with correct name and scripts
- [ ] pnpm-workspace.yaml lists apps/* and packages/*
- [ ] tsconfig.base.json has strict: true, ES2022, NodeNext
- [ ] turbo.json has build/typecheck/clean pipelines
- [ ] .gitignore covers node_modules, dist, .env, *.tsbuildinfo
- [ ] docs/ directory exists
- [ ] examples/ directory exists

### Packages (8 points)
- [ ] apps/cli has package.json with bin field
- [ ] packages/core compiles
- [ ] packages/schema compiles
- [ ] packages/generators compiles
- [ ] packages/templates compiles
- [ ] packages/db compiles
- [ ] packages/config compiles
- [ ] packages/shared compiles

### Build (3 points)
- [ ] pnpm install succeeds
- [ ] pnpm build succeeds (all packages + cli)
- [ ] No TypeScript errors in any package

### Git (1 point)
- [ ] Commit exists with message "feat: initialize databox monorepo scaffold"

Score: __/19 PASS
Gate: ALL must be ✅ to proceed to Sprint 1B
```

---

### Sprint 1B — CLI Wiring, Config Loader, Generation Plan Types, Shared Utilities

**Objective:** Wire the CLI with a command framework, implement the config loader, define the V1 Generation Plan contract, and add shared utilities.

#### Sprint 1B Prompt (for Claude Code)

```
Read: apps/cli/src/index.ts, apps/cli/src/cli.ts, packages/core/src/index.ts,
      packages/config/src/index.ts, packages/shared/src/index.ts

CONTEXT:
Sprint 1A established the monorepo scaffold. All packages compile.
Now we wire the CLI, define the Generation Plan contract, and add foundational utilities.

OBJECTIVE:
1. Wire CLI with commander.js and 4 stub commands
2. Define the V1 Generation Plan types in packages/core
3. Implement config loader in packages/config
4. Add shared utilities (logger, random seed, common types)
5. Place architecture guardrails content in docs/

REQUIREMENTS:

--- CLI (apps/cli) ---

1. Install commander as dependency of @databox/cli
2. src/cli.ts:
   - Import commander
   - Register 4 commands: scan, seed, reset, export
   - Each command prints "[command] not yet implemented — Phase 2+" and exits cleanly
   - Global --config option (default: ./databox.config.json)
   - Global --verbose flag
   - Version from package.json

3. src/commands/scan.ts — stub handler
4. src/commands/seed.ts — stub handler with --records, --template, --seed options
5. src/commands/reset.ts — stub handler with --confirm flag
6. src/commands/export.ts — stub handler with --format option (json|csv|sql)
7. src/index.ts — entry point with shebang (#!/usr/bin/env node), calls cli.ts

--- Generation Plan Types (packages/core) ---

8. src/planning/types.ts — V1 Generation Plan contract:

   GenerationPlan {
     version: string
     planId: string
     config: GenerationPlanConfig
     tableOrder: string[]
     tables: TableGenerationPlan[]
     reproducibility: ReproducibilityPlan
     template?: TemplatePlan
   }

   GenerationPlanConfig {
     targetDatabase: "postgres"
     defaultRowCount: number
     batchSize: number
     environment: "dev" | "staging" | "test"
     templateName?: string
   }

   TableGenerationPlan {
     tableName: string
     rowCount: number
     dependencies: string[]
     columns: ColumnGenerationPlan[]
     enabled: boolean
   }

   ColumnGenerationPlan {
     columnName: string
     dataType: string
     nullable: boolean
     required: boolean
     strategy: ColumnStrategy
     foreignKeyRef?: ForeignKeyReferencePlan
     defaultValueMode?: "generated" | "db_default" | "fixed"
     fixedValue?: string | number | boolean | null
   }

   ColumnStrategy (discriminated union):
     uuid | email | first_name | last_name | full_name | phone | address
     | company_name | money | integer | float | boolean | timestamp
     | enum | text | foreign_key | custom

   ForeignKeyReferencePlan {
     referencedTable: string
     referencedColumn: string
     selectionMode: "uniform" | "weighted" | "parent-linked"
   }

   ReproducibilityPlan {
     randomSeed: number
     strategyVersion: string
     templateVersion?: string
   }

   TemplatePlan {
     name: string
     version: string
     overrides?: TemplateOverride[]
   }

   TemplateOverride {
     tableName: string
     columnName?: string
     override: Partial<ColumnGenerationPlan>
   }

9. src/planning/index.ts — re-export all types
10. src/index.ts — re-export from planning

--- Config Loader (packages/config) ---

11. src/types.ts — DataboxConfig type:
    {
      database: { client: "postgres", connectionString: string }
      seed: { defaultRecords: number, batchSize: number, environment: string, randomSeed?: number }
      template?: string
      export?: { defaultFormat: "json" | "csv" | "sql", outputDir: string }
    }

12. src/loadConfig.ts:
    - Accepts optional file path (default: ./databox.config.json)
    - Reads and parses JSON
    - Validates required fields (database.connectionString)
    - Returns typed DataboxConfig
    - Throws clear error if file missing or invalid

13. src/defaults.ts — default config values
14. src/index.ts — re-export types and loadConfig

--- Shared Utilities (packages/shared) ---

15. src/logger.ts:
    - createLogger(verbose: boolean)
    - Methods: info, warn, error, debug (debug only if verbose)
    - Prefixed output: [databox] message

16. src/random.ts:
    - createSeededRandom(seed: number) — returns a deterministic PRNG function
    - Must produce identical sequences for same seed
    - Include: nextInt(min, max), nextFloat(min, max), nextBoolean(weight), pick(array)

17. src/types.ts — common shared types:
    - Result<T, E> = { ok: true, value: T } | { ok: false, error: E }
    - DataboxError { code: string, message: string, details?: unknown }

18. src/index.ts — re-export all

--- Docs ---

19. docs/architecture-guardrails.md — full content from Architecture Guardrails spec
    (13 guardrails + architecture review rule + ultimate test)

--- Config Example ---

20. databox.config.example.json at repo root:
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
      "template": "saas",
      "export": {
        "defaultFormat": "json",
        "outputDir": "./.databox"
      }
    }

CONSTRAINTS:
- Do NOT add postgres driver or any database dependencies
- Do NOT implement actual scan/seed/reset/export logic
- CLI commands must exit cleanly with informational messages
- All types must use TypeScript strict mode
- The Generation Plan types must NOT import from packages/schema (no coupling yet)
- The seeded random function must be deterministic (same seed = same sequence)
- Commit with message: "feat: wire CLI, define Generation Plan contract, add config and shared utils"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. pnpm --filter @databox/cli start -- scan — prints stub message
3. pnpm --filter @databox/cli start -- seed --records 5000 --seed 42 — prints stub message
4. pnpm --filter @databox/cli start -- --help — prints help with all commands
Report: build status, CLI output for each command
```

#### Sprint 1B Checklist

```
## Sprint 1B — CLI + Config + Generation Plan + Shared Utils

### CLI (8 points)
- [ ] commander installed as @databox/cli dependency
- [ ] databox --help prints all 4 commands
- [ ] databox --version prints version
- [ ] databox scan prints stub message and exits 0
- [ ] databox seed --records 5000 --seed 42 prints stub message and exits 0
- [ ] databox reset --confirm prints stub message and exits 0
- [ ] databox export --format json prints stub message and exits 0
- [ ] Shebang (#!/usr/bin/env node) present in entry point

### Generation Plan Types (10 points)
- [ ] GenerationPlan type exported from @databox/core
- [ ] GenerationPlanConfig type exported
- [ ] TableGenerationPlan type exported
- [ ] ColumnGenerationPlan type exported
- [ ] ColumnStrategy discriminated union with all 18 kinds
- [ ] ForeignKeyReferencePlan type exported
- [ ] ReproducibilityPlan type exported
- [ ] TemplatePlan type exported
- [ ] TemplateOverride type exported
- [ ] No imports from @databox/schema (zero coupling)

### Config Loader (5 points)
- [ ] DataboxConfig type exported from @databox/config
- [ ] loadConfig reads and parses JSON file
- [ ] loadConfig throws clear error on missing file
- [ ] loadConfig validates connectionString is present
- [ ] Default values applied for optional fields

### Shared Utilities (5 points)
- [ ] createLogger exported with info/warn/error/debug methods
- [ ] createSeededRandom exported and deterministic
- [ ] Same seed produces identical sequence (verified by test or manual check)
- [ ] Result<T, E> type exported
- [ ] DataboxError type exported

### Docs & Config (3 points)
- [ ] docs/architecture-guardrails.md contains all 13 guardrails
- [ ] databox.config.example.json exists at repo root
- [ ] README.md updated with package map and setup instructions

### Build (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] All inter-package imports resolve correctly

### Git (1 point)
- [ ] Commit exists with message "feat: wire CLI, define Generation Plan contract, add config and shared utils"

Score: __/34 PASS
Gate: ALL must be ✅ to proceed to Phase 2
```

---

## Phase 1 Architecture Compliance Matrix

After both sprints pass their checklists, verify compliance with the 13 architecture guardrails:

| # | Guardrail | Sprint 1A | Sprint 1B | Status |
|---|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | CLI contains only command registration, no business logic | ☐ |
| 2 | Schema Normalized Once | N/A | No schema logic exists yet (correct for Phase 1) | ☐ |
| 3 | Separate Planning from Execution | N/A | Generation Plan types defined as pure data contract | ☐ |
| 4 | Deterministic Generation Mandatory | N/A | Seeded PRNG in shared/random.ts | ☐ |
| 5 | Dependency Safety First | N/A | TableGenerationPlan includes dependencies field | ☐ |
| 6 | Reality Packs Core Artifact | N/A | Plan structure supports future pack export | ☐ |
| 7 | Domain Templates First-Class | N/A | TemplatePlan type defined, template package shell exists | ☐ |
| 8 | Simulation Must Be Extensible | N/A | Plan types include optional timeline/scenario slots (future) | ☐ |
| 9 | Configuration Explicit | N/A | Config loader reads databox.config.json, no hidden config | ☐ |
| 10 | Testability Non-Negotiable | N/A | All packages compile independently, functions are pure | ☐ |
| 11 | Performance Must Scale | N/A | Not applicable in Phase 1 | ☐ |
| 12 | Safe by Default | N/A | reset command requires --confirm flag | ☐ |
| 13 | Feature Discipline | Both | No out-of-scope features added | ☐ |

**Compliance Gate:** All applicable guardrails must be ☐→✅. Any ❌ requires immediate refactor before Phase 2.

---

## Phase 1 Demo Walkthrough

After all checks pass, Eddy will verify the following end-to-end:

```powershell
# 1. Clone and install
git clone https://github.com/emkwambe/databox.git
cd databox
pnpm install

# 2. Build all packages
pnpm build

# 3. Test CLI commands
node apps/cli/dist/index.js --help
node apps/cli/dist/index.js --version
node apps/cli/dist/index.js scan
node apps/cli/dist/index.js seed --records 5000 --seed 42
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js export --format json

# 4. Verify Generation Plan types compile
# (confirmed by pnpm build passing for @databox/core)

# 5. Verify config loader
# (will be tested in Phase 2 with real config file)
```

**Expected outcome:** All commands print informational stub messages and exit cleanly. No errors.

---

## Phase 1 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 1A checklist | 19/19 ✅ |
| Sprint 1B checklist | 34/34 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A where noted) |
| Demo walkthrough | All 6 commands work |
| Git | 2 commits on main or feature branch |

**Phase 1 is COMPLETE when all criteria are met.**  
**Phase 2 (Schema Engine) begins only after Phase 1 is fully verified.**

---

## What Phase 2 Will Build On

Phase 2 will:

- Add `pg` driver to `@databox/db`
- Implement Postgres introspection in `@databox/schema`
- Build the normalized schema model (TableSchema, ColumnSchema, ForeignKeySchema)
- Wire `databox scan` to real database introspection
- Validate that the Generation Plan types can be populated from real schema data

The Generation Plan contract defined here in Phase 1 becomes the **stable interface** that Phase 2's schema engine writes into and Phase 3's generator engine reads from.
