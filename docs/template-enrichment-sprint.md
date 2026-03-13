# RealityDB Template Enrichment Sprint

**Project:** RealityDB — Developer Reality Platform  
**Sprint:** TE-1 — Template Enrichment  
**Status:** DRAFT  
**Depends on:** v1.3.1 bug fixes (lifecycle, template path, FK warnings)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)  
**Version:** 1.4.0

---

## Sprint Objective

Deepen all 5 domain templates from current 65-85% completeness to 90%+. Every template should make a developer think "this tool understands my domain." No new verticals — depth over width.

---

## Why This Matters

A developer who runs `realitydb seed --template saas` and doesn't see `invoices` or `organizations` thinks "this is a toy." A developer who sees invoices with realistic due dates, organizations with team members, and subscriptions with trial periods thinks "this understands my business." That's the difference between adoption and abandonment.

---

## Sprint Structure

This sprint is split into 5 sub-sprints (TE-1A through TE-1E), one per template. Each sub-sprint:

1. Updates the test fixture SQL schema
2. Enriches the template distributions
3. Adds new column overrides for new/existing columns
4. Maintains backward compatibility (old schemas still work)

**Critical constraint:** Templates must still match schemas that DON'T have the new tables. If someone has a `users` table without `status`, the template should generate data for columns that exist and skip columns that don't. This is the same principle as the v1.3.1 lifecycle fix.

---

## TE-1A — SaaS Template Enrichment (Priority 1)

### Updated Schema: tests/fixtures/saas-seed.sql

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  industry VARCHAR(100),
  employee_count INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  price_cents INTEGER NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
  failure_reason VARCHAR(255),
  paid_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Template Distribution Updates

```
organizations:
  industry → enum: ["Technology", "Healthcare", "Finance", "Education", "Retail", "Media", "Manufacturing", "Other"]
             weights: [0.25, 0.12, 0.12, 0.10, 0.10, 0.08, 0.08, 0.15]
  employee_count → integer: min=1, max=5000
  name → company_name
  slug → text (mode=short)

users:
  role → enum: ["owner", "admin", "member", "viewer"]
         weights: [0.05, 0.10, 0.70, 0.15]
  status → enum: ["active", "inactive", "suspended", "invited"]
           weights: [0.80, 0.08, 0.02, 0.10]
  last_login_at → timestamp (mode=recent)

plans:
  tier → enum: ["free", "starter", "professional", "business", "enterprise"]
         weights: [0.10, 0.30, 0.30, 0.20, 0.10]
  name → enum: ["Free", "Starter", "Professional", "Business", "Enterprise"]
  trial_days → enum: [0, 7, 14, 30]
               weights: [0.20, 0.15, 0.45, 0.20]
  is_active → boolean (trueWeight=0.90)

subscriptions:
  status → enum: ["active", "trialing", "past_due", "canceled", "paused"]
           weights: [0.60, 0.12, 0.08, 0.15, 0.05]

invoices:
  status → enum: ["paid", "open", "past_due", "void", "uncollectible"]
           weights: [0.70, 0.10, 0.08, 0.07, 0.05]
  amount_cents → money (min=0, max=500000)

payments:
  payment_method → enum: ["card", "bank_transfer", "paypal", "wire"]
                   weights: [0.65, 0.15, 0.12, 0.08]
  status → enum: ["succeeded", "failed", "pending", "refunded"]
           weights: [0.82, 0.08, 0.05, 0.05]
  failure_reason → enum: ["card_declined", "insufficient_funds", "expired_card", "processing_error", null]
                   weights: [0.30, 0.25, 0.20, 0.10, 0.15]
```

### Match Patterns Update

The SaaS template must also match:
- `organizations` / `*org*` / `teams` / `companies`
- `invoices` / `*invoice*` / `bills`
- Keep existing patterns for users, plans, subscriptions, payments

---

## TE-1B — E-commerce Template Enrichment (Priority 2)

### Updated Schema: tests/fixtures/ecommerce-seed.sql

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'US',
  lifetime_value_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  brand VARCHAR(100),
  sku VARCHAR(50) NOT NULL UNIQUE,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  ordered_at TIMESTAMP NOT NULL DEFAULT now(),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL,
  title VARCHAR(255),
  body TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Template Distribution Updates

