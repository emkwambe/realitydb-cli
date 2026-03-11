# RealityDB H3-S2 — Synthetic Data for Data Science

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 3 — Intelligence & Simulation
**Sprint:** H3-S2 — Data Science Mode
**Status:** DRAFT
**Depends on:** H3-S1 (lifecycle engine, realitydb@0.9.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Enable data scientists and analytics engineers to generate large-scale datasets for ML training, analytics testing, and data pipeline development. After this sprint, `realitydb generate --records 1000000 --format parquet` produces a million-row dataset with configurable statistical distributions.

---

## What Must Be True After This Sprint

1. `realitydb generate` creates datasets without a database connection (pure generation).
2. Supports output formats: JSON, CSV, Parquet.
3. `--records 1000000` generates million-row datasets in reasonable time (<60s).
4. Statistical distribution controls: normal, uniform, zipf, exponential, log-normal.
5. `--correlations` flag enables cross-column statistical correlations.
6. Schema can be defined inline or via SQL file (no live DB required).
7. Version bumped to 0.10.0.

---

## Why This Matters

Data scientists need large, realistic datasets but can't use production data (PII, compliance). Current tools generate random noise that doesn't exhibit real patterns. RealityDB with lifecycle simulation + statistical controls fills this gap. The data science community is massive and chronically underserved for synthetic data.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Generate command (no DB required) | `apps/cli/src/commands/generate.ts` |
| D2 | Schema-from-SQL parser | `packages/schema/src/parseSQLSchema.ts` |
| D3 | Distribution controls | `packages/generators/src/distributions/` |
| D4 | Parquet writer | `packages/generators/src/writers/parquet.ts` |
| D5 | High-volume streaming generator | `packages/generators/src/streaming.ts` |
| D6 | Cross-column correlation engine | `packages/generators/src/correlations.ts` |
| D7 | Version bump to 0.10.0 | `apps/cli/package.json` |

---

## Sprint Checklist

```
## H3-S2 — Data Science Mode

### Generate Command (3 points)
- [ ] realitydb generate works without database connection
- [ ] Schema from SQL file: --schema schema.sql
- [ ] Inline schema definition support

### Distribution Controls (3 points)
- [ ] Normal distribution with mean/stddev
- [ ] Zipf distribution (power law)
- [ ] Configurable via template overrides

### Output Formats (3 points)
- [ ] JSON output (existing)
- [ ] CSV output (existing)
- [ ] Parquet output (new)

### Performance (2 points)
- [ ] 1M rows in <60 seconds
- [ ] Streaming generation (constant memory)

### Correlations (2 points)
- [ ] Cross-column correlations (age correlates with income)
- [ ] Configurable via template

### README + Version (2 points)
- [ ] Data Science section in README
- [ ] Version 0.10.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/17 PASS
```
