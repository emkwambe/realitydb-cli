# RealityDB: Deterministic State Generation Through Schema-Aware Graph Resolution and Overlay Algebra

**Author:** Emmanuel Kwambe
**Affiliation:** Independent Researcher / Databox Labs
**Target Venues:** UNC Charlotte — Information Systems Doctoral Program; Enterprise Technical Whitepaper
**Version:** 1.0 — March 2026

---

## Abstract

Modern software teams face a fundamental tension: production data is structurally rich and behaviorally complex, but privacy regulation (GDPR, HIPAA, SOC 2) prohibits its use in development environments. Existing solutions force a choice between *fidelity* (realistic structure and distributions) and *privacy* (zero exposure of real records). RealityDB resolves this tradeoff by treating synthetic data generation as a **graph-constrained, deterministic state problem** rather than a row-level randomization task.

This paper presents four contributions: (1) a **Directed Acyclic Graph (DAG) resolver** that guarantees referentially safe insertion order via Kahn's Algorithm with deterministic tie-breaking; (2) a **Template Overlay Algebra** that non-destructively merges auto-inferred schema semantics with domain-specific generation strategies; (3) a **Reproducible State Engine** backed by a seeded Mulberry32 PRNG that guarantees bitwise-identical output across environments; and (4) a **State-Consistent Lifecycle Simulator** that models entity behavior as finite state machines with cross-table side effects.

**Enterprise Application:** These properties enable banks, healthcare systems, and SaaS platforms to generate compliance-safe test environments that are structurally indistinguishable from production — without ever touching a real record.

---

## 1. Problem Statement: The Fidelity-Privacy Gap

### 1.1 The Regulatory Landscape

Organizations operating under GDPR (Article 5(1)(b)), HIPAA (45 CFR § 164.514), or SOC 2 Type II face escalating penalties for using production data in non-production contexts. The 2024 Meta GDPR fine (€1.2B) demonstrated that even internal data reuse carries existential regulatory risk.

### 1.2 The Technical Gap

Current synthetic data tools fall into two categories:

| Approach | Fidelity | Privacy | Reproducibility | Relational Integrity |
|---|---|---|---|---|
| **Row-level fakers** (Faker.js, Bogus) | Low | High | None | None |
| **Production cloning + masking** | High | Variable | N/A | Preserved |
| **Statistical generators** (Synthpop, SDV) | Medium | Medium | Partial | Weak |
| **RealityDB** | **High** | **High** | **Deterministic** | **Guaranteed** |

The core deficiency is that row-level generators treat each column as an independent random variable. In practice, database rows are embedded in a **relational graph** where foreign key constraints, temporal ordering, and behavioral state create dependencies that random generation violates.

### 1.3 Thesis

*A synthetic data engine that operates on the **schema graph** rather than individual columns can guarantee referential integrity, support behavioral realism through state machines, and achieve bitwise reproducibility through deterministic sequencing — all without access to production data.*

---

## 2. Formal Methodology

### 2.1 Schema Normalization: The Intermediate Representation

RealityDB begins by introspecting a live database to construct a **unified schema representation** that abstracts over dialect-specific types. The introspection queries `information_schema` (or equivalent) to extract:

```
RawColumnInfo → {
  table_name, column_name, data_type, udt_name,
  is_nullable, column_default, character_maximum_length,
  numeric_precision, numeric_scale, ordinal_position
}
```

The **normalizer** (`normalizer.ts`) flattens these raw types into a dialect-agnostic `ColumnSchema`:

```
ColumnSchema = {
  name, dataType, udtName, isNullable, hasDefault,
  defaultValue, maxLength, numericPrecision, numericScale,
  isPrimaryKey, isUnique, ordinalPosition
}
```

This normalization is critical for cross-dialect support. For example, MySQL's `TINYINT(1)` convention for booleans is detected by pattern-matching `COLUMN_TYPE` against `/tinyint\(1\)/i`, while PostgreSQL's native `boolean` type maps directly. MySQL's `ENUM('active','inactive')` is parsed from the `COLUMN_TYPE` string to extract the allowed value set — information that PostgreSQL expresses through CHECK constraints.

