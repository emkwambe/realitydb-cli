# RealityDB Horizon 1 Sprint 2 — CI Mode

**Project:** RealityDB (formerly DataBox) — Developer Reality Platform  
**Horizon:** 1 — Developer Adoption  
**Sprint:** H1-S2 — CI Mode  
**Status:** DRAFT  
**Depends on:** H1-S1 (COMPLETE ✅ — realitydb@0.1.2 published on npm)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Make RealityDB a first-class CI/CD tool. After this sprint, engineering teams can add one line to their GitHub Actions workflow and get a realistic test database for every CI run.

```yaml
- run: npx realitydb seed --ci --template saas --records 500 --seed 42
```

---

## What Must Be True After This Sprint

1. `realitydb seed --ci` runs silently with machine-readable JSON output.
2. `realitydb scan --ci` outputs schema as JSON.
3. `realitydb reset --ci` runs without interactive prompts (no --confirm needed in CI).
4. All commands with `--ci` flag exit with proper codes (0 = success, 1 = failure).
5. A sample GitHub Actions workflow file exists that developers can copy.
6. A sample Docker Compose file provides Postgres + RealityDB seed in one command.
7. Version bumped to 0.2.0 (minor bump — new feature).

---

## Why CI Mode Matters

CI pipelines run thousands of times per day inside companies. Once RealityDB becomes part of CI:

- It runs on every PR automatically
- Removing it breaks the test workflow
- Teams depend on deterministic test data
- Companies will pay for performance and reliability

This is how tools like Sentry, Datadog, and Cypress became infrastructure.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | `--ci` flag on all commands | `apps/cli/src/` |
| D2 | JSON output mode | `packages/shared/src/output.ts` |
| D3 | CI-safe reset (no --confirm in CI mode) | `apps/cli/src/commands/reset.ts` |
| D4 | Proper exit codes | All commands |
| D5 | GitHub Actions sample workflow | `examples/github-actions/seed.yml` |
| D6 | Docker Compose example | `examples/docker-compose/docker-compose.yml` |
| D7 | CI documentation in README | `README.md` update |
| D8 | Version bump to 0.2.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: apps/cli/src/cli.ts, apps/cli/src/commands/scan.ts,
      apps/cli/src/commands/seed.ts, apps/cli/src/commands/reset.ts,
      apps/cli/src/commands/export.ts, apps/cli/src/commands/pack.ts,
      packages/shared/src/logger.ts, packages/shared/src/index.ts,
      packages/core/src/seedPipeline.ts, packages/core/src/scanPipeline.ts,
      README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.1.2 is published on npm. All commands work interactively.
Now we add CI mode so the tool integrates into automated pipelines.

OBJECTIVE:
Add --ci flag to all commands with JSON output, proper exit codes,
and CI-friendly behavior. Create example workflow files.

REQUIREMENTS:

--- CI Flag (apps/cli) ---

1. Add global --ci flag to cli.ts (like --verbose and --config):
   program.option('--ci', 'CI mode: JSON output, no prompts, proper exit codes', false)

2. When --ci is active:
   - ALL output is valid JSON (no decorative banners, no emoji, no box drawing)
   - stdout gets the JSON result
   - stderr gets error messages only
   - Exit code 0 = success, 1 = failure
   - No interactive prompts (reset skips --confirm requirement)

--- CI Output Format (packages/shared) ---

3. src/output.ts:
   - CIOutput type:
     {
       success: boolean
       command: string
       version: string
       timestamp: string
       durationMs: number
       data: Record<string, unknown>
       error?: string
     }
   - formatCIOutput(result: CIOutput) → string (JSON.stringify with 2-space indent)
   - Export from packages/shared

--- Scan CI Mode ---

