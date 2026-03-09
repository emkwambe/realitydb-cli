# DataBox Phase 6 Blueprint — Domain Intelligence

**Project:** DataBox — Developer Reality Platform  
**Phase:** 6 of 8 — Domain Intelligence  
**Status:** DRAFT  
**Depends on:** Phase 4 (COMPLETE ✅ — full seed/reset/export cycle + FK integrity + determinism verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 6 Objective

Build the domain intelligence layer that transforms DataBox from generating valid data into generating *convincing* data. After Phase 6, domain templates inject realistic business rules, weighted distributions, and entity relationships that make generated environments feel like real systems.

At the end of Phase 6, the following must be true:

1. A distribution engine supports weighted categorical, bounded numeric, normal-ish, and long-tail distributions.
2. A template system allows domain packs to override default strategy inference with domain-specific rules.
3. A SaaS template produces realistic users, plans, subscriptions, and payments with real-world patterns (70% active, churn patterns, plan distribution).
4. An e-commerce template produces realistic customers, products, orders, and order_items with believable purchase patterns.
5. `databox seed --template saas` and `databox seed --template ecommerce` produce noticeably different, domain-appropriate data.
6. Templates are modular — adding a new domain is a matter of adding a new template file.
7. All generation remains deterministic.

**Phase 6 does NOT include:** Time evolution, scenario injection, Reality Packs, or behavior simulation.

---

## Why Domain Intelligence Matters

Without domain templates, DataBox generates data like this:

```
status: "theta"          ← random text, meaningless
amount: 7342             ← random number, no pattern
plan: "sigma quick"      ← nonsensical
interval: "weekly"       ← uniform random, unrealistic distribution
```

With domain intelligence, the same columns produce:

```
status: "active"         ← weighted: 70% active, 15% trialing, 10% canceled, 5% past_due
amount: 2999             ← matches plan pricing: $29.99/mo
plan: "Professional"     ← from realistic plan names with tier distribution
interval: "monthly"      ← weighted: 60% monthly, 35% yearly, 5% weekly
```

This is the difference between data that fills tables and data that makes dashboards, reports, and features behave realistically.

---

## Phase 6 Prerequisites

Before Sprint 6A, the e-commerce test schema must exist. Eddy will run this SQL:

```sql
-- E-commerce schema (add to databox_dev alongside existing SaaS tables)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  ordered_at TIMESTAMP NOT NULL DEFAULT now(),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL
);
```

This gives us two distinct domains in one database for testing template selection.

---

## Phase 6 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Distribution engine | `packages/generators/src/distributions.ts` |
| D2 | Template system types + registry | `packages/templates/src/types.ts`, `packages/templates/src/registry.ts` |
| D3 | Template resolver | `packages/templates/src/resolver.ts` |
| D4 | SaaS domain template | `packages/templates/src/domains/saas.ts` |
| D5 | E-commerce domain template | `packages/templates/src/domains/ecommerce.ts` |
| D6 | Template integration in plan builder | `packages/core/src/planning/buildPlan.ts` (update) |
| D7 | Template integration in CLI | `apps/cli/src/commands/seed.ts` (update) |
| D8 | E-commerce test fixture | `tests/fixtures/ecommerce-seed.sql` |

---

## Phase 6 Sprints

Phase 6 is divided into **3 sprints**.

---

### Sprint 6A — Distribution Engine + Template System

**Objective:** Build the distribution engine for weighted/statistical data generation and the template system architecture that domain packs plug into.

#### Sprint 6A Prompt (for Claude Code)

```
Read: packages/generators/src/primitives/enum.ts,
      packages/generators/src/primitives/numeric.ts,
      packages/generators/src/registry.ts,
      packages/generators/src/types.ts,
      packages/templates/src/index.ts,
      packages/shared/src/random.ts,
      packages/shared/src/planTypes.ts,
      packages/core/src/planning/buildPlan.ts,
      docs/architecture-guardrails.md

CONTEXT:
Phase 4 is complete. DataBox can scan, generate, seed, reset, and export.
Generation works with strategy inference but uses default distributions
(uniform random for most values). Templates package exists as an empty shell.

OBJECTIVE:
Build the distribution engine and template system architecture.

REQUIREMENTS:

--- Distribution Engine (packages/generators) ---

1. src/distributions.ts:

   - weightedChoice<T>(random: SeededRandom, items: T[], weights: number[]) → T
     Selects an item based on weighted probability.
     Weights do not need to sum to 1 — normalize internally.

   - boundedNormal(random: SeededRandom, min: number, max: number, mean?: number, stdDev?: number) → number
     Generates a number from a normal-ish distribution bounded between min and max.
     Uses Box-Muller transform approximation with the seeded random.
     Default mean: midpoint of min/max. Default stdDev: (max-min)/6.

   - longTailInteger(random: SeededRandom, min: number, max: number, skew?: number) → number
     Generates integers with a long-tail distribution (many small values, few large).
     Default skew: 2 (moderate right skew).

   - uniformChoice<T>(random: SeededRandom, items: T[]) → T
     Simple uniform random selection from array.

   - percentageChance(random: SeededRandom, percentage: number) → boolean
     Returns true with given percentage probability (0-100).

2. All functions must use SeededRandom — no Math.random().
3. All functions must be pure and deterministic.

--- Template System Types (packages/templates) ---

4. src/types.ts:

   DomainTemplate {
     name: string
     version: string
     description: string
     targetTables: string[]
     tableConfigs: Map<string, TableTemplateConfig>
   }

   TableTemplateConfig {
     tableName: string
     matchPattern: string | string[]
     rowCountMultiplier?: number
     columnOverrides: ColumnTemplateOverride[]
   }

   ColumnTemplateOverride {
     columnName: string
     matchPattern?: string | string[]
     strategy: ColumnStrategy
     description?: string
   }

   - matchPattern allows flexible table matching:
     exact name: "users"
     contains: "*user*"
     multiple: ["users", "customers", "accounts"]

5. src/types.ts also export:
   TemplateMatchResult {
     matched: boolean
     template: DomainTemplate
     tableConfig: TableTemplateConfig | null
     confidence: "exact" | "pattern" | "none"
   }

--- Template Registry (packages/templates) ---

6. src/registry.ts:
   - TemplateRegistry class:
     - register(template: DomainTemplate) → void
     - get(name: string) → DomainTemplate | undefined
     - list() → DomainTemplate[]
     - matchTable(templateName: string, tableName: string) → TableTemplateConfig | null

   - createTemplateRegistry() → TemplateRegistry
     Factory function that returns a new registry.

   - getDefaultRegistry() → TemplateRegistry
     Returns a registry pre-loaded with all built-in templates.
     (For now returns empty registry — templates added in Sprint 6B)

--- Template Resolver (packages/templates) ---

7. src/resolver.ts:
   - resolveColumnOverride(
       templateName: string,
       tableName: string,
       columnName: string,
       registry: TemplateRegistry
     ) → ColumnStrategy | null

     Looks up the template, finds the table config, finds the column override.
     Returns the overridden strategy or null if no override exists.

   - resolveTableConfig(
       templateName: string,
       tableName: string,
       registry: TemplateRegistry
     ) → TableTemplateConfig | null

     Matches tableName against the template's table configs using matchPattern.
     Exact match takes priority over pattern match.

8. src/index.ts — re-export all types, registry, resolver

CONSTRAINTS:
- Distribution functions must use SeededRandom only
- Template system must NOT import from @databox/db
- Template types must NOT depend on runtime schema (templates are static configs)
- matchPattern matching must handle exact strings and simple wildcards (*)
- Do NOT implement actual SaaS/ecommerce templates yet (Sprint 6B)
- Do NOT modify CLI or pipelines yet (Sprint 6C)
- Commit with message: "feat: add distribution engine and template system architecture"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify weightedChoice, boundedNormal, longTailInteger exported from @databox/generators
3. Verify DomainTemplate, TemplateRegistry, resolveColumnOverride exported from @databox/templates
4. Quick determinism test: weightedChoice with seed 42 returns same result twice
Report: build status, exported symbols, determinism result
```

#### Sprint 6A Checklist

```
## Sprint 6A — Distribution Engine + Template System

### Distribution Engine (6 points)
- [ ] weightedChoice selects based on weighted probability
- [ ] boundedNormal produces values clustered around mean within bounds
- [ ] longTailInteger produces right-skewed integer distribution
- [ ] uniformChoice picks uniformly from array
- [ ] percentageChance returns boolean with correct probability
- [ ] All functions use SeededRandom (no Math.random)

### Template Types (4 points)
- [ ] DomainTemplate type exported with name, version, targetTables, tableConfigs
- [ ] TableTemplateConfig type exported with matchPattern, columnOverrides
- [ ] ColumnTemplateOverride type exported with strategy
- [ ] TemplateMatchResult type exported

### Template Registry (3 points)
- [ ] TemplateRegistry supports register, get, list, matchTable
- [ ] createTemplateRegistry factory function exported
- [ ] getDefaultRegistry returns registry (empty for now)

### Template Resolver (2 points)
- [ ] resolveColumnOverride looks up template → table → column override
- [ ] resolveTableConfig handles exact match and wildcard patterns

### Determinism (1 point)
- [ ] Distribution functions produce identical results with same seed

### Architecture (2 points)
- [ ] @databox/templates does NOT import from @databox/db
- [ ] Template types are static configs (no runtime schema dependency)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add distribution engine and template system architecture"

Score: __/20 PASS
Gate: ALL must be ✅ to proceed to Sprint 6B
```

---

### Sprint 6B — SaaS Template + E-commerce Template

**Objective:** Build two domain templates with realistic business rules, distributions, and entity patterns that demonstrate domain intelligence.

#### Sprint 6B Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/registry.ts,
      packages/templates/src/resolver.ts, packages/templates/src/index.ts,
      packages/generators/src/distributions.ts,
      packages/generators/src/primitives/index.ts,
      packages/shared/src/planTypes.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 6A built the distribution engine and template system architecture.
TemplateRegistry, DomainTemplate types, and resolver are in place.
Now we create the actual domain templates.

OBJECTIVE:
Build SaaS and e-commerce domain templates with realistic business rules.

REQUIREMENTS:

--- SaaS Template (packages/templates) ---

1. src/domains/saas.ts — export saasTemplate: DomainTemplate

   Target tables (matchPattern):
   - users / accounts / customers → user entity
   - plans / tiers / pricing → plan entity
   - subscriptions → subscription entity
   - payments / invoices / charges → payment entity

   Column overrides for user-like tables:
   - email → { kind: "email" }
   - full_name / name → { kind: "full_name" }
   - created_at → { kind: "timestamp", mode: "past" }

   Column overrides for plan-like tables:
   - name → { kind: "enum", values: ["Starter", "Professional", "Business", "Enterprise"],
               weights: [0.35, 0.35, 0.20, 0.10] }
   - price_cents → { kind: "enum",
                      values: [0, 999, 2999, 4999, 9999, 19999],
                      weights: [0.10, 0.25, 0.30, 0.20, 0.10, 0.05] }
   - interval → { kind: "enum", values: ["monthly", "yearly"],
                   weights: [0.65, 0.35] }

   Column overrides for subscription-like tables:
   - status → { kind: "enum",
                 values: ["active", "trialing", "canceled", "past_due", "paused"],
                 weights: [0.65, 0.12, 0.10, 0.08, 0.05] }
   - canceled_at → nullable, should be null for active/trialing (handled by noting nullable)

   Column overrides for payment-like tables:
   - status → { kind: "enum",
                 values: ["succeeded", "pending", "failed", "refunded"],
                 weights: [0.85, 0.05, 0.05, 0.05] }
   - currency → { kind: "enum", values: ["USD", "EUR", "GBP", "CAD"],
                   weights: [0.60, 0.20, 0.12, 0.08] }
   - amount_cents / amount / total → { kind: "money", min: 999, max: 49999 }

--- E-commerce Template (packages/templates) ---

2. src/domains/ecommerce.ts — export ecommerceTemplate: DomainTemplate

   Target tables (matchPattern):
   - customers / users → customer entity
   - products / items / catalog → product entity
   - orders / purchases → order entity
   - order_items / line_items / cart_items → order item entity

   Column overrides for customer-like tables:
   - email → { kind: "email" }
   - first_name → { kind: "first_name" }
   - last_name → { kind: "last_name" }
   - phone → { kind: "phone" }

   Column overrides for product-like tables:
   - name → { kind: "enum",
               values: ["Wireless Headphones", "USB-C Cable", "Phone Case",
                        "Laptop Stand", "Mechanical Keyboard", "Mouse Pad",
                        "Monitor Light", "Webcam HD", "Desk Organizer",
                        "Portable Charger", "Smart Watch", "Fitness Tracker",
                        "Bluetooth Speaker", "Screen Protector", "Tablet Sleeve",
                        "Cable Management Kit", "Ring Light", "Microphone USB",
                        "External SSD", "Ergonomic Chair Pad"] }
   - description → { kind: "text", mode: "medium" }
   - price_cents → { kind: "money", min: 499, max: 29999 }
   - category → { kind: "enum",
                   values: ["Electronics", "Accessories", "Office", "Audio", "Wearables"],
                   weights: [0.30, 0.25, 0.20, 0.15, 0.10] }
   - sku → { kind: "custom", name: "sku" }
     (generator should produce format: "SKU-XXXXX" where X is alphanumeric)
   - in_stock → { kind: "boolean", trueWeight: 0.85 }

   Column overrides for order-like tables:
   - status → { kind: "enum",
                 values: ["delivered", "shipped", "processing", "pending", "canceled", "returned"],
                 weights: [0.45, 0.15, 0.12, 0.10, 0.10, 0.08] }
   - total_cents → { kind: "money", min: 499, max: 99999 }
   - currency → { kind: "enum", values: ["USD", "EUR", "GBP"],
                   weights: [0.65, 0.22, 0.13] }

   Column overrides for order-item-like tables:
   - quantity → { kind: "integer", min: 1, max: 5 }
   - unit_price_cents → { kind: "money", min: 499, max: 29999 }

--- Register Templates ---

3. src/domains/index.ts — export both templates
4. Update src/registry.ts: getDefaultRegistry() now returns registry with saas and ecommerce templates
5. src/index.ts — re-export everything including domain templates

--- Custom Generator: SKU ---

6. Add SKU generator to packages/generators:
   - src/primitives/custom.ts:
     - generateSku(ctx: GeneratorContext) → string
     - Format: "SKU-" + 5 random alphanumeric characters (uppercase)
   - Register "sku" as a custom strategy kind in the registry

--- Test Fixtures ---

7. tests/fixtures/ecommerce-seed.sql — the e-commerce schema SQL from prerequisites

CONSTRAINTS:
- Templates must be pure data declarations (no runtime logic beyond strategy configs)
- All enum weights must sum to approximately 1.0 (normalize if needed)
- Templates must use the existing ColumnStrategy union types
- Custom generators (SKU) must use SeededRandom
- Do NOT modify CLI commands yet (Sprint 6C)
- Do NOT modify the seed/reset/export pipelines yet (Sprint 6C)
- Commit with message: "feat: add SaaS and e-commerce domain templates"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify saasTemplate and ecommerceTemplate exported from @databox/templates
3. Verify getDefaultRegistry() returns registry with both templates
4. Verify registry.get("saas") returns template with 4+ table configs
5. Verify registry.get("ecommerce") returns template with 4+ table configs
Report: build status, template configs summary
```

#### Sprint 6B Checklist

```
## Sprint 6B — SaaS + E-commerce Templates

### SaaS Template (6 points)
- [ ] saasTemplate exported from @databox/templates
- [ ] Matches user/account tables with email, name overrides
- [ ] Matches plan tables with realistic plan names and pricing distribution
- [ ] Matches subscription tables with weighted status (65% active)
- [ ] Matches payment tables with weighted status (85% succeeded)
- [ ] Currency weighted distribution (60% USD)

### E-commerce Template (6 points)
- [ ] ecommerceTemplate exported from @databox/templates
- [ ] Matches customer tables with name/email/phone overrides
- [ ] Matches product tables with realistic product names and categories
- [ ] Matches order tables with weighted status (45% delivered)
- [ ] Matches order_items with quantity 1-5 range
- [ ] Product price range realistic (499-29999 cents)

### Template Registration (3 points)
- [ ] Both templates registered in getDefaultRegistry()
- [ ] registry.get("saas") returns SaaS template
- [ ] registry.get("ecommerce") returns e-commerce template

### Custom SKU Generator (2 points)
- [ ] generateSku produces "SKU-XXXXX" format
- [ ] Uses SeededRandom (deterministic)

### Test Fixtures (1 point)
- [ ] tests/fixtures/ecommerce-seed.sql contains 4-table e-commerce schema

### Architecture (2 points)
- [ ] Templates are pure data configs (no runtime DB dependency)
- [ ] All enum weights approximately sum to 1.0

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add SaaS and e-commerce domain templates"

Score: __/22 PASS
Gate: ALL must be ✅ to proceed to Sprint 6C
```

---

### Sprint 6C — Template Integration + CLI Wiring

**Objective:** Integrate the template system into the generation plan builder and CLI so `databox seed --template saas` and `databox seed --template ecommerce` produce domain-aware data.

#### Sprint 6C Prompt (for Claude Code)

```
Read: packages/core/src/planning/buildPlan.ts,
      packages/core/src/seedPipeline.ts,
      packages/core/src/exportPipeline.ts,
      packages/templates/src/index.ts,
      packages/templates/src/registry.ts,
      packages/templates/src/resolver.ts,
      packages/templates/src/domains/saas.ts,
      packages/templates/src/domains/ecommerce.ts,
      packages/generators/src/strategyInference.ts,
      packages/generators/src/registry.ts,
      apps/cli/src/commands/seed.ts,
      apps/cli/src/commands/export.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 6B is complete. SaaS and e-commerce domain templates exist with
realistic distributions. The distribution engine and template resolver are
in place. Now we integrate them into the generation pipeline.

OBJECTIVE:
Wire template system into plan builder, generation engine, and CLI.

REQUIREMENTS:

--- Plan Builder Integration (packages/core) ---

1. Update src/planning/buildPlan.ts:
   - If config.template is set:
     a. Load template from getDefaultRegistry()
     b. For each table in schema, check if template has a matching table config
     c. For each column, check if template has a column override
     d. If override exists, use template's ColumnStrategy instead of inferred strategy
     e. If no override, fall back to inferColumnStrategy (existing behavior)
   - If config.template is not set, behavior unchanged (pure inference)
   - Set plan.template field with template name and version
   - Apply rowCountMultiplier from template if defined

2. The plan builder must handle the case where a template targets tables
   that don't exist in the schema (skip gracefully, warn).

3. The plan builder must handle custom strategy kinds (like "sku") by
   passing them through — the generator registry handles resolution.

--- Generator Registry Update (packages/generators) ---

4. Update src/registry.ts:
   - Register the SKU custom generator
   - Handle "custom" strategy kind by looking up custom.name
   - If custom generator not found, fall back to text generator with warning

--- Seed Pipeline Integration (packages/core) ---

5. Update src/seedPipeline.ts:
   - Pass config.template through to buildGenerationPlan
   - Log which template is being used (if any)

--- Export Pipeline Integration (packages/core) ---

6. Update src/exportPipeline.ts:
   - Same template passthrough as seed pipeline

--- CLI Updates ---

7. Update apps/cli/src/commands/seed.ts:
   - --template option already exists, ensure it passes to SeedOptions
   - Print template name in output header
   - If template specified but not found, print available templates and exit

8. Update apps/cli/src/commands/export.ts:
   - Add --template option if not present
   - Same behavior as seed

9. Add `databox templates` command (new):
   - Lists all registered templates with name, version, description, target tables
   - Example output:
     Available Templates:
       saas (v1.0) — SaaS subscription business with users, plans, and payments
         Targets: users, plans, subscriptions, payments
       ecommerce (v1.0) — E-commerce store with products, orders, and customers
         Targets: customers, products, orders, order_items

--- Integration Test Script ---

10. tests/template-test.ts:
    - Connect to DB
    - Reset tables
    - Seed with --template saas --records 200 --seed 42
    - Query: SELECT status, COUNT(*) FROM subscriptions GROUP BY status
    - Verify: "active" is the dominant status (~65%)
    - Query: SELECT interval, COUNT(*) FROM plans GROUP BY interval
    - Verify: "monthly" appears more than "yearly"
    - Reset tables
    - Print PASS/FAIL

CONSTRAINTS:
- Template overrides must NOT break deterministic generation
- If no template specified, all existing behavior must be unchanged
- Template matching must be case-insensitive for table names
- Plan builder must not crash if template references tables not in schema
- Custom strategy kinds must be handled gracefully (fallback to text if unknown)
- Commit with message: "feat: integrate templates into generation pipeline and CLI"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. node apps/cli/dist/index.js templates — lists available templates
3. Build and verify: template overrides appear in generation plan
Report: build status, templates list output
```

#### Sprint 6C Checklist

```
## Sprint 6C — Template Integration + CLI

### Plan Builder Integration (5 points)
- [ ] buildGenerationPlan loads template from registry when config.template set
- [ ] Template column overrides replace inferred strategies
- [ ] Falls back to inferColumnStrategy when no override exists
- [ ] Gracefully skips template tables not in schema
- [ ] plan.template field populated with name and version

### Generator Registry Update (2 points)
- [ ] Custom strategy kind "sku" resolved to SKU generator
- [ ] Unknown custom generators fall back to text with warning

### Pipeline Integration (2 points)
- [ ] seedPipeline passes template through to plan builder
- [ ] exportPipeline passes template through to plan builder

### CLI (5 points)
- [ ] databox seed --template saas uses SaaS template
- [ ] databox seed --template ecommerce uses e-commerce template
- [ ] databox templates lists all registered templates
- [ ] Invalid template name prints available templates and exits
- [ ] databox export --template works

### Data Quality (4 points)
- [ ] SaaS seed: subscription status distribution shows ~65% active
- [ ] SaaS seed: plan interval shows monthly > yearly
- [ ] SaaS seed: payment status shows ~85% succeeded
- [ ] E-commerce seed: product category distribution is weighted

### Determinism (1 point)
- [ ] Same template + seed produces identical data across runs

### Architecture (2 points)
- [ ] Templates are resolved at plan time, not generation time
- [ ] CLI contains no template logic (delegates to pipeline)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: integrate templates into generation pipeline and CLI"

Score: __/23 PASS
Gate: ALL must be ✅ to close Phase 6
```

---

## Phase 6 Architecture Compliance Matrix

| # | Guardrail | Sprint 6A | Sprint 6B | Sprint 6C | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | N/A | CLI delegates to pipelines | ☐ |
| 2 | Schema Normalized Once | N/A | N/A | Templates match against schema tables | ☐ |
| 3 | Separate Planning from Execution | N/A | Templates modify plan | Overrides applied at plan time | ☐ |
| 4 | Deterministic Generation | Distributions use SeededRandom | Templates are static configs | Same template+seed = same data | ☐ |
| 5 | Dependency Safety | N/A | N/A | Table order unchanged by templates | ☐ |
| 6 | Reality Packs Core Artifact | N/A | N/A | Template name stored in plan | ☐ |
| 7 | Domain Templates First-Class | N/A | Two templates built | Templates integrated into pipeline | ☐ |
| 8 | Simulation Extensible | Distribution engine reusable | Template system modular | N/A | ☐ |
| 9 | Configuration Explicit | N/A | N/A | --template in config and CLI | ☐ |
| 10 | Testability Non-Negotiable | Pure distribution functions | Templates are data declarations | Integration test script | ☐ |
| 11 | Performance Must Scale | N/A | N/A | N/A | ☐ |
| 12 | Safe by Default | N/A | N/A | Unknown template prints list, exits | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | No extra features | ☐ |

---

## Phase 6 Demo Walkthrough

After all sprints pass, Eddy runs the full domain intelligence demo:

```powershell
# 1. Add e-commerce schema to test database
docker exec -i databox-pg psql -U postgres -d databox_dev < tests/fixtures/ecommerce-seed.sql

# 2. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 3. List templates
node apps/cli/dist/index.js templates

# 4. Scan (should show 8 tables now — 4 SaaS + 4 e-commerce)
node apps/cli/dist/index.js scan

# 5. Seed with SaaS template
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template saas --records 200 --seed 42

# 6. Verify SaaS distributions
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM subscriptions GROUP BY status ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT interval, COUNT(*) FROM plans GROUP BY interval ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM payments GROUP BY status ORDER BY count DESC;"

# 7. Reset and seed with e-commerce template
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template ecommerce --records 200 --seed 42

# 8. Verify e-commerce distributions
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT in_stock, COUNT(*) FROM products GROUP BY in_stock;"
```

---

## Phase 6 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 6A checklist | 20/20 ✅ |
| Sprint 6B checklist | 22/22 ✅ |
| Sprint 6C checklist | 23/23 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | Both templates produce domain-appropriate distributions |
| Git | 3 commits on feature branch |

**Phase 6 is COMPLETE when all criteria are met.**  
**Phase 7 (Reality Engine — Time Evolution + Scenario Injection) begins only after Phase 6 is fully verified.**

---

## What Phase 7 Will Build On

Phase 7 will:

- Add time evolution to the generation engine (datasets spanning months/years)
- Add scenario injection (fraud spikes, payment failures, system outages)
- Integrate both into the template system as optional timeline and scenario configs
- Enable `databox seed --template saas --timeline 12-months`
- Enable `databox seed --template saas --scenario payment-failures`

The domain templates from Phase 6 provide the business rules.  
Phase 7 adds the temporal dimension and controlled chaos.
