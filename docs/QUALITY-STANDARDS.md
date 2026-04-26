# RealityDB Dataset Quality Standards

> **Classification:** Internal — Mpingo Systems LLC
> **Version:** 1.0
> **Date:** April 25, 2026
> **Rule:** NO dataset ships without meeting ALL 6 moats. Zero exceptions.
> **Rationale:** A customer only needs ONE counter-example to destroy our credibility.

---

## The 6 Dataset Moats

Every dataset we publish — in the CLI, R2 Store, SimLab, or Enterprise catalog — MUST demonstrate all 6 moats. If any moat fails, the dataset is NOT published.

### Moat 1: FK Integrity (100% referential integrity)

**Standard:** Every foreign key value in every child table references a real, existing row in the parent table. No orphaned records. No dangling references.

**How we verify:**
```bash
realitydb examine assess dataset.sql
# ✅ FK integrity: 100% (0/0)
```

**What failure looks like:**
- `orders.customer_id = 'abc-123'` but no `customers.id = 'abc-123'` exists
- A JOIN between parent and child returns fewer rows than the child table

**Why it matters:**
- Faker/Mockaroo generate random UUIDs for FK columns — JOINs return empty results
- Developers waste hours debugging "why does my query return 0 rows?"
- Our data works with `FOREIGN KEY REFERENCES` constraints enabled

**Counter-example risk:** "I loaded RealityDB data into PostgreSQL with FK constraints and it failed on INSERT. Your data doesn't have referential integrity."

---

### Moat 2: Temporal Ordering (causally ordered timestamps)

**Standard:** All date/timestamp columns follow real-world causality. Events that happen later have later timestamps. No time travel.

