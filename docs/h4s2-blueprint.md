# RealityDB H4-S2 — Enterprise Privacy & Data Masking

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 4 — Enterprise & Platform
**Sprint:** H4-S2 — Data Masking
**Status:** DRAFT
**Depends on:** H4-S1 (schema analysis, realitydb@1.0.0)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Add production data masking that replaces PII with realistic synthetic equivalents while preserving statistical distributions and referential integrity. After this sprint, enterprises can create safe test environments from production databases with zero real PII.

---

## What Must Be True After This Sprint

1. `realitydb mask` reads production data, replaces PII, writes masked data back.
2. PII auto-detected using the column detector from H4-S1.
3. Statistical distributions preserved: masked data has same patterns as original.
4. Referential integrity preserved: FK relationships survive masking.
5. `--mode hipaa|gdpr|strict` controls masking aggressiveness.
6. `--dry-run` shows what would be masked without modifying data.
7. `--audit-log <file>` writes a compliance audit log (what was masked, column-by-column).
8. `--output <dir>` exports masked data to files instead of writing back to DB.
9. Version bumped to 1.1.0.

---

## Why This Matters

Enterprises can't use production data for testing due to HIPAA/GDPR. Current solutions cost $50k+. RealityDB mask gives teams a single command to create safe test environments. The audit log proves compliance to security teams.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | PII detector with masking rules | `packages/generators/src/mask/piiDetector.ts` |
| D2 | Masking engine (column-level replacement) | `packages/generators/src/mask/maskEngine.ts` |
| D3 | Audit log generator | `packages/generators/src/mask/auditLog.ts` |
| D4 | Mask pipeline | `packages/core/src/maskPipeline.ts` |
| D5 | Mask CLI command | `apps/cli/src/commands/mask.ts` |
| D6 | Version bump to 1.1.0 | `apps/cli/package.json` |

---

## Sprint Checklist

```
## H4-S2 — Enterprise Privacy & Data Masking

### PII Detector (3 points)
- [ ] Classify columns as PII / quasi-identifier / safe
- [ ] PII categories: name, email, phone, address, SSN, DOB, IP, username
- [ ] Compliance modes: hipaa (medical+PII), gdpr (all personal), strict (everything detectable)
- [ ] Deterministic: same seed produces same masked values (for FK consistency)

### Masking Engine (4 points)
- [ ] Replace emails with synthetic emails (preserving domain pattern)
- [ ] Replace names with synthetic names
- [ ] Replace phones with synthetic phones
- [ ] Replace addresses with synthetic addresses
- [ ] Generalize dates (shift by random offset, preserve day-of-week patterns)
- [ ] Preserve numeric distributions (mask with same mean/stddev)
- [ ] Preserve FK referential integrity (consistent ID mapping)
- [ ] Preserve null patterns (nulls stay null)

### Audit Log (2 points)
- [ ] Per-column masking record: what was masked, strategy used, row count
- [ ] Compliance summary: total PII columns, total rows masked
- [ ] JSON format for machine processing

### CLI Command (3 points)
- [ ] realitydb mask --confirm (writes back to DB)
- [ ] --dry-run shows plan without modifying
- [ ] --mode hipaa|gdpr|strict
- [ ] --output <dir> exports to files instead of DB
- [ ] --audit-log <file> writes compliance proof
- [ ] --seed <N> for deterministic masking
- [ ] CI mode JSON output

### README + Version (2 points)
- [ ] Data Masking section in README
- [ ] Version 1.1.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/16 PASS
```