4. apps/cli/src/commands/scan.ts:
   - If --ci: output JSON:
     {
       success: true,
       command: "scan",
       version: "0.2.0",
       timestamp: "2026-03-10T...",
       durationMs: 150,
       data: {
         database: "postgres://...(masked)",
         tableCount: 14,
         foreignKeyCount: 12,
         tables: [
           { name: "users", columnCount: 4, primaryKey: "id" },
           ...
         ],
         foreignKeys: [
           { source: "subscriptions.user_id", target: "users.id" },
           ...
         ],
         insertionOrder: ["users", "plans", "subscriptions", "payments"]
       }
     }

--- Seed CI Mode ---

5. apps/cli/src/commands/seed.ts:
   - If --ci: output JSON:
     {
       success: true,
       command: "seed",
       version: "0.2.0",
       timestamp: "2026-03-10T...",
       durationMs: 850,
       data: {
         database: "postgres://...(masked)",
         template: "saas",
         seed: 42,
         recordsPerTable: 500,
         totalRows: 2000,
         tables: [
           { name: "plans", rowsInserted: 500, batchCount: 1, durationMs: 30 },
           { name: "users", rowsInserted: 500, batchCount: 1, durationMs: 35 },
           ...
         ],
         timelineUsed: false,
         scenariosApplied: []
       }
     }

--- Reset CI Mode ---

6. apps/cli/src/commands/reset.ts:
   - If --ci: skip --confirm requirement (CI is always non-interactive)
   - Output JSON:
     {
       success: true,
       command: "reset",
       version: "0.2.0",
       timestamp: "2026-03-10T...",
       durationMs: 200,
       data: {
         database: "postgres://...(masked)",
         tablesCleared: ["payments", "subscriptions", "users", "plans"],
         tableCount: 4
       }
     }

--- Export CI Mode ---

7. apps/cli/src/commands/export.ts:
   - If --ci: output JSON:
     {
       success: true,
       command: "export",
       version: "0.2.0",
       timestamp: "...",
       durationMs: 500,
       data: {
         format: "json",
         outputDir: "./.realitydb",
         files: ["plans.json", "users.json", ...],
         totalRows: 2000,
         fileCount: 4
       }
     }

--- Error Handling in CI Mode ---

8. All commands in CI mode:
   - On error, output JSON to stdout:
     {
       success: false,
       command: "seed",
       version: "0.2.0",
       timestamp: "...",
       durationMs: 0,
       error: "Config file not found: realitydb.config.json"
     }
   - Exit with code 1
   - No stack traces in stdout (stderr only if --verbose)

--- GitHub Actions Example ---

9. Create examples/github-actions/realitydb-seed.yml:

   name: Test with RealityDB
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: test_db
           ports:
             - 5432:5432
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
             --health-timeout 5s
             --health-retries 5
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
         - name: Apply schema
           run: psql -h localhost -U postgres -d test_db -f schema.sql
           env:
             PGPASSWORD: postgres
         - name: Seed test data
           run: |
             npx realitydb seed --ci \
               --template saas \
               --records 500 \
               --seed 42 \
               --config realitydb.ci.json
         - name: Run tests
           run: npm test

10. Create examples/github-actions/realitydb.ci.json:
    {
      "database": {
        "client": "postgres",
        "connectionString": "postgres://postgres:postgres@localhost:5432/test_db"
      },
      "seed": {
        "defaultRecords": 500,
        "batchSize": 1000,
        "environment": "test",
        "randomSeed": 42
      },
      "template": "saas"
    }

--- Docker Compose Example ---

11. Create examples/docker-compose/docker-compose.yml:

    version: '3.8'
    services:
      postgres:
        image: postgres:16
        environment:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_db
        ports:
          - "5432:5432"
        volumes:
          - ./schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U postgres"]
          interval: 5s
          timeout: 5s
          retries: 5

    Create examples/docker-compose/README.md explaining usage:
    1. Add your schema.sql
    2. docker compose up -d
    3. npx realitydb seed --template saas --records 1000 --seed 42

