# RealityDB Platform
## Security, Maintenance, Monitoring & Inspection Plan
### Technical Handover Document

> **Version:** 1.0 · **Date:** April 6, 2026 · **Author:** Mpingo Systems LLC
> 
> This document serves dual purpose: (1) operational security and maintenance plan for the RealityDB platform, and (2) technical handover summary for any new engineer joining the project.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture Map](#2-architecture-map)
3. [Repository Structure](#3-repository-structure)
4. [Security Plan](#4-security-plan)
5. [Maintenance Plan](#5-maintenance-plan)
6. [Monitoring Plan](#6-monitoring-plan)
7. [Inspection Checklist](#7-inspection-checklist)
8. [Incident Response](#8-incident-response)
9. [Onboarding Guide for New Engineers](#9-onboarding-guide-for-new-engineers)
10. [Key Decisions Log](#10-key-decisions-log)
11. [Known Issues & Technical Debt](#11-known-issues--technical-debt)
12. [Contact & Ownership](#12-contact--ownership)

---

## 1. Platform Overview

RealityDB is a synthetic data platform that generates causally-correct, production-realistic databases. It consists of four products:

| Product | URL | Stack | Status |
|---------|-----|-------|--------|
| **CLI** | [npm @realitydb/cli](https://www.npmjs.com/package/@realitydb/cli) | Node.js, TypeScript, Commander.js | v2.19.0 · Production |
| **Engine** | `packages/engine/` in monorepo | Pure TypeScript (zero Node.js deps) | v1.0.0 · Production |
| **Sandbox** | [sandbox.realitydb.dev](https://sandbox.realitydb.dev) | React, PGLite, Vite | v1.0 · Production |
| **Studio** | [studio.realitydb.dev](https://studio.realitydb.dev) | React, React Flow, Vite | v0.2.0 · Internal Preview |

**Business model:** Free tier (50K rows/month) + Core tier ($49/month, 500K rows/month). Lifecycle rules are the primary upgrade trigger.

**License:** BSL-1.1 (Business Source License). All repositories.

---

## 2. Architecture Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Endpoints                           │
├──────────┬──────────┬──────────────┬───────────────────────────┤
│ CLI      │ Sandbox  │ Studio       │ Landing                    │
│ npm pkg  │ CF Pages │ CF Pages     │ CF Pages (planned)         │
│ Node.js  │ React    │ React        │ Static HTML                │
│          │ PGLite   │ React Flow   │                            │
│          │          │ Claude API   │                            │
└────┬─────┴────┬─────┴──────┬───────┴───────────────────────────┘
     │          │            │
     ▼          │            │
┌──────────┐    │            │
│ Engine   │    │            │
│ (pkg)    │◄───┘            │
│ TS/ES20  │                 │
│ No deps  │                 │
└────┬─────┘                 │
     │                       │
     ▼                       ▼
┌──────────┐          ┌──────────────┐
│ pg       │          │ Anthropic    │
│ Driver   │          │ Claude API   │
│ (CLI)    │          │ (Studio AI)  │
└────┬─────┘          └──────────────┘
     │
     ▼
┌──────────────────────┐
│ PostgreSQL           │
│ (User's DB /         │
│  Supabase /          │
│  Local Docker)       │
└──────────────────────┘
```

**Hosting:** All web products on Cloudflare Pages (free tier). No servers to maintain. CLI distributed via npm.

**Databases:** RealityDB does not run its own database. It connects to the user's PostgreSQL instance via connection string. The only Supabase project is for future auth/usage tracking.

---

## 3. Repository Structure

### Primary Repositories

| Repo | GitHub | Purpose |
|------|--------|---------|
| `databox` | [github.com/emkwambe/realitydb-cli](https://github.com/emkwambe/realitydb-cli) | Monorepo: CLI, Engine, Sandbox, Studio source |
| `realityDB-sutudio` | [github.com/emkwambe/realityDB-sutudio](https://github.com/emkwambe/realityDB-sutudio) | Studio deployment repo (separate from monorepo) |

### Monorepo Layout (`databox`)

```
databox/
├── apps/
│   ├── cli/                    # @realitydb/cli (published to npm)
│   │   ├── src/
│   │   │   ├── index.ts        # Commander.js entry (~500 lines)
│   │   │   ├── gate.ts         # Tier gating (Free/Core enforcement)
│   │   │   ├── auth/
│   │   │   │   └── license.ts  # License management
│   │   │   └── commands/
│   │   │       ├── analyze.ts
│   │   │       ├── audit.ts
│   │   │       ├── capture.ts
│   │   │       ├── init.ts
│   │   │       ├── load.ts
│   │   │       ├── login.ts
│   │   │       ├── logout.ts
│   │   │       ├── mask.ts
│   │   │       ├── pack.ts
│   │   │       ├── reset.ts
│   │   │       ├── scan.ts
│   │   │       ├── seed.ts
│   │   │       ├── simulate.ts
│   │   │       ├── status.ts
│   │   │       └── upgrade.ts
│   │   ├── tsup.config.ts      # Build config (CJS, node20)
│   │   └── package.json        # @realitydb/cli
│   ├── sandbox/                # Sandbox web app
│   └── studio/                 # Studio web app (source of truth)
├── packages/
│   ├── engine/                 # @realitydb/engine (standalone)
│   │   ├── src/
│   │   │   ├── types.ts        # NormalizedTable, GenerationResult
│   │   │   ├── generators.ts   # Strategy implementations
│   │   │   ├── normalize.ts    # Template format detection + conversion
│   │   │   ├── engine.ts       # Topological sort, distribution, generation
│   │   │   ├── output-sql.ts   # SQL output formatter
│   │   │   ├── output-json.ts  # Streaming JSON output
│   │   │   ├── output-csv.ts   # CSV output
│   │   │   └── index.ts        # Barrel exports
│   │   └── tsup.config.ts      # CJS + ESM + .d.ts, target es2020
│   ├── config/
│   ├── core/                   # Legacy (not wired to CLI)
│   ├── db/                     # PostgreSQL/MySQL adapters (not wired)
│   ├── generators/             # Legacy generators (superseded by engine)
│   ├── schema/                 # Schema introspection (not wired)
│   ├── shared/                 # Legacy shared utils (not wired)
│   └── templates/              # Legacy templates (not wired)
├── docs/
│   ├── README.md               # Comprehensive CLI documentation
│   └── MASTERCLASS.md          # $10 course content
├── supabase/                   # Supabase edge functions
│   └── functions/
│       └── validate-api-key/   # API key validation
└── package.json                # Monorepo root (turbo)
```

### Key File Locations (Local Development)

| What | Path |
|------|------|
| CLI source | `C:\Users\HP\Documents\databox\apps\cli\src\` |
| Engine source | `C:\Users\HP\Documents\databox\packages\engine\src\` |
| Studio deploy repo | `C:\Users\HP\Documents\realityDB-sutudio\` |
| Sandbox deploy | `C:\Users\HP\Documents\realitydb-sandbox\` |
| Template packs | `C:\Users\HP\Documents\realityDB Packs\` |
| Internal docs | `C:\Users\HP\Documents\realitydb-internal\` |
| User home config | `C:\Users\HP\.realitydb\` |

---

## 4. Security Plan

### 4.1 Secrets & Credentials

| Secret | Location | Rotation Policy |
|--------|----------|----------------|
| npm publish token | npm CLI auth (browser-based) | Rotate after any compromise |
| Cloudflare API token | `wrangler` CLI auth | Rotate quarterly |
| Supabase DB password | Supabase Dashboard | Rotated 2026-04-06 to `ips5nwzGLL3KpQqP` |
| Anthropic API key | Studio `.env.local` (gitignored) | Rotate monthly |
| GitHub access | Personal token / SSH key | Rotate annually |

**Critical rules:**
- No secrets in source code. Ever. Check with `git log --all -p -S "sk-ant"` before any push.
- `.env.local` is gitignored. `.env.example` shows variable names only.
- The Anthropic API key is bundled into Studio's JS at build time. This is acceptable ONLY because Studio is internal-only and not publicly linked. If Studio becomes public, move to a backend proxy.
- Connection strings are masked in all CLI output (`postgresql://user:****@host`).

### 4.2 Authentication & Authorization

| Component | Auth Method | Notes |
|-----------|------------|-------|
| CLI | API key stored at `~/.realitydb/license.json` | Validated against Supabase edge function |
| Studio | None (internal tool) | Protected by obscurity only — not publicly linked |
| Sandbox | None (public tool) | Read-only SQL execution via PGLite (client-side only) |
| npm publish | npm 2FA required | Enforce 2FA on npm account |

**Tier enforcement:**
- Free tier: 50K rows/month cumulative, lifecycle rules stripped, Core commands blocked
- Core tier ($49/mo): 500K rows/month, all features
- Enforcement is local (`~/.realitydb/usage.json`). Tamper-resistant server-side enforcement planned for post-launch.

### 4.3 Data Security

| Data Type | Protection |
|-----------|-----------|
| User connection strings | Never logged, masked in output |
| Generated data | Stays local — never sent to any server |
| PII mask audit logs | Stored locally, user-controlled |
| Captured bug packs | `--safe` flag masks PII before writing |
| Studio AI prompts | Sent to Anthropic API (see privacy note) |
| Usage tracking | Local file only (`~/.realitydb/usage.json`) |

**Privacy note:** When the Studio AI Generator is used, the user's schema description is sent to the Anthropic API. No database data, credentials, or PII is sent — only the natural language prompt. The generated schema JSON is received and processed client-side.

### 4.4 Dependency Security

| Check | Frequency | Command |
|-------|-----------|---------|
| npm audit | Before every publish | `npm audit` in `apps/cli/` |
| Outdated deps | Monthly | `pnpm outdated` |
| License compliance | Before publish | Verify all deps are MIT/Apache/BSD compatible with BSL-1.1 |
| Snyk/Socket scan | Before major release | Use npm's built-in `npm audit` or Socket.dev |

**Current dependency count:** CLI has ~15 direct dependencies. Engine has 0 runtime dependencies (dev-only: tsup, typescript).

### 4.5 Supply Chain Security

- **npm 2FA** is required for publishing `@realitydb/cli`
- **Package provenance** should be enabled (`--provenance` flag on npm publish)
- **Lock files** (`pnpm-lock.yaml`) are committed and reviewed
- **No postinstall scripts** in the published package
- The deprecated `realitydb` package redirects to `@realitydb/cli` with a console warning

---

## 5. Maintenance Plan

### 5.1 Regular Maintenance Schedule

| Task | Frequency | Owner | Procedure |
|------|-----------|-------|-----------|
| Dependency updates | Monthly | Lead dev | `pnpm outdated`, update, test, publish |
| npm audit | Before each publish | Lead dev | `npm audit --production` |
| Cloudflare Pages builds | After each deploy | Auto | Verify at deployment URL |
| License file check | Quarterly | Founder | Ensure BSL-1.1 in all package.json files |
| Supabase DB password rotation | Quarterly | Founder | Dashboard → Settings → Database |
| Anthropic API key rotation | Monthly | Founder | console.anthropic.com → new key → .env.local → rebuild Studio |
| Usage data cleanup | Monthly | Auto | gate.ts keeps only last 3 months |
| Backup template packs | Monthly | Lead dev | Copy `realityDB Packs/` to cloud storage |

### 5.2 Build & Deploy Procedures

**CLI publish:**
```bash
cd apps/cli
pnpm run build                    # Builds with tsup
npm version patch|minor|major     # Bumps version
npm publish --access public       # Publishes to npm (requires 2FA)
```

**Engine build:**
```bash
cd packages/engine
pnpm install
pnpm run build                    # Produces CJS + ESM + .d.ts
```

**Monorepo full build:**
```bash
cd databox
pnpm install
pnpm run build                    # turbo runs all packages
```

**Studio deploy:**
```bash
cd realityDB-sutudio
npm run build                     # Vite build
npx wrangler pages deploy dist --project-name=realitydb-studio --commit-dirty=true
```

**Sandbox deploy:**
```bash
cd realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name=realitydb-sandbox --commit-dirty=true
```

**Important:** Studio source lives in TWO places — `databox/apps/studio/` (monorepo source) and `realityDB-sutudio/` (deployment repo). After Claude Code makes changes to the monorepo, files must be copied to the deployment repo manually:

```bash
copy databox\apps\studio\src\*.tsx realityDB-sutudio\src\
copy databox\apps\studio\src\components\*.tsx realityDB-sutudio\src\components\
```

This is a known pain point. Future fix: consolidate into a single repo with CI/CD.

### 5.3 Version Management

| Package | npm Name | Current Version | Versioning |
|---------|----------|-----------------|-----------|
| CLI | `@realitydb/cli` | 2.19.0 | semver (patch/minor/major) |
| Engine | `@realitydb/engine` | 1.0.0 | semver |
| Old CLI (deprecated) | `realitydb` | 2.0.14 | Frozen — redirect only |

**Build order matters:** Engine must build before CLI (CLI imports from engine).

```
packages/engine → apps/cli → apps/sandbox → apps/studio
```

Turbo handles this via the `build` pipeline in `turbo.json`.

---

## 6. Monitoring Plan

### 6.1 What to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| npm weekly downloads | npmjs.com/package/@realitydb/cli | Track trend (currently ~1,164/week) |
| GitHub stars | github.com/emkwambe/realitydb-cli | Track trend |
| Cloudflare Pages uptime | Cloudflare Dashboard | Any deploy failure |
| Studio AI generator errors | Browser console (manual check) | API timeout > 150s |
| Supabase edge function health | Supabase Dashboard → Logs | Any 5xx errors |
| CLI error reports | npm issues / GitHub issues | Any new issue |

### 6.2 Health Checks

**Weekly (5 minutes):**
```bash
# Verify CLI installs correctly
npm install -g @realitydb/cli@latest
realitydb --version
realitydb status

# Verify Sandbox loads
curl -s -o /dev/null -w "%{http_code}" https://sandbox.realitydb.dev
# Should return 200

# Verify Studio loads
curl -s -o /dev/null -w "%{http_code}" https://studio.realitydb.dev
# Should return 200
```

**Monthly (30 minutes):**
```bash
# Full CLI regression test
realitydb init --domain saas --quick
realitydb run --pack realitydb-saas-template.json --rows 1000 -o test.json
realitydb run --pack realitydb-saas-template.json --rows 1000 --format sql -o test.sql
realitydb run --pack realitydb-saas-template.json --rows 1000 --format csv
realitydb pack:validate --pack realitydb-saas-template.json
realitydb simulate --list-scenarios

# If local PostgreSQL available:
realitydb seed --pack realitydb-saas-template.json --rows 1000 \
  --connection postgresql://postgres:postgres@localhost:5432/test \
  --drop-tables --create-tables
realitydb scan --connection postgresql://postgres:postgres@localhost:5432/test -o scanned.json
realitydb mask --connection postgresql://postgres:postgres@localhost:5432/test --dry-run
realitydb reset --pack realitydb-saas-template.json \
  --connection postgresql://postgres:postgres@localhost:5432/test --confirm
```

### 6.3 Uptime & Performance Baselines

| Metric | Baseline | Acceptable Range |
|--------|----------|-----------------|
| CLI generation speed | 210K rows/sec (14 tables) | > 100K rows/sec |
| CLI seed speed | 13K rows/sec (24 tables, batch 1000) | > 5K rows/sec |
| Sandbox page load | < 3s | < 5s |
| Studio page load | < 3s | < 5s |
| Studio AI generation | 15-30s for 20 tables | < 150s |

---

## 7. Inspection Checklist

### 7.1 Pre-Release Inspection

Run before every npm publish:

- [ ] `pnpm run build` passes for engine AND cli
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] CLI `--version` shows correct version
- [ ] `realitydb status` works (logged in and logged out)
- [ ] `realitydb run` generates data with correct FK refs
- [ ] `realitydb run --format sql` produces valid SQL
- [ ] `realitydb run --format csv` creates directory with files
- [ ] Free tier gating blocks > 50K rows
- [ ] Core tier commands blocked on free tier
- [ ] Lifecycle rules stripped on free tier with warning
- [ ] `package.json` license is `BSL-1.1`
- [ ] No secrets in committed files (`git diff --cached | grep -i "sk-ant\|password\|secret"`)

### 7.2 Quarterly Security Inspection

- [ ] All npm packages audited (`npm audit`)
- [ ] Supabase database password rotated
- [ ] Anthropic API key rotated (Studio .env.local)
- [ ] Cloudflare access reviewed
- [ ] GitHub repository access reviewed
- [ ] BSL-1.1 license present in all published packages
- [ ] No new dependencies with incompatible licenses
- [ ] Studio is not publicly linked from any navigation (internal only)
- [ ] `realitydb` (deprecated) still redirects properly

### 7.3 Annual Platform Review

- [ ] Review all third-party dependencies for EOL / unmaintained status
- [ ] Review pricing model against usage data
- [ ] Review template packs for outdated schemas
- [ ] Review engine generation strategies for new data types needed
- [ ] Review gating logic against current tier model
- [ ] Update this document

---

## 8. Incident Response

### 8.1 Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|---------|
| **P0** | Revenue impacting, data loss, security breach | Immediate (< 1 hour) | Credentials leaked, npm package compromised, CLI generates corrupt data |
| **P1** | Major feature broken, blocking users | Same day (< 8 hours) | `seed` command crashes, Sandbox won't load, gating bypassed |
| **P2** | Minor feature broken, workaround exists | Next business day | One format doesn't work, emoji display issues, Studio crash on edge case |
| **P3** | Cosmetic, documentation, enhancement | Next sprint | Typos, UI polish, feature requests |

### 8.2 Response Procedures

**P0 — Security Incident:**
1. Identify scope (what was exposed, for how long)
2. Revoke all affected credentials immediately
3. If npm package compromised: `npm unpublish` the bad version, publish clean version
4. If API key leaked: rotate key, rebuild and redeploy Studio
5. Notify affected users (if any)
6. Post-mortem within 48 hours

**P0 — Data Corruption:**
1. Identify the version that introduced the bug
2. Publish a patch immediately
3. Communicate via npm deprecation message on affected version
4. Provide rollback instructions

**P1 — Feature Broken:**
1. Reproduce the issue
2. Fix in source
3. Build, test, publish patch version
4. Verify fix in production

### 8.3 Rollback Procedures

**CLI rollback:**
```bash
# Users can install a specific version
npm install -g @realitydb/cli@2.18.0

# Deprecate the broken version
npm deprecate @realitydb/cli@2.19.0 "Known issue with X. Use 2.18.0."
```

**Studio rollback:**
```bash
# Cloudflare Pages keeps previous deployments
# Go to Cloudflare Dashboard → Pages → realitydb-studio → Deployments
# Click "Rollback to this deployment" on the last good version
```

**Sandbox rollback:**
Same as Studio — Cloudflare Pages retains all deployments.

---

## 9. Onboarding Guide for New Engineers

### 9.1 First Day Setup

```bash
# 1. Clone the monorepo
git clone https://github.com/emkwambe/realitydb-cli.git
cd databox

# 2. Install dependencies
pnpm install

# 3. Build everything
pnpm run build

# 4. Test the CLI
cd apps/cli
node dist/index.js --version
node dist/index.js init --domain saas --quick
node dist/index.js run --pack realitydb-saas-template.json --rows 1000 -o test.json
```

### 9.2 Development Workflow

The "Eddy Protocol" — conventions used throughout the project:

1. **Atomic file replacement** — when modifying files, replace the entire file rather than patching. This avoids merge conflicts and partial states.
2. **PowerShell on Windows** — use `[System.IO.File]::WriteAllText()` for BOM-free UTF-8 writes. Never use `Out-File` for source code.
3. **Build order** — packages build in dependency order: `engine → cli`. Run `pnpm run build` from monorepo root or build individually.
4. **Test before publish** — always run the CLI locally against a test pack before `npm publish`.
5. **Claude Code integration** — architecture planning happens in Claude Chat (this tool), execution happens in Claude Code (cloud environment connected to GitHub). Verify locally before advancing sprints.

### 9.3 Key Concepts

**RealityPack** — a JSON file defining a database schema with generation strategies. Two formats supported (see docs/README.md).

**Engine** — the standalone TypeScript package that takes a normalized template and generates data. Zero Node.js dependencies. Runs in CLI (Node.js), Cloudflare Workers, and browsers.

**Normalization** — the engine's `normalizeTables()` function auto-detects which template format is being used and converts it to a uniform internal structure.

**Topological Sort** — tables are sorted so parents generate before children. This ensures every FK reference points to a real parent row.

**Gating** — the `gate.ts` module enforces Free vs Core tier limits. Commands, row counts, and lifecycle rules are all gated.

### 9.4 Common Tasks

**Add a new CLI command:**
1. Create `src/commands/mycommand.ts`
2. Add import in `src/index.ts`
3. Register with `program.command('mycommand')...`
4. If Core-only: wrap action with `gateCommand('mycommand')` check
5. Build and test

**Add a new generation strategy:**
1. Edit `packages/engine/src/generators.ts`
2. Add case in `generateByStrategy()`
3. Build engine: `cd packages/engine && pnpm run build`
4. Build CLI: `cd apps/cli && pnpm run build`

**Deploy Studio changes:**
1. Make changes in `databox/apps/studio/src/`
2. Copy changed files to `realityDB-sutudio/src/`
3. Build: `cd realityDB-sutudio && npm run build`
4. Deploy: `npx wrangler pages deploy dist --project-name=realitydb-studio --commit-dirty=true`

**Publish a new CLI version:**
1. Build: `cd apps/cli && pnpm run build`
2. Test: `node dist/index.js run --pack test.json --rows 1000`
3. Version: `npm version patch|minor|major`
4. Publish: `npm publish --access public`

---

## 10. Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03 | BSL-1.1 license | Protect revenue while allowing evaluation |
| 2026-03 | Supabase for auth | Existing expertise, edge functions, free tier |
| 2026-04 | Engine extraction to packages/engine/ | Enable engine reuse in Workers/browser |
| 2026-04 | Direct pg import (not @databox/db) | Avoid broken dependency chain in legacy packages |
| 2026-04 | Studio v4.3.0 as canonical format | Includes positions, explicit IDs, fkTarget |
| 2026-04 | Anthropic Claude for Studio AI | Best structured output quality for schema generation |
| 2026-04 | Direct browser API call for Studio AI | Internal-only tool, no backend needed |
| 2026-04 | Local usage tracking (not Supabase) | Ship faster, add server-side enforcement post-launch |
| 2026-04 | Free: 50K rows/month, Core: $49/500K | Pre-funding pricing strategy, lifecycle as upgrade trigger |
| 2026-04 | Lifecycle rules as paywall trigger | Users feel the absence naturally during evaluation |

---

## 11. Known Issues & Technical Debt

### High Priority (Fix Before Launch)

| Issue | Impact | Fix |
|-------|--------|-----|
| Studio lives in two repos | Deployment friction, potential drift | Consolidate to single repo with CI/CD |
| Legacy `@databox/*` packages not wired | Dead code in monorepo, confusing for new devs | Remove or mark as deprecated |
| `status` command still checks `checkFeature()` | Shows wrong tier info for some plans | Replace with isPaid check (done in status.ts, verify checkFeature is unused) |
| Login/logout calls Supabase edge function | Edge function may not be deployed/configured | Verify or mock for testing |
| Usage tracking is local-only | Can be tampered with by deleting file | Add server-side enforcement post-launch |

### Medium Priority (Post-Launch)

| Issue | Impact | Fix |
|-------|--------|-----|
| No CI/CD pipeline | Manual builds and deploys | Add GitHub Actions for build/test/publish |
| No automated tests | Regression risk | Add test suite for engine and CLI |
| SQL data files not version-controlled | Template data can be lost | Add to sandbox repo |
| `@databox/templates` not wired | `templates` and `scenarios` commands disabled | Wire or remove |
| Duplicate key warning in Studio build | Cosmetic (non-fatal) | Fix `name` key in store.ts |
| Engine doesn't support all SQL types | Some scanned types map to TEXT | Add more type mappings |

### Low Priority (Future)

| Issue | Impact | Fix |
|-------|--------|-----|
| No MySQL/SQLite support in scan/seed | Limited to PostgreSQL | Add adapters via packages/db |
| No Parquet/Arrow output | Missing for data science use case | Add via external library |
| No schema diffing | Can't compare two packs | Build pack:diff command |
| No progress bar for large generations | UX for long-running operations | Add progress callback in engine |

---

## 12. Contact & Ownership

| Role | Name | Contact |
|------|------|---------|
| Founder & Technical Director | Eddy Mkwambe | eddy@mpingo.ai |
| Company | Mpingo Systems LLC | Charlotte, NC |
| GitHub | @emkwambe | github.com/emkwambe |
| npm | @mpingo | npmjs.com/~mpingo |

**Repositories owned:**
- github.com/emkwambe/realitydb-cli (primary monorepo)
- github.com/emkwambe/realityDB-sutudio (Studio deployment)
- github.com/emkwambe/realitydb-sandbox (Sandbox — if separate)

**Infrastructure accounts:**
- Cloudflare (Pages hosting for sandbox, studio, landing)
- Supabase (project: cfpongyknrdrudetjhdq — auth, edge functions)
- npm (scope: @realitydb)
- Anthropic (API key for Studio AI generator)
- Stripe (planned — payment processing for Core tier)

---

*RealityDB Security, Maintenance & Inspection Plan v1.0*
*© 2026 Mpingo Systems LLC · All rights reserved*
*Last updated: April 6, 2026*
