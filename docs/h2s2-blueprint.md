# RealityDB H2-S2 — Framework Starters & Integrations

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 2 — Ecosystem & Integrations
**Sprint:** H2-S2 — Framework Starters
**Status:** DRAFT
**Depends on:** H2-S1 (custom template API, realitydb@0.5.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Create plug-and-play starter configurations for popular frameworks so developers can add RealityDB to their existing project in under 2 minutes. After this sprint, a Next.js developer can run `realitydb init --framework nextjs` and get a working seed setup.

---

## What Must Be True After This Sprint

1. `realitydb init` scaffolds config + schema detection for a project.
2. `realitydb init --framework nextjs` creates Next.js-specific config.
3. `realitydb init --framework express` creates Express-specific config.
4. `realitydb init --framework django` creates Django-specific config.
5. `realitydb init --framework rails` creates Rails-specific config.
6. Each init detects existing database config (DATABASE_URL, .env) when possible.
7. Docker Compose integration improved with seed-on-startup pattern.
8. Version bumped to 0.6.0.

---

## Why This Matters

Developers evaluate tools in 2 minutes. If setup takes longer, they move on. Framework-specific init commands eliminate the "how do I configure this?" barrier. Docker Compose integration means `docker compose up` gives you a seeded database automatically.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Init command framework | `apps/cli/src/commands/init.ts` |
| D2 | Framework detector | `packages/config/src/detectFramework.ts` |
| D3 | Next.js starter config | `packages/config/src/starters/nextjs.ts` |
| D4 | Express starter config | `packages/config/src/starters/express.ts` |
| D5 | Django starter config | `packages/config/src/starters/django.ts` |
| D6 | Rails starter config | `packages/config/src/starters/rails.ts` |
| D7 | Docker seed-on-startup example | `examples/docker-compose/seed-on-startup/` |
| D8 | Version bump to 0.6.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/config/src/loadConfig.ts, apps/cli/src/cli.ts,
      apps/cli/src/commands/seed.ts, examples/docker-compose/docker-compose.yml,
      README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.5.0 supports custom templates and 5 built-in templates.
Setup still requires manually creating realitydb.config.json. We want
to make first-time setup as fast as possible with framework detection.

OBJECTIVE:
Add `realitydb init` command with framework-specific starter configs.

REQUIREMENTS:

--- Framework Detector (packages/config) ---

1. src/detectFramework.ts:
   - detectFramework(projectDir: string) → Promise<DetectedFramework>
   - DetectedFramework { name: string, configHints: ConfigHints }
   - Detection logic:
     - next.config.* → "nextjs"
     - express in package.json deps → "express"
     - manage.py + django in requirements → "django"
     - Gemfile + rails → "rails"
     - package.json only → "node"
     - None detected → "generic"
   - ConfigHints: { databaseUrl?: string, envFile?: string }
     - Reads .env, .env.local for DATABASE_URL
     - Reads docker-compose.yml for postgres service

--- Starter Configs ---

2. src/starters/nextjs.ts:
   - generateNextjsConfig(hints: ConfigHints) → StarterConfig
   - StarterConfig includes:
     - realitydb.config.json content
     - .env.local additions (if needed)
     - package.json script suggestions: "db:seed": "realitydb seed --template saas --seed 42"
   - Default: postgres://postgres:postgres@localhost:5432/app_db
   - Detects Prisma schema if present

3. src/starters/express.ts:
   - generateExpressConfig(hints: ConfigHints) → StarterConfig
   - Similar structure, detects Knex/Sequelize config

4. src/starters/django.ts:
   - generateDjangoConfig(hints: ConfigHints) → StarterConfig
   - Reads settings.py DATABASES config if possible

5. src/starters/rails.ts:
   - generateRailsConfig(hints: ConfigHints) → StarterConfig
   - Reads config/database.yml if possible

--- Init Command ---

6. apps/cli/src/commands/init.ts:
   - realitydb init [--framework <name>]
   - Flow:
     a. Detect framework (or use --framework override)
     b. Generate starter config
     c. Write realitydb.config.json
     d. Print next steps:
        "Created realitydb.config.json
         Detected: Next.js project
         Database: postgres://...

         Next steps:
           1. Ensure your database is running
           2. Apply your schema (migrations)
           3. Run: realitydb seed --template saas --seed 42"
   - If config already exists, warn and ask to overwrite (skip in CI mode)
   - CI mode: JSON output with generated config

--- Docker Seed-on-Startup ---

7. examples/docker-compose/seed-on-startup/:
   - docker-compose.yml with postgres + seed service
   - seed service runs: npx realitydb seed --ci --template saas --seed 42
   - Waits for postgres healthcheck before seeding
   - README.md with usage instructions

--- README Update ---

8. Add Quick Setup section to README showing init workflow

--- Version + Changelog ---

9. Bump version to 0.6.0
10. Update CHANGELOG.md

CONSTRAINTS:
- Init must not overwrite existing config without warning
- Framework detection is best-effort (not required to be perfect)
- All starters default to postgres://postgres:postgres@localhost:5432/app_db
- Init works without any framework detected (generic starter)
- Commit message: "feat: add realitydb init with framework detection"

VERIFICATION:
1. pnpm build succeeds
2. realitydb init --framework nextjs creates valid config
3. realitydb init (no flag) detects and generates
Report: build status, init output for each framework
```

---

## Sprint Checklist

```
## H2-S2 — Framework Starters

### Framework Detector (2 points)
- [ ] Detects nextjs, express, django, rails, node, generic
- [ ] Reads .env and docker-compose for database hints

### Starter Configs (4 points)
- [ ] Next.js starter generates valid config
- [ ] Express starter generates valid config
- [ ] Django starter generates valid config
- [ ] Rails starter generates valid config

### Init Command (4 points)
- [ ] realitydb init creates realitydb.config.json
- [ ] Auto-detects framework when --framework not specified
- [ ] Prints clear next steps
- [ ] CI mode outputs JSON

### Docker Seed-on-Startup (2 points)
- [ ] docker-compose.yml with postgres + seed service
- [ ] README with usage instructions

### README + Version (2 points)
- [ ] Quick Setup section updated in README
- [ ] Version 0.6.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/16 PASS
Gate: ALL must be ✅ before npm publish 0.6.0
```
