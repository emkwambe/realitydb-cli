# RealityDB H4-S1 — AI-assisted Data Generation

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 4 — Enterprise & Platform
**Sprint:** H4-S1 — AI-assisted Generation
**Status:** DRAFT
**Depends on:** H3-S3 (advanced scenarios, realitydb@0.11.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Add intelligent schema analysis that auto-detects column semantics, samples existing data distributions, and generates a ready-to-use template file. After this sprint, new users run `realitydb analyze` and get a custom template tuned to their exact schema — zero manual configuration.

---

## What Must Be True After This Sprint

1. `realitydb analyze` introspects the database and prints a detailed analysis report.
2. Column semantics auto-detected: emails, phones, URLs, dates, currencies, countries, enums, statuses, prices, percentages, ratings, IP addresses, slugs, usernames.
3. Sample data analyzed: reads up to 1000 rows per table, extracts real distributions (value frequencies, numeric ranges, null rates).
4. `realitydb analyze --output my-template.json` generates a template file from analysis.
5. Generated templates are valid (pass `realitydb templates validate`).
6. CI mode outputs structured JSON analysis.
7. `--sample-size <N>` controls how many rows to sample (default 1000).
8. Version bumped to 1.0.0.

---

## Why This Matters

Current workflow: user reads schema, picks a template, manually adjusts overrides. New workflow: `realitydb analyze` → auto-generated template → `realitydb seed --template ./analyzed.json`. This eliminates the cold-start problem entirely. Users get realistic data from their exact schema on the first try.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Column pattern detector (semantic heuristics) | `packages/generators/src/analyze/columnDetector.ts` |
| D2 | Sample data analyzer (distribution learning) | `packages/generators/src/analyze/sampleAnalyzer.ts` |
| D3 | Template generator (analysis → template JSON) | `packages/generators/src/analyze/templateGenerator.ts` |
| D4 | Analysis report formatter | `packages/generators/src/analyze/report.ts` |
| D5 | Analyze pipeline | `packages/core/src/analyzePipeline.ts` |
| D6 | Analyze CLI command | `apps/cli/src/commands/analyze.ts` |
| D7 | Version bump to 1.0.0 | `apps/cli/package.json` |

---

## Sprint Checklist

```
## H4-S1 — AI-assisted Generation

### Column Pattern Detector (4 points)
- [ ] Detect email columns (name + data type heuristics)
- [ ] Detect phone/mobile columns
- [ ] Detect URL/website columns
- [ ] Detect country/locale columns
- [ ] Detect currency code columns
- [ ] Detect IP address columns
- [ ] Detect slug/username columns
- [ ] Detect percentage/rating columns
- [ ] Detect enum-like columns from sample data (≤20 distinct values)
- [ ] Detect status columns with weighted distributions from actual data

### Sample Data Analyzer (4 points)
- [ ] Read up to N rows per table (--sample-size, default 1000)
- [ ] Compute value frequency distributions for string columns
- [ ] Compute min/max/mean/stddev for numeric columns
- [ ] Compute null rate per column
- [ ] Detect boolean-like columns (only 2 distinct values)
- [ ] Detect date range and temporal patterns
- [ ] No mutations — read-only queries

### Template Generator (3 points)
- [ ] Convert analysis results to valid TemplateJSON
- [ ] Include discovered distributions as strategy options
- [ ] Include table match patterns
- [ ] Output passes templates validate
- [ ] --output <file> writes the generated template

### Analyze CLI Command (2 points)
- [ ] realitydb analyze runs full analysis
- [ ] Interactive output with per-table, per-column breakdown
- [ ] CI mode JSON output
- [ ] --output <file> generates template file
- [ ] --sample-size <N> controls sample size

### README + Version (2 points)
- [ ] AI-assisted Generation section in README
- [ ] Version 1.0.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/17 PASS
```
