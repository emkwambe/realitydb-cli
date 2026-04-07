# RealityDB Masterclass
## Synthetic Data for Business & Engineering

> **Price:** $10 (one-time) · **8 Modules** · **Template packs included**
> 
> Learn to generate production-realistic databases from scratch using RealityDB CLI.
> Each module follows a real business persona solving a real problem.

---

## Course Overview

This is not software documentation. Documentation teaches you what buttons to press. This course teaches you **when and why** — through the eyes of people who actually need synthetic data in their daily work.

By the end, you will:

- Generate production-realistic databases for any domain in under 60 seconds
- Reverse-engineer an existing database and regenerate it with better data
- Mask PII for GDPR/HIPAA compliance without losing data utility
- Simulate 12-month business timelines with controlled anomalies
- Share reproducible bug environments with your team
- Build reusable template libraries for your organization

**Prerequisites:** Basic SQL knowledge. A terminal. That's it.

**Setup:**

```bash
npm install -g @realitydb/cli
realitydb --version
```

---

## Module 1: Your First Synthetic Database

### Persona: Maya — Junior Backend Developer

Maya just joined a fintech startup. Her first ticket: "Seed the local dev database with realistic test data." The current dev DB has 3 rows in every table — hand-inserted by the previous developer. Every query returns the same 3 customers. Every test passes because there's no edge cases in 3 rows.

Maya needs 5,000 rows of realistic data. Today.

### What You'll Learn

- Installing and configuring RealityDB CLI
- Understanding RealityPack templates
- Generating data in JSON, SQL, and CSV formats
- Using `--seed` for reproducible output

### Exercise

```bash
# Step 1: Create a SaaS template from a preset
realitydb init --domain saas --quick

# Step 2: Inspect the template
realitydb pack:info --pack realitydb-saas-template.json
```

**Pause and read the output.** Notice the 6 tables, 5 FK relationships, and the enum distributions. This template defines *what* the database looks like. RealityDB decides *what goes in it*.

```bash
# Step 3: Generate 1,000 rows to JSON
realitydb run --pack realitydb-saas-template.json --rows 1000 -o maya-test.json

# Step 4: Generate SQL (what Maya actually needs)
realitydb run --pack realitydb-saas-template.json --rows 5000 \
  --format sql --drop-tables -o dev-seed.sql
```

Open `dev-seed.sql` in your editor. Notice:

- `DROP TABLE IF EXISTS` at the top (idempotent — safe to run multiple times)
- `CREATE TABLE` with FK constraints
- `INSERT` statements with realistic data: real-looking emails, weighted statuses (65% active, 15% cancelled), proper UUID references

```bash
# Step 5: Reproduce exactly
realitydb run --pack realitydb-saas-template.json --rows 5000 \
  --format sql --seed 42 -o dev-seed-v2.sql
```

Run it again with `--seed 42`. Compare the two files — they're identical. This is the foundation of reproducible testing.

### Maya's Takeaway

*"I can seed any dev environment in 10 seconds. And when someone asks 'what data are you testing with?', I can say: `--seed 42`. They run the same command, get the same data."*

### Challenge

Generate an e-commerce template with 10,000 rows in CSV format. How many files does it create? Why one per table?

```bash
realitydb init --domain ecommerce --quick
realitydb run --pack realitydb-ecommerce-template.json --rows 10000 --format csv
```

---

## Module 2: Why FK Integrity Matters

### Persona: Derek — QA Engineer

Derek's test suite has a problem: 40% of tests pass locally but fail in staging. The root cause? The local test database was hand-crafted with perfect data. Staging gets random data from a Faker script — and 8% of `order_items` reference `product_id`s that don't exist.

Derek needs test data where every foreign key is guaranteed valid.

### What You'll Learn

- How RealityDB resolves FK chains
- Topological sorting (dependency order)
- Why other tools produce orphan rows
- Validating templates with `pack:validate`

### Exercise

```bash
# Step 1: Use the SaaS template from Module 1
realitydb pack:info --pack realitydb-saas-template.json
```

Look at the FK relationships:

- `users.org_id` → `organizations`
- `subscriptions.org_id` → `organizations`
- `subscriptions.plan_id` → `plans`
- `invoices.subscription_id` → `subscriptions`
- `sessions.user_id` → `users`

