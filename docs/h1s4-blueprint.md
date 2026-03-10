# RealityDB H1-S4 — Premium Domain Templates

**Project:** RealityDB — Developer Reality Platform  
**Horizon:** 1 — Developer Adoption  
**Sprint:** H1-S4 — Fintech + Healthcare Domain Templates  
**Status:** DRAFT  
**Depends on:** H1-S3 (COMPLETE ✅ — capture/share/load, realitydb@0.3.0)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Add two high-value domain templates that demonstrate RealityDB's depth and become future revenue candidates. After this sprint, `realitydb seed --template fintech` and `realitydb seed --template healthcare` produce domain-realistic data.

---

## What Must Be True After This Sprint

1. `realitydb templates` lists 5 templates: saas, ecommerce, education, fintech, healthcare.
2. `realitydb seed --template fintech --records 200 --seed 42` produces realistic financial data.
3. `realitydb seed --template healthcare --records 200 --seed 42` produces realistic medical data.
4. Both templates have realistic weighted distributions matching real-world patterns.
5. Test fixture SQL files exist for both schemas.
6. Version bumped to 0.4.0.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Fintech template | `packages/templates/src/domains/fintech.ts` |
| D2 | Fintech test fixture | `tests/fixtures/fintech-seed.sql` |
| D3 | Healthcare template | `packages/templates/src/domains/healthcare.ts` |
| D4 | Healthcare test fixture | `tests/fixtures/healthcare-seed.sql` |
| D5 | Register both in default registry | `packages/templates/src/registry.ts` |
| D6 | Version bump to 0.4.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/registry.ts,
      packages/templates/src/domains/saas.ts, packages/templates/src/domains/ecommerce.ts,
      packages/templates/src/domains/education.ts,
      packages/generators/src/distributions.ts,
      packages/generators/src/primitives/index.ts,
      packages/shared/src/planTypes.ts,
      docs/architecture-guardrails.md

CONTEXT:
RealityDB v0.3.0 has 3 templates (saas, ecommerce, education). The template
system is proven and extensible. Now we add fintech and healthcare as
high-value domain templates.

OBJECTIVE:
Build fintech and healthcare domain templates with realistic distributions.

REQUIREMENTS:

--- Fintech Schema Fixture ---

1. tests/fixtures/fintech-seed.sql:

   CREATE TABLE accounts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     account_number VARCHAR(20) NOT NULL UNIQUE,
     account_type VARCHAR(50) NOT NULL,
     owner_name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL,
     balance_cents BIGINT NOT NULL DEFAULT 0,
     currency VARCHAR(3) NOT NULL DEFAULT 'USD',
     status VARCHAR(50) NOT NULL DEFAULT 'active',
     opened_at TIMESTAMP NOT NULL DEFAULT now(),
     closed_at TIMESTAMP
   );

   CREATE TABLE transactions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     account_id UUID NOT NULL REFERENCES accounts(id),
     transaction_type VARCHAR(50) NOT NULL,
     amount_cents BIGINT NOT NULL,
     currency VARCHAR(3) NOT NULL DEFAULT 'USD',
     description VARCHAR(255),
     status VARCHAR(50) NOT NULL DEFAULT 'completed',
     reference_id VARCHAR(100),
     created_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE fraud_alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     transaction_id UUID NOT NULL REFERENCES transactions(id),
     alert_type VARCHAR(100) NOT NULL,
     severity VARCHAR(20) NOT NULL DEFAULT 'medium',
     status VARCHAR(50) NOT NULL DEFAULT 'open',
     description TEXT,
     created_at TIMESTAMP NOT NULL DEFAULT now(),
     resolved_at TIMESTAMP
   );

   CREATE TABLE settlements (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     transaction_id UUID NOT NULL REFERENCES transactions(id),
     settlement_type VARCHAR(50) NOT NULL,
     amount_cents BIGINT NOT NULL,
     status VARCHAR(50) NOT NULL DEFAULT 'pending',
     settled_at TIMESTAMP,
     created_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE chargebacks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     transaction_id UUID NOT NULL REFERENCES transactions(id),
     reason VARCHAR(255) NOT NULL,
     amount_cents BIGINT NOT NULL,
     status VARCHAR(50) NOT NULL DEFAULT 'open',
     filed_at TIMESTAMP NOT NULL DEFAULT now(),
     resolved_at TIMESTAMP
   );

--- Fintech Template ---