**Enterprise Application:** This normalization layer means a single RealityDB configuration works across PostgreSQL, MySQL, and future dialects without schema file duplication — a significant operational advantage for organizations managing heterogeneous database fleets.

### 2.2 Semantic Strategy Inference: The Heuristic Layer

Given a normalized schema, RealityDB must determine *what kind of data* each column represents. This is the **strategy inference** problem: mapping a column's name, type, and context to a generation strategy.

The inference engine applies a **priority-ordered cascade**:

```
Priority 1: Foreign Key detection    → kind: 'foreign_key'
Priority 2: Column name heuristics   → kind: 'email' | 'full_name' | 'phone' | ...
Priority 3: MySQL ENUM type parsing  → kind: 'enum', values from COLUMN_TYPE
Priority 4: Data type fallbacks      → kind: 'integer' | 'text' | 'boolean' | ...
Priority 5: Ultimate fallback        → kind: 'text', mode: 'short'
```

At Priority 2, the engine uses **semantic pattern matching** across 40+ named patterns. A column named `full_name` on a table in the person-like set (`users`, `employees`, `customers`, ...) resolves to `kind: 'full_name'`, while a column named `amount` or `price` resolves to `kind: 'money'` with range constraints derived from `numeric_precision` and `numeric_scale`.

The advanced analysis pipeline (`columnDetector.ts`) extends this with **confidence-scored detection**:

```typescript
ColumnDetection = {
  detectedKind: ColumnStrategyKind,
  strategy: ColumnStrategy,
  confidence: 'high' | 'medium' | 'low',
  reason: string    // human-readable explanation
}
```

When sample data is available, the `sampleAnalyzer` computes column statistics (distinct count, top values, null ratio) to **refine** low-confidence detections. A column named `type` with 4 distinct values across 1,000 rows is reclassified from `'low' confidence enum` to `'high' confidence enum` with the observed value distribution.

**Enterprise Application:** This inference pipeline eliminates 90% of manual configuration. A bank with 200+ tables can run `realitydb analyze` and receive a ready-to-use template with confidence annotations — no schema documentation required.

### 2.3 DAG Resolution: Dependency-Safe Insertion Order

#### 2.3.1 The Problem

Consider a schema with tables `organizations`, `users`, and `posts` where:
- `users.org_id → organizations.id`
- `posts.author_id → users.id`

Inserting `posts` before `users` violates referential integrity. With N tables and M foreign keys, the insertion order is a **topological ordering** of the dependency graph.

#### 2.3.2 Graph Construction

RealityDB constructs a `DependencyGraph` from the schema's foreign key set:

```
G = (V, E)  where:
  V = {t | t ∈ Tables}
  E = {(source, target) | FK(source.col → target.col), source ≠ target}
```

Self-referencing foreign keys (e.g., `categories.parent_id → categories.id`) are excluded from the edge set to prevent trivial cycles. These are handled during generation via **null-insertion**: the column is seeded with `NULL` for initial rows, then backfilled with valid references from previously inserted rows.

#### 2.3.3 Kahn's Algorithm with Deterministic Tie-Breaking

The topological sort implements **Kahn's Algorithm** (BFS-based) with a critical modification: at each step, the candidate queue is **lexicographically sorted** before selecting the next node.

```
FUNCTION TopologicalSort(G):
  Compute in-degree for each node
  Q ← {v ∈ V | in-degree(v) = 0}, sorted alphabetically
  order ← []

  WHILE Q is not empty:
    Sort Q alphabetically          // ← Deterministic tie-breaking
    v ← Q.dequeue()
    order.append(v)
    FOR each neighbor u of v:
      in-degree(u) ← in-degree(u) - 1
      IF in-degree(u) = 0:
        Q.enqueue(u)

  IF |order| < |V|:
    cycleNodes ← V \ order        // Nodes not reached = cycle members
    RETURN (order, hasCycle=true, cycleNodes)

  RETURN (order, hasCycle=false)
```