RealityDB generates data in **topological order**: organizations first (root), then users (refs organizations), then subscriptions (refs organizations + plans), then invoices (refs subscriptions). Every FK reference points to a real parent row.

```bash
# Step 2: Generate and verify
realitydb run --pack realitydb-saas-template.json --rows 5000 --format sql -o fk-test.sql
```

Look at the output. Notice the table order in the SQL file matches the dependency chain. Root tables are created first, child tables last.

```bash
# Step 3: Validate a template
realitydb pack:validate --pack realitydb-saas-template.json
```

A valid pack shows `✅ Pack is valid!`. An invalid one shows specific errors: missing PKs, broken FK targets, enums without values.

### Derek's Takeaway

*"Zero orphan rows. Not 'usually zero' — actually zero. At 50K rows, at 500K rows. Every foreign key points to a real parent. My staging tests now match local because the data structure is guaranteed correct."*

### Challenge

What happens if you create a template with a circular FK reference (table A refs table B, table B refs table A)? Try it — create a minimal JSON template with a circular reference and run `pack:validate`.

---

## Module 3: Scaling to Production-Sized Datasets

### Persona: Priya — Performance Engineer

Priya's team is launching a new feature that queries the `orders` table. It works fine in dev with 1,000 rows. But production has 2.3 million orders. The query plan changes completely at scale — sequential scans become index scans, joins behave differently, memory pressure appears.

Priya needs 2 million rows of realistic order data to load-test against.

### What You'll Learn

- Generating large datasets (100K to 2M+ rows)
- Streaming JSON for memory efficiency
- Batch size tuning for database seeding
- Understanding row distribution across tables

### Exercise

```bash
# Step 1: Start with 10K to verify
realitydb run --pack realitydb-ecommerce-template.json --rows 10000 --format sql -o test-10k.sql

# Step 2: Scale to 100K
realitydb run --pack realitydb-ecommerce-template.json --rows 100000 --format sql -o test-100k.sql

# Step 3: Scale to 1M (use JSON for streaming)
realitydb run --pack realitydb-ecommerce-template.json --rows 1000000 -o test-1m.json
```

Notice the speed: RealityDB generates at 100K-210K rows/sec depending on schema complexity. A 1M row dataset takes about 5-10 seconds.

**Row distribution:** RealityDB doesn't put all 1M rows into one table. Root tables (no FK parents) get 2x the rows. Child tables get proportional shares. This mimics production patterns where `users` tables are larger than `order_items`.

```bash
# Step 4: Seed directly into PostgreSQL (Core tier)
realitydb seed --pack realitydb-ecommerce-template.json --rows 100000 \
  --connection postgresql://user:pass@localhost:5432/loadtest \
  --create-tables --drop-tables --batch-size 1000
```

**Batch size matters.** At 100K rows:

| Batch Size | Insert Speed |
|-----------|-------------|
| 100 | ~4,000 rows/sec |
| 500 | ~6,000 rows/sec |
| 1000 | ~13,000 rows/sec |

### Priya's Takeaway

*"I seeded 100K rows in 8 seconds with `--batch-size 1000`. My EXPLAIN plans now match production. The query that looked fine at 1K rows shows a full table scan at 100K — exactly what we see in prod."*

### Challenge

Generate 500K rows with the `--seed 42` flag. Then generate again with `--seed 42`. Verify the files are byte-identical. This is how you ensure reproducible load tests in CI.

---

## Module 4: Reverse-Engineering a Real Database

### Persona: Carlos — Data Engineer

Carlos inherited a legacy application with 30 database tables and zero documentation. No ERD, no schema docs, no test data scripts. He needs to understand the schema and generate realistic test data — without reading 50,000 lines of application code.

### What You'll Learn

- Scanning a live PostgreSQL database
- Auto-detection of FKs, PKs, and column types
- Strategy inference from column names
- Enriching scanned packs with real data distributions

### Exercise

**If you have a PostgreSQL database available:**

```bash
# Step 1: Scan your database
realitydb scan --connection postgresql://user:pass@localhost:5432/mydb -o my-schema.json

# Step 2: Inspect what was found
realitydb pack:info --pack my-schema.json
```

