# RealityDB H2-S3 — Demo Mode & Pre-built Packs

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 2 — Ecosystem & Integrations
**Sprint:** H2-S3 — Demo Mode
**Status:** DRAFT
**Depends on:** H2-S2 (framework starters, realitydb@0.6.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Enable sales engineers and product teams to spin up realistic demo environments with one command. After this sprint, `realitydb demo --template saas` creates a complete demo database with curated, presentation-ready data.

---

## What Must Be True After This Sprint

1. `realitydb demo --template saas` seeds with curated demo data (named users, realistic company names, coherent stories).
2. Demo mode produces "presentation-ready" data — no Lorem Ipsum, no obviously fake names.
3. Each template has a demo variant with hand-crafted seed entities.
4. `realitydb demo --template saas --persona enterprise` uses an enterprise-scale demo profile.
5. Pre-built Reality Packs for each demo template can be downloaded without a database connection.
6. Version bumped to 0.7.0.

---

## Why This Matters

Sales engineering is a massive hidden market. Every SaaS company needs demo environments filled with realistic data. Today, sales engineers manually create demo data or use production snapshots (risky). RealityDB demo mode automates this entirely. One demo pack can be used across the entire sales team.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Demo data profiles (curated seed entities) | `packages/templates/src/demos/` |
| D2 | SaaS demo profile | `packages/templates/src/demos/saas-demo.ts` |
| D3 | E-commerce demo profile | `packages/templates/src/demos/ecommerce-demo.ts` |
| D4 | Fintech demo profile | `packages/templates/src/demos/fintech-demo.ts` |
| D5 | Demo command | `apps/cli/src/commands/demo.ts` |
| D6 | Persona system (startup, growth, enterprise) | `packages/templates/src/demos/personas.ts` |
| D7 | Pre-built pack generation script | `scripts/build-demo-packs.ts` |
| D8 | Version bump to 0.7.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/domains/saas.ts,
      packages/templates/src/domains/fintech.ts,
      packages/generators/src/primitives/index.ts,
      packages/generators/src/distributions.ts,
      apps/cli/src/cli.ts, apps/cli/src/commands/seed.ts,
      README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.6.0 has 5 templates, custom template API, and framework init.
Templates generate statistically realistic data, but the output has random
names and values. Sales teams need curated, presentation-ready data where
specific seed entities tell a coherent story.

OBJECTIVE:
Add demo mode with curated seed entities and persona scaling.

REQUIREMENTS:

--- Demo Profile Type ---

1. packages/templates/src/demos/types.ts:
   - DemoProfile {
       templateName: string
       personas: Map<string, PersonaConfig>
       seedEntities: SeedEntity[]      // hand-crafted first rows
       storyArcs: StoryArc[]           // coherent data narratives
     }
   - PersonaConfig {
       name: string                     // "startup", "growth", "enterprise"
       description: string
       recordMultiplier: number          // 1x, 5x, 20x
       defaultRecords: number
     }
   - SeedEntity {
       table: string
       data: Record<string, unknown>     // hand-crafted row values
       description?: string              // "The flagship enterprise customer"
     }
   - StoryArc {
       name: string                      // "enterprise-upgrade"
       description: string               // "Customer upgrades from Starter to Enterprise"
       entities: SeedEntity[]
     }

--- SaaS Demo Profile ---

2. packages/templates/src/demos/saas-demo.ts:
   - Seed entities:
     - Plans: "Starter" ($0), "Professional" ($29/mo), "Business" ($99/mo), "Enterprise" ($499/mo)
     - Users: "Alex Chen" (enterprise), "Sarah Johnson" (churned), "Marcus Williams" (trialing),
              "Priya Patel" (power user), "Demo Admin" (admin account)
     - Subscriptions: Alex on Enterprise (active), Sarah canceled last month, Marcus on trial
     - Payments: Alex paid $499 x 12 months, Sarah's last payment failed
   - Story arcs:
     - "Enterprise Upgrade": user starts Starter → Professional → Enterprise
     - "Churn Recovery": canceled user returns after 2 months
   - Personas:
     - startup: 50 records, 5 seed entities
     - growth: 500 records, 5 seed entities + random fill
     - enterprise: 5000 records, 5 seed entities + random fill

--- E-commerce Demo Profile ---

3. packages/templates/src/demos/ecommerce-demo.ts:
   - Seed entities:
     - Products: "Premium Headphones" ($299), "Wireless Keyboard" ($89), etc.
     - Customers: "Demo Buyer" with complete order history
     - Orders: Mix of completed, processing, and returned orders
   - Personas: startup (50), growth (500), enterprise (5000)

--- Fintech Demo Profile ---

4. packages/templates/src/demos/fintech-demo.ts:
   - Seed entities:
     - Accounts: "Acme Corp" (business), "Jane Doe" (personal checking)
     - Transactions: Realistic payment flows
     - Fraud alert: One flagged suspicious transaction
   - Personas: startup (50), growth (500), enterprise (5000)

--- Demo Command ---

5. apps/cli/src/commands/demo.ts:
   - realitydb demo --template <name> [--persona <name>]
   - Default persona: growth
   - Flow:
     a. Load demo profile for template
     b. Insert seed entities first (hand-crafted rows)
     c. Generate remaining rows using template distributions
     d. Apply story arcs
   - Output:
     RealityDB Demo
     ═══════════════════════════════════════
     Template: SaaS (growth persona)
     Seed entities: 5 hand-crafted rows
     Generated: 500 rows per table

     Demo accounts:
       Alex Chen (Enterprise, active) — alex@acmecorp.com
       Sarah Johnson (canceled) — sarah@example.com
       Marcus Williams (trialing) — marcus@startup.io

     Total: 2000 rows in 0.3s
     Ready for demo.

   - CI mode: JSON output

--- Pre-built Pack Script ---

6. scripts/build-demo-packs.ts:
   - Generates Reality Packs for each demo profile + persona
   - Outputs to dist/demo-packs/
   - These packs can be distributed without needing a DB connection
   - Used for: npx realitydb demo --pack saas-growth
     (loads pre-built pack instead of generating)

--- README Update ---

7. Add Demo Mode section to README

--- Version + Changelog ---

8. Bump version to 0.7.0
9. Update CHANGELOG.md

CONSTRAINTS:
- Seed entities are inserted BEFORE random generation
- Seed entities use real-sounding names and values (no Lorem Ipsum)
- Random-generated rows must not conflict with seed entity PKs
- Demo mode reuses existing template distributions for non-seed rows
- All demos deterministic with --seed
- Commit message: "feat: add demo mode with curated seed entities and personas"

VERIFICATION:
1. pnpm build succeeds
2. realitydb demo --template saas --persona startup works
3. Seed entities appear in output
Report: build status, demo output
```

---

## Sprint Checklist

```
## H2-S3 — Demo Mode

### Demo Profile Type (1 point)
- [ ] DemoProfile, PersonaConfig, SeedEntity, StoryArc types defined

### SaaS Demo Profile (4 points)
- [ ] 4 curated plans with real pricing
- [ ] 5 named seed users with realistic emails
- [ ] Coherent subscription + payment stories
- [ ] 3 personas (startup, growth, enterprise)

### E-commerce Demo Profile (2 points)
- [ ] Curated products, customers, orders
- [ ] 3 personas

### Fintech Demo Profile (2 points)
- [ ] Curated accounts, transactions, fraud alert
- [ ] 3 personas

### Demo Command (4 points)
- [ ] realitydb demo --template saas works end-to-end
- [ ] Seed entities inserted before generated rows
- [ ] --persona flag changes scale
- [ ] CI mode outputs JSON

### Pre-built Packs (2 points)
- [ ] Build script generates packs for each template + persona
- [ ] Packs are valid Reality Packs

### README + Version (2 points)
- [ ] Demo Mode section in README
- [ ] Version 0.7.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/19 PASS
Gate: ALL must be ✅ before npm publish 0.7.0
```
