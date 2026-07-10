# ADR-002: Dependent Column Generation — Problem Statement and Resolution Path

**Date:** 2026-07-10  
**Status:** Resolved — Option A implemented  
**Author:** Eddy Mkwambe  
**Related:** ADR-001 (SimLab execution), PR-024 (semantic inspection gate), PR-025 (monetary constraints)

---

## Context

During row-level quality inspection on 2026-07-10, three classes of
semantic quality failures were identified in the fintech pack:

1. Merchant name does not correlate with merchant category
   (City Cab → healthcare, Pita Palace → grocery)
2. Customer email prefix does not derive from customer full_name
   (chen9804@proton.me for Omar Johnson)
3. Customer city does not correlate with customer country
   (US, Mumbai — fixed in commit 7c32eb1 by narrowing city vocabulary,
   but within-Western mismatches remain: US/Berlin, DE/Houston)

All three failures share the same root cause: the engine generates
each column value independently from its defined strategy, with no
awareness of sibling column values in the same row.

This is the dependent-column problem.

---

## The Dependent-Column Problem

The engine's generation model is:

  for each table:
    for each row:
      for each column:
        value = sample(column.strategy, column.options)

Each column is sampled in isolation. A column cannot reference the
value of another column in the same row during generation.

This means:
- merchant.name cannot condition on merchant.category
- customer.email cannot derive from customer.full_name
- customer.city cannot filter by customer.country
- transaction.amount cannot condition on transaction.type

The constraint is architectural, not a bug. Changing it requires
modifications to packages/engine/ which is governed by the
NEVER TOUCH rule in CLAUDE.md.

---

## Partial Mitigations Applied (Pack-Level)

Three partial mitigations have been applied at the pack level
without touching the engine:

### Mitigation 1 — City vocabulary restriction (commit 7c32eb1)
Replaced "strategy": "city" (global city pool including Mumbai,
Tokyo, Lagos) with a 22-city Western enum. Eliminates cross-continent
impossibilities. Within-Western mismatches accepted as international
account holders.

### Mitigation 2 — Email anonymization (commit 0d1c4f0)
Replaced "strategy": "email" (name-prefix emails) with anonymous
enum (user8821@gmail.com style). Eliminates name-prefix contradiction.
Does not achieve name-derived emails — those require dependent columns.

### Mitigation 3 — Merchant name pool expansion (commit 0d1c4f0)
Replaced generic company_name generator with 42-value merchant-
specific enum. Net improvement in realism but name↔category
correlation still not achieved.

---

## Resolution Path

### Option A — Engine-level dependent-column strategy (Preferred)
Add a new strategy type to packages/engine/:

  "name": {
    "strategy": "dependent_enum",
    "options": {
      "depends_on": "category",
      "map": {
        "grocery":       ["Metro Mart", "FreshGrove", "Daily Basket"],
        "restaurant":    ["Spice Garden", "The Curry House", "Noodle Bar"],
        "healthcare":    ["MedPlus Pharmacy", "HealthFirst Clinic"],
        "travel":        ["SkyHigh Airlines", "Global Stays"],
        "entertainment": ["CityPlex Cinema", "GameZone"],
        "retail":        ["TechHub Electronics", "StyleZone Apparel"],
        "online":        ["NetPay", "SwiftTransfer"],
        "other":         ["Other Merchant"]
      }
    }
  }

This also solves email derivation:

  "email": {
    "strategy": "dependent_email",
    "options": {
      "derives_from": "full_name",
      "pattern": "{first_name_lower}{random4}@{domain}",
      "domains": ["gmail.com", "yahoo.com", "hotmail.com", "proton.me"]
    }
  }

This is the correct fix. It requires a planned engine sprint
under Eddy's direct supervision per the trio workflow.

### Option B — Category-specific sub-tables (Pack-level workaround)
Split merchants into category-specific tables
(grocery_merchants, restaurant_merchants, etc.) each with its
own name enum. FK references from transactions point to the
appropriate sub-table based on transaction type.

Disadvantages: increases table count, complicates FK graph,
not how real merchant databases are structured.

### Option C — Post-generation SQL patch (Deployment workaround)
Ship a companion SQL patch file that runs UPDATE statements
to align merchant names to categories after generation.
Deterministic given the seed. Does not require engine changes.

Disadvantage: breaks the single-file generation contract.

---

## Decision

Option A is the correct long-term solution.
Option C is acceptable as a temporary measure for the fintech pack
while the engine sprint is planned.
Option B is rejected as it misrepresents real data structure.

The engine sprint for dependent_enum and dependent_email strategies
is logged as a future roadmap item. It will be executed as a
dedicated engine sprint under Eddy's direct verification.

---

## Resolution (2026-07-10)

Option A implemented in commits 38c8947 (engine) and 370e837 (fintech pack).

Changes shipped:
- packages/engine/src/generators.ts — createRng(seed), dependent_enum,
  dependent_email strategy handlers, rng threaded through all generation
- packages/engine/src/engine.ts — generateData accepts seed param,
  pass-2 skip for dependent strategies, pass-3 generalized for
  dependent_enum and dependent_email
- apps/cli/src/packs/fintech.json — merchants.name uses dependent_enum
  keyed on category, customers.email uses dependent_email derived from
  full_name

Verified:
- 215/215 smoke tests
- merchant name matches category 9/9 (grocery→Daily Basket,
  online→NetPay, travel→Wanderlust Tours)
- email derives from first name 9/9 (Omar Johnson→omar3206@proton.me)
- determinism holds with dependent strategies (seed 7 ×2 identical)
- assess 99/100

Remaining open items from ADR-002:
- dependent_enum not yet applied to eu-banking, eu-healthcare,
  eu-telecom, universal, supply-chain packs — future sprint
- dependent_email pattern limited to first name prefix — surname
  and middle initial patterns deferred

---

## Impact on Quality Claims

Until Option A is implemented, the following quality claims
apply to the fintech pack:

✅ Structural quality: FK integrity 100%, temporal ordering 100%
✅ Enum validity: all values from defined distributions
✅ City-country: non-Western impossibilities eliminated
✅ Email: name-prefix contradiction eliminated
⚠️  Merchant name↔category: improved vocabulary, correlation pending
⚠️  Email↔name derivation: anonymous pattern, derivation pending
⚠️  Monetary distribution: floor fixed ($5 minimum), shape pending PR-025

These limitations are documented in RDB-RD-001-Synthetic-Data-Realism.md
and the sales objection script RDB-OBJ-001.

---

## Related Requirements

PR-024: Semantic inspection gate (examine assess --deep)
PR-025: Monetary value constraints with source citations

Both requirements are blocked on the same dependent-column limitation
for their most powerful implementations, but can be partially
implemented at the pack level in the interim.

---

*Mpingo Systems LLC · RealityDB Platform*  
*Next review: when engine sprint is scheduled*