2. packages/templates/src/domains/fintech.ts — export fintechTemplate

   Target tables:
   - accounts / *account* → account entity
   - transactions / *transaction* / *transfer* → transaction entity
   - fraud_alerts / *fraud* / *alert* → fraud alert entity
   - settlements / *settlement* → settlement entity
   - chargebacks / *chargeback* / *dispute* → chargeback entity

   Column overrides for accounts:
   - account_type → { kind: "enum",
       values: ["checking", "savings", "investment", "credit", "business"],
       weights: [0.35, 0.25, 0.15, 0.15, 0.10] }
   - balance_cents → { kind: "money", min: 0, max: 5000000 }
   - currency → { kind: "enum", values: ["USD", "EUR", "GBP", "CAD", "JPY"],
       weights: [0.55, 0.20, 0.10, 0.08, 0.07] }
   - status → { kind: "enum",
       values: ["active", "frozen", "closed", "pending_review"],
       weights: [0.82, 0.05, 0.08, 0.05] }
   - owner_name → { kind: "full_name" }
   - email → { kind: "email" }
   - account_number → { kind: "text", mode: "short" }

   Column overrides for transactions:
   - transaction_type → { kind: "enum",
       values: ["deposit", "withdrawal", "transfer", "payment", "refund", "fee"],
       weights: [0.25, 0.20, 0.20, 0.20, 0.10, 0.05] }
   - amount_cents → { kind: "money", min: 100, max: 500000 }
   - status → { kind: "enum",
       values: ["completed", "pending", "failed", "reversed", "held"],
       weights: [0.78, 0.08, 0.05, 0.04, 0.05] }
   - description → { kind: "text", mode: "short" }

   Column overrides for fraud_alerts:
   - alert_type → { kind: "enum",
       values: ["unusual_amount", "velocity_check", "geo_mismatch", "duplicate_transaction", "account_takeover"],
       weights: [0.30, 0.25, 0.20, 0.15, 0.10] }
   - severity → { kind: "enum",
       values: ["low", "medium", "high", "critical"],
       weights: [0.20, 0.40, 0.30, 0.10] }
   - status → { kind: "enum",
       values: ["open", "investigating", "resolved_fraud", "resolved_legitimate", "escalated"],
       weights: [0.25, 0.20, 0.30, 0.15, 0.10] }

   Column overrides for settlements:
   - settlement_type → { kind: "enum",
       values: ["standard", "expedited", "batch", "real_time"],
       weights: [0.50, 0.20, 0.20, 0.10] }
   - amount_cents → { kind: "money", min: 100, max: 500000 }
   - status → { kind: "enum",
       values: ["pending", "processing", "completed", "failed"],
       weights: [0.15, 0.10, 0.70, 0.05] }

   Column overrides for chargebacks:
   - reason → { kind: "enum",
       values: ["unauthorized", "product_not_received", "product_defective", "duplicate_charge", "subscription_canceled", "other"],
       weights: [0.25, 0.20, 0.15, 0.15, 0.15, 0.10] }
   - amount_cents → { kind: "money", min: 500, max: 200000 }
   - status → { kind: "enum",
       values: ["open", "under_review", "won", "lost", "expired"],
       weights: [0.20, 0.25, 0.30, 0.15, 0.10] }

--- Healthcare Schema Fixture ---

