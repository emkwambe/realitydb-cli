# RealityDB CLI — Changelog

## v2.34.1 (April 18, 2026)

**Fix: scan:infer FK detection for inline REFERENCES and ALTER TABLE**

- Added inline REFERENCES detection (`column UUID REFERENCES table(col)`) to DDL parser
- Added ALTER TABLE ADD COLUMN REFERENCES detection for migration files
- Schema-qualified references (`auth.users`) resolved to table name only
- Tested on MathPivot TutorOS: 109 tables, 1,402 columns, 225 FKs detected (previously 0)

## v2.34.0 (April 18, 2026)

**Feature: scan:infer — schema-to-pack inference engine**

New command: `realitydb scan:infer <schema.sql>`

Reads SQL DDL files (CREATE TABLE statements) and auto-generates a ready-to-run pack JSON with three tiers of inference:

- Tier 1 (auto-applied): Table/column/type detection, PK/FK parsing, topological sort, strategy inference from column names and types
- Tier 2 (heuristic, flagged for review): Lifecycle detection (status + nullable _at columns), temporal pair detection (created_at + other _at), enum defaults for common column names, cardinality ratio heuristics
- Tier 3 (review manifest): Domain-specific enum values, distribution weights, correlation rules

Outputs pack JSON + REVIEW.md manifest. Proven on Banking (17 tables, 15 FKs) and MathPivot (109 tables, 225 FKs, 66 temporal pairs) in under 50ms.

## v2.33.1 (April 18, 2026)

**Feature: comply report — HTML compliance reports**

New subcommand group: `realitydb comply report`

- Generates self-contained HTML compliance reports against regulatory frameworks
- Four frameworks: HIPAA Safe Harbor (45 CFR §164.514(b)), GDPR Pseudonymization (Article 4(5)), PCI DSS (Requirement 3), SOC 2 (TSC CC6.1/CC6.7)
- Reports include: metadata grid, overall score, pillar breakdowns (fidelity/structure/privacy), PII findings table, HIPAA 18 identifier checklist, framework methodology, disclaimer
- Print to PDF via browser
- JSON output option: `--json`
- Mpingo Systems LLC branding in footer

## v2.33.0 (April 18, 2026)

**Feature: assess — synthetic data quality assessment engine**

New command: `realitydb assess <file>`

Three-pillar quality assessment with 12 individual metrics:

Fidelity: completeness, distribution diversity (Shannon entropy), correlation stability (Pearson)

Structure: FK integrity (cross-table validation), PK uniqueness, temporal logic (created_at < other _at), enum validity, cardinality ratios

Privacy: k-anonymity (quasi-identifier grouping), exact match rate, PII column detection (10 patterns), sensitive value uniqueness

- Standards presets: generic, hipaa, gdpr, pci
- Report ID generation (RDB-ASSESS-YYYYMMDD-xxxx)
- Dataset hash (SHA-256)
- Methodology version: SQR v1.0
- Disclaimer included in every report
- JSON output with `--json` and `--output` options

## v2.32.6 (April 18, 2026)

**Feature: diff — dataset comparison**

New command: `realitydb diff <left> <right>`

- Compares two SQL datasets: tables added/removed, column changes, row count deltas, distribution shifts (top value changes on categorical columns), FK relationship changes
- Breaking vs cosmetic classification
- Exit code 1 if breaking changes detected (CI/CD integration)
- JSON output with `--json`

## v2.32.5 (April 18, 2026)

**Feature: profile — statistical dataset profiling**

New command: `realitydb profile <file>`

- Per-column analysis: data type, null percentage, uniqueness ratio, distribution shape (uniform/skewed/bimodal/constant/unique), top-N values with frequencies
- Numeric summary: min, max, mean, median
- Watermark and certification detection
- Table filtering with `--table <name>`
- JSON output with `--json`

## v2.32.4 (April 18, 2026)

**Feature: pii-scan — PII pattern detection**

New command: `realitydb pii-scan <file>`

- 46 PII patterns across free (10) and full tiers
- Name-based matching (column name regex) + value-based matching (sample data regex)
- HIPAA Safe Harbor 18 identifier check with `--hipaa` flag
- Exit code 1 if PII found (CI/CD integration)
- JSON output with `--json`

**Fix: CVV/CVC false positive** — removed overly broad `\d{3,4}` value regex that matched UUIDs, timestamps, and amounts (56 false positives → 0)

## v2.32.3 (April 18, 2026)

**Feature: doctor — pack diagnosis and auto-fix**

New command: `realitydb doctor --pack <file>`

- Format detection: studio-v4, studio-export, cli-object, empty, unknown
- Six diagnostic checks: Format Compatibility, FK References, Date Strategies, Generator Strategies, Enum Values, Duplicate Names
- Auto-fix with `--fix`: converts studio-v4 → studio-export format, infers missing strategies
- Solves the FK format mismatch (`fkTarget.tableId/columnId` vs `foreignKey.table/column`)

## v2.32.2 (April 18, 2026)

**Feature: Ed25519 cryptographic certification system**

New commands: `realitydb certify <file>`, `realitydb verify <file>`

- Ed25519 public key embedded in CLI binary
- Two watermark modes: signed (with `REALITYDB_SIGNING_KEY` env var) and unsigned (basic content hash)
- Auto-watermark on every `realitydb run --format sql` output
- Detached certificate file (`.realitydb-cert.json`) with signature, content hash, generator metadata
- Tamper detection: content hash verification catches any post-certification modifications
- Four verification checks: signature, content hash, generator identity, key ID

**Fix: Content hash verification** — three iterations to fix the strip regex in verify.ts (greedy match consumed entire file, trimEnd() removed trailing newline that was part of hashed content)

**Fix: PII check logic** — changed `pii_masked !== undefined` to `pii_masked === true` (only flags when masking was claimed but not done)
