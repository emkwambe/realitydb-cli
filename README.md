# RealityDB CLI

Schema-aware synthetic data generation, quality assessment, and compliance tooling.

> Generate production-quality synthetic datasets from any database schema — with lifecycle rules, temporal ordering, FK integrity, and cryptographic certification. No real data needed.

```bash
npm install -g @realitydb/cli
```

## Quick start (5 commands, 2 minutes)

```bash
# 1. Scan your schema → auto-generate a pack template
realitydb scan:infer schema.sql

# 2. Validate the pack
realitydb doctor --pack my-pack.json --fix

# 3. Generate synthetic data
realitydb run --pack my-pack.json --rows 5000 --format sql -o data.sql

# 4. Assess quality (fidelity, structure, privacy)
realitydb assess data.sql

# 5. Generate a compliance report
realitydb comply report --file data.sql --framework hipaa -o report.html
```

## What it does

RealityDB generates synthetic data that respects your schema's relational intelligence — foreign key chains, lifecycle rules (status + closed_at), temporal ordering (settled_at after created_at), weighted enum distributions, and realistic cardinality ratios.

The `scan:infer` command reads your DDL (CREATE TABLE statements, Supabase migrations, or any SQL schema) and auto-generates a ready-to-run pack JSON with three tiers of inference:

- **Tier 1 (auto-applied):** PKs, FKs, topological sort, strategy from column names/types
- **Tier 2 (heuristic):** Lifecycle rules, temporal pairs, enum defaults, cardinality ratios
- **Tier 3 (review):** Domain-specific enums, distribution weights, correlation rules

Proven on real production schemas: 109 tables, 1,402 columns, 225 foreign keys scanned in 49ms.

## Commands (~52 total)

### Schema & generation

| Command | What it does |
|---------|-------------|
| `scan:infer <schema.sql>` | Infer a pack JSON from DDL — lifecycle, temporal, FK detection |
| `run --pack <file>` | Generate synthetic data (SQL, CSV, JSON) |
| `doctor --pack <file>` | Diagnose + auto-fix pack issues |
| `validate --pack <file>` | Validate pack against engine requirements |
| `explain --pack <file>` | Explain what the engine will generate |
| `tune --pack <file>` | List tunable parameters |

### Quality assessment

| Command | What it does |
|---------|-------------|
| `assess <file>` | Quality score — fidelity, structure, privacy (3 pillars, 12 metrics) |
| `profile <file>` | Statistical profiling — types, nulls, distributions, numerics |
| `diff <left> <right>` | Compare two datasets — schema, row counts, distributions |
| `pii-scan <file>` | Detect PII patterns (46 patterns, HIPAA 18 identifier check) |

### Compliance & certification

| Command | What it does |
|---------|-------------|
| `comply report` | HTML compliance report (HIPAA, GDPR, PCI DSS, SOC 2) |
| `certify <file>` | Ed25519 cryptographic dataset certification |
| `verify <file>` | Verify certificate + tamper detection |

### SimLab (disposable databases)

14 commands for creating, connecting, querying, snapshotting, and sharing Neon PostgreSQL sandboxes.

## Assessment output

```
🧪 RealityDB Assessment Report
════════════════════════════════════════════════
   🟢 OVERALL SCORE: 92/100

   ✅ Fidelity: 88/100
   ✅ Structure: 94/100
   ⚠️  Privacy: 89/100

   Methodology: SQR v1.0
════════════════════════════════════════════════
```

## Compliance reports

```bash
realitydb comply report --file data.sql --framework hipaa -o report.html
```

Generates self-contained HTML reports for HIPAA Safe Harbor, GDPR, PCI DSS, and SOC 2. Open in browser, print to PDF.

## Cryptographic certification

Every SQL output includes a content hash watermark. With a signing key, datasets get Ed25519 signatures with full tamper detection.

## Links

- [realitydb.dev](https://realitydb.dev) | [studio.realitydb.dev](https://studio.realitydb.dev) | [sandbox.realitydb.dev](https://sandbox.realitydb.dev)
- [GitHub](https://github.com/emkwambe/realitydb-cli) | [npm](https://www.npmjs.com/package/@realitydb/cli)

*Mpingo Systems LLC — Precision Tools. African Roots.*
