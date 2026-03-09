# DataBox Phase 7 Blueprint — Reality Engine

**Project:** DataBox — Developer Reality Platform  
**Phase:** 7 of 8 — Reality Engine (Time Evolution + Scenario Injection)  
**Status:** DRAFT  
**Depends on:** Phase 6 (COMPLETE ✅ — SaaS + e-commerce distributions verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 7 Objective

Add the temporal dimension and controlled chaos to DataBox. After Phase 7, generated datasets span realistic time periods with growth curves, churn patterns, and seasonal effects. Scenario injection introduces controlled anomalies — fraud spikes, payment failures, duplicate records — that test system resilience.

This is where DataBox transitions from a data generator into a **Reality Engine**.

At the end of Phase 7, the following must be true:

1. `databox seed --template saas --timeline 12-months` generates a dataset spanning 12 months with realistic growth.
2. Timestamps across all tables follow coherent timelines (user created before their subscription, subscription before payments).
3. Growth curves show realistic patterns (early slow growth, acceleration, possible plateau).
4. `databox seed --template saas --scenario payment-failures` injects controlled payment failure patterns.
5. Multiple scenarios can be combined: `--scenario payment-failures,churn-spike`
6. Scenarios modify the dataset post-generation (overlay, not replace).
7. All generation remains deterministic.

**Phase 7 does NOT include:** Reality Packs (Phase 8), behavior simulation (event streams), or the education template.

---

## Why Time Evolution and Scenarios Matter

### Without time evolution:
```
user.created_at:         2024-03-15    ← random past date
subscription.started_at: 2023-01-22    ← subscription before user existed!
payment.paid_at:         2025-11-03    ← payment in the future!
```
Analytics dashboards show nonsensical growth charts. Retention metrics are meaningless.

### With time evolution:
```
user.created_at:         2024-01-15    ← month 1
subscription.started_at: 2024-01-15    ← same day as signup
payment.paid_at:         2024-02-15    ← first billing cycle
payment.paid_at:         2024-03-15    ← second billing cycle
```
Now analytics show real cohort behavior. Growth charts work. Retention is measurable.

### Without scenarios:
```
payment.status: succeeded (100% of the time)
```
Fraud detection has nothing to detect. Error handling is never tested.

### With scenario injection:
```
payment.status: succeeded (85%)
payment.status: failed (10%)    ← injected failures
payment.status: fraudulent (5%) ← injected fraud
```
Now monitoring, alerting, and fraud detection can be tested.

---

## Phase 7 Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Timeline types and config | `packages/shared/src/timelineTypes.ts` |
| D2 | Timeline engine | `packages/generators/src/timeline.ts` |
| D3 | Temporal coherence resolver | `packages/generators/src/temporalResolver.ts` |
| D4 | Growth models (linear, exponential, S-curve) | `packages/generators/src/growthModels.ts` |
| D5 | Scenario types and config | `packages/shared/src/scenarioTypes.ts` |
| D6 | Scenario engine | `packages/generators/src/scenarioEngine.ts` |
| D7 | Built-in scenarios (payment-failures, churn-spike, fraud-spike, data-quality) | `packages/generators/src/scenarios/` |
| D8 | Timeline integration in plan builder | `packages/core/src/planning/buildPlan.ts` (update) |
| D9 | Scenario integration in generation engine | `packages/generators/src/engine.ts` (update) |
| D10 | CLI flags: --timeline, --scenario | `apps/cli/` (update) |
| D11 | Timeline + scenario test script | `tests/timeline-test.ts` |

---

## Phase 7 Sprints

Phase 7 is divided into **3 sprints**.

---

### Sprint 7A — Timeline Engine + Growth Models + Temporal Coherence

**Objective:** Build the time evolution system that generates datasets spanning configurable time periods with coherent timestamps across related entities.

#### Sprint 7A Prompt (for Claude Code)

```
Read: packages/generators/src/engine.ts, packages/generators/src/types.ts,
      packages/generators/src/primitives/temporal.ts,
      packages/shared/src/planTypes.ts, packages/shared/src/random.ts,
      packages/core/src/planning/buildPlan.ts,
      packages/schema/src/types.ts,
      docs/architecture-guardrails.md

CONTEXT:
Phase 6 is complete. DataBox generates domain-aware data with realistic
distributions via templates. However, timestamps are random — there is no
temporal coherence between related entities. A user might have a created_at
date that comes AFTER their subscription started_at.

OBJECTIVE:
Build the timeline engine that generates temporally coherent datasets
spanning configurable time periods with growth models.

REQUIREMENTS:

--- Timeline Types (packages/shared) ---

1. src/timelineTypes.ts:

   TimelineConfig {
     enabled: boolean
     startDate: string (ISO date)
     endDate: string (ISO date)
     granularity: "day" | "week" | "month"
     growthModel: GrowthModelConfig
   }

   GrowthModelConfig {
     kind: "linear" | "exponential" | "s-curve" | "flat"
     initialCount: number
     finalCount: number
     parameters?: Record<string, number>
   }

   TimelineSlot {
     slotIndex: number
     startDate: Date
     endDate: Date
     targetRowCount: number
   }

   TemporalConstraint {
     columnName: string
     afterColumn?: string
     afterTable?: string
     withinDays?: number
     mode: "creation" | "dependent" | "lifecycle"
   }

2. Export from packages/shared/src/index.ts

--- Growth Models (packages/generators) ---

3. src/growthModels.ts:

   - computeTimelineSlots(config: TimelineConfig) → TimelineSlot[]
     Divides the time range into slots based on granularity.
     Distributes totalRowCount across slots using the growth model.

   - linearGrowth(slots: number, initial: number, final: number) → number[]
     Returns array of row counts per slot, growing linearly.

   - exponentialGrowth(slots: number, initial: number, final: number) → number[]
     Returns array growing exponentially (slow start, fast end).

   - sCurveGrowth(slots: number, initial: number, final: number) → number[]
     S-curve (slow start, fast middle, slow end) — most realistic for user growth.

   - flatGrowth(slots: number, total: number) → number[]
     Uniform distribution across all slots.

   All functions must be deterministic and pure.

--- Temporal Coherence Resolver (packages/generators) ---

4. src/temporalResolver.ts:

   - resolveTemporalConstraints(
       schema: DatabaseSchema,
       foreignKeys: ForeignKeySchema[],
       templateName?: string
     ) → Map<string, TemporalConstraint[]>

     Automatically infers temporal constraints from schema:
     a. If table has created_at/signup_at → mark as "creation" timestamp
     b. If table has FK to another table AND both have timestamps:
        child.timestamp should be AFTER parent.timestamp
        Example: subscription.started_at AFTER user.created_at
     c. If table has lifecycle timestamps (started_at, canceled_at, delivered_at):
        they should be in logical order

   - applyTemporalConstraint(
       ctx: GeneratorContext,
       constraint: TemporalConstraint,
       parentRow: GeneratedRow | null,
       slotStart: Date,
       slotEnd: Date
     ) → string (ISO timestamp)

     Generates a timestamp that respects the constraint:
     - "creation": random within slot range
     - "dependent": after parent's timestamp, within withinDays
     - "lifecycle": after the referenced column in same row

--- Timeline Engine (packages/generators) ---

5. src/timeline.ts:

   - generateTimelineDataset(plan: GenerationPlan, timelineConfig: TimelineConfig) → GeneratedDataset
     Alternative to generateDataset that respects timeline.

     Flow:
     a. Compute timeline slots from config
     b. Resolve temporal constraints from schema
     c. For each slot:
        - Determine how many rows to generate for each table this slot
        - Generate rows with timestamps within slot range
        - Ensure FK references point to rows from current or earlier slots
     d. Combine all slots into final dataset
     e. Return GeneratedDataset with same structure

   - The function must handle tables without timestamps (generate all rows without time slicing)
   - Tables with FK dependencies must respect both temporal AND relational order
   - Must use SeededRandom for all randomness

6. src/index.ts — re-export timeline, growthModels, temporalResolver

--- Plan Builder Update (packages/core) ---

7. Update packages/shared/src/planTypes.ts:
   - Add optional timeline?: TimelineConfig to GenerationPlan
   - Add optional temporalConstraints?: TemporalConstraint[] to TableGenerationPlan

8. Update src/planning/buildPlan.ts:
   - If timeline config provided, attach to plan
   - Resolve temporal constraints and attach to table plans

CONSTRAINTS:
- Timeline engine must use SeededRandom (deterministic)
- Temporal constraints must be inferred automatically (no manual config required)
- Tables without timestamp columns should still generate normally
- FK references must remain valid (parent row exists before child references it)
- Growth model row counts must sum to the total requested records
- Do NOT modify CLI yet (Sprint 7C)
- Do NOT implement scenarios yet (Sprint 7B)
- Commit with message: "feat: add timeline engine with growth models and temporal coherence"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify computeTimelineSlots, generateTimelineDataset exported from @databox/generators
3. Verify TimelineConfig, TemporalConstraint exported from @databox/shared
4. Quick test: computeTimelineSlots with 12 monthly slots, s-curve growth → row counts increase then plateau
Report: build status, sample slot distribution
```

#### Sprint 7A Checklist

```
## Sprint 7A — Timeline Engine + Growth Models + Temporal Coherence

### Timeline Types (3 points)
- [ ] TimelineConfig type exported from @databox/shared
- [ ] GrowthModelConfig type exported
- [ ] TimelineSlot and TemporalConstraint types exported

### Growth Models (5 points)
- [ ] computeTimelineSlots divides time range and distributes row counts
- [ ] linearGrowth produces linearly increasing row counts
- [ ] exponentialGrowth produces exponentially increasing row counts
- [ ] sCurveGrowth produces S-curve distribution
- [ ] flatGrowth produces uniform distribution
- [ ] All growth model row counts sum to requested total

### Temporal Coherence (4 points)
- [ ] resolveTemporalConstraints infers constraints from schema + FKs
- [ ] Creation timestamps placed within time slot
- [ ] Dependent timestamps come AFTER parent timestamps
- [ ] Lifecycle timestamps in logical order (started_at before canceled_at)

### Timeline Engine (5 points)
- [ ] generateTimelineDataset produces dataset spanning time range
- [ ] Rows distributed across time slots per growth model
- [ ] FK references point to rows from current or earlier slots
- [ ] Tables without timestamps handled normally
- [ ] Uses SeededRandom (deterministic)

### Plan Builder Update (2 points)
- [ ] GenerationPlan includes optional timeline field
- [ ] TableGenerationPlan includes optional temporalConstraints

### Architecture (2 points)
- [ ] Timeline engine in @databox/generators (no DB dependency)
- [ ] Temporal constraints inferred automatically (no manual config)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add timeline engine with growth models and temporal coherence"

Score: __/23 PASS
Gate: ALL must be ✅ to proceed to Sprint 7B
```

---

### Sprint 7B — Scenario Engine + Built-in Scenarios

**Objective:** Build the scenario injection system that overlays controlled anomalies onto generated datasets.

#### Sprint 7B Prompt (for Claude Code)

```
Read: packages/generators/src/engine.ts, packages/generators/src/timeline.ts,
      packages/generators/src/types.ts, packages/generators/src/distributions.ts,
      packages/shared/src/planTypes.ts, packages/shared/src/random.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 7A built the timeline engine with growth models and temporal coherence.
Now we add scenario injection — controlled anomalies overlaid on generated data.

OBJECTIVE:
Build the scenario engine and 4 built-in scenarios.

REQUIREMENTS:

--- Scenario Types (packages/shared) ---

1. src/scenarioTypes.ts:

   ScenarioConfig {
     name: string
     intensity: "low" | "medium" | "high"
     targetTables?: string[]
     parameters?: Record<string, unknown>
   }

   ScenarioDefinition {
     name: string
     description: string
     version: string
     supportedIntensities: ("low" | "medium" | "high")[]
     targetTablePatterns: string[]
     apply: ScenarioApplyFn
   }

   ScenarioApplyFn = (
     dataset: GeneratedDataset,
     config: ScenarioConfig,
     random: SeededRandom
   ) => GeneratedDataset

   ScenarioResult {
     scenarioName: string
     rowsAffected: number
     modifications: string[]
   }

2. Export from packages/shared/src/index.ts

--- Scenario Engine (packages/generators) ---

3. src/scenarioEngine.ts:

   - ScenarioRegistry class:
     - register(scenario: ScenarioDefinition) → void
     - get(name: string) → ScenarioDefinition | undefined
     - list() → ScenarioDefinition[]

   - createScenarioRegistry() → ScenarioRegistry
   - getDefaultScenarioRegistry() → ScenarioRegistry (pre-loaded with built-in scenarios)

   - applyScenarios(
       dataset: GeneratedDataset,
       scenarios: ScenarioConfig[],
       random: SeededRandom
     ) → { dataset: GeneratedDataset, results: ScenarioResult[] }

     Applies scenarios sequentially. Each scenario modifies the dataset in place.
     Returns modified dataset and summary of changes.

--- Built-in Scenarios (packages/generators) ---

4. src/scenarios/paymentFailures.ts:
   - Name: "payment-failures"
   - Description: "Inject payment failure patterns"
   - Target tables: *payment*, *charge*, *invoice*
   - Behavior:
     - low: 5% of payment rows → status = "failed"
     - medium: 15% of payment rows → status = "failed", some "declined"
     - high: 30% of payment rows → mixed failures (failed, declined, error, timeout)
   - Also adjusts amount to 0 for some failed payments

5. src/scenarios/churnSpike.ts:
   - Name: "churn-spike"
   - Description: "Inject subscription cancellation surge"
   - Target tables: *subscription*
   - Behavior:
     - low: 10% additional cancellations
     - medium: 25% additional cancellations
     - high: 40% additional cancellations
   - Sets status = "canceled" and populates canceled_at timestamp

6. src/scenarios/fraudSpike.ts:
   - Name: "fraud-spike"
   - Description: "Inject suspicious transaction patterns"
   - Target tables: *payment*, *order*, *transaction*
   - Behavior:
     - low: 2% suspicious (rapid duplicate transactions)
     - medium: 5% suspicious
     - high: 10% suspicious
   - Creates rows with very close timestamps and identical amounts

7. src/scenarios/dataQuality.ts:
   - Name: "data-quality"
   - Description: "Inject data quality issues for testing"
   - Target tables: all
   - Behavior:
     - low: 1% null values in nullable columns, 0.5% duplicate-looking records
     - medium: 3% nulls, 1% duplicates, some inconsistent formats
     - high: 5% nulls, 2% duplicates, mixed case issues, whitespace problems
   - Only modifies nullable columns (never breaks NOT NULL constraints)

8. src/scenarios/index.ts — export all scenarios

--- Plan Builder Update (packages/shared) ---

9. Update planTypes.ts:
   - Add optional scenarios?: ScenarioConfig[] to GenerationPlan

CONSTRAINTS:
- Scenarios modify dataset AFTER generation (overlay, not replace)
- Scenarios must NOT break FK integrity
- Scenarios must NOT violate NOT NULL constraints
- Scenarios must use SeededRandom (deterministic)
- Scenario application must be idempotent with same seed
- Each scenario must document what it changes
- Do NOT modify CLI yet (Sprint 7C)
- Commit with message: "feat: add scenario engine with payment-failures, churn-spike, fraud-spike, and data-quality scenarios"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify getDefaultScenarioRegistry() returns 4 scenarios
3. Verify applyScenarios exported from @databox/generators
4. Quick test: generate 1000-row payment dataset, apply payment-failures medium,
   verify ~15% status changed to failed
Report: build status, scenario registry contents, test result
```

#### Sprint 7B Checklist

```
## Sprint 7B — Scenario Engine + Built-in Scenarios

### Scenario Types (3 points)
- [ ] ScenarioConfig type exported from @databox/shared
- [ ] ScenarioDefinition type exported with apply function
- [ ] ScenarioResult type exported

### Scenario Engine (3 points)
- [ ] ScenarioRegistry supports register, get, list
- [ ] getDefaultScenarioRegistry returns 4 built-in scenarios
- [ ] applyScenarios processes scenarios sequentially and returns results

### Payment Failures Scenario (3 points)
- [ ] Targets payment/charge/invoice tables
- [ ] Low/medium/high intensity levels work
- [ ] Modifies status column, adjusts amounts for failures

### Churn Spike Scenario (2 points)
- [ ] Targets subscription tables
- [ ] Sets status to canceled and populates canceled_at

### Fraud Spike Scenario (2 points)
- [ ] Targets payment/order/transaction tables
- [ ] Creates rapid duplicate patterns with close timestamps

### Data Quality Scenario (2 points)
- [ ] Targets all tables
- [ ] Only nullifies nullable columns (respects NOT NULL)

### Safety (3 points)
- [ ] Scenarios do NOT break FK integrity
- [ ] Scenarios do NOT violate NOT NULL constraints
- [ ] All scenarios use SeededRandom (deterministic)

### Architecture (2 points)
- [ ] Scenarios in @databox/generators (no DB dependency)
- [ ] GenerationPlan includes optional scenarios field

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add scenario engine with payment-failures, churn-spike, fraud-spike, and data-quality scenarios"

Score: __/22 PASS
Gate: ALL must be ✅ to proceed to Sprint 7C
```

---

### Sprint 7C — CLI Integration + End-to-End Wiring

**Objective:** Wire timeline and scenario flags into the CLI and pipelines. After this sprint, the full Reality Engine workflow works end-to-end.

#### Sprint 7C Prompt (for Claude Code)

```
Read: apps/cli/src/commands/seed.ts, apps/cli/src/commands/export.ts,
      apps/cli/src/cli.ts,
      packages/core/src/seedPipeline.ts, packages/core/src/exportPipeline.ts,
      packages/generators/src/engine.ts, packages/generators/src/timeline.ts,
      packages/generators/src/scenarioEngine.ts,
      packages/core/src/planning/buildPlan.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint 7A built the timeline engine with growth models and temporal coherence.
Sprint 7B built the scenario engine with 4 built-in scenarios. Now we wire
everything into the CLI and pipelines.

OBJECTIVE:
Add --timeline and --scenario flags to CLI, integrate into pipelines.

REQUIREMENTS:

--- Pipeline Updates (packages/core) ---

1. Update src/seedPipeline.ts:
   - Add timeline?: string to SeedOptions (e.g., "12-months", "6-months", "24-months")
   - Add scenarios?: string to SeedOptions (comma-separated, e.g., "payment-failures,churn-spike")
   - Add scenarioIntensity?: "low" | "medium" | "high" to SeedOptions
   - If timeline provided:
     a. Parse timeline string → TimelineConfig (e.g., "12-months" → 12 month slots ending today)
     b. Use generateTimelineDataset instead of generateDataset
   - If scenarios provided:
     a. Parse comma-separated string → ScenarioConfig[]
     b. After generation, apply scenarios via applyScenarios
     c. Include scenario results in SeedResult

2. Update SeedResult to include:
   - timelineUsed?: boolean
   - scenariosApplied?: ScenarioResult[]

3. Update src/exportPipeline.ts with same timeline/scenario support

--- CLI Updates (apps/cli) ---

4. Update apps/cli/src/commands/seed.ts:
   - Add --timeline option (string, e.g., "12-months")
   - Add --scenario option (string, comma-separated)
   - Add --scenario-intensity option (low|medium|high, default: medium)
   - Print timeline info in header if used
   - Print scenario results after seeding

   Example output with timeline:
   ```
   DataBox Seed
   ═══════════════════════════════════════
   Database: postgres://postgres:****@localhost:5432/databox_dev
   Template: saas
   Timeline: 12 months (Jan 2025 → Dec 2025)
   Growth: s-curve
   Seed: 42
   Records per table: 1000
   
   Generating with timeline...
   Writing to database...
     ...
   
   Seed complete. 8000 rows in 1.5s
   ```

   Example output with scenarios:
   ```
   DataBox Seed
   ═══════════════════════════════════════
   ...
   Scenarios: payment-failures (medium), churn-spike (low)

   Generating...
   Applying scenarios...
     payment-failures: 127 rows affected
     churn-spike: 43 rows affected
   Writing to database...
     ...
   ```

5. Update apps/cli/src/commands/export.ts:
   - Same --timeline, --scenario, --scenario-intensity options

6. Add `databox scenarios` command:
   - Lists all available scenarios with name, description, intensities
   - Example output:
     Available Scenarios:
       payment-failures — Inject payment failure patterns (low, medium, high)
       churn-spike — Inject subscription cancellation surge (low, medium, high)
       fraud-spike — Inject suspicious transaction patterns (low, medium, high)
       data-quality — Inject data quality issues for testing (low, medium, high)

--- Timeline Parsing Utility ---

7. Add to packages/core/src/planning/parseTimeline.ts:
   - parseTimelineString(input: string) → TimelineConfig
   - Supported formats:
     "12-months" → 12 months ending today, s-curve growth
     "6-months" → 6 months ending today, s-curve growth
     "24-months" → 24 months ending today, s-curve growth
     "1-year" → alias for 12-months
     "2-years" → alias for 24-months
   - Default growth model: s-curve
   - Start date: computed from end date minus duration
   - End date: today

--- Test Script ---

8. tests/timeline-test.ts:
   - Connect to DB, reset tables
   - Seed with: --template saas --records 500 --seed 42 --timeline 12-months
   - Query: SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) FROM users GROUP BY month ORDER BY month
   - Verify: row counts increase over time (growth curve)
   - Query: verify subscription.started_at >= user.created_at for FK-linked rows
   - Reset tables
   - Seed with: --template saas --records 500 --seed 42 --scenario payment-failures --scenario-intensity high
   - Query: SELECT status, COUNT(*) FROM payments GROUP BY status
   - Verify: significant portion of failures (>20%)
   - Print PASS/FAIL

CONSTRAINTS:
- Timeline + scenarios must not break deterministic generation
- Timeline + scenarios must not break FK integrity
- If --timeline not provided, behavior is unchanged (backward compatible)
- If --scenario not provided, behavior is unchanged
- Timeline and scenarios can be used together
- CLI must NOT contain business logic (delegate to pipelines)
- Invalid timeline format prints helpful error
- Invalid scenario name prints available scenarios
- Commit with message: "feat: wire timeline and scenario flags into CLI and pipelines"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. node apps/cli/dist/index.js seed --help — shows timeline and scenario options
3. node apps/cli/dist/index.js scenarios — lists 4 scenarios
Report: build status, help output, scenarios list
```

#### Sprint 7C Checklist

```
## Sprint 7C — CLI Integration + End-to-End

### Pipeline Updates (5 points)
- [ ] seedPipeline accepts timeline, scenarios, scenarioIntensity options
- [ ] Timeline string parsed into TimelineConfig
- [ ] generateTimelineDataset used when timeline provided
- [ ] applyScenarios called when scenarios provided
- [ ] SeedResult includes timelineUsed and scenariosApplied

### CLI Seed Updates (5 points)
- [ ] --timeline option accepted (e.g., "12-months")
- [ ] --scenario option accepted (comma-separated)
- [ ] --scenario-intensity option accepted (low|medium|high)
- [ ] Timeline info printed in header
- [ ] Scenario results printed after generation

### CLI Export Updates (2 points)
- [ ] --timeline option works for export
- [ ] --scenario option works for export

### CLI List Commands (2 points)
- [ ] databox scenarios lists all 4 built-in scenarios
- [ ] Invalid scenario name prints available scenarios

### Timeline Parsing (2 points)
- [ ] "12-months", "6-months", "24-months" parsed correctly
- [ ] "1-year", "2-years" aliases work

### Backward Compatibility (2 points)
- [ ] Without --timeline, generation works exactly as before
- [ ] Without --scenario, generation works exactly as before

### Data Quality (3 points)
- [ ] Timeline: user growth visible across months
- [ ] Timeline: child timestamps come after parent timestamps
- [ ] Scenarios: payment-failures injects expected failure rate

### Architecture (2 points)
- [ ] CLI contains no timeline/scenario logic (delegates to pipelines)
- [ ] Deterministic with same seed + timeline + scenario combination

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: wire timeline and scenario flags into CLI and pipelines"

Score: __/25 PASS
Gate: ALL must be ✅ to close Phase 7
```

---

## Phase 7 Architecture Compliance Matrix

| # | Guardrail | Sprint 7A | Sprint 7B | Sprint 7C | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | N/A | CLI delegates to pipelines | ☐ |
| 2 | Schema Normalized Once | Temporal constraints inferred from schema | N/A | N/A | ☐ |
| 3 | Separate Planning from Execution | Timeline config in plan | Scenarios in plan | Both resolved before execution | ☐ |
| 4 | Deterministic Generation | Timeline uses SeededRandom | Scenarios use SeededRandom | Same inputs = same output | ☐ |
| 5 | Dependency Safety | FK references respect temporal order | Scenarios don't break FKs | N/A | ☐ |
| 6 | Reality Packs Core Artifact | Timeline config exportable | Scenario config exportable | Both stored in plan | ☐ |
| 7 | Domain Templates First-Class | Templates + timeline combine | Templates + scenarios combine | All three compose | ☐ |
| 8 | Simulation Extensible | Timeline is pluggable layer | Scenarios are pluggable registry | Both extensible | ☐ |
| 9 | Configuration Explicit | Timeline in config/CLI | Scenarios in config/CLI | All via --flags | ☐ |
| 10 | Testability Non-Negotiable | Pure growth models | Pure scenario functions | Integration test script | ☐ |
| 11 | Performance Must Scale | N/A | N/A | N/A | ☐ |
| 12 | Safe by Default | N/A | Scenarios respect NOT NULL | Invalid inputs print help | ☐ |
| 13 | Feature Discipline | No extra features | No extra features | No extra features | ☐ |

---

## Phase 7 Demo Walkthrough

After all sprints pass, Eddy runs the Reality Engine demo:

```powershell
# 1. Build
cd C:\Users\HP\Documents\databox
pnpm install
pnpm build

# 2. List scenarios
node apps/cli/dist/index.js scenarios

# 3. Seed with timeline
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template saas --records 500 --seed 42 --timeline 12-months

# 4. Verify growth curve
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) FROM users GROUP BY month ORDER BY month;"

# 5. Verify temporal coherence
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) as violations FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.started_at < u.created_at;"

# 6. Seed with scenarios
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template saas --records 500 --seed 42 --scenario payment-failures --scenario-intensity high

# 7. Verify scenario effects
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM payments GROUP BY status ORDER BY count DESC;"

# 8. Combined: timeline + scenarios
node apps/cli/dist/index.js reset --confirm
node apps/cli/dist/index.js seed --template saas --records 500 --seed 42 --timeline 12-months --scenario payment-failures,churn-spike

# 9. Verify both effects
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) FROM users GROUP BY month ORDER BY month;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM payments GROUP BY status ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT status, COUNT(*) FROM subscriptions GROUP BY status ORDER BY count DESC;"
```

---

## Phase 7 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint 7A checklist | 23/23 ✅ |
| Sprint 7B checklist | 22/22 ✅ |
| Sprint 7C checklist | 25/25 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | Timeline growth + scenario injection verified |
| Git | 3 commits on feature branch |

**Phase 7 is COMPLETE when all criteria are met.**  
**Phase 8 (Platform Layer — Reality Packs + Education Template) begins only after Phase 7 is fully verified.**

---

## What Phase 8 Will Build On

Phase 8 will:

- Build the Reality Pack format (portable environment packages)
- Enable `databox pack export` and `databox pack import`
- Create the education domain template (students, teachers, classes, grades, attendance)
- Add `databox templates` command wiring (deferred from Phase 6)
- Polish CLI output and error handling
- Prepare for npm publish

The timeline engine and scenario system from Phase 7 become optional metadata within Reality Packs, making shared environments include not just data but temporal behavior and controlled chaos configurations.