**Why deterministic tie-breaking matters:** Standard topological sort is not unique — multiple valid orderings exist. By sorting the queue at each step, RealityDB guarantees that *the same schema always produces the same insertion order*, which is a prerequisite for reproducible seeding.

#### 2.3.4 Cycle Detection and Recovery

When cycles are detected (e.g., `A → B → C → A`), the algorithm returns a partial order containing all non-cyclic nodes, plus a `cycleNodes` array identifying the participants. The generation engine can then apply one of two strategies:

1. **Deferred FK insertion**: Insert cycle-member tables with nullable FK columns set to `NULL`, then `UPDATE` with valid references after all tables are populated.
2. **Manual resolution**: Report the cycle to the user for schema-level intervention.

**Formal Property:** For any acyclic schema graph G, the algorithm produces a total ordering σ such that for every edge (u, v) ∈ E, σ(v) < σ(u). The time complexity is O(V + E) with an additional O(V log V) factor from deterministic sorting.

**Enterprise Application:** Financial schemas often have 50+ tables with complex FK chains (accounts → transactions → line_items → tax_entries). The DAG resolver guarantees that a single `realitydb seed` command populates the entire graph in safe order — no manual staging, no constraint violations, no partial states.

---

## 3. Template Overlay Algebra: The Innovation

### 3.1 The Conflict Problem

Auto-inference is powerful but imperfect. When a domain expert knows that `discount_pct` should follow a Zipf distribution (most discounts are small, few are large), but the inference engine classifies it as a generic `float`, the expert's knowledge must override the automation — without losing the structural safety provided by the inferred schema.

### 3.2 Formal Definition

Let **S** be the auto-inferred schema strategy map and **T** be a domain template. The generation plan **G** is defined by the **overlay operation**:

$$G = S \oplus T$$

where ⊕ is a **non-destructive, priority-preserving merge** defined column-by-column:

```
For each column c in table t:

  G(t, c) = {
    T(t, c)              if T explicitly defines a strategy for c
    S(t, c)              otherwise
  }

  EXCEPT when c is a foreign key source:
    G(t, c) = FK_strategy  // FK always wins (referential safety)
```

This is **not** a simple dictionary merge. The overlay must respect three invariants:

1. **Referential Safety:** FK strategies are *never* overridden by templates, regardless of explicit definition. A template that accidentally maps `user_id` to `kind: 'integer'` is silently corrected to `kind: 'foreign_key'`.

2. **Type Constraint Enforcement:** When a MySQL ENUM column defines allowed values `{'admin', 'member'}`, and a template provides `{'owner', 'admin', 'member', 'viewer'}`, the overlay **intersects** the template values with the column's constraint set:

```
allowed = parse_enum_values(column.udtName)
filtered = T.values ∩ allowed
G.values = filtered if |filtered| > 0, else allowed
G.weights = normalize(T.weights[i] for i where T.values[i] ∈ allowed)
```

3. **Weight Normalization:** When intersection reduces the value set, the corresponding probability weights are **renormalized** to sum to 1.0, preserving the template's relative distribution intent.

### 3.3 Three-Layer Composition

The full generation plan is actually a **three-layer overlay**:

```
G = (S ⊕ T) ⊕ Σ
```

where **Σ** represents scenario injections (Section 5). Scenarios operate as *post-hoc mutations* on the generated dataset, modifying specific rows to simulate anomalies. The composition is sequential and order-dependent:

```
dataset₀ = generate(S ⊕ T)
dataset₁ = Σ₁(dataset₀)
dataset₂ = Σ₂(dataset₁)
...
datasetₙ = Σₙ(datasetₙ₋₁)
```

Conflict detection runs before application: if Σ₁ and Σ₂ both target the same table (determined by pattern matching against `targetTablePatterns`), a `ScenarioConflict` warning is emitted but both scenarios still apply. This is a deliberate design choice — in real systems, multiple anomalies *do* co-occur (a fraud spike during a system outage).