The scan discovers tables, columns, PKs, and FKs from `information_schema`. It infers generation strategies from column names: `email` → email strategy, `status` → enum, `price` → float with range.

```bash
# Step 3: Analyze for real distributions (Core tier)
realitydb analyze --connection postgresql://user:pass@localhost:5432/mydb -o strategies.json
```

Analyze goes deeper than scan — it samples actual data to detect:

- Enum values with real weights (`active: 85%, frozen: 11%, closed: 4%`)
- Numeric ranges from actual min/max
- Email and phone patterns
- Null rates per column

```bash
# Step 4: Generate from the scanned schema
realitydb run --pack my-schema.json --rows 5000 -o test-data.json
```

**If you don't have a database available**, use the supplied template:

```bash
# Use the supply chain template (24 tables, 27 FKs)
realitydb run --pack supply-chain-24-tables.json --rows 5000 --format sql -o supply-chain.sql
```

### Carlos's Takeaway

*"Two commands. `scan` gave me the ERD I never had. `analyze` told me the actual data patterns. I went from zero documentation to a complete test data pipeline in 15 minutes."*

### Challenge

Scan a database, generate 5,000 rows from the scanned pack, seed it back into a different database, then scan *that* database. Compare the two scanned packs — are they identical?

---

## Module 5: Direct Database Seeding

### Persona: Amara — DevOps Engineer

Amara manages 12 staging environments. Every Monday, developers complain: "My staging DB is empty." She's been manually running SQL scripts, but it takes 30 minutes per environment and the scripts are always outdated.

She needs a single command that populates any staging environment with fresh, realistic data.

### What You'll Learn

- The `seed` command and connection strings
- `--create-tables` and `--drop-tables` flags
- Batch size optimization
- The `reset` command for cleanup
- Building a seeding pipeline

### Exercise

```bash
# Step 1: Seed with table creation (fresh database)
realitydb seed --pack realitydb-saas-template.json --rows 10000 \
  --connection postgresql://user:pass@localhost:5432/staging \
  --create-tables --drop-tables --batch-size 500

# Step 2: Verify the data
psql -d staging -c "SELECT COUNT(*) FROM organizations;"
psql -d staging -c "SELECT status, COUNT(*) FROM subscriptions GROUP BY status;"
```

The `--drop-tables` flag makes it idempotent — run it every Monday morning and it replaces all data fresh.

```bash
# Step 3: Clean up when done
realitydb reset --pack realitydb-saas-template.json \
  --connection postgresql://user:pass@localhost:5432/staging --confirm
```

**Scripting for all 12 environments:**

```bash
#!/bin/bash
ENVS=("staging-1" "staging-2" "staging-3" "staging-4")
for ENV in "${ENVS[@]}"; do
  realitydb seed --pack template.json --rows 10000 \
    --connection "postgresql://user:pass@${ENV}.db.internal:5432/app" \
    --drop-tables --create-tables --batch-size 500 --seed 42
done
```

Same `--seed 42` across all environments = identical data everywhere.

### Amara's Takeaway

*"One cron job, every Monday at 6 AM. All 12 staging environments seeded with identical data in under 2 minutes. No more 'my staging is empty' tickets."*

### Challenge

Seed a database with 50K rows, then use `realitydb analyze` to verify the distributions match the template. Do the enum weights hold at scale?

---

## Module 6: PII Masking for Compliance

### Persona: James — Security Analyst

James's company just received a GDPR audit request. The auditor asks: "Does your staging environment contain real customer data?" James checks — it does. Names, emails, phone numbers, addresses. All copied from production six months ago.

He needs to mask all PII in staging within 24 hours, with an audit trail proving compliance.

### What You'll Learn

- PII detection across 16 categories
- Three compliance modes: GDPR, HIPAA, STRICT
- Dry-run before committing changes
- Audit log generation
- Deterministic masking with `--seed`

### Exercise

```bash
# Step 1: Scan for PII (dry run — no changes)
realitydb mask --connection postgresql://user:pass@localhost:5432/staging \
  --dry-run --mode gdpr
```

Read the output carefully. It shows:

- Which tables contain PII
- Which columns are flagged
- The category (Email, Phone, Full Name, etc.)
- Sample values from the actual data
- Row counts per column

