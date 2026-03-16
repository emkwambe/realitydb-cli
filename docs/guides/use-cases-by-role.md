# RealityDB Use Cases by Role

## Backend Developer

### Problem
You're building a new microservice and need a database with realistic test data. You don't want to write seed scripts by hand, and you need the data to have correct foreign key relationships, realistic distributions, and proper temporal ordering.

### Solution
```bash
# Design your schema visually at studio.realitydb.dev
# Export the template, then:
realitydb run --pack my-service-template.json \
  --connection "postgresql://localhost:5432/my_service_dev" \
  --records 10000 --seed 42
```

In under 10 seconds, you have a fully populated database with:
- Correct FK relationships (every order references a real customer)
- Realistic enum distributions (not uniform random)
- Temporal ordering (shipped_at is always after created_at)
- Deterministic output (same seed = same data, every time)

### Why Not Faker/Factory?
Faker generates individual values. RealityDB generates **systems** — interconnected tables with relational integrity, lifecycle state machines, and temporal consistency. A faker-based seed script for 5 tables with FKs, lifecycle rules, and temporal deps would be 500+ lines of custom code. RealityDB does it with a JSON config.

---

## QA / Test Engineer

### Problem
You need consistent test fixtures across your team. Different developers have different local data, causing "works on my machine" failures. You also need to test edge cases like cancelled orders, failed payments, and expired subscriptions.

### Solution

**Consistent fixtures:**
```bash
# Same command, same seed = same data on every machine
realitydb run --pack qa-fixtures.json --connection $DB_URL --seed 42
```

**Edge cases via lifecycle rules:**
Your template can specify that 10% of orders are "returned" (with null shipped_at), 5% of payments are "failed", and 2% of subscriptions are "cancelled" (with null next_billing_at). These edge cases appear naturally in the generated data without manual scripting.

**CI integration:**
```yaml
- name: Setup test data
  run: realitydb run --pack fixtures/template.json --connection $DB_URL --seed 42
```

---

## Data Scientist / ML Engineer

### Problem
You need large-scale realistic datasets for model training, but you can't use production data due to privacy regulations. You need the data to have the same statistical properties (distributions, correlations, temporal patterns) as production without any real PII.

### Solution

**Generate privacy-safe training data:**
```bash
# 500K rows per table with realistic distributions
realitydb run --pack ml-training-template.json \
  --connection $DB_URL \
  --records 500000 --seed 42
```

**Or capture and anonymize production data:**
```bash
# Capture live data with PII masking
realitydb capture --name training-set-v3 --safe --safe-mode mask

# Load into your ML environment
realitydb load training-set-v3.realitydb-pack.json --confirm
```

The weighted distributions in your template ensure the training data has the same class imbalances as production — 90% completed transactions, 3% failed, 2% reversed — so your model trains on realistic proportions.

---

## Team Lead / Engineering Manager

### Problem
Your team wastes hours debugging production issues that can't be reproduced locally. Bug reports say "it fails in production" but nobody can recreate the exact data state. You also need a standard way to onboard new team members with realistic dev environments.

### Solution

**Bug Reproduction Packs:**
```bash
# Developer captures the production state (PII-safe)
realitydb capture --name bug-4821 --safe

# Shares the pack file with the team
# Any developer can reproduce:
realitydb load bug-4821.realitydb-pack.json --confirm
```

**Standard dev environment:**
```bash
# One command in the onboarding docs
realitydb run --pack team-dev-template.json --connection $DB_URL
```

New hires get a fully populated dev database in seconds instead of following a 20-step setup guide.

**ROI:** If your team has 10 developers spending 2 hours/week on data-related debugging and environment setup, that's 1,000 hours/year. At $75/hour, that's $75,000/year in engineering time. RealityDB reduces this to minutes.

---

## DevOps / Platform Engineer

### Problem
You need to provision realistic test environments for staging, load testing, and demo instances. Creating seed scripts for each environment is manual and brittle. You also need to ensure no PII leaks into non-production environments.

### Solution

**Environment provisioning:**
```bash
# Staging with 100K rows
realitydb run --pack prod-schema.json \
  --connection $STAGING_DB_URL \
  --records 100000 --seed 42

# Load testing with 2M rows
realitydb run --pack prod-schema.json \
  --connection $LOADTEST_DB_URL \
  --records 400000 --seed 99
```

**Demo environments:**
```bash
# Fresh demo for each customer
realitydb run --pack demo-template.json \
  --connection $DEMO_DB_URL \
  --records 5000 --seed $CUSTOMER_ID_HASH
```

**CI/CD pipeline:**
```yaml
stages:
  - name: Provision test DB
    run: |
      createdb test_${CI_BUILD_ID}
      realitydb run \
        --pack ./fixtures/template.json \
        --connection "postgresql://ci:ci@localhost:5432/test_${CI_BUILD_ID}" \
        --records 1000 --seed 42
  
  - name: Run tests
    run: npm test
  
  - name: Cleanup
    run: dropdb test_${CI_BUILD_ID}
```

---

## Compliance / Security Officer

### Problem
Development teams need production-like data for testing, but copying production data to dev/staging environments violates GDPR, HIPAA, and SOC2 policies. You need a way to give developers realistic data without exposing PII.

### Solution

**Privacy-safe data generation:**
RealityDB generates synthetic data that matches production schema and distributions without containing any real PII. The data is generated from strategies, not copied from production.

**Safe capture for debugging:**
When production data must be referenced (for bug reproduction), the `--safe` flag automatically detects and masks 16 categories of PII:
```bash
realitydb capture --name incident-report --safe --safe-mode mask
```

**Audit trail:**
```bash
realitydb audit verify capture-log.json    # Verify integrity
realitydb audit summary capture-log.json   # Compliance summary
```

**Compliance coverage:**
- GDPR: Synthetic data is not personal data. No data subject rights apply.
- HIPAA: No PHI in generated datasets. Safe Harbor method satisfied.
- SOC2: Audit trail for all data generation and capture operations.
- PCI DSS: No real card numbers, account numbers, or financial identifiers.
