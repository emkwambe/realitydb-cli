# RealityDB H1-S3 — Environment Reproduction

**Project:** RealityDB — Developer Reality Platform  
**Horizon:** 1 — Developer Adoption  
**Sprint:** H1-S3 — Environment Reproduction (capture + share)  
**Status:** DRAFT  
**Depends on:** H1-S2 (COMPLETE ✅ — CI mode, realitydb@0.2.0 published)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Enable developers to capture a live database state and share it with teammates so anyone can reproduce the exact same environment. This is the viral adoption feature — when developers start attaching Reality Packs to bug reports, RealityDB becomes a standard debugging tool.

```
# Developer A hits a bug
realitydb capture --name bug-4821

# Shares the file or short code
realitydb share bug-4821.realitydb-pack.json

# Developer B reproduces instantly
realitydb load bug-4821.realitydb-pack.json --confirm
```

---

## What Must Be True After This Sprint

1. `realitydb capture` snapshots a live seeded database into a Reality Pack (reverse: DB → Pack).
2. `realitydb capture --name bug-4821` produces `bug-4821.realitydb-pack.json`.
3. `realitydb capture --tables users,subscriptions` captures only specific tables.
4. `realitydb share <file>` uploads the pack to a GitHub Gist and returns a short URL.
5. `realitydb load <file-or-url>` imports a Reality Pack (alias for `pack import` with friendlier UX).
6. Captured packs include schema snapshot so the receiver knows what tables to create.
7. All commands work with `--ci` flag for pipeline integration.
8. Version bumped to 0.3.0.

---

## Why This Matters

Today when a developer reports a bug:

```
"I can't reproduce it."
"What data do you have in your database?"
"Uh... let me check... I think I had about 500 users and some of them..."
```

With RealityDB:

```
"Here's my environment: bug-4821.realitydb-pack.json"
"Got it. Loading... reproduced. It's a null check on subscription.canceled_at."
```

This saves hours per bug and creates viral adoption within teams.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Capture pipeline (DB → Reality Pack) | `packages/core/src/capturePipeline.ts` |
| D2 | DB data reader (read rows from tables) | `packages/db/src/readTable.ts` |
| D3 | Share via GitHub Gist | `packages/core/src/sharePipeline.ts` |
| D4 | Load command (friendly alias) | `apps/cli/src/commands/load.ts` |
| D5 | Capture CLI command | `apps/cli/src/commands/capture.ts` |
| D6 | Share CLI command | `apps/cli/src/commands/share.ts` |
| D7 | Schema DDL generator | `packages/schema/src/generateDDL.ts` |
| D8 | Version bump to 0.3.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/core/src/packExportPipeline.ts, packages/core/src/packImportPipeline.ts,
      packages/generators/src/packExporter.ts,
      packages/db/src/client.ts, packages/db/src/batchInsert.ts, packages/db/src/index.ts,
      packages/schema/src/types.ts, packages/schema/src/introspectDatabase.ts,
      packages/shared/src/realityPackTypes.ts,
      apps/cli/src/cli.ts, apps/cli/src/commands/pack.ts,
      README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.2.0 is published. Reality Packs exist for export (generate → pack)
and import (pack → DB). But there's no way to capture a LIVE database state
into a Reality Pack (DB → pack), and no way to share packs between developers.

OBJECTIVE:
Add capture, share, and load commands for environment reproduction.

REQUIREMENTS:

--- DB Data Reader (packages/db) ---

1. src/readTable.ts:
   - readTableRows(pool: pg.Pool, tableName: string, columns: string[]) → Promise<Record<string, unknown>[]>
   - Reads ALL rows from the given table
   - Column and table names double-quoted for safety
   - Returns array of row objects

   - readTableRowCount(pool: pg.Pool, tableName: string) → Promise<number>
   - Returns count of rows in table

2. src/index.ts — re-export read functions

--- Schema DDL Generator (packages/schema) ---