3. tests/fixtures/healthcare-seed.sql:

   CREATE TABLE patients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     mrn VARCHAR(20) NOT NULL UNIQUE,
     first_name VARCHAR(100) NOT NULL,
     last_name VARCHAR(100) NOT NULL,
     date_of_birth DATE NOT NULL,
     gender VARCHAR(20) NOT NULL,
     email VARCHAR(255),
     phone VARCHAR(50),
     insurance_provider VARCHAR(255),
     registered_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE providers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     npi VARCHAR(20) NOT NULL UNIQUE,
     first_name VARCHAR(100) NOT NULL,
     last_name VARCHAR(100) NOT NULL,
     specialty VARCHAR(100) NOT NULL,
     department VARCHAR(100),
     email VARCHAR(255) NOT NULL,
     active BOOLEAN NOT NULL DEFAULT true
   );

   CREATE TABLE encounters (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     patient_id UUID NOT NULL REFERENCES patients(id),
     provider_id UUID NOT NULL REFERENCES providers(id),
     encounter_type VARCHAR(50) NOT NULL,
     status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
     chief_complaint TEXT,
     scheduled_at TIMESTAMP NOT NULL DEFAULT now(),
     checked_in_at TIMESTAMP,
     discharged_at TIMESTAMP
   );

   CREATE TABLE diagnoses (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     encounter_id UUID NOT NULL REFERENCES encounters(id),
     icd_code VARCHAR(20) NOT NULL,
     description VARCHAR(255) NOT NULL,
     diagnosis_type VARCHAR(50) NOT NULL DEFAULT 'primary',
     diagnosed_at TIMESTAMP NOT NULL DEFAULT now()
   );

   CREATE TABLE billing (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     encounter_id UUID NOT NULL REFERENCES encounters(id),
     cpt_code VARCHAR(20) NOT NULL,
     description VARCHAR(255) NOT NULL,
     amount_cents INTEGER NOT NULL,
     insurance_covered_cents INTEGER NOT NULL DEFAULT 0,
     patient_responsibility_cents INTEGER NOT NULL DEFAULT 0,
     status VARCHAR(50) NOT NULL DEFAULT 'pending',
     billed_at TIMESTAMP NOT NULL DEFAULT now(),
     paid_at TIMESTAMP
   );

--- Healthcare Template ---

4. packages/templates/src/domains/healthcare.ts — export healthcareTemplate

   Target tables:
   - patients / *patient* → patient entity
   - providers / doctors / physicians / *provider* → provider entity
   - encounters / visits / appointments / *encounter* / *visit* → encounter entity
   - diagnoses / *diagnosis* / *diagnos* → diagnosis entity
   - billing / claims / charges / *bill* / *claim* → billing entity

   Column overrides for patients:
   - first_name → { kind: "first_name" }
   - last_name → { kind: "last_name" }
   - email → { kind: "email" }
   - phone → { kind: "phone" }
   - gender → { kind: "enum",
       values: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"],
       weights: [0.48, 0.48, 0.02, 0.01, 0.01] }
   - insurance_provider → { kind: "enum",
       values: ["Blue Cross", "Aetna", "UnitedHealth", "Cigna", "Humana", "Medicare", "Medicaid", "Self-Pay"],
       weights: [0.18, 0.15, 0.15, 0.12, 0.10, 0.12, 0.10, 0.08] }
   - mrn → { kind: "text", mode: "short" }
   - date_of_birth → { kind: "timestamp", mode: "past" }

   Column overrides for providers:
   - first_name → { kind: "first_name" }
   - last_name → { kind: "last_name" }
   - email → { kind: "email" }
   - specialty → { kind: "enum",
       values: ["Family Medicine", "Internal Medicine", "Pediatrics", "Cardiology",
                "Orthopedics", "Dermatology", "Neurology", "Psychiatry",
                "Emergency Medicine", "Radiology"],
       weights: [0.18, 0.15, 0.12, 0.10, 0.10, 0.08, 0.08, 0.07, 0.07, 0.05] }
   - department → { kind: "enum",
       values: ["Primary Care", "Surgery", "Emergency", "Specialty", "Diagnostics"],
       weights: [0.30, 0.20, 0.15, 0.25, 0.10] }
   - npi → { kind: "text", mode: "short" }
   - active → { kind: "boolean", trueWeight: 0.92 }

   Column overrides for encounters:
   - encounter_type → { kind: "enum",
       values: ["office_visit", "emergency", "telehealth", "procedure", "follow_up", "annual_checkup"],
       weights: [0.35, 0.08, 0.15, 0.12, 0.18, 0.12] }
   - status → { kind: "enum",
       values: ["completed", "scheduled", "in_progress", "canceled", "no_show"],
       weights: [0.55, 0.15, 0.10, 0.10, 0.10] }
   - chief_complaint → { kind: "enum",
       values: ["Headache", "Back pain", "Cough", "Chest pain", "Fatigue",
                "Fever", "Joint pain", "Shortness of breath", "Abdominal pain",
                "Skin rash", "Dizziness", "Annual checkup"],
       weights roughly even with slight emphasis on common complaints }

   Column overrides for diagnoses:
   - icd_code → { kind: "enum",
       values: ["J06.9", "M54.5", "I10", "E11.9", "J20.9",
                "R51.9", "M25.50", "Z00.00", "K21.0", "L30.9",
                "F41.1", "E78.5"],
       weights roughly even }
   - description → { kind: "enum",
       values: ["Acute upper respiratory infection", "Low back pain",
                "Essential hypertension", "Type 2 diabetes", "Acute bronchitis",
                "Headache", "Joint pain", "General adult medical exam",
                "Gastroesophageal reflux", "Dermatitis",
                "Generalized anxiety disorder", "Hyperlipidemia"] }
   - diagnosis_type → { kind: "enum",
       values: ["primary", "secondary", "admitting", "working"],
       weights: [0.60, 0.25, 0.08, 0.07] }

   Column overrides for billing:
   - cpt_code → { kind: "enum",
       values: ["99213", "99214", "99215", "99203", "99204",
                "99281", "99282", "99283", "99395", "99396"],
       weights: [0.25, 0.20, 0.10, 0.10, 0.08, 0.05, 0.05, 0.05, 0.06, 0.06] }
   - description → { kind: "enum",
       values: ["Office visit - established, low", "Office visit - established, moderate",
                "Office visit - established, high", "Office visit - new, low",
                "Office visit - new, moderate", "ED visit - low",
                "ED visit - moderate", "ED visit - high",
                "Preventive visit 18-39", "Preventive visit 40-64"] }
   - amount_cents → { kind: "money", min: 5000, max: 150000 }
   - insurance_covered_cents → { kind: "money", min: 0, max: 120000 }
   - patient_responsibility_cents → { kind: "money", min: 0, max: 50000 }
   - status → { kind: "enum",
       values: ["paid", "pending", "denied", "appealed", "partially_paid"],
       weights: [0.50, 0.20, 0.10, 0.05, 0.15] }

