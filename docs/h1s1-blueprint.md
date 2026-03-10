# DataBox Horizon 1 Sprint 1 — npm Publish & First Public Release

**Project:** DataBox — Developer Reality Platform  
**Horizon:** 1 — Developer Adoption  
**Sprint:** H1-S1 — npm Publish  
**Status:** DRAFT  
**Depends on:** Phase 8 (COMPLETE ✅)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer) + Eddy (npm account + GitHub settings)

---

## Sprint Objective

Make DataBox installable by any developer in the world with a single command:

```
npx databox seed --seed 42
```

After this sprint, DataBox is a published npm package that developers can discover, install, and use against their own Postgres databases.

---

## What Must Be True After This Sprint

1. `npm install -g databox` installs the CLI globally.
2. `npx databox` works without prior installation.
3. `npx databox scan` connects to a developer's own Postgres.
4. `npx databox seed --template saas --records 100 --seed 42` populates their database.
5. The npm package page shows a clear description, keywords, and README.
6. The GitHub repo is public with a polished README.
7. `databox` is the package name on npm (or `@databox/cli` if taken).

---

## Pre-Sprint Checklist (Eddy Must Complete)

Before Claude Code touches anything, Eddy handles these manually:

### 1. npm Account

- [ ] Create npm account at https://www.npmjs.com if not already done
- [ ] Verify email
- [ ] Enable 2FA (required for publishing)
- [ ] Run locally: `npm login`

### 2. Check Package Name Availability

```powershell
npm view databox
```

If taken, fallback options in priority order:
- `@databox/cli`
- `databox-cli`  
- `databox-dev`
- `@mpingo/databox`

### 3. GitHub Repo Visibility

- [ ] Change repo from Private → Public (Settings → Danger Zone → Change visibility)
- [ ] Verify LICENSE file is MIT
- [ ] Verify no secrets in committed files (connection strings, passwords)
- [ ] Verify `databox.config.json` is in `.gitignore` (it is)
- [ ] Verify `.databox/` is in `.gitignore` (it is)
- [ ] Verify no `.env` files committed

### 4. Merge All Work to Main

```powershell
cd C:\Users\HP\Documents\databox
git checkout main
git merge claude/databox-platform-setup-KfIH1
git push
```

---

## Sprint Deliverables

| # | Deliverable | Owner |
|---|------------|-------|
| D1 | Package restructure for npm publish | Claude Code |
| D2 | Build pipeline produces publishable dist | Claude Code |
| D3 | npx binary works correctly | Claude Code |
| D4 | package.json metadata complete | Claude Code |
| D5 | .npmignore or files whitelist | Claude Code |
| D6 | CHANGELOG.md | Claude Code |
| D7 | npm publish dry run verified | Eddy |
| D8 | npm publish live | Eddy |
| D9 | Post-publish verification | Eddy |

---

## Sprint Prompt (for Claude Code)

```
Read: apps/cli/package.json, apps/cli/src/index.ts, apps/cli/src/cli.ts,
      package.json, tsconfig.base.json, pnpm-workspace.yaml,
      README.md, LICENSE, .gitignore,
      docs/architecture-guardrails.md

CONTEXT:
DataBox v0.1.0 is complete — scan, seed, reset, export, templates, scenarios,
timeline, Reality Packs all work. The monorepo has 8 packages. Now we need
to publish the CLI as a single npm package that any developer can install.

OBJECTIVE:
Restructure the project so `npm install -g databox` (or npx databox) works.
The published package must bundle all workspace dependencies into a single
distributable.

REQUIREMENTS:

--- Package Configuration (apps/cli) ---

1. Update apps/cli/package.json:
   - name: "databox" (or "@databox/cli" if "databox" is taken)
   - version: "0.1.0"
   - description: "Developer Reality Platform — realistic database environments from your schema"
   - license: "MIT"
   - keywords: ["database", "seed", "testing", "synthetic-data", "developer-tools",
                 "postgres", "fake-data", "test-data", "reality-engine", "schema"]
   - repository: { type: "git", url: "https://github.com/emkwambe/databox.git" }
   - author: "Eddy Mkwambe"
   - homepage: "https://github.com/emkwambe/databox"
   - bugs: { url: "https://github.com/emkwambe/databox/issues" }
   - bin: { "databox": "./dist/index.js" }
   - files: ["dist/", "README.md", "LICENSE"]
   - engines: { node: ">=20.0.0" }

2. The CLI must bundle all workspace packages into its dist.
   Option A (recommended): Use tsup or esbuild to bundle everything into a single file
   Option B: Include workspace packages in the published files

   If using bundler approach:
   - Install tsup as devDependency of @databox/cli
   - Create tsup.config.ts that bundles src/index.ts with all workspace deps
   - Output single dist/index.js (or dist/index.cjs for max compatibility)
   - External only: pg (native module must be installed by user)
   - Mark pg as a dependency (not devDependency) in the published package.json

3. The shebang #!/usr/bin/env node must be at the top of the output file

4. The output must work on Node 20+ on Windows, macOS, and Linux

--- Dependencies ---

5. The published package.json must have these runtime dependencies:
   - pg (Postgres driver — cannot be bundled, native bindings)
   - commander (CLI framework)
   
   All other workspace packages (@databox/core, @databox/schema, etc.) must
   be bundled into the CLI dist, NOT listed as dependencies.

6. @types/pg and typescript are devDependencies only (not published)

--- Build Script ---

7. Add a "prepublishOnly" script that:
   - Runs the bundler build
   - Verifies the output exists
   - Verifies the shebang is present

8. Add a "prepack" script if needed for npm pack

--- Files to Include in Published Package ---

9. Only these should be in the npm tarball:
   - dist/ (bundled CLI)
   - README.md
   - LICENSE
   - package.json

   Use "files" field in package.json to whitelist.
   Everything else (src/, tests/, docs/, other packages) excluded.

--- README for npm ---

10. Copy the polished README.md from repo root into apps/cli/
    (npm shows the README from the published package directory)
    
    Ensure it includes:
    - Installation: npm install -g databox
    - Quick Start with scan/seed/reset
    - All commands table
    - Configuration example
    - Link to GitHub repo for full docs

--- CHANGELOG ---

11. Create CHANGELOG.md at repo root:
    # Changelog

    ## 0.1.0 (2026-03-09)

    ### Features
    - Schema-aware database scanning (`databox scan`)
    - Realistic data generation with domain templates
    - Three built-in templates: SaaS, e-commerce, education
    - Timeline generation with S-curve growth models
    - Scenario injection: payment-failures, churn-spike, fraud-spike, data-quality
    - Reality Pack export and import for portable environments
    - JSON, CSV, and SQL export formats
    - Deterministic generation (same seed = same data)
    - PostgreSQL support

--- Verification Script ---

12. Create scripts/verify-publish.ts (or .mjs):
    - Runs: npm pack --dry-run
    - Checks tarball contents include dist/index.js
    - Checks tarball does NOT include src/, tests/, node_modules/
    - Checks package.json has correct name, version, bin, files
    - Prints PASS/FAIL

CONSTRAINTS:
- The published package must work with: npm install -g databox && databox scan
- Must work with: npx databox scan (without prior install)
- pg must be a runtime dependency (not bundled)
- commander must be bundled OR listed as dependency
- Source code (src/) must NOT be in the published package
- Tests, docs, and other workspace packages must NOT be published
- Must work on Windows, macOS, and Linux
- Node 20+ required
- Commit with message: "feat: configure CLI for npm publish"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. cd apps/cli && npm pack --dry-run — check tarball contents
3. Verify dist/index.js exists and has shebang
4. Verify package.json has correct metadata
Report: build status, npm pack dry-run output, file list
```