```bash
# Step 2: Try HIPAA mode (catches more)
realitydb mask --connection postgresql://... --dry-run --mode hipaa

# Step 3: Try STRICT mode (catches everything)
realitydb mask --connection postgresql://... --dry-run --mode strict
```

GDPR catches personal data. HIPAA adds health records and SSNs. STRICT adds IPs, usernames, passwords, notes.

```bash
# Step 4: Apply masking with audit trail
realitydb mask --connection postgresql://user:pass@localhost:5432/staging \
  --confirm --mode gdpr -o gdpr-audit-2026-04.json --seed 42
```

The audit log contains: timestamp, compliance mode, every column masked, row counts, and the masking categories used. This is the document James hands to the auditor.

### James's Takeaway

*"From 'we have PII in staging' to 'here's the audit log proving we don't' — in 20 minutes. The `--dry-run` saved me from masking things I shouldn't have. The audit log has everything the auditor needs."*

### Challenge

Run mask in GDPR mode, then in STRICT mode on the same database. Compare the audit logs — which additional categories does STRICT catch?

---

## Module 7: Timeline Simulation

### Persona: Nadia — Data Scientist

Nadia is building a fraud detection model. She needs training data that shows: 11 months of normal activity, then a 2-week spike of fraudulent transactions in month 12. Real fraud data is too sparse (0.1% of transactions), too sensitive to share, and doesn't come with clean labels.

She needs 500K rows spanning 12 months with a controlled fraud spike.

### What You'll Learn

- Timeline generation with S-curve distribution
- Scenario injection (fraud spike, churn wave, holiday rush)
- Intensity levels
- Combining multiple scenarios
- Using simulated data for ML training

### Exercise

```bash
# Step 1: See available scenarios
realitydb simulate --list-scenarios
```

Six built-in scenarios, each targeting specific business patterns.

```bash
# Step 2: Generate a 12-month banking timeline
realitydb simulate --pack banking-template.json \
  --timeline 12-months --rows 50000 --format sql -o baseline.sql
```

No scenario yet — just 12 months of normal data with S-curve growth (slow start, acceleration, plateau).

```bash
# Step 3: Add a fraud spike
realitydb simulate --pack banking-template.json \
  --scenario fraud-spike --timeline 12-months --rows 50000 \
  --intensity high --format sql -o fraud-scenario.sql
```

Now 60% of fraud alerts are concentrated in a 2-week window around month 10. Risk scores are elevated. More alerts are marked `confirmed_fraud`.

```bash
# Step 4: Combine scenarios
realitydb simulate --pack banking-template.json \
  --scenario fraud-spike,payment-failures --timeline 12-months --rows 100000 \
  --intensity medium -o combined-crisis.json
```

Two scenarios stacked: fraud spike + payment failures. The payment failure rate jumps to 25% in a 1-month window while fraud spikes simultaneously.

### Nadia's Takeaway

*"I generated 500K rows of labeled fraud data in 30 seconds. The timeline looks realistic — S-curve growth, then a visible spike. My model can train on the normal period and detect the anomaly. And because it's deterministic (`--seed 42`), my training pipeline is reproducible."*

### Challenge

Generate a 6-month e-commerce timeline with `holiday-rush` and `churn-wave` combined. Examine the data — do the order volumes spike in Nov-Dec? Does churn peak in month 5?

---

## Module 8: Building a Complete Data Factory

### Persona: Kofi — Engineering Manager

Kofi's team has grown from 3 to 15 engineers. Each person sets up their own test data differently. Some use Faker scripts, some copy production snapshots, some hardcode JSON fixtures. There's no consistency, no reproducibility, and every new hire spends their first week figuring out how to get test data.

Kofi wants a single source of truth: a data factory that any engineer can use in 30 seconds.

### What You'll Learn

- Designing schemas with RealityDB Studio (AI-powered)
- Building a template library
- The capture/load workflow for bug reproduction
- Integrating into CI/CD pipelines
- Building organizational data standards

### Exercise

**Part 1: Design a schema from scratch using AI**