--- Register Both Templates ---

5. Update packages/templates/src/registry.ts: getDefaultRegistry() registers fintech and healthcare
6. Update packages/templates/src/domains/index.ts: export both new templates
7. Update packages/templates/src/index.ts if needed

--- No Cross-Domain Collisions ---

8. Verify NO pattern collisions between all 5 templates:
   - saas: users, plans, subscriptions, payments
   - ecommerce: customers, products, orders, order_items
   - education: teachers, classes, students, enrollments, grades, attendance
   - fintech: accounts, transactions, fraud_alerts, settlements, chargebacks
   - healthcare: patients, providers, encounters, diagnoses, billing

--- Version + Changelog ---

9. Bump version to 0.4.0
10. Update CHANGELOG.md:
    ## 0.4.0
    ### Features
    - Fintech domain template (accounts, transactions, fraud alerts, settlements, chargebacks)
    - Healthcare domain template (patients, providers, encounters, diagnoses, billing)
    - 5 domain templates total

CONSTRAINTS:
- Follow exact same DomainTemplate structure as existing templates
- No cross-domain pattern collisions
- All enum weights sum to approximately 1.0
- Do NOT modify existing templates
- Do NOT modify CLI commands (template system auto-discovers)
- Commit message: "feat: add fintech and healthcare domain templates"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify getDefaultRegistry() returns 5 templates
3. Verify no pattern collisions between templates
Report: build status, template list
```

---

## Sprint Checklist

```
## H1-S4 — Fintech + Healthcare Templates

### Fintech Schema (1 point)
- [ ] tests/fixtures/fintech-seed.sql contains 5-table schema

### Fintech Template (6 points)
- [ ] fintechTemplate exported
- [ ] Account types weighted (35% checking)
- [ ] Transaction types weighted (25% deposit)
- [ ] Fraud alert types weighted (30% unusual_amount)
- [ ] Settlement statuses weighted (70% completed)
- [ ] Chargeback reasons weighted realistically

### Healthcare Schema (1 point)
- [ ] tests/fixtures/healthcare-seed.sql contains 5-table schema

### Healthcare Template (6 points)
- [ ] healthcareTemplate exported
- [ ] Patient gender weighted (48/48/2/1/1)
- [ ] Insurance providers weighted realistically
- [ ] Provider specialties weighted (18% Family Medicine)
- [ ] Encounter types weighted (35% office_visit)
- [ ] Billing CPT codes weighted realistically

### Registration (2 points)
- [ ] getDefaultRegistry() returns 5 templates
- [ ] No cross-domain pattern collisions

### Architecture (1 point)
- [ ] All enum weights sum to ~1.0

### Version + Changelog (2 points)
- [ ] Version 0.4.0
- [ ] CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/21 PASS
Gate: ALL must be ✅ before npm publish 0.4.0
```