3. src/generateDDL.ts:
   - generateCreateTableDDL(schema: DatabaseSchema) → string
   - Generates CREATE TABLE statements from the normalized schema
   - Includes column types, NOT NULL, DEFAULT, PRIMARY KEY
   - Includes FOREIGN KEY constraints
   - Tables ordered by dependency (parents first)
   - Output is valid, runnable SQL

   - This is included in the Reality Pack so receivers can create the schema

4. src/index.ts — re-export generateDDL

--- Capture Pipeline (packages/core) ---

5. src/capturePipeline.ts:
   - captureDatabase(config: DataboxConfig, options: CaptureOptions) → Promise<CaptureResult>

   - CaptureOptions {
       name: string
       description?: string
       tables?: string[]  (optional: capture only specific tables)
       outputDir?: string
     }

   - CaptureResult {
       pack: RealityPack
       filePath: string
       totalRows: number
       tableCount: number
       durationMs: number
     }

   - Flow:
     a. Connect to DB
     b. Introspect schema
     c. If options.tables specified, filter to only those tables + their FK dependencies
     d. Read all rows from each table using readTableRows
     e. Build RealityPack with:
        - schema snapshot (from introspection)
        - dataset (from read rows)
        - DDL (from generateCreateTableDDL)
        - metadata (name, timestamp, row counts)
     f. Save pack to file
     g. Close connection
     h. Return result

   - The pack must include a "ddl" field in metadata so receivers can create tables

6. Update packages/shared/src/realityPackTypes.ts:
   - Add optional ddl?: string to PackMetadata
   - Add optional capturedFrom?: string to PackMetadata (masked connection string)

--- Share Pipeline (packages/core) ---

7. src/sharePipeline.ts:
   - shareRealityPack(filePath: string, options?: ShareOptions) → Promise<ShareResult>

   - ShareOptions {
       method: "gist" | "file"  (default: "file")
       description?: string
     }

   - ShareResult {
       method: string
       location: string  (file path or gist URL)
       packName: string
       size: string  (human readable, e.g., "245 KB")
     }

   - For method "file": just return the file path (it already exists)
   - For method "gist": use GitHub API to create a public gist
     Note: gist upload requires a GitHub token. If no token set,
     fall back to "file" method with a message:
     "To share via Gist, set GITHUB_TOKEN environment variable."

   - The gist approach is optional/future. For V1, "file" method is sufficient.
     The important thing is the command exists and the UX is right.

--- Load Command (apps/cli) ---

8. src/commands/load.ts:
   - realitydb load <file> --confirm
   - Friendly alias for pack import with better messaging
   - Flow:
     a. Read the Reality Pack file
     b. Print pack summary (name, template, tables, rows, DDL available)
     c. If pack has DDL and tables don't exist: offer to show the DDL
        "Schema required. Run this SQL first:"
        (print DDL or save to file)
     d. If --confirm: import the pack into DB
   - CI mode: JSON output

9. src/commands/capture.ts:
   - realitydb capture --name <name>
   - Options: --name (required), --description, --tables (comma-separated), --output
   - Calls capturePipeline
   - Prints:
     RealityDB Capture
     ═══════════════════════════════════════
     Database: postgres://postgres:****@localhost:5432/databox_dev
     Name: bug-4821

     Capturing...
       users: 500 rows
       plans: 500 rows
       subscriptions: 500 rows
       payments: 500 rows

     Captured: ./bug-4821.realitydb-pack.json (312 KB)
     Schema DDL included. Share this file to reproduce the environment.

   - CI mode: JSON output

10. src/commands/share.ts:
    - realitydb share <file>
    - For now: prints the file path and size, suggests sharing methods
    - Output:
      RealityDB Share
      ═══════════════════════════════════════
      Pack: bug-4821 (4 tables, 2000 rows, 312 KB)

      Share this file:
        File: ./bug-4821.realitydb-pack.json
        Size: 312 KB

      The receiver can load it with:
        realitydb load ./bug-4821.realitydb-pack.json --confirm

      Tip: To create the schema first, the receiver can run:
        realitydb load ./bug-4821.realitydb-pack.json --show-ddl

    - CI mode: JSON output

--- Wire Commands in CLI ---

