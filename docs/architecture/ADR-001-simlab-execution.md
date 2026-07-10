# ADR-001: RealityDB SimLab Execution Architecture

**Date:** 2026-07-10  
**Status:** Accepted  
**Deciders:** Eddy Mkwambe (Founder, Mpingo Systems LLC)

## Context

SimLab UI tabs (ML split, Inject anomalies, Simulate scenario, What-if analysis)
exist with working controls but fire "coming soon" errors. The CLI commands
(split, anomaly, simulate) are fully implemented and verified 215/215.
The question is how to bridge CLI capability to hosted SimLab execution.

## Decision

RealityDB SimLab will use a shared, infrastructure-neutral simulation engine.
The CLI and hosted SimLab will be adapters over the same versioned operation
contracts. Hosted operations will run as durable asynchronous jobs.
Neon branches will hold interactive database states.
R2 will hold exports, manifests, and reproducibility artifacts.

## Architecture

RealityDB Simulation Engine (packages/simulation-core/)
├── split()
├── injectAnomalies()
├── simulateScenario()
├── runWhatIf()
├── validate()
└── generateManifest()
│
│ shared domain contracts
│
┌────────┴────────┐
│                 │
CLI Adapter   SimLab Cloud Adapter
(local files) (Worker → Workflow → Neon/R2)

## Operation Execution Model

| Operation         | Primary Output         | Destination              |
|-------------------|------------------------|--------------------------|
| ML split          | Train/val/test files   | R2 downloadable ZIP      |
| Inject anomalies  | Modified dataset       | Neon branch + manifest   |
| Simulate scenario | Modified DB state      | Neon branch + R2 report  |
| What-if analysis  | Comparison report      | Separate Neon branch + R2|

## Endpoint Model

POST /v1/labs/:id/jobs/split
POST /v1/labs/:id/jobs/anomalies
POST /v1/labs/:id/jobs/scenarios
POST /v1/labs/:id/jobs/what-if
GET  /v1/jobs/:jobId
POST /v1/jobs/:jobId/cancel
GET  /v1/jobs/:jobId/artifacts
POST /v1/jobs/:jobId/replay

## Job Manifest

Every operation produces a job manifest:

{
  "jobId": "job_...",
  "labId": "lab_...",
  "operation": "inject-anomalies",
  "engineVersion": "1.4.0",
  "templateVersion": "banking@3.2.0",
  "seed": 847293,
  "parameters": {},
  "baselineSnapshotId": "snap_...",
  "status": "queued",
  "idempotencyKey": "...",
  "createdBy": "user_..."
}

## UI Product Structure (future)

Three modes replace four disconnected tabs:

### 1. Shape Data
Generate dataset, Split for ML, Inject anomalies, Adjust distributions

### 2. Simulate Reality
Run scenario, Replay event sequence, Introduce operational failure,
Apply market or behavioral shock, Generate time evolution

### 3. Compare Decisions
Create baseline, Apply intervention, Compare outcomes,
Inspect affected records, Export evidence package

## Implementation Phases

- Phase 1 (now): Replace "coming soon" with CLI command display.
  Fix hardcoded template map. Dynamic template fetch from /v1/store.
- Phase 2: Extract engine into packages/simulation-core/.
  Define SimulationOperation interface. No React, CLI, or HTTP code inside.
- Phase 3: Hosted ML split. Worker → Workflow → Neon → R2 ZIP → signed URL.
- Phase 4: Anomaly injection with pre-op snapshot, rollback, integrity validation.
- Phase 5: Scenario simulation with versioned scenario pack definitions.
- Phase 6: What-if analysis with Neon branch isolation and comparison reports.

## What Was Rejected

- Option A (bundle engine into Worker): Tight coupling, memory pressure,
  CPU ceilings, difficult progress reporting, HTTP retries rerunning mutations.
- Option B (everything to R2): Correct for exports, wrong for interactive
  database simulations. Breaks the SimLab experience.
- Option C (permanent CLI fallback): Useful bridge, not a product architecture.
  Tells users the hosted product does not actually perform the operation.

## The Defensible Moat

Not the React tabs. Not the Worker endpoints. Not the R2 download links.

The simulation grammar and execution engine:
- Domain-aware anomaly definitions
- Reproducible scenario models with cross-table causal coherence
- Relational-integrity preservation across all operations
- Deterministic seeding for Article 10(b) compliance
- Versioned scenario catalogs
- Auditable job manifests
- Baseline-vs-intervention comparison

## Governing Principle

Workers coordinate. The RealityDB engine computes.
Neon holds interactive state. R2 holds artifacts.
Queues make execution reliable.