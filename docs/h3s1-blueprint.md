# RealityDB H3-S1 — Lifecycle Simulation Engine

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 3 — Intelligence & Simulation
**Sprint:** H3-S1 — Lifecycle Engine
**Status:** DRAFT
**Depends on:** H2-S4 (pack sharing, realitydb@0.8.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Replace independent random generation with a lifecycle simulation engine that produces causally-connected data. After this sprint, a "user" entity flows through a realistic lifecycle: signup → trial → subscription → usage → renewal/churn, and all related entities (payments, subscriptions) reflect that coherent story.

---

## What Must Be True After This Sprint

1. Templates can define state machines (lifecycle definitions) for entities.
2. `realitydb seed --template saas --lifecycle` generates data where entity states are consistent across tables.
3. A user with status "canceled" has a canceled_at timestamp, a final failed payment, and no active subscription.
4. A user with status "active" has consistent payment history, valid subscription, and no canceled_at.
5. Cross-table correlation: high-value customers have more transactions, larger payments.
6. Version bumped to 0.9.0.

---

## Why This Matters

This is the leap from "statistically realistic data" to "domain-intelligent data." Current templates produce correct distributions per column but no causal relationships. A checking account might show 0 transactions. A canceled user might have no failed payments. Lifecycle simulation fixes this by modeling how real entities behave over time.

This is what makes domain packs worth paying for.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Lifecycle definition types | `packages/shared/src/lifecycleTypes.ts` |
| D2 | State machine engine | `packages/generators/src/lifecycle/stateMachine.ts` |
| D3 | Lifecycle simulation runner | `packages/generators/src/lifecycle/simulate.ts` |
| D4 | Cross-table correlation engine | `packages/generators/src/lifecycle/correlate.ts` |
| D5 | SaaS lifecycle definition | `packages/templates/src/lifecycles/saas.ts` |
| D6 | Fintech lifecycle definition | `packages/templates/src/lifecycles/fintech.ts` |
| D7 | --lifecycle flag in seed command | `apps/cli/src/commands/seed.ts` |
| D8 | Version bump to 0.9.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/shared/src/planTypes.ts, packages/generators/src/generate.ts,
      packages/generators/src/distributions.ts,
      packages/templates/src/types.ts, packages/templates/src/domains/saas.ts,
      packages/templates/src/domains/fintech.ts,
      apps/cli/src/commands/seed.ts, README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.8.0 generates data with correct per-column distributions but
no cross-table causality. A "canceled" user might have no failed payment.
We need a lifecycle simulation engine that produces coherent entity stories.

OBJECTIVE:
Build a lifecycle engine that generates causally-connected data across tables.

REQUIREMENTS:

--- Lifecycle Types (packages/shared) ---

1. src/lifecycleTypes.ts:
   - LifecycleDefinition {
       entityName: string           // "user", "account"
       rootTable: string            // "users", "accounts"
       states: LifecycleState[]
       transitions: LifecycleTransition[]
       correlations: CrossTableCorrelation[]
     }
   - LifecycleState {
       name: string                 // "trial", "active", "churned"
       weight: number               // probability of entity being in this state
       columnValues: Record<string, unknown>  // forced column values in this state
     }
   - LifecycleTransition {
       from: string
       to: string
       probability: number
       sideEffects: SideEffect[]    // what happens in other tables
     }
   - SideEffect {
       table: string
       action: "create" | "update"
       values: Record<string, unknown>
     }
   - CrossTableCorrelation {
       description: string
       condition: { table: string, column: string, operator: string, value: unknown }
       effect: { table: string, column: string, multiplier?: number, values?: unknown[] }
     }

--- State Machine Engine ---

2. packages/generators/src/lifecycle/stateMachine.ts:
   - SimulatedEntity: tracks an entity through its lifecycle states
   - advanceEntity(entity, lifecycle, random) → SimulatedEntity
   - generateEntityRows(entity, lifecycle) → Map<string, Record<string, unknown>[]>
     Returns rows for ALL related tables based on entity's state history

--- Lifecycle Simulation Runner ---

3. packages/generators/src/lifecycle/simulate.ts:
   - simulateLifecycles(lifecycle, count, random) → SimulationResult
   - Generates N entities, each walking through the state machine
   - Returns coherent multi-table dataset

--- Cross-Table Correlation ---

4. packages/generators/src/lifecycle/correlate.ts:
   - applyCorrelations(dataset, correlations, random) → dataset
   - Example: "enterprise users have 3x more payments"
   - Adjusts row counts in related tables based on entity properties

--- SaaS Lifecycle ---

5. packages/templates/src/lifecycles/saas.ts:
   - User lifecycle: signup → trial → active → [churned | renewed | upgraded]
   - States:
     - trial (12%): subscription.status="trialing", no payments
     - active (65%): subscription.status="active", regular payments
     - churned (10%): subscription.status="canceled", canceled_at set, last payment failed
     - past_due (8%): subscription.status="past_due", last payment failed
     - paused (5%): subscription.status="paused"
   - Correlations:
     - Enterprise plan users: 2x more payments (longer tenure)
     - Churned users: always have a failed payment before cancel

--- Fintech Lifecycle ---

6. packages/templates/src/lifecycles/fintech.ts:
   - Account lifecycle: opened → active → [frozen | closed]
   - Active accounts: regular transactions
   - Frozen accounts: fraud_alert exists, no transactions after freeze
   - Closed accounts: settlement completed

--- Seed Integration ---

7. --lifecycle flag in seed command:
   - realitydb seed --template saas --lifecycle
   - When enabled, uses lifecycle engine instead of independent generation
   - Without --lifecycle: existing behavior unchanged

CONSTRAINTS:
- --lifecycle is opt-in (default generation unchanged)
- State machine must be deterministic with seed
- Lifecycle definitions are pure data (no code execution)
- Performance: lifecycle mode may be slower (acceptable for V1)
- Commit message: "feat: add lifecycle simulation engine for causally-connected data"

VERIFICATION:
1. pnpm build succeeds
2. realitydb seed --template saas --lifecycle --seed 42 produces coherent data
3. Verify: all "churned" users have canceled_at set and a failed payment
Report: build status, sample coherent output
```

---

## Sprint Checklist

```
## H3-S1 — Lifecycle Engine

### Lifecycle Types (2 points)
- [ ] LifecycleDefinition with states, transitions, side effects
- [ ] CrossTableCorrelation type defined

### State Machine (3 points)
- [ ] SimulatedEntity tracks state history
- [ ] advanceEntity walks entity through states
- [ ] generateEntityRows produces multi-table rows per entity

### Lifecycle Runner (2 points)
- [ ] simulateLifecycles generates N coherent entities
- [ ] Deterministic with seed

### Cross-Table Correlation (2 points)
- [ ] applyCorrelations adjusts related table row counts
- [ ] Enterprise users get more payments (verifiable)

### SaaS Lifecycle (3 points)
- [ ] 5 states with correct weights
- [ ] Churned users always have failed payment + canceled_at
- [ ] Trial users have no payments

### Fintech Lifecycle (2 points)
- [ ] Frozen accounts have fraud alerts
- [ ] Closed accounts have settlements

### Seed Integration (2 points)
- [ ] --lifecycle flag works in seed command
- [ ] Without --lifecycle, behavior unchanged

### README + Version (2 points)
- [ ] Lifecycle section in README
- [ ] Version 0.9.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/20 PASS
```
