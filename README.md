# RealityDB CLI

Generate production-realistic synthetic databases with verified FK integrity,
deterministic seeds, temporal ordering, and EU regulatory compliance documentation.

```bash
npm install -g @realitydb/cli
```

## What it does

RealityDB generates synthetic data that behaves like real data — not just looks like it.
Every foreign key points to a real parent row. Cancelled orders have `NULL shipped_at`.
`--seed 42` produces byte-identical output every time, on any machine.

Built for data engineers, ML teams, and EU compliance workflows.

---

## Built-in Packs

| Pack | Tables | Score | Domain |
|---|---|---|---|
| `eu-banking` | 11 | 99/100 | SEPA · PSD2 · MiFID II · KYC · AML — DORA compliant |
| `eu-healthcare` | 14 | 99/100 | ICD-10 · WHO ATC · EHDS · GDPR Article 9 |
| `eu-telecom` | 12 | 100/100 | BEREC · EECC · GDPR consent modeling |
| `fintech` | 9 | 99/100 | Customers · merchants · transactions · fraud alerts · KYC |
| `healthcare` | 14 | 100/100 | Hospital operations · billing · lab tests · insurance |
| `oncology` | 20 | 100/100 | Patients · diagnoses · treatments · clinical trials |
| `supply-chain` | 24 | 100/100 | Suppliers · inventory · shipments · demand forecasting |
| `telecom` | 21 | 99/100 | Subscribers · towers · usage · billing · churn |
| `universal` | 6 | 98/100 | Users · transactions · audit logs · API requests |

Quality scores verified by `realitydb examine assess` at 10K rows.

---

## Usage

```bash
# Generate to SQL
realitydb run --pack eu-banking --rows 50000 --format sql --seed 42 -o banking.sql

# Generate to JSON
realitydb run --pack fintech --rows 5000 --seed 42

# Generate to CSV (one file per table)
realitydb run --pack supply-chain --rows 10000 --format csv --seed 42

# Seed directly into PostgreSQL
realitydb seed --pack healthcare --rows 5000 \
  --connection postgresql://user:pass@localhost:5432/mydb \
  --create-tables

# Assess output quality
realitydb examine assess output.sql --pack eu-banking

# Assess for EU AI Act Article 10 bias
realitydb examine bias output.sql --pack eu-banking

# Sign and certify a dataset
realitydb attest sign output.sql --pack eu-banking --seed 42
```

---

## Commands

| Command | Description |
|---|---|
| `run` | Generate data to JSON, SQL, or CSV |
| `seed` | Generate and insert directly into PostgreSQL |
| `examine assess` | Quality assessment — FK integrity, distributions, structure |
| `examine bias` | EU AI Act Article 10(f) bias and coverage check |
| `attest sign` | Ed25519 certificate — provenance and reproducibility |
| `attest verify` | Verify a signed dataset certificate |
| `comply report` | Generate DORA / EU AI Act compliance documentation |
| `login` | Authenticate with your RealityDB account |
| `status` | Show current plan and usage |
| `logout` | Clear stored credentials |

---

## Deterministic Seeds

```bash
# These two runs produce byte-identical output
realitydb run --pack eu-banking --rows 10000 --seed 42 -o run1.sql
realitydb run --pack eu-banking --rows 10000 --seed 42 -o run2.sql
diff run1.sql run2.sql  # no differences
```

Same seed on any machine, any OS, any Node.js version — guaranteed identical output.
Required for DORA Article 9 audit trails and EU AI Act Article 10 provenance documentation.

---

## Dependent Column Strategies

Pack authors can define columns that derive their values from sibling columns:

```json
"name": {
  "strategy": "dependent_enum",
  "options": {
    "dependsOn": "category",
    "map": {
      "grocery": ["Metro Mart", "FreshGrove", "Daily Basket"],
      "healthcare": ["MedPlus Pharmacy", "HealthFirst Clinic"],
      "restaurant": ["Spice Garden", "Noodle Bar", "La Trattoria"]
    }
  }
}
```

```json
"email": {
  "strategy": "dependent_email",
  "options": {
    "derivesFrom": "full_name",
    "domains": ["gmail.com", "yahoo.com", "proton.me"]
  }
}
```

---

## Performance

| Pack | Tables | Rows | Speed |
|---|---|---|---|
| `fintech` | 9 | 1M | 50K rows/sec |
| `supply-chain` | 24 | 1M | 48K rows/sec |
| `oncology` | 20 | 1M | 50K rows/sec |

---

## EU Compliance

RealityDB generates compliance documentation alongside your synthetic data:

```bash
# DORA compliance report (Articles 6, 9, 10, 11, 12, 16)
realitydb comply report --pack eu-banking --standard dora -o dora-report.md

# EU AI Act Article 10 documentation
realitydb comply report --pack eu-banking --standard eu-ai-act -o ai-act-report.md
```

Reports include provenance chain, distribution citations, bias assessment,
and Ed25519 dataset certificate. Reproducible given the same seed.

---

## Links

- [SimLab](https://sandbox.realitydb.dev) — Spin up live PostgreSQL labs with RealityDB data
- [Data Store](https://sandbox.realitydb.dev/#data-store) — Download verified datasets
- [realitydb.dev](https://realitydb.dev) — Pricing, CLI docs, EU enterprise
- [GitHub](https://github.com/emkwambe/realitydb-cli) — Source code

---

## License

BSL-1.1 — Mpingo Systems LLC