1. Go to `studio.realitydb.dev`
2. Click "Generate with AI"
3. Type: "Hospital management system with patients, doctors, appointments, billing, pharmacy, and lab results"
4. Select "Complex" (20-30 tables)
5. Wait for the AI to generate the schema
6. Review the tables on the canvas
7. Export as "Studio Pack"

```bash
# Generate data from the AI-designed schema
realitydb run --pack hospital-studio-pack.json --rows 10000 --format sql -o hospital.sql
```

One sentence → 20+ tables → 10,000 rows → ready to seed.

**Part 2: Build a template library**

```bash
# Create templates for each team
realitydb init --domain saas -o templates/saas.json --quick
realitydb init --domain ecommerce -o templates/store.json --quick
realitydb init --domain healthcare -o templates/health.json --quick

# List all packs in the templates directory
cd templates
realitydb pack
```

Store these in your team's git repo. Any engineer can generate data:

```bash
git pull
realitydb seed --pack templates/saas.json --rows 5000 \
  --connection postgresql://... --drop-tables --create-tables --seed 42
```

**Part 3: CI/CD integration**

```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @realitydb/cli
      - run: |
          realitydb run --pack templates/saas.json \
            --rows 1000 --seed 42 --format sql -o test-seed.sql
          psql -d test_db -f test-seed.sql
      - run: npm test
```

Same `--seed 42` on every CI run. Tests are deterministic. Failures are reproducible.

**Part 4: Bug reproduction pipeline**

```bash
# Engineer A finds a bug
realitydb capture --name bug-7743 --connection postgresql://staging... --safe

# Engineer A shares the file
# (via Slack, git, email — it's just JSON)

# Engineer B reproduces it
realitydb load bug-7743.realitydb-pack.json \
  --connection postgresql://localhost:5432/debug --drop-tables --confirm

# Engineer B has the exact same database state
```

### Kofi's Takeaway

*"One repo, four templates, one seed number. Every engineer gets identical data in 10 seconds. New hires are productive on day one. Bug reproduction went from 'works on my machine' to 'here's the pack file'. The data factory paid for itself in the first week."*

### Final Challenge

Build a complete data pipeline for your own project:

1. If you have an existing database → `scan` it → `analyze` it → enrich the template
2. If starting fresh → use Studio AI or `init` to create a template
3. Generate data → `seed` into your database
4. Add `mask` to your staging deployment pipeline
5. Store the template in git with a `--seed` in your CI config
6. Share the template with your team

You now have a repeatable, reproducible, compliance-ready data factory.

---

## Appendix: Included Template Packs

This course includes the following template packs (download from the course materials):

| Pack | Tables | FKs | Domain |
|------|--------|-----|--------|
| `starter-saas.json` | 6 | 5 | SaaS platform |
| `starter-ecommerce.json` | 6 | 6 | Online store |
| `starter-healthcare.json` | 6 | 5 | Medical system |
| `starter-education.json` | 6 | 5 | School system |
| `restaurant-14.json` | 14 | 13 | Restaurant chain |
| `supply-chain-24.json` | 24 | 27 | Supply chain & logistics |
| `banking-16.json` | 16 | 15 | Banking platform |
| `hospital-ai.json` | 20+ | varies | Hospital (AI-generated) |

---

## Appendix: Command Quick Reference

| Command | Tier | What It Does |
|---------|------|-------------|
| `init` | Free | Create template from preset |
| `run` | Free | Generate JSON/SQL/CSV |
| `generate` | Free | Alias for run |
| `export` | Free | Alias for run (output required) |
| `scan` | Free | DB → template |
| `pack` | Free | List packs |
| `pack:info` | Free | Inspect a pack |
| `pack:validate` | Free | Validate a pack |
| `upgrade` | Free | Open Stripe checkout |
| `status` | Free | Show tier info |
| `seed` | Core | Direct DB insert |
| `reset` | Core | Drop seeded tables |
| `mask` | Core | PII detection & masking |
| `analyze` | Core | Data-driven strategies |
| `simulate` | Core | Timeline + scenarios |
| `capture` | Core | Snapshot DB state |
| `load` | Core | Restore captured pack |
| `audit` | Core | Operation history |

---

*RealityDB Masterclass v1.0 · © 2026 Mpingo Systems LLC*

*"Other tools generate data that looks real. RealityDB generates data that behaves real."*