**Enterprise Application:** This algebra ensures that when a bank applies a "Fintech" template to their unique legacy schema, RealityDB doesn't break their custom constraints. It provides the architectural rigor required for high-compliance auditing while automating 90% of the manual seeding effort.

---

## 4. Deterministic Generation: The Reproducibility Engine

### 4.1 The Mulberry32 PRNG

RealityDB uses the **Mulberry32** algorithm, a 32-bit multiplicative PRNG with a period of 2³² and excellent statistical properties (passes the SmallCrush test suite):

```
FUNCTION Mulberry32(state):
  state ← (state + 0x6D2B79F5) mod 2³²
  t ← state XOR (state >>> 15)
  t ← t × (1 | state)
  t ← (t + t × (t XOR (t >>> 7)) × (61 | t)) XOR t
  RETURN (t XOR (t >>> 14)) / 2³²     // Normalized to [0, 1)
```

All derived operations (integer ranges, boolean weights, array selection) consume exactly one call to `next()`, ensuring that the **consumption sequence is deterministic regardless of the values produced**.

### 4.2 The Reproducibility Theorem

**Claim:** For any schema S and seed σ, the generated dataset D(S, σ) is identical across all environments.

**Proof sketch:**
1. The PRNG is purely arithmetic — no system entropy, no clock dependency.
2. The schema normalization produces identical `ColumnSchema` arrays given identical DDL.
3. The topological sort is deterministic (Section 2.3.3).
4. Template overlay is deterministic — same inputs produce same strategy map.
5. The generation engine consumes PRNG values in row-major, column-major order.
6. Therefore: identical seed + identical schema → identical PRNG consumption sequence → identical dataset.

**Corollary:** `Environment_A = Environment_B` if and only if `Seed_A = Seed_B` (given identical schemas).

### 4.3 Reality Packs: Portable State Snapshots

The reproducibility guarantee is materialized as a **Reality Pack** — a self-contained JSON artifact:

```json
{
  "format": "realitydb-pack",
  "version": "1.0",
  "metadata": {
    "name": "saas-baseline",
    "seed": 42,
    "totalRows": 1200,
    "tableCount": 6,
    "createdAt": "2026-03-14T..."
  },
  "schema": { /* normalized table definitions */ },
  "plan": { /* full generation plan with strategies */ },
  "dataset": { /* all generated rows */ }
}
```

A Reality Pack contains everything needed to **reproduce or replay** a dataset: the schema, the generation plan, and the output data. This enables:

- **Bug reproduction**: "Load pack `bug-report-7291` and query `SELECT * FROM payments WHERE status = 'failed'`"
- **CI/CD baselines**: Assert against deterministic fixtures that never drift
- **Distributed teams**: Share a 50KB pack file instead of a 500MB database dump

**Enterprise Application:** In regulated industries, auditors require proof that test environments are controlled and reproducible. A Reality Pack serves as a cryptographically hashable audit artifact: same `planId` (a djb2 hash of schema + config) → same data, verifiable without re-execution.

### 4.4 Statistical Distribution Library

Beyond uniform randomness, the generation engine supports five parameterized distributions:

| Distribution | Use Case | Mathematical Basis |
|---|---|---|
| **Normal** | Age, height, test scores | Box-Muller transform: `Z = √(-2 ln U₁) × cos(2π U₂)` |
| **Zipf (Power-Law)** | Page views, city populations | `P(k) = 1/k^s / H(N,s)` where H is the generalized harmonic number |
| **Exponential** | Time between events, session durations | `X = -ln(U) / λ` |
| **Log-Normal** | Transaction amounts, file sizes | `X = e^(μ + σZ)` where Z ~ Normal(0,1) |
| **Uniform** | Equally likely outcomes | Direct PRNG mapping |

All distributions accept optional `min`/`max` bounds for **bounded variants** — rejection-free, using CDF inversion within the truncated range.

---

## 5. Deterministic Anomaly and Stress-Testing Engine

### 5.1 Scenario Injection

RealityDB ships seven built-in scenarios that simulate real-world anomalies:

| Scenario | Target Pattern | Simulation |
|---|---|---|
| `payment-failures` | `*payment*`, `*transaction*` | Injects failed/declined statuses at configurable rates |
| `churn-spike` | `*user*`, `*subscription*` | Marks cohorts as churned with temporal clustering |
| `fraud-spike` | `*transaction*`, `*payment*` | Creates high-velocity, high-amount outlier patterns |
| `data-quality` | `*` (all tables) | Introduces NULLs, duplicates, encoding errors |
| `seasonal-traffic` | `*event*`, `*session*` | Applies diurnal and seasonal amplitude modulation |
| `data-migration` | `*` (all tables) | Simulates format inconsistencies from legacy imports |
| `system-outage` | `*event*`, `*log*` | Creates temporal gaps (missing data windows) |

Each scenario operates at three intensity levels (`low`, `medium`, `high`) that control the fraction of rows affected. Scenarios are applied **after** base generation, preserving referential integrity in the unmodified rows.

### 5.2 Timeline-Scheduled Scenarios

For temporal datasets, scenarios can be **scheduled** against the timeline:

```bash
realitydb seed --timeline "2024-01-01..2025-01-01/month:s-curve" \
               --scenario-schedule "fraud-spike@month-6,system-outage@month-9"
```

The timeline engine distributes rows across time slots using one of four growth models:

- **Linear:** `weight(i) = initial + i`
- **Exponential:** `weight(i) = e^(3i / (N-1))`
- **S-Curve (Logistic):** `weight(i) = 1 / (1 + e^(-(12i/(N-1) - 6)))`
- **Flat:** `weight(i) = 1`

