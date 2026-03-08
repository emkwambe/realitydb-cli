# DataBox Architecture Guardrails

These 13 guardrails are non-negotiable constraints that govern all DataBox development. Every PR, feature, and refactor must comply.

---

## 1. Thin CLI / Strong Core

The CLI (`apps/cli`) contains only argument parsing and output formatting. Business logic, orchestration, and data processing live in `packages/`. The CLI is a shell — never a brain.

## 2. Schema Normalized Once

Raw database metadata (pg_catalog, information_schema) is read once by `@databox/schema` and transformed into the normalized `TableSchema` / `ColumnSchema` model. No other package ever touches raw DB metadata.

## 3. Separate Planning from Execution

A `GenerationPlan` is built before any data is generated. The plan is a pure data structure — inspectable, serializable, diffable. The generator reads the plan; it never builds the plan.

## 4. Deterministic Generation Mandatory

Given the same seed and the same plan, the generator must produce byte-identical output. Randomness flows exclusively through `createSeededRandom()`. No `Math.random()`, no `Date.now()` in generation paths.

## 5. Dependency Safety First

Tables with foreign keys must be inserted after their referenced tables. Insertion order is always determined by topological sort of the FK dependency graph. Circular dependencies must be detected and reported, never silently broken.

## 6. Reality Packs as Core Artifact

A Reality Pack is the portable output of DataBox — a self-contained package of schema, plan, and generated data that can be shared, versioned, and replayed. All features must support Reality Pack export/import.

## 7. Domain Templates First-Class

Domain templates (SaaS, ecommerce, education, etc.) are modular, pluggable packs that define table structures, column strategies, and realistic data distributions. Templates are not afterthoughts — they are first-class citizens.

## 8. Simulation Must Be Extensible

The generation engine must support future timeline simulation (data evolving over time) and scenario injection (what-if modifications). Plan types and generator interfaces must leave room for these extensions without breaking changes.

## 9. Configuration Explicit

All configuration lives in `databox.config.json`. There are no hidden defaults that change behavior silently. Every option has a documented default, and the config file is the single source of truth.

## 10. Testability Non-Negotiable

Every module must be independently testable. Functions are pure where possible. Side effects (DB writes, file I/O) are isolated behind interfaces. No global state.

## 11. Performance Must Scale

Batch operations for DB writes. Streaming generation for large datasets. Memory-conscious data structures. Performance is a feature, not an afterthought.

## 12. Safe by Default

Destructive commands (`reset`, `drop`) require explicit confirmation flags. No accidental data loss. The default path is always the safe path.

## 13. Feature Discipline

Nothing ships that doesn't strengthen the core doctrine. No speculative features. No "nice to have" additions that dilute focus. Every line of code must serve the Reality Engine mission.

---

## Architecture Review Rule

Before any PR is merged, ask: **"Does this change respect all 13 guardrails?"** If any guardrail is violated, the PR must be revised.

## The Ultimate Test

> If you delete this feature, does DataBox still work as a Reality Engine?
> If yes, the feature might not belong here yet.