```
customers:
  country → enum: ["US", "CA", "UK", "DE", "FR", "AU", "JP", "BR", "IN", "Other"]
            weights: [0.40, 0.08, 0.10, 0.08, 0.06, 0.05, 0.05, 0.04, 0.04, 0.10]
  city → enum: ["New York", "Los Angeles", "London", "Toronto", "Berlin", "Sydney", "Tokyo", "San Francisco", "Chicago", "Austin"]
  lifetime_value_cents → money (min=0, max=2000000)

categories:
  name → enum: ["Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys", "Beauty", "Food & Drink", "Automotive", "Office"]
         weights: [0.18, 0.16, 0.12, 0.10, 0.10, 0.08, 0.08, 0.06, 0.06, 0.06]
  slug → text (mode=short)

products:
  brand → enum: ["Acme", "NovaCore", "PeakGear", "CraftLine", "TrueForm", "EverBright", "Nexus", "Primewave", "Solidcraft", "Zenith"]
          weights even
  rating → float (min=1.0, max=5.0)
  review_count → integer (min=0, max=500)
  compare_at_price_cents → money (min=0, max=200000)

orders:
  status → enum: ["delivered", "shipped", "processing", "pending", "canceled", "returned"]
           weights: [0.40, 0.15, 0.12, 0.10, 0.13, 0.10]
  discount_cents → money (min=0, max=50000)

reviews:
  rating → enum: [5, 4, 3, 2, 1]
           weights: [0.35, 0.30, 0.15, 0.10, 0.10]
  title → text (mode=short)
  body → text (mode=medium)
  verified_purchase → boolean (trueWeight=0.75)
```

---

## TE-1C — Healthcare Template Enrichment (Priority 3)

### Updated Schema: tests/fixtures/healthcare-seed.sql

Add these tables to existing schema:

```sql
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  route VARCHAR(50) NOT NULL DEFAULT 'oral',
  prescribed_at TIMESTAMP NOT NULL DEFAULT now(),
  end_date TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  heart_rate INTEGER,
  temperature_f NUMERIC(4,1),
  weight_lbs NUMERIC(5,1),
  height_inches INTEGER,
  recorded_at TIMESTAMP NOT NULL DEFAULT now()
);
```

### Also enrich existing tables

```
patients:
  add blood_type → enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
                   weights: [0.34, 0.06, 0.09, 0.02, 0.03, 0.01, 0.38, 0.07]

encounters:
  add notes → text (mode=medium)
```

### Template Distribution Updates for New Tables

```
medications:
  medication_name → enum: ["Lisinopril", "Metformin", "Amlodipine", "Omeprazole", "Atorvastatin",
                           "Levothyroxine", "Metoprolol", "Albuterol", "Gabapentin", "Sertraline",
                           "Amoxicillin", "Ibuprofen"]
                    weights roughly even with slight emphasis on common prescriptions
  dosage → enum: ["5mg", "10mg", "20mg", "25mg", "40mg", "50mg", "100mg", "250mg", "500mg"]
  frequency → enum: ["once daily", "twice daily", "three times daily", "as needed", "every 6 hours", "at bedtime"]
              weights: [0.35, 0.25, 0.10, 0.15, 0.05, 0.10]
  route → enum: ["oral", "topical", "injection", "inhaled", "sublingual"]
          weights: [0.75, 0.08, 0.07, 0.06, 0.04]
  status → enum: ["active", "discontinued", "completed"]
           weights: [0.65, 0.20, 0.15]

vitals:
  systolic_bp → integer (min=90, max=180)
  diastolic_bp → integer (min=55, max=110)
  heart_rate → integer (min=50, max=120)
  temperature_f → float (min=96.0, max=103.0)
  weight_lbs → float (min=100, max=350)
  height_inches → integer (min=55, max=78)
```

---

## TE-1D — Fintech Template Enrichment (Priority 4)

### Column Additions to Existing Tables

Update tests/fixtures/fintech-seed.sql:

```sql
-- Add to accounts table
ALTER TABLE accounts ADD COLUMN routing_number VARCHAR(20);
ALTER TABLE accounts ADD COLUMN phone VARCHAR(50);

-- Add to transactions table
ALTER TABLE transactions ADD COLUMN fee_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN counterparty_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN category VARCHAR(100);
```

(Or recreate the full CREATE TABLE statements with new columns included)