---

## Sprint Checklist

```
## H1-S1 — npm Publish Prep

### Package Configuration (5 points)
- [ ] apps/cli/package.json has name "databox" (or fallback)
- [ ] version is "0.1.0"
- [ ] description, keywords, repository, author, homepage, bugs all set
- [ ] bin field points to correct dist entry
- [ ] engines specifies node >= 20

### Bundling (5 points)
- [ ] All workspace packages bundled into CLI dist
- [ ] Single entry point (dist/index.js or similar)
- [ ] Shebang present at top of output file
- [ ] pg listed as runtime dependency (not bundled)
- [ ] Source files NOT included in published package

### Build Pipeline (3 points)
- [ ] Build command produces publishable output
- [ ] prepublishOnly script runs build + verify
- [ ] npm pack --dry-run shows correct file list

### README + CHANGELOG (2 points)
- [ ] README.md in apps/cli/ with installation and quick start
- [ ] CHANGELOG.md at repo root with v0.1.0 features

### Verification (3 points)
- [ ] npm pack --dry-run shows dist/, README, LICENSE, package.json only
- [ ] No src/, tests/, docs/, node_modules/ in tarball
- [ ] Package size is reasonable (< 5MB)

### Git (1 point)
- [ ] Commit with message "feat: configure CLI for npm publish"

Score: __/19 PASS
Gate: ALL must be ✅ before npm publish
```

---

## Post-Sprint: Eddy's Manual Steps

After Claude Code commits and the checklist passes:

### Step 1 — Verify Locally

```powershell
cd C:\Users\HP\Documents\databox
git pull
pnpm install
pnpm build
cd apps/cli
npm pack --dry-run
```

Review the file list. Confirm no source code or secrets.

### Step 2 — Test the Package Locally

```powershell
cd apps/cli
npm pack
```

This creates `databox-0.1.0.tgz`. Test it:

```powershell
cd C:\Users\HP\Documents
mkdir databox-test
cd databox-test
npm init -y
npm install ..\databox\apps\cli\databox-0.1.0.tgz
npx databox --help
npx databox scan
```

If `scan` works against your Docker Postgres, the package is good.

### Step 3 — Publish

```powershell
cd C:\Users\HP\Documents\databox\apps\cli
npm publish
```

If "databox" is taken:

```powershell
npm publish --access public
```

(for scoped packages like @databox/cli)

### Step 4 — Verify Live

From a completely separate directory:

```powershell
cd C:\Users\HP\Documents
mkdir databox-verify
cd databox-verify
npx databox --help
npx databox scan
```

If this works, DataBox is live on npm.

### Step 5 — Announce

Post the GitHub repo URL and npm package link. The README does the rest.

---

## What H1-S2 Will Build

H1-S2 adds CI mode:
- `--ci` flag with JSON output and proper exit codes
- GitHub Actions sample workflow
- Docker image consideration

But first: get on npm. That's the unlock.