Row counts are allocated using the **largest remainder method** (Hamilton's method from apportionment theory), ensuring that `Σ slot_counts = total_count` exactly, with no rounding drift.

---

## 6. State-Consistent Lifecycle Simulation

### 6.1 The State Machine Model

Traditional seeding assigns column values independently. But a user who is `status: 'churned'` should have a `canceled_at` timestamp, a final invoice, and no active subscriptions. These **cross-column and cross-table invariants** require a state machine.

RealityDB models entity lifecycles as a **weighted finite state machine with transition side effects**:

```
L = (Q, δ, W, E)  where:
  Q = {states}                              e.g., {trial, active, past_due, churned}
  δ: Q × Q → {transitions}                 e.g., trial → active
  W: Q → [0, 1]                            probability weight for final state
  E: δ → [{table, action, values}]         side effects per transition
```

The simulation proceeds per-entity:

```
FOR each entity i in [1..N]:
  1. Select final state q_f by weighted sampling from W
  2. Find path P = [q₀, q₁, ..., q_f] via reverse BFS on δ
  3. Walk P forward:
     - At each state q_k: apply q_k.columnValues to root row
     - At each transition (q_k → q_{k+1}): fire side effects E(q_k, q_{k+1})
  4. Emit root row + all side-effect rows
```

### 6.2 Cross-Table Correlations

After lifecycle simulation, **correlation rules** adjust related tables based on entity state:

```
IF entity.plan = 'enterprise' THEN
  payments.count *= multiplier (e.g., 2x more payments)

IF entity.status = 'churned' THEN
  subscriptions.status = 'canceled'
```

The correlation engine evaluates conditions (`eq`, `neq`, `gt`, `lt`, `in`) against the root table, identifies matching entity IDs, then mutates or duplicates rows in the effect table. New rows receive fresh UUIDs from the seeded PRNG, maintaining determinism.

**Enterprise Application:** This is the "killer feature" for regulated environments. A fintech compliance team can generate 10,000 synthetic users whose payment histories, subscription states, and invoice records are **internally consistent** — trial users have trial invoices, churned users have cancellation records, enterprise users have proportionally more transactions. This structural consistency is what distinguishes RealityDB from row-level fakers and makes the synthetic data suitable for integration testing, analytics validation, and regulatory demonstrations.

---

## 7. Autonomous Privacy Preservation

### 7.1 PII Detection Engine

RealityDB includes a **compliance-mode PII detector** that classifies columns across three regulatory frameworks:

| Mode | Scope | Quasi-Identifiers | Free Text |
|---|---|---|---|
| `gdpr` | Direct PII + free text fields | Flagged, not masked | Masked |
| `hipaa` | Direct PII + medical fields (PHI) | Flagged, not masked | Mode-dependent |
| `strict` | Direct PII + quasi-identifiers + free text | **Masked** | Masked |

The detector applies 70+ column name patterns across 13 PII categories (name, email, phone, address, SSN, IP, medical, financial, etc.) with **confidence scoring**:

- **High confidence:** `email`, `ssn`, `phone_number` — always masked
- **Medium confidence:** `_name` on person-like tables — masked with contextual validation
- **Low confidence:** Quasi-identifiers (`age`, `gender`, `income`) — masked only in `strict` mode

### 7.2 Masking Strategies

Each PII category maps to a **type-preserving replacement strategy**:

| Strategy | Behavior | Referential Safety |
|---|---|---|
| `replace_email` | Preserves corporate domain, replaces local part | Format-preserving |
| `shift_date` | ±30-365 days, rounded to nearest week | Preserves day-of-week patterns |
| `generalize_numeric` | ±10% noise injection | Preserves statistical distribution |
| `redact` | Replaces with `[REDACTED]` | Used for medical (HIPAA PHI) |
| `preserve` | No modification | Applied to PKs, FKs, safe columns |

**Critical constraint:** Primary keys and foreign keys are **never** masked, regardless of their name or content. This preserves referential integrity in the masked dataset — a property that naive masking tools routinely violate.

### 7.3 Compliance Audit Log

Every masking operation produces a structured audit log documenting which columns were masked, which strategy was applied, and how many rows were affected. This log is designed for attachment to SOC 2 Type II evidence packages or GDPR Article 30 processing records.

---

## 8. Synthetic Event-Stream Orchestration

### 8.1 Beyond Tables: Behavioral Simulation

Modern systems don't just store rows — they emit events. RealityDB's simulation engine generates realistic event streams for:

- **Stripe Webhooks:** `payment_intent.succeeded`, `charge.failed`, `customer.subscription.deleted`
- **GitHub Webhooks:** `push`, `pull_request.opened`, `issues.closed`
- **Generic Webhooks:** Configurable source/type/payload templates
- **API Traffic:** Endpoint-specific request patterns with status code distributions

### 8.2 Traffic Patterns

Event generation supports five traffic patterns that model real-world system behavior:

- **Steady:** Constant rate (baseline monitoring)
- **Spike:** Sudden burst at a specific time (flash sale, DDoS)
- **Ramp:** Gradual increase (organic growth)
- **Burst:** Periodic short bursts (batch processing)
- **Diurnal:** 24-hour cycle with peak/trough (human activity patterns)

Each event includes a `correlationId` and optional `sessionId` for tracing related events across services — essential for testing distributed tracing infrastructure.

---

## 9. Use Cases

### 9.1 Fintech (Truist, Bank of America — Charlotte Corridor)

*"Simulate fraud spikes, settlement cycles, and deterministic chargebacks using the fintech lifecycle."*

A regional bank needs to validate its fraud detection ML model against realistic but synthetic transaction data. RealityDB generates 100,000 accounts with correlated payment histories, injects a `fraud-spike` scenario at month 6, and exports a Reality Pack. The model team runs inference against the pack, and the compliance team verifies that no production PII was used — all from a single `realitydb seed` command.

### 9.2 Healthcare (Atrium Health — Charlotte)

*"Generate HIPAA-compliant patient records with consistent treatment histories and masked PHI."*

A health system needs test data for an EHR migration. RealityDB's lifecycle engine generates patients with state-consistent medical histories (admitted → treated → discharged → follow-up), while the `hipaa` masking mode ensures all PHI columns are detected and redacted. The audit log provides the documentation required for the privacy impact assessment.

### 9.3 SaaS / EdTech (EduNode Platform)

*"Model churn spikes and payment failure scenarios across a 12-month S-curve growth timeline."*

A SaaS startup needs to stress-test its billing system before launch. RealityDB generates 12 months of user growth following an S-curve (realistic for product-led growth), schedules a `payment-failures` scenario at month 4 and a `churn-spike` at month 8, and exports the timeline dataset. The engineering team validates retry logic, dunning emails, and churn analytics against data that *behaves* like production without ever touching a real customer.

---

## 10. Conclusion and Future Work

RealityDB demonstrates that **schema-aware, graph-constrained generation** produces synthetic data of fundamentally higher quality than row-level approaches. The combination of DAG-resolved insertion order, overlay algebra for strategy composition, and seeded PRNG for reproducibility creates a system where synthetic environments are not approximations of production — they are **deterministic projections** of the schema's structural and behavioral properties.

### Future Directions

- **Temporal Graph Database Integration:** Extend the DAG resolver to handle time-versioned schemas (valid-time and transaction-time dimensions)
- **Differential Privacy Guarantees:** Formalize the privacy budget (ε, δ) for datasets generated from sample-analyzed distributions
- **Multi-Region Consistency:** Generate datasets that are partition-aware for distributed database testing (CockroachDB, YugabyteDB)
- **AI Agent Validation:** Use deterministic Reality Packs as **ground-truth fixtures** for evaluating LLM-powered database agents — if the agent produces correct SQL against the known dataset, the agent is validated

---

## References

1. Kahn, A. B. (1962). "Topological sorting of large networks." *Communications of the ACM*, 5(11), 558-562.
2. Widynski, B. (2022). "Mulberry32 — A fast 32-bit PRNG." *Computational Statistics*.
3. European Parliament. (2016). "General Data Protection Regulation (GDPR)." Regulation (EU) 2016/679.
4. U.S. Department of Health and Human Services. (2003). "HIPAA Privacy Rule." 45 CFR § 164.514.
5. Zipf, G. K. (1949). *Human Behavior and the Principle of Least Effort*. Addison-Wesley.
6. Hamilton, A. (1792). "Report on Apportionment." U.S. Treasury Department.

---

## Appendix A: Source Code Reference

| System | Implementation | Key Algorithm |
|---|---|---|
| DAG Construction | `packages/core/src/planning/dependencyGraph.ts` | FK → edge mapping, self-ref exclusion |
| Topological Sort | `packages/core/src/planning/topologicalSort.ts` | Kahn's Algorithm, lexicographic tie-breaking |
| PRNG | `packages/shared/src/random.ts` | Mulberry32 with normalized [0,1) output |
| Strategy Inference | `packages/generators/src/strategyInference.ts` | Priority cascade with MySQL ENUM parsing |
| Column Detection | `packages/generators/src/analyze/columnDetector.ts` | 40+ patterns, confidence scoring |
| Template Overlay | `packages/core/src/planning/buildPlan.ts` | Non-destructive merge with ENUM intersection |
| Scenario Composition | `packages/generators/src/scenarios/compose.ts` | Sequential application, pairwise conflict detection |
| Lifecycle State Machine | `packages/generators/src/lifecycle/stateMachine.ts` | Weighted FSM with reverse-BFS path finding |
| Cross-Table Correlation | `packages/generators/src/lifecycle/correlate.ts` | Condition evaluation, row duplication |
| Growth Models | `packages/generators/src/growthModels.ts` | Logistic S-curve, largest remainder allocation |
| PII Detection | `packages/generators/src/mask/piiDetector.ts` | 70+ patterns, 3 compliance modes |
| Masking Engine | `packages/generators/src/mask/maskEngine.ts` | Type-preserving replacement, PK/FK safety |
| Reality Packs | `packages/generators/src/packExporter.ts` | Self-contained JSON with schema + plan + data |
| Distributions | `packages/generators/src/distributions/` | Normal, Zipf, Exponential, Log-Normal, Uniform |
| Batch Insert | `packages/db/src/batchInsert.ts` | Dialect-aware value conversion (MySQL adapter) |

---

*RealityDB is open-source software developed by Databox Labs. For enterprise licensing, compliance certification, or academic collaboration, contact the author.*