### Template Distribution Updates

```
accounts:
  routing_number → text (mode=short)
  phone → phone

transactions:
  fee_cents → money (min=0, max=5000)
  counterparty_name → company_name
  category → enum: ["groceries", "restaurants", "transportation", "entertainment", "utilities",
                     "healthcare", "shopping", "travel", "education", "transfer", "salary", "investment"]
             weights: [0.12, 0.10, 0.08, 0.08, 0.07, 0.06, 0.10, 0.05, 0.04, 0.12, 0.10, 0.08]
```

---

## TE-1E — Education Template Enrichment (Priority 5)

### Column Additions to Existing Tables

Update tests/fixtures/education-seed.sql:

```sql
-- Add to students table
ALTER TABLE students ADD COLUMN date_of_birth DATE;
ALTER TABLE students ADD COLUMN gender VARCHAR(20);

-- Add to teachers table  
ALTER TABLE teachers ADD COLUMN phone VARCHAR(50);

-- Add to grades table
ALTER TABLE grades ADD COLUMN assignment_type VARCHAR(50) NOT NULL DEFAULT 'homework';
```

### Template Distribution Updates

```
students:
  date_of_birth → timestamp (mode=past)
  gender → enum: ["Male", "Female", "Non-binary"]
           weights: [0.49, 0.49, 0.02]

teachers:
  phone → phone

grades:
  assignment_type → enum: ["homework", "quiz", "test", "project", "participation", "final_exam"]
                    weights: [0.25, 0.20, 0.20, 0.15, 0.10, 0.10]
```

---

## Sprint Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/registry.ts,
      packages/templates/src/domains/saas.ts, packages/templates/src/domains/ecommerce.ts,
      packages/templates/src/domains/education.ts, packages/templates/src/domains/fintech.ts,
      packages/templates/src/domains/healthcare.ts,
      packages/generators/src/distributions.ts,
      packages/generators/src/primitives/index.ts,
      packages/shared/src/planTypes.ts,
      tests/fixtures/seed.sql, tests/fixtures/ecommerce-seed.sql,
      tests/fixtures/education-seed.sql, tests/fixtures/fintech-seed.sql,
      tests/fixtures/healthcare-seed.sql,
      docs/architecture-guardrails.md

CONTEXT:
RealityDB v1.3.x has 5 domain templates but an audit found they are 65-85%
complete. Developers expect deep domain realism. This sprint enriches all 5
templates to 90%+ completeness.

OBJECTIVE:
Enrich all 5 domain template schemas and distributions. Add missing tables
and columns that real applications need.

REQUIREMENTS:

--- SaaS Template (TE-1A) ---

1. Create tests/fixtures/saas-seed.sql (replaces old seed.sql for SaaS testing):
   - organizations(id, name, slug, industry, employee_count, created_at)
   - users(id, org_id FK→organizations, email, full_name, role, status, last_login_at, created_at)
   - plans(id, name, tier, price_cents, interval, trial_days, is_active)
   - subscriptions(id, org_id FK→organizations, plan_id FK→plans, status, trial_ends_at, current_period_start, current_period_end, started_at, canceled_at)
   - invoices(id, subscription_id FK→subscriptions, amount_cents, currency, status, due_date, paid_at, created_at)
   - payments(id, invoice_id FK→invoices, amount_cents, currency, payment_method, status, failure_reason, paid_at)

2. Update packages/templates/src/domains/saas.ts:
   - Add organizations config: industry weights (Technology 25%, Healthcare 12%, etc.), company_name, slug
   - Add users: role weights (owner 5%, admin 10%, member 70%, viewer 15%), status weights (active 80%, inactive 8%, suspended 2%, invited 10%)
   - Enrich plans: tier weights (free 10%, starter 30%, professional 30%, business 20%, enterprise 10%), trial_days weights
   - Update subscriptions: status weights (active 60%, trialing 12%, past_due 8%, canceled 15%, paused 5%)
   - Add invoices config: status weights (paid 70%, open 10%, past_due 8%, void 7%, uncollectible 5%)
   - Update payments: add payment_method weights (card 65%, bank_transfer 15%, paypal 12%, wire 8%), add failure_reason weights
   - Add match patterns for organizations (*org*, teams, companies) and invoices (*invoice*, bills)
   - Update targetTables to include organizations and invoices