**Rules:**
- `created_at` < `updated_at` < `deleted_at`
- `diagnosis_date` < `treatment_start_date` < `treatment_end_date`
- `order_placed_at` < `shipped_at` < `delivered_at`
- `enrolled_date` < `first_dose_date` < `last_dose_date`
- Parent `created_at` ≤ child `created_at` (a child can't exist before its parent)

**How we verify:**
```bash
realitydb examine assess dataset.sql
# ✅ Temporal logic: X/X ordered correctly
```

**What failure looks like:**
- A patient's `treatment_end_date` is before their `treatment_start_date`
- An order's `shipped_at` is before its `created_at`

**Why it matters:**
- Real databases have temporal ordering — test data should too
- Time-series queries, event sourcing, and audit trails depend on it
- Analytics queries like "average time to ship" return negative values with disordered data

**Counter-example risk:** "Your healthcare data shows patients being treated before they were diagnosed. That's not realistic."

---

### Moat 3: Lifecycle State Machines (realistic state transitions)

**Standard:** Records follow realistic state transitions. Impossible states never occur.

**Rules:**
- A `cancelled` order NEVER has a `shipped_at` date
- A `deceased` patient has NO future appointments
- A `churned` subscription has NO future invoices
- A `completed` trial subject has NO `progressive_disease` after completion
- A `denied` claim has `amount_paid = 0`

**How we verify:**
- Manual inspection during Gate 4 (Generation & Inspection)
- Lifecycle rules in the pack JSON (`lifecycleRules` property)

**What failure looks like:**
- An order with `status = 'cancelled'` also has `shipped_at = '2025-03-15'`
- A patient with `vital_status = 'deceased'` has a future `follow_up_visit`

**Why it matters:**
- State machines are how real applications work
- QA teams test edge cases like "what happens when a cancelled order has shipping data?"
- Our data should exercise these edge cases correctly, not create impossible states

**Counter-example risk:** "Your data shows cancelled orders that were shipped. Real databases never have this. Your synthetic data is wrong."

---

### Moat 4: Cardinality Ratios (production-realistic parent:child ratios)

**Standard:** Parent-child table row counts follow realistic ratios from the domain. Not flat 1:1 everywhere.

**Rules:**
- Document the expected ratio for every FK relationship
- Ratios should be research-backed (e.g., CMS: avg 6.2 visits/patient/year)
- No table should have 0 rows
- Root tables (no FK) get more rows than child tables with FKs

**Research-backed targets:**

| Relationship | Ratio | Source |
|---|---|---|
| customers → orders | 1:3 to 1:10 | Shopify avg 4.2 orders/customer/year |
| orders → order_items | 1:2 to 1:5 | NRF avg basket size 3.1 items |
| users → sessions | 1:20 to 1:100 | Google Analytics benchmarks |
| users → audit_logs | 1:30 to 1:200 | SOC 2 audit logging |
| patients → appointments | 1:4 to 1:12 | CMS avg 6.2 visits/patient/year |
| patients → prescriptions | 1:5 to 1:20 | CDC avg 12.6 rx/person/year |
| subscribers → CDR | 1:30 to 1:100 | ITU benchmarks |
| sensors → readings | 1:100 to 1:10000 | Sampling frequency dependent |
| trials → subjects | 1:50 to 1:500 | Phase I-III enrollment |

**How we verify:**
```bash
# Check row distribution in generation output
# patients: 769 rows (root)
# diagnoses: 385 rows (refs: patients)  → 0.5:1 ratio
```

**What failure looks like:**
- Every table has exactly the same number of rows (flat 1:1)
- A patient table has 1,000 rows but the appointments table also has 1,000 rows (unrealistic: most patients have multiple appointments)

**Why it matters:**
- Real databases have skewed distributions
- SQL query performance depends on cardinality (query plans change)
- Analytics queries like "average orders per customer" need realistic ratios

**Counter-example risk:** "Every table in your dataset has exactly 500 rows. That's not how real databases work. There's no cardinality."

---

### Moat 5: Provenance & Certification (cryptographic proof of synthetic origin)

**Standard:** Every dataset embeds `_realitydb_meta` table proving it was synthetically generated. Optionally Ed25519 signed.

**What `_realitydb_meta` contains:**
- Generator version (e.g., `RealityDB CLI v2.37.7`)
- Generation timestamp
- Seed value (for reproducibility)
- Template name
- Dataset hash (SHA-256)

**How we verify:**
```bash
realitydb examine assess dataset.sql
# ✅ PII column detection: X PII-shaped column(s) — synthetic provenance verified
```

**What failure looks like:**
- No `_realitydb_meta` table in the SQL output
- The assess engine treats the data as potentially real (Privacy score drops)

**Why it matters:**
- Compliance teams need proof that test data is synthetic, not copied from production
- EU AI Act Article 10 requires documented data governance
- HIPAA requires evidence that PHI is not present in test environments
- Our assess engine uses provenance to correctly score privacy

**Counter-example risk:** "How do I prove to my auditor that this data is synthetic? There's no metadata or certification."

---

### Moat 6: Quality Score (SQR v1.0 independently assessed)

**Standard:** Every dataset scores ≥95/100 on the SQR v1.0 assessment. Privacy MUST be 100/100 for synthetic data.

**Score requirements:**

| Pillar | Minimum | Target |
|---|---|---|
| **Overall** | 95 | 100 |
| **Fidelity** | 90 | 100 |
| **Structure** | 95 | 100 |
| **Privacy** | 100 | 100 |

**How we verify:**
```bash
realitydb examine assess dataset.sql
# 🟢 OVERALL SCORE: 99/100
# ✅ Fidelity: 99/100
# ✅ Structure: 99/100
# ✅ Privacy: 100/100
```

**What failure looks like:**
- Overall score < 95
- Privacy < 100 (synthetic provenance not detected)
- Fidelity < 90 (distribution diversity low, completeness issues)

**Why it matters:**
- We're selling data quality — our own assessment must prove it
- Customers can run `realitydb examine assess` on our data and verify the score
- If our own data doesn't score well on our own tool, we have zero credibility

**Counter-example risk:** "I assessed your healthcare template with your own CLI and it scored 73/100. You claim 'production-quality' but your own tool disagrees."

---

## Additional Quality Gates (beyond the 6 moats)

### No Mock Placeholders

**Standard:** Zero occurrences of mock/placeholder strings in generated data.

**Forbidden patterns:**
- `mock_past_date_XXX`
- `mock_future_date_XXX`
- `mock_template_XXX`
- `mock_city_XXX`
- `mock_state_XXX`
- `mock_ip_XXX`
- `mock_number_XXX`
- `sample_text_XXX`

**How we verify:**
```bash
# Smoke test checks all 9 patterns per pack
grep -c "mock_" dataset.sql  # Must be 0
```

**Counter-example risk:** "Your data has values like 'mock_past_date_407'. This isn't real data, it's test stubs."

---

### Research-Backed Enum Distributions

**Standard:** Every enum column has weighted distributions backed by peer-reviewed research or regulatory data. No uniform random distributions.

**Rules:**
- Every enum MUST have a `weights` array
- Every enum MUST have a `_citation` field documenting the source
- Weights MUST sum to ~100 (±1)
- No uniform distributions unless the domain genuinely has equal probability

**How we verify:**
```bash
# Gate 2 check
node -e "..." # Lists all enums with WEIGHTED/UNIFORM status
# Weighted: 30 | Uniform: 0 | GATE 2: PASS
```

**Counter-example risk:** "Your transaction status distribution is perfectly uniform — 20% each for pending, completed, failed, refunded, cancelled. That's not how real payment systems work. Completed should be ~72%."

---

## The Publication Checklist

Before ANY dataset is published to R2, CLI, or Store:

- [ ] **Moat 1:** FK integrity 100%
- [ ] **Moat 2:** Temporal ordering verified
- [ ] **Moat 3:** Lifecycle states reviewed (no impossible states)
- [ ] **Moat 4:** Cardinality ratios documented and realistic
- [ ] **Moat 5:** `_realitydb_meta` watermark embedded
- [ ] **Moat 6:** Quality score ≥ 95/100, Privacy = 100/100
- [ ] **No mock placeholders** (9 patterns checked)
- [ ] **All enums weighted** with citations
- [ ] **Smoke test passes** (146+ tests, all green)
- [ ] **7-gate protocol completed** (all gates green)

**If ANY item fails: DO NOT PUBLISH.**

---

## Current Template Scorecard

| # | Template | Score | Moat 1 | Moat 2 | Moat 3 | Moat 4 | Moat 5 | Moat 6 | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | universal | 100 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (enum weights pending) |
| 2 | healthcare | 99 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 3 | oncology (v1) | 100 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 4 | supply-chain | 100 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 5 | telecom | 100 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 6 | fintech | 95 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 7 | banking | — | ✅ | ✅ | — | ⚠️ | ✅ | — | Published (needs re-assess) |
| 8 | iot-sensors | 96 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published |
| 9 | breast-cancer | 99 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (research-backed) |
| 10 | lung-cancer | 99 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (research-backed) |
| 11 | clinical-trial | 100 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (research-backed) |
| 12 | rwd-ehr | 99 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (research-backed) |
| 13 | immuno-oncology | 99 | ✅ | ✅ | — | ⚠️ | ✅ | ✅ | Published (research-backed) |

**Notes:**
- Moat 3 (Lifecycle): Not yet enforced in engine — requires lifecycle rule implementation
- Moat 4 (Cardinality): Assess engine reports "0/0" — cardinality measurement not yet implemented
- Older templates (1-8): Enum weights are UNIFORM — need research-backed weights
- Oncology v2 templates (9-13): ALL enums are research-backed with citations

---

## Honest Assessment of Current Gaps

We publish these templates because they meet Moats 1, 2, 5, and 6. But we acknowledge:

1. **Moat 3 (Lifecycle) is not enforced** — The engine doesn't check state machine rules. A cancelled order CAN have a shipped_at date. This is a known gap.

2. **Moat 4 (Cardinality) is not measured** — The assess engine reports "0/0 healthy" because it doesn't detect FK relationships in SQL. This needs an engine fix.

3. **Older templates lack research-backed enums** — Universal, healthcare, supply-chain, telecom, fintech, iot-sensors all have UNIFORM distributions. The oncology v2 templates are the standard to follow.

**Remediation plan:**
- [ ] Implement lifecycle rule enforcement in engine (P0)
- [ ] Add cardinality measurement to assess engine (P0)
- [ ] Backport research-backed enum weights to all 8 older templates (P1)
- [ ] Re-generate and re-upload all R2 templates after fixes (P1)

---

*Mpingo Systems LLC — Precision Tools built to stay.*
*"A customer only needs ONE counter-example. We give them ZERO."*