11. Wire in cli.ts:
    - realitydb capture --name <name> [--tables <tables>] [--description <desc>] [--output <dir>]
    - realitydb share <file>
    - realitydb load <file> [--confirm] [--show-ddl]

--- README Update ---

12. Add Environment Reproduction section to README:

    ## Environment Reproduction

    Capture and share database environments for debugging:

    ```bash
    # Capture current database state
    realitydb capture --name bug-4821

    # Share with teammate
    # (send the .realitydb-pack.json file)

    # Teammate loads the environment
    realitydb load bug-4821.realitydb-pack.json --confirm
    ```

    Capture specific tables:
    ```bash
    realitydb capture --name user-issue --tables users,subscriptions
    ```

--- Version + Changelog ---

13. Bump version to 0.3.0 in apps/cli/package.json

14. Update CHANGELOG.md:
    ## 0.3.0 (2026-03-10)
    ### Features
    - `realitydb capture` — snapshot live database into Reality Pack
    - `realitydb share` — share Reality Pack with teammates
    - `realitydb load` — load Reality Pack into database
    - Schema DDL included in captured packs
    - Selective table capture with `--tables` flag
    - CI mode support for all new commands

CONSTRAINTS:
- capture must read ACTUAL data from the live database (not re-generate)
- capture must include schema DDL so receiver can create tables
- capture must handle large tables gracefully (batch reads if needed)
- load is a friendlier alias for pack import (reuse existing import pipeline)
- share V1 is file-based only (gist upload is future enhancement)
- All new commands must support --ci flag
- Table and column names must be double-quoted in all SQL
- Connection must be closed in all code paths
- Commit message: "feat: add capture, share, and load for environment reproduction"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify capture, share, load commands appear in --help
3. Verify captureDatabase exported from @databox/core
4. Verify readTableRows exported from @databox/db
5. Verify generateCreateTableDDL exported from @databox/schema
Report: build status, --help output showing new commands
```

---

## Sprint Checklist

```
## H1-S3 — Environment Reproduction

### DB Data Reader (2 points)
- [ ] readTableRows reads all rows from a table
- [ ] readTableRowCount returns row count

### Schema DDL Generator (2 points)
- [ ] generateCreateTableDDL produces valid CREATE TABLE SQL
- [ ] Includes FK constraints and dependency ordering

### Capture Pipeline (5 points)
- [ ] captureDatabase reads live DB rows into Reality Pack
- [ ] Pack includes schema snapshot + DDL
- [ ] --tables flag filters to specific tables + FK dependencies
- [ ] Metadata includes capturedFrom (masked connection)
- [ ] Connection closed in all code paths

### Share Command (2 points)
- [ ] realitydb share prints file info and receiver instructions
- [ ] CI mode outputs JSON

### Load Command (3 points)
- [ ] realitydb load <file> --confirm imports pack into DB
- [ ] Shows pack summary before import
- [ ] --show-ddl prints schema creation SQL

### Capture Command (3 points)
- [ ] realitydb capture --name <name> works end-to-end
- [ ] Prints table names and row counts during capture
- [ ] CI mode outputs JSON

### CLI Wiring (1 point)
- [ ] All three commands (capture, share, load) appear in --help

### README + Version (2 points)
- [ ] Environment Reproduction section in README
- [ ] Version 0.3.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/22 PASS
Gate: ALL must be ✅ before npm publish 0.3.0
```

---

## Post-Sprint: Publish + Test

After checklist passes:

```powershell
# Pull and build
cd C:\Users\HP\Documents\databox
git pull
pnpm install
pnpm build

# Test capture workflow
realitydb reset --confirm
realitydb seed --template saas --records 100 --seed 42
realitydb capture --name test-capture

# Verify pack exists
ls *.realitydb-pack.json

# Reset and load
realitydb reset --confirm
realitydb load test-capture.realitydb-pack.json --confirm

# Verify data matches
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM users;"

# Publish
cd apps/cli
npm publish
```

---

## What H1-S4 Will Build

H1-S4 adds premium domain templates:
- Fintech template (accounts, transactions, fraud attempts, settlements)
- Healthcare template (patients, encounters, diagnoses, billing)
- These become the first revenue candidates