3. Keep backward compatibility: if someone's schema has old users(id, email, full_name, created_at) without org_id/role/status, the template should still work — it only overrides columns that exist.

--- E-commerce Template (TE-1B) ---

4. Update tests/fixtures/ecommerce-seed.sql:
   - Add categories(id, name, slug, parent_id FK→categories)
   - Add reviews(id, product_id FK→products, customer_id FK→customers, rating, title, body, verified_purchase, created_at)
   - Add to customers: city, country, lifetime_value_cents
   - Add to products: category_id FK→categories, brand, compare_at_price_cents, rating, review_count
   - Add to orders: discount_cents

5. Update packages/templates/src/domains/ecommerce.ts:
   - Add categories config: name weights for 10 categories, slug
   - Add reviews config: rating weights (5-star: 35%, 4-star: 30%, etc.), verified_purchase trueWeight=0.75
   - Enrich customers: country weights (US 40%, CA 8%, UK 10%, etc.), city enum
   - Enrich products: brand enum with 10 fictional brands, rating float, review_count integer
   - Enrich orders: discount_cents money, status updated weights (delivered 40%, shipped 15%, etc.)
   - Add match patterns for categories (*categor*) and reviews (*review*)
   - Update targetTables to include categories and reviews

--- Healthcare Template (TE-1C) ---

6. Update tests/fixtures/healthcare-seed.sql:
   - Add medications(id, encounter_id FK→encounters, medication_name, dosage, frequency, route, prescribed_at, end_date, status)
   - Add vitals(id, encounter_id FK→encounters, systolic_bp, diastolic_bp, heart_rate, temperature_f, weight_lbs, height_inches, recorded_at)
   - Add to patients: blood_type
   - Add to encounters: notes

7. Update packages/templates/src/domains/healthcare.ts:
   - Add medications config: 12 common medication names weighted, dosage enum, frequency weights, route weights, status weights
   - Add vitals config: realistic vital sign ranges (systolic 90-180, diastolic 55-110, heart_rate 50-120, temp 96-103, weight 100-350, height 55-78)
   - Enrich patients: blood_type distribution matching real population (O+ 38%, A+ 34%, B+ 9%, etc.)
   - Add match patterns for medications (*medic*, *prescription*, *rx*) and vitals (*vital*, *measurement*)
   - Update targetTables to include medications and vitals

--- Fintech Template (TE-1D) ---

8. Update tests/fixtures/fintech-seed.sql:
   - Add to accounts: routing_number, phone
   - Add to transactions: fee_cents, counterparty_name, category

9. Update packages/templates/src/domains/fintech.ts:
   - Add phone strategy to accounts
   - Add transaction category weights (12 categories: groceries, restaurants, etc.)
   - Add counterparty_name as company_name
   - Add fee_cents as money (min=0, max=5000)

--- Education Template (TE-1E) ---

10. Update tests/fixtures/education-seed.sql:
    - Add to students: date_of_birth, gender
    - Add to teachers: phone
    - Add to grades: assignment_type

11. Update packages/templates/src/domains/education.ts:
    - Add student gender distribution (49/49/2)
    - Add assignment_type weights (homework 25%, quiz 20%, test 20%, project 15%, participation 10%, final_exam 10%)
    - Add teacher phone strategy

--- Registration ---

12. Verify getDefaultRegistry() still returns 5 templates — no new templates, just enriched existing ones

--- Version + Changelog ---

13. Bump version to 1.4.0

14. Update CHANGELOG.md:
    ## 1.4.0
    ### Template Enrichment
    - SaaS: added organizations, invoices tables; enriched users with role/status, plans with tiers, payments with methods
    - E-commerce: added categories, reviews tables; enriched customers with geography, products with brands/ratings
    - Healthcare: added medications, vitals tables; enriched patients with blood type
    - Fintech: enriched transactions with categories/fees, accounts with routing/phone
    - Education: enriched students with demographics, grades with assignment types

CONSTRAINTS:
- Templates must work with BOTH old and new schemas. If a column doesn't exist in the actual DB schema, the template override is silently skipped.
- No new domain templates — only enrich existing 5
- All enum weights must sum to approximately 1.0
- No cross-domain pattern collisions between templates
- Do NOT modify existing test fixtures in-place — create new versioned fixtures (saas-seed.sql, ecommerce-seed-v2.sql, etc.) OR update existing files with backward-compatible additions
- Commit message: "feat: enrich all 5 domain templates to 90% completeness"

