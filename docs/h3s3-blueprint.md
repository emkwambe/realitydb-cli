# RealityDB H3-S3 — Advanced Scenario Engine

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 3 — Intelligence & Simulation
**Sprint:** H3-S3 — Advanced Scenarios
**Status:** DRAFT
**Depends on:** H3-S2 (data science mode, realitydb@0.10.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Evolve the scenario system from static injection to composable, timeline-aware event simulation. After this sprint, developers can compose multiple scenarios, schedule them on timelines, and create custom scenarios as JSON files.

---

## What Must Be True After This Sprint

1. Multiple scenarios composable: `--scenario payment-failures,churn-spike`.
2. Timeline-aware scenarios: fraud spike at month 6, churn wave at month 9.
3. Custom scenarios via JSON (like custom templates).
4. `realitydb scenarios create` scaffolds a custom scenario file.
5. Scenario result report: what was injected, where, how much.
6. 3 new scenarios: seasonal-traffic, data-migration, system-outage.
7. Version bumped to 0.11.0.

---

## Why This Matters

QA teams test against specific failure patterns. Current scenarios inject random anomalies. Composable, timeline-scheduled scenarios let teams build precise test conditions: "fraud spike in week 3, followed by churn wave in week 5, during a seasonal traffic surge." This is how RealityDB becomes a resilience testing tool.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Scenario composition engine | `packages/generators/src/scenarios/compose.ts` |
| D2 | Timeline-aware scenario scheduling | `packages/generators/src/scenarios/schedule.ts` |
| D3 | Custom scenario JSON loader | `packages/generators/src/scenarios/loadScenario.ts` |
| D4 | Scenario scaffolding command | `apps/cli/src/commands/scenarios.ts` |
| D5 | Scenario result reporter | `packages/generators/src/scenarios/report.ts` |
| D6 | Seasonal traffic scenario | `packages/generators/src/scenarios/seasonalTraffic.ts` |
| D7 | Data migration scenario | `packages/generators/src/scenarios/dataMigration.ts` |
| D8 | System outage scenario | `packages/generators/src/scenarios/systemOutage.ts` |
| D9 | Version bump to 0.11.0 | `apps/cli/package.json` |

---

## Sprint Checklist

```
## H3-S3 — Advanced Scenarios

### Scenario Composition (3 points)
- [ ] Multiple scenarios apply in sequence
- [ ] No conflicts between composed scenarios
- [ ] Deterministic with seed

### Timeline Scheduling (3 points)
- [ ] Scenarios can target specific timeline periods
- [ ] --scenario-schedule "fraud-spike:month-6,churn-spike:month-9"
- [ ] Scheduled scenarios respect timeline boundaries

### Custom Scenarios (2 points)
- [ ] Custom scenario JSON file format defined
- [ ] realitydb scenarios create scaffolds template

### New Scenarios (3 points)
- [ ] seasonal-traffic: holiday/weekend traffic patterns
- [ ] data-migration: encoding issues, format changes, null spikes
- [ ] system-outage: gap in data, then recovery burst

### Scenario Reporter (2 points)
- [ ] Reports what was injected per table
- [ ] CI mode JSON output with injection details

### README + Version (2 points)
- [ ] Advanced Scenarios section in README
- [ ] Version 0.11.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/17 PASS
```