--- README Update ---

12. Add CI section to README.md:

    ## CI/CD Integration

    RealityDB works seamlessly in CI pipelines:

    ```bash
    # GitHub Actions / any CI
    npx realitydb seed --ci --template saas --records 500 --seed 42
    ```

    CI mode outputs JSON and uses proper exit codes:
    ```bash
    # Parse CI output
    RESULT=$(npx realitydb seed --ci --template saas --seed 42)
    echo $RESULT | jq '.data.totalRows'
    ```

    The `--ci` flag:
    - Outputs structured JSON (machine-readable)
    - Skips interactive prompts
    - Uses proper exit codes (0 = success, 1 = failure)
    - No decorative formatting

    See [examples/github-actions](./examples/github-actions) for a complete workflow.

--- Version + Changelog ---

13. Bump version to 0.2.0 in apps/cli/package.json (minor — new feature)

14. Update CHANGELOG.md:
    ## 0.2.0 (2026-03-10)
    ### Features
    - CI mode with `--ci` flag for all commands
    - JSON output for machine-readable pipeline integration
    - CI-safe reset (no --confirm needed with --ci)
    - GitHub Actions example workflow
    - Docker Compose example

CONSTRAINTS:
- Without --ci flag, all commands behave exactly as before (backward compatible)
- --ci flag must work with ALL existing options (--template, --timeline, --scenario, etc.)
- JSON output must be valid JSON (parseable by jq)
- Reset in CI mode must NOT require --confirm
- Exit codes must be reliable (CI pipelines depend on them)
- No console.log in CI mode except the final JSON output
- Errors in CI mode output JSON with success: false
- Commit message: "feat: add CI mode with JSON output and GitHub Actions example"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. node apps/cli/dist/index.js seed --ci --help — shows ci option
3. node apps/cli/dist/index.js scan --ci — outputs valid JSON
4. Verify examples/github-actions/realitydb-seed.yml exists
Report: build status, sample CI JSON output
```

---

## Sprint Checklist

```
## H1-S2 — CI Mode

### CI Flag (3 points)
- [ ] --ci global flag registered in cli.ts
- [ ] Flag accessible in all command handlers
- [ ] Without --ci, all commands unchanged (backward compatible)

### JSON Output (5 points)
- [ ] scan --ci outputs valid JSON with tables, FKs, insertion order
- [ ] seed --ci outputs valid JSON with insert results per table
- [ ] reset --ci outputs valid JSON with tables cleared
- [ ] export --ci outputs valid JSON with file list
- [ ] All JSON includes success, command, version, timestamp, durationMs

### CI Behavior (4 points)
- [ ] reset --ci skips --confirm requirement
- [ ] No decorative output in CI mode (no banners, box drawing)
- [ ] Exit code 0 on success
- [ ] Exit code 1 on failure with JSON error output

### Examples (3 points)
- [ ] examples/github-actions/realitydb-seed.yml is valid GitHub Actions workflow
- [ ] examples/github-actions/realitydb.ci.json exists
- [ ] examples/docker-compose/docker-compose.yml exists

### README (1 point)
- [ ] CI/CD Integration section added to README

### Version + Changelog (2 points)
- [ ] Version bumped to 0.2.0
- [ ] CHANGELOG.md updated with 0.2.0 features

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add CI mode with JSON output and GitHub Actions example"

Score: __/20 PASS
Gate: ALL must be ✅ before npm publish 0.2.0
```

---

## Post-Sprint: Publish

After checklist passes:

```powershell
cd C:\Users\HP\Documents\databox\apps\cli
npm publish
```

Then verify:

```powershell
npx realitydb@0.2.0 --version
```

---

## What H1-S3 Will Build

H1-S3 creates example repos:
- Next.js SaaS app with RealityDB seed
- Express e-commerce API with RealityDB seed
- Each repo: clone, docker compose up, realitydb seed, app works with data