VERIFICATION:
1. pnpm build — all packages compile
2. getDefaultRegistry() returns 5 templates
3. SaaS template targets 6+ tables (was 4)
4. E-commerce template targets 6 tables (was 4)
5. Healthcare template targets 7 tables (was 5)
6. No cross-domain pattern collisions
7. All enum weights sum to ~1.0
Report: build status, template target counts, total table configs per template
```

---

## Sprint Checklist

```
## TE-1 — Template Enrichment

### SaaS (8 points)
- [ ] saas-seed.sql has 6 tables (organizations, users, plans, subscriptions, invoices, payments)
- [ ] Organizations config with industry weights
- [ ] Users enriched with role + status weights
- [ ] Plans enriched with tier weights + trial_days
- [ ] Subscriptions status updated (added trialing, past_due, paused)
- [ ] Invoices config with status weights
- [ ] Payments enriched with payment_method + failure_reason
- [ ] SaaS template targets 6+ tables

### E-commerce (6 points)
- [ ] ecommerce-seed.sql has 6 tables (added categories, reviews)
- [ ] Categories config with 10 category names
- [ ] Reviews config with rating distribution + verified_purchase
- [ ] Customers enriched with country + city
- [ ] Products enriched with brand + rating + review_count
- [ ] E-commerce template targets 6 tables

### Healthcare (5 points)
- [ ] healthcare-seed.sql has 7 tables (added medications, vitals)
- [ ] Medications config with 12 drug names + dosage + frequency
- [ ] Vitals config with realistic ranges (BP, HR, temp, weight, height)
- [ ] Patients enriched with blood_type distribution
- [ ] Healthcare template targets 7 tables

### Fintech (3 points)
- [ ] fintech-seed.sql has enriched accounts + transactions columns
- [ ] Transaction category weights (12 categories)
- [ ] Fee and counterparty fields configured

### Education (3 points)
- [ ] education-seed.sql has enriched students + teachers + grades columns
- [ ] Student gender + date_of_birth configured
- [ ] Assignment type weights (6 types)

### Integration (3 points)
- [ ] getDefaultRegistry() returns 5 templates (no new templates)
- [ ] No cross-domain pattern collisions
- [ ] All enum weights sum to ~1.0

### Version + Changelog (2 points)
- [ ] Version 1.4.0
- [ ] CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/32 PASS
Gate: ALL must be ✅ before npm publish 1.4.0
```

---

## Post-Sprint Testing

After Claude Code completes, test locally:

```powershell
# Add new SaaS schema tables
Get-Content tests/fixtures/saas-seed.sql -Raw | docker exec -i databox-pg psql -U postgres -d databox_dev

# Seed with enriched SaaS template
realitydb reset --confirm
realitydb seed --template saas --records 100 --seed 42

# Verify new tables populated
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM organizations;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM invoices;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT tier, COUNT(*) FROM plans GROUP BY tier ORDER BY count DESC;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT payment_method, COUNT(*) FROM payments GROUP BY payment_method ORDER BY count DESC;"

# Test e-commerce enrichment
Get-Content tests/fixtures/ecommerce-seed.sql -Raw | docker exec -i databox-pg psql -U postgres -d databox_dev
realitydb reset --confirm
realitydb seed --template ecommerce --records 100 --seed 42
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM categories;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM reviews;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT rating, COUNT(*) FROM reviews GROUP BY rating ORDER BY rating DESC;"

# Test healthcare enrichment
Get-Content tests/fixtures/healthcare-seed.sql -Raw | docker exec -i databox-pg psql -U postgres -d databox_dev
realitydb reset --confirm
realitydb seed --template healthcare --records 100 --seed 42
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM medications;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT COUNT(*) FROM vitals;"
docker exec databox-pg psql -U postgres -d databox_dev -c "SELECT blood_type, COUNT(*) FROM patients GROUP BY blood_type ORDER BY count DESC;"
```

---

## What Comes After TE-1

After all 5 templates reach 90%+:

1. Publish v1.4.0 to npm
2. Update landing page template section with enriched table counts
3. Update README with enriched examples
4. THEN consider new verticals (logistics, legal) — but only at 90% depth from day one
