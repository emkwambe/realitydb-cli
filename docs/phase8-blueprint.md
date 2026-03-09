# DataBox Phase 8 Blueprint — Platform Layer

**Project:** DataBox — Developer Reality Platform  
**Phase:** 8 of 8 — Platform Layer (Reality Packs + Education Template + Launch Prep)  
**Status:** DRAFT  
**Depends on:** Phase 7 (COMPLETE ✅ — timeline growth + scenario injection verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 8 Objective

Complete DataBox as a shippable developer product. After Phase 8, environments are portable via Reality Packs, a third domain template (education) demonstrates extensibility, and the CLI is polished for public release.

At the end of Phase 8, the following must be true:

1. `databox pack export` saves a complete environment (schema + plan + dataset + config) as a portable Reality Pack.
2. `databox pack import` loads a Reality Pack and seeds the database from it without needing the original schema.
3. An education domain template produces realistic school data (students, teachers, classes, enrollments, grades).
4. `databox templates` and `databox scenarios` CLI commands work.
5. The README is rewritten for public developers with quick start, examples, and template showcase.
6. The package is ready for `npm publish` as `databox`.

**Phase 8 does NOT include:** Behavior simulation (event streams), marketplace, AI dataset generation, or cloud hosting.

---

## Phase 8 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Reality Pack format types | `packages/shared/src/realityPackTypes.ts` |
| D2 | Reality Pack exporter | `packages/generators/src/packExporter.ts` |
| D3 | Reality Pack importer/loader | `packages/core/src/packImporter.ts` |
| D4 | Pack export pipeline | `packages/core/src/packExportPipeline.ts` |
| D5 | Pack import pipeline | `packages/core/src/packImportPipeline.ts` |
| D6 | `databox pack export` CLI command | `apps/cli/src/commands/pack.ts` |
| D7 | `databox pack import` CLI command | `apps/cli/src/commands/pack.ts` |
| D8 | Education domain template | `packages/templates/src/domains/education.ts` |
| D9 | Education test fixture SQL | `tests/fixtures/education-seed.sql` |
| D10 | Wired `databox templates` command | `apps/cli/src/commands/templates.ts` |
| D11 | Wired `databox scenarios` command | fix in `apps/cli/src/cli.ts` |
| D12 | Polished README | `README.md` |
| D13 | npm publish config | `package.json` updates |

---

## Phase 8 Sprints

Phase 8 is divided into **3 sprints**.

---

### Sprint 8A — Reality Pack Format + Export/Import

**Objective:** Define the Reality Pack format and build export/import capabilities so environments become portable.

#### Sprint 8A Prompt (for Claude Code)

```
Read: packages/generators/src/types.ts, packages/generators/src/exporters/index.ts,
      packages/core/src/seedPipeline.ts, packages/core/src/exportPipeline.ts,
      packages/shared/src/planTypes.ts, packages/shared/src/timelineTypes.ts,
      packages/shared/src/scenarioTypes.ts,
      packages/db/src/batchInsert.ts, packages/db/src/client.ts,
      packages/config/src/types.ts,
      docs/architecture-guardrails.md

CONTEXT:
Phase 7 is complete. DataBox generates domain-aware data with timeline
growth curves and scenario injection. Now we make environments portable.

OBJECTIVE:
Define the Reality Pack format and build export/import pipelines.

REQUIREMENTS:

--- Reality Pack Types (packages/shared) ---

1. src/realityPackTypes.ts:

   RealityPack {
     format: "databox-reality-pack"
     version: "1.0"
     metadata: PackMetadata
     schema: PackSchema
     plan: GenerationPlan
     dataset: PackDataset
   }

   PackMetadata {
     name: string
     description?: string
     createdAt: string
     createdBy?: string
     templateName?: string
     seed: number
     totalRows: number
     tableCount: number
   }

   PackSchema {
     tables: PackTableSchema[]
     foreignKeys: PackForeignKey[]
   }

   PackTableSchema {
     name: string
     columns: PackColumnSchema[]
     primaryKey?: string
   }

   PackColumnSchema {
     name: string
     dataType: string
     nullable: boolean
     maxLength?: number | null
   }

   PackForeignKey {
     sourceTable: string
     sourceColumn: string
     targetTable: string
     targetColumn: string
   }

   PackDataset {
     tables: Record<string, PackTableData>
   }

   PackTableData {
     columns: string[]
     rows: Record<string, unknown>[]
     rowCount: number
   }

2. Export from packages/shared/src/index.ts

--- Reality Pack Exporter (packages/generators) ---

3. src/packExporter.ts:
   - exportRealityPack(
       dataset: GeneratedDataset,
       plan: GenerationPlan,
       schema: DatabaseSchema,
       options?: { name?: string, description?: string }
     ) → RealityPack

     Converts a generated dataset + plan + schema into the Reality Pack format.
     All data is self-contained — the pack includes everything needed to recreate
     the environment without the original database.

   - saveRealityPack(pack: RealityPack, outputPath: string) → Promise<string>
     Writes the Reality Pack as a single JSON file: {name}.databox-pack.json
     Returns the file path.

   - loadRealityPack(filePath: string) → Promise<RealityPack>
     Reads and validates a Reality Pack file.
     Throws clear error if format is invalid.

4. src/index.ts — re-export pack functions

--- Pack Export Pipeline (packages/core) ---

5. src/packExportPipeline.ts:
   - exportPack(config: DataboxConfig, options: PackExportOptions) → Promise<PackExportResult>
   - PackExportOptions {
       name?: string
       description?: string
       outputDir?: string
       records?: number
       seed?: number
       template?: string
       timeline?: string
       scenarios?: string
       scenarioIntensity?: "low" | "medium" | "high"
     }
   - PackExportResult { filePath: string, pack: RealityPack }
   - Flow:
     a. Connect to DB, introspect schema
     b. Build plan (with template, timeline, scenario options)
     c. Generate dataset
     d. Apply scenarios if specified
     e. Build RealityPack from dataset + plan + schema
     f. Save to file
     g. Close connection
     h. Return result

--- Pack Import Pipeline (packages/core) ---

6. src/packImportPipeline.ts:
   - importPack(config: DataboxConfig, filePath: string) → Promise<PackImportResult>
   - PackImportResult {
       pack: RealityPack
       insertResult: DatasetInsertResult
       totalRows: number
       durationMs: number
     }
   - Flow:
     a. Load Reality Pack from file
     b. Validate pack format
     c. Connect to DB
     d. Convert PackDataset → GeneratedDataset (for batch insert compatibility)
     e. Within transaction: batch insert dataset in pack's tableOrder
     f. Close connection
     g. Return result

   - The import does NOT create tables — it assumes the schema already exists.
     If tables are missing, throw clear error listing which tables are needed.

7. src/index.ts — re-export pack pipelines

--- CLI Commands (apps/cli) ---

8. src/commands/pack.ts:

   databox pack export:
   - Options: --name, --description, --output, --records, --seed, --template, --timeline, --scenario, --scenario-intensity
   - Calls packExportPipeline
   - Prints:
     Reality Pack Export
     ═══════════════════════════════════════
     Name: my-saas-env
     Template: saas
     Seed: 42
     Tables: 4
     Total rows: 2000

     Exported: ./my-saas-env.databox-pack.json (245 KB)

   databox pack import:
   - Argument: file path to .databox-pack.json
   - Options: --confirm (required, like reset)
   - Calls packImportPipeline
   - Prints:
     Reality Pack Import
     ═══════════════════════════════════════
     Pack: my-saas-env (v1.0)
     Template: saas
     Tables: 4
     Total rows: 2000

     Importing...
       plans: 500 rows inserted
       users: 500 rows inserted
       subscriptions: 500 rows inserted
       payments: 500 rows inserted

     Import complete. 2000 rows in 0.5s

9. Wire pack commands in cli.ts:
   program.command("pack").description("Reality Pack operations")
   with subcommands: export, import

CONSTRAINTS:
- Reality Pack must be a single JSON file (no zip/binary for V1)
- Pack must be fully self-contained (no external dependencies)
- Import requires --confirm flag (safe by default)
- Import does NOT create tables (schema must pre-exist)
- Pack format must include version for future compatibility
- All file I/O must handle errors gracefully
- Commit with message: "feat: add Reality Pack export and import"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify RealityPack type exported from @databox/shared
3. Verify exportPack, importPack exported from @databox/core
4. Verify pack export/import commands in CLI help
Report: build status, CLI help output for pack commands
```

#### Sprint 8A Checklist

```
## Sprint 8A — Reality Pack Format + Export/Import

### Reality Pack Types (4 points)
- [ ] RealityPack type exported from @databox/shared
- [ ] PackMetadata includes name, seed, totalRows, templateName
- [ ] PackSchema includes tables and foreignKeys
- [ ] PackDataset includes table data with columns and rows

### Pack Exporter (4 points)
- [ ] exportRealityPack converts dataset + plan + schema into RealityPack
- [ ] saveRealityPack writes single JSON file
- [ ] loadRealityPack reads and validates pack file
- [ ] Invalid pack file throws clear error

### Pack Export Pipeline (3 points)
- [ ] exportPack connects to DB, generates dataset, saves pack
- [ ] Supports template, timeline, scenario options
- [ ] Closes connection in all code paths

### Pack Import Pipeline (4 points)
- [ ] importPack loads pack file and inserts data
- [ ] Uses transaction for all inserts
- [ ] Throws clear error if required tables missing
- [ ] Does NOT create tables (assumes schema exists)

### CLI Commands (4 points)
- [ ] databox pack export works with options
- [ ] databox pack import works with --confirm
- [ ] Import requires --confirm (safe by default)
- [ ] Pack commands appear in CLI help

### Architecture (2 points)
- [ ] Pack format is self-contained single JSON
- [ ] Pack includes version field for compatibility

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add Reality Pack export and import"

Score: __/23 PASS
Gate: ALL must be ✅ to proceed to Sprint 8B
```

---

### Sprint 8B — Education Template

**Objective:** Build a third domain template to prove the template system is truly extensible and to serve the EdTech market.

#### Sprint 8B Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/registry.ts,
      packages/templates/src/domains/saas.ts, packages/templates/src/domains/ecommerce.ts,
      packages/generators/src/distributions.ts,
      packages/generators/src/primitives/index.ts,
      packages/generators/src/registry.ts,
      packages/shared/src/planTypes.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 8A added Reality Packs. The template system has SaaS and e-commerce.
Now we add education to prove extensibility and serve the EdTech market.

OBJECTIVE:
Build an education domain template with realistic school data patterns.

REQUIREMENTS:

--- Education Schema Fixture ---

1. tests/fixtures/education-seed.sql:

   CREATE TABLE teachers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) NOT NULL UNIQUE,
     first_name VARCHAR(100) NOT NULL,
     last_name VARCHAR(100) NOT NULL,
     department VARCHAR(100),
     hire_date TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE classes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR(255) NOT NULL,
     subject VARCHAR(100) NOT NULL,
     teacher_id UUID NOT NULL REFERENCES teachers(id),
     room_number VARCHAR(20),
     period INTEGER NOT NULL,
     school_year VARCHAR(20) NOT NULL DEFAULT '2024-2025'
   );

   CREATE TABLE students (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) NOT NULL UNIQUE,
     first_name VARCHAR(100) NOT NULL,
     last_name VARCHAR(100) NOT NULL,
     grade_level INTEGER NOT NULL,
     enrolled_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE enrollments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     student_id UUID NOT NULL REFERENCES students(id),
     class_id UUID NOT NULL REFERENCES classes(id),
     enrolled_at TIMESTAMP NOT NULL DEFAULT now(),
     status VARCHAR(50) NOT NULL DEFAULT 'active'
   );

   CREATE TABLE grades (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     enrollment_id UUID NOT NULL REFERENCES enrollments(id),
     assignment_name VARCHAR(255) NOT NULL,
     score NUMERIC(5,2) NOT NULL,
     max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
     graded_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE attendance (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     student_id UUID NOT NULL REFERENCES students(id),
     class_id UUID NOT NULL REFERENCES classes(id),
     date DATE NOT NULL,
     status VARCHAR(20) NOT NULL DEFAULT 'present'
   );

--- Education Template (packages/templates) ---

2. src/domains/education.ts — export educationTemplate: DomainTemplate

   Target tables (matchPattern):
   - teachers / instructors / faculty → teacher entity
   - classes / courses / sections → class entity
   - students / pupils / learners → student entity
   - enrollments / registrations → enrollment entity
   - grades / scores / assessments / marks → grade entity
   - attendance → attendance entity

   Column overrides for teacher-like tables:
   - email → { kind: "email" }
   - first_name → { kind: "first_name" }
   - last_name → { kind: "last_name" }
   - department → { kind: "enum",
       values: ["Mathematics", "English", "Science", "History", "Art", "Physical Education", "Computer Science", "Music"],
       weights: [0.18, 0.16, 0.16, 0.12, 0.10, 0.10, 0.10, 0.08] }

   Column overrides for class-like tables:
   - name → { kind: "enum",
       values: ["Algebra I", "Algebra II", "Geometry", "Pre-Calculus",
                "English 9", "English 10", "English 11", "AP English",
                "Biology", "Chemistry", "Physics", "AP Physics",
                "World History", "US History", "Government",
                "Art Foundations", "Studio Art",
                "PE", "Health",
                "Intro to CS", "AP Computer Science"],
       weights distributed roughly evenly with slight emphasis on core subjects }
   - subject → { kind: "enum",
       values: ["Math", "English", "Science", "History", "Art", "PE", "CS", "Music"],
       weights: [0.20, 0.18, 0.16, 0.14, 0.10, 0.08, 0.08, 0.06] }
   - period → { kind: "integer", min: 1, max: 8 }
   - school_year → { kind: "enum", values: ["2023-2024", "2024-2025", "2025-2026"],
       weights: [0.20, 0.50, 0.30] }
   - room_number → { kind: "text", mode: "short" }

   Column overrides for student-like tables:
   - email → { kind: "email" }
   - first_name → { kind: "first_name" }
   - last_name → { kind: "last_name" }
   - grade_level → { kind: "integer", min: 6, max: 12 }

   Column overrides for enrollment-like tables:
   - status → { kind: "enum",
       values: ["active", "withdrawn", "completed", "transferred"],
       weights: [0.75, 0.05, 0.15, 0.05] }

   Column overrides for grade-like tables:
   - assignment_name → { kind: "enum",
       values: ["Homework 1", "Homework 2", "Homework 3", "Quiz 1", "Quiz 2",
                "Midterm Exam", "Final Exam", "Project", "Lab Report",
                "Essay", "Presentation", "Participation"],
       weights roughly even }
   - score → { kind: "float", min: 40, max: 100 }
   - max_score → { kind: "enum", values: [100, 50, 25, 10],
       weights: [0.60, 0.20, 0.15, 0.05] }

   Column overrides for attendance-like tables:
   - status → { kind: "enum",
       values: ["present", "absent", "tardy", "excused"],
       weights: [0.85, 0.05, 0.05, 0.05] }
   - date → { kind: "timestamp", mode: "past" }

3. Register in getDefaultRegistry() alongside saas and ecommerce

--- Custom Generators ---

4. If any custom generators are needed (like room_number "R-101" format),
   add them to packages/generators/src/primitives/custom.ts

CONSTRAINTS:
- Template must follow same DomainTemplate structure as saas/ecommerce
- No cross-domain pattern collisions with saas or ecommerce templates
- All enum weights must sum to approximately 1.0
- Do NOT modify existing templates
- Do NOT modify CLI commands (already wired from Phase 7)
- Commit with message: "feat: add education domain template"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify educationTemplate exported from @databox/templates
3. Verify getDefaultRegistry() returns 3 templates (saas, ecommerce, education)
4. Verify template has 6 table configs
Report: build status, template summary
```

#### Sprint 8B Checklist

```
## Sprint 8B — Education Template

### Education Schema (1 point)
- [ ] tests/fixtures/education-seed.sql contains 6-table school schema

### Education Template (8 points)
- [ ] educationTemplate exported from @databox/templates
- [ ] Matches teacher tables with department distribution
- [ ] Matches class tables with subject, period, school_year overrides
- [ ] Matches student tables with grade_level 6-12
- [ ] Matches enrollment tables with 75% active status
- [ ] Matches grade tables with assignment names and score ranges
- [ ] Matches attendance tables with 85% present
- [ ] No cross-domain collisions with saas or ecommerce

### Template Registration (2 points)
- [ ] getDefaultRegistry() returns 3 templates
- [ ] registry.get("education") returns template with 6 table configs

### Architecture (2 points)
- [ ] Template is pure data config (no runtime DB dependency)
- [ ] All enum weights approximately sum to 1.0

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add education domain template"

Score: __/15 PASS
Gate: ALL must be ✅ to proceed to Sprint 8C
```

---

### Sprint 8C — CLI Polish + README + Launch Prep

**Objective:** Wire remaining CLI commands, polish output, rewrite README for developers, and prepare for npm publish.

#### Sprint 8C Prompt (for Claude Code)

```
Read: apps/cli/src/cli.ts, apps/cli/src/commands/scan.ts,
      apps/cli/src/commands/seed.ts, apps/cli/src/commands/reset.ts,
      apps/cli/src/commands/export.ts, apps/cli/package.json,
      README.md, package.json,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 8B added the education template. Reality Packs exist from Sprint 8A.
Two CLI commands (templates, scenarios) are not wired. README is placeholder.
This sprint polishes everything for public release.

OBJECTIVE:
Wire remaining CLI commands, polish the developer experience, and prepare
for npm publish.

REQUIREMENTS:

--- Wire Missing CLI Commands ---

1. Ensure `databox templates` command is wired in cli.ts:
   - Lists all registered templates
   - Format:
     Available Templates:
       saas (v1.0) — SaaS subscription business
         Targets: users, plans, subscriptions, payments
       ecommerce (v1.0) — E-commerce store
         Targets: customers, products, orders, order_items
       education (v1.0) — K-12 school system
         Targets: teachers, classes, students, enrollments, grades, attendance

2. Ensure `databox scenarios` command is wired in cli.ts:
   - Lists all registered scenarios
   - Format:
     Available Scenarios:
       payment-failures — Inject payment failure patterns (low, medium, high)
       churn-spike — Inject subscription cancellation surge (low, medium, high)
       fraud-spike — Inject suspicious transaction patterns (low, medium, high)
       data-quality — Inject data quality issues (low, medium, high)

3. Ensure `databox pack export` and `databox pack import` are wired

--- CLI Polish ---

4. Add `databox --version` banner:
   When running just `databox` with no command, print:
   DataBox v0.1.0 — Developer Reality Platform
   Run `databox --help` for available commands.

5. All error messages should be consistent:
   [databox] Error: <message>
   Hint: <actionable suggestion>

6. All commands should print empty line before and after output for readability

--- README Rewrite ---

7. Rewrite README.md for public developers:

   # DataBox

   > Production-like data before production exists.

   DataBox is a developer tool that instantly populates your database with
   realistic, schema-aware data. One command, realistic environments.

   ## Quick Start

   ```bash
   npx databox scan              # Understand your schema
   npx databox seed --seed 42    # Populate with realistic data
   npx databox reset --confirm   # Clear and start fresh
   ```

   ## Features

   - **Schema Intelligence** — Automatically understands your database structure
   - **Domain Templates** — SaaS, e-commerce, education with realistic distributions
   - **Timeline Generation** — Datasets spanning months with growth curves
   - **Scenario Injection** — Payment failures, churn spikes, fraud patterns
   - **Reality Packs** — Portable, shareable environment packages
   - **Deterministic** — Same seed = same data, every time

   ## Templates

   ```bash
   databox seed --template saas --records 1000 --seed 42
   databox seed --template ecommerce --records 1000 --seed 42
   databox seed --template education --records 1000 --seed 42
   ```

   ## Timeline & Scenarios

   ```bash
   databox seed --template saas --timeline 12-months --seed 42
   databox seed --template saas --scenario payment-failures --scenario-intensity high
   ```

   ## Reality Packs

   ```bash
   databox pack export --template saas --name my-saas-env --seed 42
   databox pack import ./my-saas-env.databox-pack.json --confirm
   ```

   ## Configuration

   Create `databox.config.json`:
   ```json
   {
     "database": {
       "client": "postgres",
       "connectionString": "postgres://user:pass@localhost:5432/mydb"
     },
     "seed": {
       "defaultRecords": 5000,
       "batchSize": 1000,
       "randomSeed": 42
     },
     "template": "saas"
   }
   ```

   ## Prerequisites

   - Node.js 20+
   - PostgreSQL database

   ## Commands

   | Command | Description |
   |---------|-------------|
   | `databox scan` | Scan and display database schema |
   | `databox seed` | Generate and insert realistic data |
   | `databox reset` | Clear seeded data |
   | `databox export` | Export dataset to JSON/CSV/SQL files |
   | `databox templates` | List available domain templates |
   | `databox scenarios` | List available scenarios |
   | `databox pack export` | Export environment as Reality Pack |
   | `databox pack import` | Import Reality Pack into database |

   ## License

   MIT

--- npm Publish Prep ---

8. Update root package.json:
   - Ensure "name": "databox"
   - Ensure "version": "0.1.0"
   - Add "description": "Developer Reality Platform — realistic database environments from your schema"
   - Add "keywords": ["database", "seed", "testing", "synthetic-data", "developer-tools"]
   - Add "repository" field pointing to GitHub
   - Add "author" field

9. Update apps/cli/package.json:
   - Ensure bin field is correct for npx usage
   - Add "files" field to include only dist/

CONSTRAINTS:
- README must be developer-focused (not marketing copy)
- All CLI commands must be functional (not stubs)
- Error messages must be actionable
- Commit with message: "feat: polish CLI, rewrite README, prepare for launch"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. databox --help — shows all commands
3. databox templates — lists 3 templates
4. databox scenarios — lists 4 scenarios
Report: build status, help output, templates output, scenarios output
```

#### Sprint 8C Checklist

```
## Sprint 8C — CLI Polish + README + Launch Prep

### CLI Commands Wired (4 points)
- [ ] databox templates lists 3 templates with descriptions
- [ ] databox scenarios lists 4 scenarios with intensities
- [ ] databox pack export works
- [ ] databox pack import works with --confirm

### CLI Polish (3 points)
- [ ] databox (no command) prints version banner
- [ ] Error messages follow consistent [databox] Error format
- [ ] Output has clean spacing (empty lines before/after)

### README (4 points)
- [ ] Quick Start section with scan/seed/reset
- [ ] Features section listing 6 capabilities
- [ ] Templates, Timeline, Scenarios, Reality Packs examples
- [ ] Configuration example with databox.config.json

### npm Publish Prep (3 points)
- [ ] Root package.json has name, version, description, keywords, repository
- [ ] CLI package.json has correct bin and files fields
- [ ] Version is 0.1.0

### Architecture (1 point)
- [ ] No stubs remain in CLI (all commands functional)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: polish CLI, rewrite README, prepare for launch"

Score: __/17 PASS
Gate: ALL must be ✅ to close Phase 8
```

---

## Phase 8 Architecture Compliance Matrix

| # | Guardrail | Sprint 8A | Sprint 8B | Sprint 8C | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | Pack commands delegate to pipelines | N/A | All commands delegate | ☐ |
| 2 | Schema Normalized Once | Pack includes schema snapshot | N/A | N/A | ☐ |
| 3 | Separate Planning from Execution | Pack includes plan | N/A | N/A | ☐ |
| 4 | Deterministic Generation | Pack preserves seed | N/A | N/A | ☐ |
| 5 | Dependency Safety | Import follows tableOrder | N/A | N/A | ☐ |
| 6 | Reality Packs Core Artifact | Pack format defined and functional | N/A | Pack commands in CLI | ☐ |
| 7 | Domain Templates First-Class | N/A | 3rd template proves extensibility | Templates listed in CLI | ☐ |
| 8 | Simulation Extensible | Pack includes timeline/scenario config | N/A | N/A | ☐ |
| 9 | Configuration Explicit | Pack export accepts config options | N/A | Config in README | ☐ |
| 10 | Testability Non-Negotiable | Pack exporter is pure function | Template is data config | N/A | ☐ |
| 11 | Performance Must Scale | N/A | N/A | N/A | ☐ |
| 12 | Safe by Default | Import requires --confirm | N/A | Consistent error messages | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | No extra features | ☐ |

---

## Phase 8 Demo Walkthrough

After all sprints pass, Eddy runs the complete product demo:

```powershell
# 1. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 2. List everything
node apps/cli/dist/index.js templates
node apps/cli/dist/index.js scenarios

# 3. Add education schema
docker exec -i databox-pg psql -U postgres -d databox_dev < tests/fixtures/education-seed.sql

# 4. Scan (should show all tables)
node apps/cli/dist/index.js scan

# 5. Seed with education template
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template education --records 200 --seed 42

# 6. Verify education distributions
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT department, COUNT(*) FROM teachers GROUP BY department ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT subject, COUNT(*) FROM classes GROUP BY subject ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM attendance GROUP BY status ORDER BY count DESC;"

# 7. Export as Reality Pack
node apps/cli/dist/index.js pack export --template education --name school-demo --records 200 --seed 42

# 8. Reset and import the pack
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js pack import ./school-demo.databox-pack.json --confirm

# 9. Verify data matches original seed
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM teachers;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM students;"
```

---

## Phase 8 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 8A checklist | 23/23 ✅ |
| Sprint 8B checklist | 15/15 ✅ |
| Sprint 8C checklist | 17/17 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | Education template + Reality Pack export/import verified |
| Git | 3 commits on feature branch |

**Phase 8 is COMPLETE when all criteria are met.**

---

## After Phase 8: DataBox v0.1.0

When Phase 8 closes, DataBox is a complete developer product:

```
databox scan                    # Understand your schema
databox seed --template saas    # Populate with realistic SaaS data
databox seed --template ecommerce --timeline 12-months  # Growth curves
databox seed --scenario payment-failures    # Controlled chaos
databox export --format json    # File artifacts
databox pack export --name my-env   # Portable environments
databox pack import ./pack.json     # Load anywhere
databox reset --confirm         # Clean slate
```

Three domain templates (SaaS, e-commerce, education).
Four scenarios (payment-failures, churn-spike, fraud-spike, data-quality).
Timeline with S-curve growth.
Reality Packs for portable environments.
Deterministic generation.

**Ready for npm publish and developer adoption.**
