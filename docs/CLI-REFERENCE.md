# RealityDB CLI Reference
## Version 2.38 — July 2026
## 65 commands across 5 namespaces

Install: `npm install -g realitydb`
Verify:  `realitydb --version`

---

## Quick Reference — All 65 Commands

### Top-Level (39 commands)

| Command | Description | Tier |
|---------|-------------|------|
| `run` | Generate synthetic data from a pack | Free |
| `generate` | Alias for run | Free |
| `export` | Alias for run (output required) | Free |
| `init` | Create a new pack interactively | Free |
| `scan` | Reverse-engineer a PostgreSQL database into a pack | Free |
| `explain` | Show row distribution plan without generating | Free |
| `validate` | Validate a pack for schema integrity and FK references | Free |
| `pack` | List packs in current directory | Free |
| `pack:info` | Show detailed info about a pack | Free |
| `pack:validate` | Validate a pack file | Free |
| `rule:list` | Show lifecycle and temporal rules in a pack | Free |
| `convert` | Convert between data formats (JSON, CSV, SQL) | Free |
| `benchmark` | Measure generation speed for a pack | Free |
| `ci` | Generate CI/CD configuration for ephemeral databases | Free |
| `generate:template` | AI-generate a research-based pack | Free |
| `tune` | Tune enum weights in a pack | Free |
| `add` | Add lifecycle or temporal rules to a pack | Free |
| `audit:export` | Export audit log for compliance reporting | Free |
| `login` | Authenticate with API key | Free |
| `logout` | Clear authentication | Free |
| `status` | Show license status and plan details | Free |
| `upgrade` | Upgrade your plan via Stripe | Free |
| `audit` | View operation history | Core |
| `analytics` | Show usage analytics and compliance limits | Core |
| `menu` | Interactive guided navigation | Free |
| `seed` | Generate and insert directly into PostgreSQL | Core |
| `seed:supabase` | Generate Supabase-compatible seed.sql | Core |
| `seed:supabase` | Direct Supabase connection seeding | Core |
| `reset` | Drop tables created by seed | Core |
| `simulate` | Generate data across a timeline with scenarios | Core |
| `split` | Generate ML train/test/validation splits | Core |
| `anomaly` | Inject controlled labeled anomalies | Core |
| `analyze` | Analyze live data for strategy suggestions | Core |
| `mask` | Scan and mask PII in a PostgreSQL database | Core |
| `capture` | Capture database state for bug reproduction | Core |
| `load` | Load a captured pack into a database | Core |
| `examine` | Namespace: discovery and quality assessment | — |
| `comply` | Namespace: compliance and policy enforcement | — |
| `attest` | Namespace: certification and provenance | — |
| `lab` | Namespace: simulation lab | — |

### examine namespace (6 subcommands)
| Command | Description |
|---------|-------------|
| `examine assess` | Assess synthetic data quality — FK, temporal, enum, overall |
| `examine profile` | Statistical profiling of a SQL or CSV dataset |
| `examine diff` | Compare two SQL datasets — schema, row counts, distributions |
| `examine scan` | Infer a RealityDB pack from a SQL schema (DDL) file |
| `examine scan:supabase` | Infer a pack from a live Supabase database |
| `examine supabase` | Assess data quality of a live Supabase database |

### comply namespace (4 subcommands)
| Command | Description |
|---------|-------------|
| `comply scan` | Scan a SQL or CSV file for PII patterns |
| `comply report` | Generate a compliance report against a regulatory framework |
| `comply doctor` | Diagnose and fix pack issues |
| `comply temporal` | Detect and fix temporal ordering violations |

### attest namespace (2 subcommands)
| Command | Description |
|---------|-------------|
| `attest sign` | Generate an Ed25519 cryptographic certificate for a dataset |
| `attest verify` | Verify a dataset certificate |

### lab namespace (14 subcommands)
| Command | Description |
|---------|-------------|
| `lab create` | Create a disposable PostgreSQL database from a pack |
| `lab list` | List active labs |
| `lab connect` | Show connection string for a lab |
| `lab extend` | Extend a lab's TTL |
| `lab delete` | Destroy a lab and its database |
| `lab snapshot` | Create an immutable snapshot of a lab |
| `lab publish` | Publish a snapshot to the public gallery |
| `lab fork` | Fork a published lab from the gallery |
| `lab gallery` | Browse published labs |
| `lab snapshots` | List snapshots for a lab |
| `lab query:save` | Save a SQL query to a lab session |
| `lab query:list` | List saved queries for a lab |
| `lab query:run` | Execute a SQL query against a live lab |
| `lab share` | Generate a shareable connection string |

---

## Core Data Generation

### `realitydb run`

Generate synthetic data from a RealityPack JSON file.

```
realitydb run [options]

Options:
  --pack <file|name>     Pack JSON file path or built-in pack name
                         Built-in: fintech, healthcare, oncology,
                         supply-chain, telecom, universal
  --rows <n>             Number of rows to generate (default: 1000)
  --format <fmt>         Output format: json, sql, csv, parquet (default: json)
  --seed <n>             Deterministic seed for reproducible output
  -o, --output <file>    Output file path (required for --format sql/csv)
  --drop-tables          Prepend DROP TABLE IF EXISTS (SQL format)
  --schema-only          Output CREATE TABLE only, no INSERT statements
  --data-only            Output INSERT statements only, no CREATE TABLE
  --batch-size <n>       Rows per INSERT batch in SQL output (default: 500)
  --connection <url>     PostgreSQL connection string (inserts directly)
  --create-tables        Create tables before inserting (with --connection)
  -h, --help             Display help
```

Examples:
```bash
# Generate 50,000 rows of healthcare data to SQL
realitydb run --pack healthcare --rows 50000 --format sql \
  --seed 42 -o healthcare-50k.sql

# Generate fintech data and insert directly into PostgreSQL
realitydb run --pack fintech --rows 10000 \
  --connection "postgresql://user:pass@localhost:5432/mydb" \
  --create-tables --drop-tables

# Generate custom pack data to JSON
realitydb run --pack my-pack.json --rows 5000 -o my-data.json

# EU banking pack with deterministic seed (Article 10 audit trail)
realitydb run --pack eu-banking.json --rows 50000 --format sql \
  --seed 42 -o eu-banking-baseline.sql
```

EU compliance note: Always use --seed N for datasets used in AI training.
The seed value must be recorded in your Article 10(b) provenance documentation.

---

### `realitydb generate` / `realitydb export`

Aliases for `run`. `export` requires an output file.

```bash
realitydb generate --pack healthcare.json --rows 1000 -o data.json
realitydb export --pack healthcare.json --rows 1000 --format sql -o data.sql
```

---

### `realitydb init`

Create a new RealityPack interactively or from a domain preset.

```
realitydb init [options]

Options:
  --domain <name>    Domain preset: saas, ecommerce, healthcare, banking,
                     logistics, telecom, education
  --quick            Skip interactive prompts, use domain defaults
  --output <file>    Output pack file path (default: realitydb-pack.json)
  -h, --help         Display help
```

Examples:
```bash
# Interactive pack creation
realitydb init

# Quick SaaS pack
realitydb init --domain saas --quick

# Healthcare pack with custom output name
realitydb init --domain healthcare --output my-hospital-pack.json
```

---

### `realitydb explain`

Show the row distribution plan for a pack without generating data.
Useful for verifying cardinality ratios before a large generation run.

```
realitydb explain [options]

Options:
  --pack <file>      Pack JSON file path
  --rows <n>         Total rows to distribute (default: 1000)
  -h, --help         Display help
```

Example:
```bash
realitydb explain --pack healthcare.json --rows 50000
# Output:
# patients:          769 rows (root)
# diagnoses:         1538 rows (1:2 ratio)
# appointments:      3845 rows (1:5 ratio)
# prescriptions:     7690 rows (1:10 ratio)
```

---

### `realitydb seed`

Generate synthetic data and insert directly into a PostgreSQL database.

```
realitydb seed [options]

Options:
  --pack <file>          Pack JSON file path
  --rows <n>             Number of rows (default: 1000)
  --connection <url>     PostgreSQL connection string (required)
  --create-tables        Create tables before inserting
  --drop-tables          Drop existing tables before creating
  --batch-size <n>       Rows per INSERT batch (default: 100)
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
realitydb seed \
  --pack healthcare.json \
  --rows 10000 \
  --connection "postgresql://postgres:pass@localhost:5432/mydb" \
  --create-tables --drop-tables \
  --batch-size 500 \
  --seed 42
```

Connection string formats:
```
postgresql://user:password@host:port/database

Local:     postgresql://postgres:postgres@localhost:5432/mydb
Supabase:  postgresql://postgres.REF:PASS@aws-0-us-east-1.pooler.supabase.com:5432/postgres
Docker:    postgresql://postgres:postgres@localhost:54322/postgres
```

---

### `realitydb seed:supabase`

Generate Supabase-compatible seed data. Writes to supabase/seed.sql or
inserts directly via connection string.

```
realitydb seed:supabase [options]

Options:
  --pack <file>          Pack JSON file path
  --rows <n>             Number of rows
  --project-ref <ref>    Supabase project reference
  --output <file>        Output path (default: supabase/seed.sql)
  --connection <url>     Direct connection string (skips file output)
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
# Generate supabase/seed.sql
realitydb seed:supabase --pack fintech.json --rows 5000

# Direct Supabase insertion
realitydb seed:supabase \
  --pack fintech.json \
  --rows 5000 \
  --connection "postgresql://postgres.myref:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

---

### `realitydb reset`

Drop tables that were created by `seed`. Requires --confirm.

```
realitydb reset [options]

Options:
  --pack <file>          Pack JSON file path (to know which tables to drop)
  --connection <url>     PostgreSQL connection string
  --confirm              Required to execute (prevents accidental drops)
  -h, --help             Display help
```

Example:
```bash
realitydb reset \
  --pack healthcare.json \
  --connection "postgresql://postgres:pass@localhost:5432/mydb" \
  --confirm
```

---

### `realitydb simulate`

Generate data across a timeline with injected scenarios (anomalies, crises,
seasonal patterns). Produces time-series-aware data with causal ordering.

```
realitydb simulate [options]

Options:
  --pack <file>          Pack JSON file path
  --scenario <name>      Scenario to inject (see list below)
  --timeline <period>    Timeline: 12-months, 6-months, 4-weeks, 30-days
  --rows <n>             Total rows across the timeline
  --intensity <level>    Scenario intensity: low (1.5x), medium (3x), high (5x)
  --format <fmt>         Output format: json, sql, csv
  -o, --output <file>    Output file path
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Available scenarios:
```
fraud-spike          Burst of fraud alerts in a 2-week window
churn-wave           30% of subscriptions cancel in one month
holiday-rush         3x orders in Q4 with January drop
data-breach          Mass password resets and audit log spike
seasonal-enrollment  Registrations peak in Aug-Sep
payment-failures     Payment failure rate jumps to 25%
aml-investigation    Structuring pattern appears in transaction data
clinical-site-issue  Site performance degrades in month 8
```

Examples:
```bash
# 12-month SaaS timeline with churn wave
realitydb simulate \
  --pack fintech.json \
  --scenario churn-wave \
  --timeline 12-months \
  --rows 50000 \
  --intensity high \
  --format sql \
  -o churn-simulation.sql

# Combine two scenarios
realitydb simulate \
  --pack fintech.json \
  --scenario fraud-spike,payment-failures \
  --timeline 6-months \
  --rows 20000 \
  -o crisis-data.json
```

---

### `realitydb split`

Generate ML train/test/validation splits with FK integrity preserved.
All three splits reference the same parent rows, maintaining referential
integrity across the split boundary.

```
realitydb split [options]

Options:
  --pack <file>          Pack JSON file path
  --rows <n>             Total rows before splitting
  --train <pct>          Training set percentage (default: 70)
  --test <pct>           Test set percentage (default: 15)
  --validation <pct>     Validation set percentage (default: 15)
  --format <fmt>         Output format: json, sql, csv
  --output-dir <dir>     Output directory for split files
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
realitydb split \
  --pack healthcare.json \
  --rows 100000 \
  --train 70 --test 15 --validation 15 \
  --format sql \
  --output-dir ./ml-splits \
  --seed 42

# Produces:
# ml-splits/healthcare-train-70k.sql
# ml-splits/healthcare-test-15k.sql
# ml-splits/healthcare-validation-15k.sql
```

---

### `realitydb anomaly`

Inject controlled, labeled anomalies into generated data.
Useful for training fraud detection and anomaly detection models.

```
realitydb anomaly [options]

Options:
  --pack <file>          Pack JSON file path
  --rows <n>             Total rows
  --anomaly-rate <pct>   Percentage of rows with anomalies (default: 5)
  --type <name>          Anomaly type: outlier, missing, duplicate, temporal
  --label-column         Add a boolean is_anomaly column to output
  --format <fmt>         Output format: json, sql, csv
  -o, --output <file>    Output file path
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
# Generate fraud detection training data with 5% anomaly rate
realitydb anomaly \
  --pack fintech.json \
  --rows 100000 \
  --anomaly-rate 5 \
  --type outlier \
  --label-column \
  --format sql \
  -o fraud-training-data.sql \
  --seed 42
```

---

### `realitydb convert`

Convert between data formats. Does not regenerate data — converts existing files.

```
realitydb convert [options]

Options:
  --input <file>         Input file path
  --from <fmt>           Input format: json, sql, csv
  --to <fmt>             Output format: json, sql, csv
  --output <file>        Output file path
  -h, --help             Display help
```

Example:
```bash
realitydb convert --input data.json --from json --to sql --output data.sql
realitydb convert --input data.sql --from sql --to csv --output data.csv
```

---

### `realitydb benchmark`

Measure generation speed for a pack at different row counts.

```
realitydb benchmark [options]

Options:
  --pack <file>          Pack JSON file path
  --sizes <list>         Comma-separated row counts to benchmark
                         (default: 1000,5000,10000,50000,100000)
  --format <fmt>         Output format to benchmark (default: sql)
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
realitydb benchmark --pack healthcare.json --sizes 10000,50000,100000

# Output:
#   10,000 rows:   7.2s  (1,389 rows/sec)
#   50,000 rows:  34.8s  (1,437 rows/sec)
#  100,000 rows:  68.4s  (1,462 rows/sec)
```

---

## Pack Management

### `realitydb pack`

List available packs in the current directory.

```bash
realitydb pack
```

---

### `realitydb pack:info`

Show detailed information about a pack: tables, columns, FKs, row ratios.

```
realitydb pack:info [options]

Options:
  --pack <file>    Pack JSON file path
  -h, --help       Display help
```

Example:
```bash
realitydb pack:info --pack healthcare.json

# Output:
# Pack: healthcare v1.0
# Tables: 14
# Columns: 87
# Foreign keys: 18
# Enum columns: 31 (all weighted)
# Lifecycle rules: 4
# ...
```

---

### `realitydb pack:validate`

Validate a pack file for structural integrity, FK references, and
strategy correctness. Zero errors required before generation.

```
realitydb pack:validate [options]

Options:
  --pack <file>    Pack JSON file path
  -h, --help       Display help
```

Example:
```bash
realitydb pack:validate --pack eu-banking.json

# Output:
# ✅ JSON valid
# ✅ Schema version compatible
# ✅ All FK references resolved
# ✅ No circular dependencies
# ✅ All strategies valid
# ✅ 0 errors, 0 warnings
```

---

### `realitydb validate`

Validate a pack JSON file (top-level alias for pack:validate).

```bash
realitydb validate --pack my-pack.json
```

---

### `realitydb rule:list`

Show all lifecycle rules, temporal rules, and weighted enums in a pack.

```
realitydb rule:list [options]

Options:
  --pack <file>    Pack JSON file path
  -h, --help       Display help
```

Example:
```bash
realitydb rule:list --pack healthcare.json

# Output:
# Lifecycle rules (4):
#   cancelled appointments → appointment_date nullified
#   deceased patients → future appointments blocked
#   ...
# Temporal rules (6):
#   appointments.created_at < appointments.appointment_date
#   ...
# Enum columns (31):
#   patients.insurance_type: commercial 52%, medicare 28%...
```

---

### `realitydb tune`

Tune enum weights in a pack — list, preview changes, or apply them.

```
realitydb tune [options]

Options:
  --pack <file>          Pack JSON file path
  --table <name>         Filter to specific table
  --column <name>        Filter to specific column
  --apply                Apply changes to the pack file
  --preview              Preview changes without saving
  -h, --help             Display help
```

Example:
```bash
# List all enum distributions in a pack
realitydb tune --pack fintech.json

# Preview a weight change
realitydb tune --pack fintech.json \
  --table transactions --column status \
  --preview

# Apply changes interactively
realitydb tune --pack fintech.json --apply
```

---

### `realitydb add`

Add lifecycle or temporal rules to an existing pack.

```
realitydb add [options]

Options:
  --pack <file>          Pack JSON file path
  --rule-type <type>     Rule type: lifecycle, temporal
  --output <file>        Output pack file (default: overwrites input)
  -h, --help             Display help
```

---

### `realitydb scan`

Scan a live PostgreSQL database and generate a RealityPack from its schema.
Reverse-engineering: from real database to synthetic data pack.

```
realitydb scan [options]

Options:
  --connection <url>     PostgreSQL connection string (required)
  -o, --output <file>    Output pack file path (default: scanned-pack.json)
  --analyze              Also run distribution analysis (slower, more accurate)
  -h, --help             Display help
```

Example:
```bash
realitydb scan \
  --connection "postgresql://postgres:pass@localhost:5432/mydb" \
  -o my-db-pack.json

# Then generate matching synthetic data:
realitydb run --pack my-db-pack.json --rows 10000 --format sql -o test-data.sql
```

---

### `realitydb analyze`

Analyze live database data to suggest optimal generation strategies.
Samples actual data distributions to improve pack accuracy.

```
realitydb analyze [options]

Options:
  --connection <url>     PostgreSQL connection string (required)
  -o, --output <file>    Output analysis JSON path
  -h, --help             Display help
```

---

### `realitydb generate:template`

AI-generate a research-based pack from a domain description.
Uses the Anthropic API to produce research-backed distributions.

```
realitydb generate:template [options]

Options:
  --domain <description>    Domain description in plain English
  --tables <n>              Target number of tables (default: 10)
  --output <file>           Output pack file path
  -h, --help                Display help
```

Example:
```bash
realitydb generate:template \
  --domain "European retail bank with SEPA payments and AML monitoring" \
  --tables 12 \
  --output eu-banking-generated.json
```

Note: Always run pack:validate after AI generation. Review all enum
weights against primary sources before using in production.

---

### `realitydb ci`

Generate CI/CD configuration for ephemeral test databases.
Supports GitHub Actions, GitLab CI, CircleCI, Docker Compose.

```
realitydb ci [options]

Options:
  --pack <file>          Pack JSON file path
  --platform <name>      Platform: github, gitlab, circleci, docker
  --rows <n>             Rows per CI run (default: 1000)
  --output <file>        Output configuration file path
  -h, --help             Display help
```

Example:
```bash
realitydb ci \
  --pack fintech.json \
  --platform github \
  --rows 5000 \
  --output .github/workflows/test-data.yml
```

---

## Database Operations

### `realitydb mask`

Scan a PostgreSQL database for PII and apply masking in-place.
Always run --dry-run first to review what will be masked.

```
realitydb mask [options]

Options:
  --connection <url>     PostgreSQL connection string (required)
  --mode <mode>          Compliance mode: gdpr, hipaa, strict (default: gdpr)
  --dry-run              Show what would be masked, make no changes
  --confirm              Required to apply masking (prevents accidents)
  -o, --output <file>    Audit log output path
  --seed <n>             Seed for consistent masking across runs
  -h, --help             Display help
```

Masking modes:
- `gdpr`: names, emails, phones, addresses, financial data
- `hipaa`: GDPR + SSN, DOB, medical records, account numbers
- `strict`: HIPAA + IPs, usernames, passwords, free-text notes

Examples:
```bash
# Dry run first — see what will be masked
realitydb mask \
  --connection "postgresql://postgres:pass@localhost:5432/staging" \
  --dry-run \
  --mode hipaa

# Apply masking with audit trail
realitydb mask \
  --connection "postgresql://postgres:pass@localhost:5432/staging" \
  --mode hipaa \
  --confirm \
  --seed 42 \
  -o masking-audit.json
```

EU compliance note: The masking audit log (--output) satisfies GDPR
Article 5(1)(f) accountability requirements for data pseudonymisation.

---

### `realitydb capture`

Capture a live database state as a portable RealityPack for bug reproduction.
The --safe flag masks PII before saving.

```
realitydb capture [options]

Options:
  --name <name>          Pack name for the captured state
  --connection <url>     PostgreSQL connection string (required)
  --safe                 Mask PII before saving (recommended)
  --tables <list>        Comma-separated table names (default: all tables)
  -o, --output <file>    Output pack file path
  -h, --help             Display help
```

Example:
```bash
# Capture bug environment with PII masking
realitydb capture \
  --name bug-4821 \
  --connection "postgresql://postgres:pass@localhost:5432/prod" \
  --safe

# Share bug-4821.realitydb-pack.json with teammate
# Teammate restores with realitydb load
```

---

### `realitydb load`

Load a captured RealityPack into a database for bug reproduction.

```
realitydb load [options] <file>

Arguments:
  file                   RealityPack file path (required)

Options:
  --connection <url>     PostgreSQL connection string (required)
  --drop-tables          Drop existing tables before loading
  --confirm              Required to execute
  -h, --help             Display help
```

Example:
```bash
realitydb load bug-4821.realitydb-pack.json \
  --connection "postgresql://postgres:pass@localhost:5432/local" \
  --drop-tables \
  --confirm

# Output:
# ✅ Bug reproduction environment ready.
# 6 tables, 28,800 rows loaded in 1.0s
```

---

## Examine Namespace — Quality Assessment

### `realitydb examine assess`

The primary quality assessment command. Produces a scored quality report
across four dimensions: FK integrity, temporal logic, enum validity, privacy.

```
realitydb examine assess [options] <file>

Arguments:
  file                    SQL or CSV dataset to assess (required)

Options:
  --standard <name>       Assessment standard: generic, hipaa, gdpr, pci
                          (default: generic)
  --pack <file>           Pack JSON for pack-aware scoring (more accurate)
  --json                  Output as JSON
  --output <file>         Save JSON report to file
  --min-confidence <lvl>  CI gate: exit 2 if below threshold
                          (low|medium|high|very-high)
  -h, --help              Display help
```

Examples:
```bash
# Basic assessment
realitydb examine assess healthcare.sql

# Pack-aware assessment with JSON output (recommended)
realitydb examine assess healthcare.sql \
  --pack healthcare.json \
  --json \
  --output healthcare-assess.json

# GDPR-standard assessment for EU datasets
realitydb examine assess eu-banking.sql \
  --pack eu-banking.json \
  --standard gdpr \
  --json \
  --output eu-banking-assess.json

# CI gate — fail build if below high confidence
realitydb examine assess dataset.sql \
  --pack my-pack.json \
  --min-confidence high
```

Score interpretation:
```
100/100 — Production-ready. All structural gates pass.
97–99   — Publication-ready for CLI built-in packs.
95–96   — Acceptable with documented limitations.
90–94   — Review and fix before shipping.
< 90    — Do not ship. Structural defects present.

Privacy must always be 100/100 for synthetic data.
EU enterprise packs: 98+ required.
```

EU compliance note: The --output JSON report satisfies EU AI Act Article 10(e)
suitability evidence requirements. Retain alongside the dataset.

---

### `realitydb examine profile`

Statistical profiling of a dataset. Reports column-level statistics:
min, max, mean, stddev, null rate, unique count, top values by frequency.

```
realitydb examine profile [options] <file>

Arguments:
  file                   SQL or CSV dataset to profile

Options:
  --json                 Output as JSON
  --output <file>        Save report to file
  --columns <list>       Comma-separated column names to profile
  -h, --help             Display help
```

Example:
```bash
realitydb examine profile healthcare.sql --json --output profile.json
```

---

### `realitydb examine diff`

Compare two datasets — schema, row counts, and distribution differences.
Useful for verifying enforcer script transformations.

```
realitydb examine diff [options] <left> <right>

Arguments:
  left                   First dataset (SQL or CSV)
  right                  Second dataset (SQL or CSV)

Options:
  --json                 Output as JSON
  --output <file>        Save comparison to file
  -h, --help             Display help
```

Example:
```bash
# Compare raw generated vs enforced baseline
realitydb examine diff \
  oncology-50k-raw.sql \
  oncology-50k-baseline.sql \
  --json \
  --output oncology-diff.json

# Verifies the enforcer transformed the villain entity correctly
```

---

### `realitydb examine scan`

Infer a RealityPack JSON from a SQL schema (DDL) file.
Not a PII scanner — use comply scan for PII detection.

```
realitydb examine scan [options] <schema>

Arguments:
  schema                 SQL DDL file (CREATE TABLE statements)

Options:
  --output <file>        Output pack JSON path
  --review <file>        Output review manifest path
  -h, --help             Display help
```

Example:
```bash
realitydb examine scan schema.sql --output inferred-pack.json
```

---

### `realitydb examine scan:supabase`

Infer a RealityPack from a live Supabase database schema.

```
realitydb examine scan:supabase [options]

Options:
  --project-ref <ref>    Supabase project reference
  --output <file>        Output pack JSON path
  -h, --help             Display help
```

---

### `realitydb examine supabase`

Assess data quality of a live Supabase database.

```
realitydb examine supabase [options]

Options:
  --project-ref <ref>    Supabase project reference
  --json                 Output as JSON
  -h, --help             Display help
```

---

## Comply Namespace — Compliance and Policy

### `realitydb comply scan`

Scan a SQL or CSV file for PII patterns. Detects 10 patterns on free tier,
46 patterns on paid tier.

Detected patterns (paid tier):
SSN, email, phone, credit card, date of birth, IP address, passport number,
driving license, bank account number, IBAN, BIC/SWIFT, national ID number,
medical record number, health insurance number, NHS number, tax ID,
VAT number, employee ID, biometric identifier, GPS coordinates, MAC address,
and more.

```
realitydb comply scan [options] <file>

Arguments:
  file                   SQL or CSV file to scan (required)

Options:
  --tier <tier>          Scan depth: free (10 patterns), full (46 patterns)
  --json                 Output as JSON
  --output <file>        Save report to file
  -h, --help             Display help
```

Examples:
```bash
# Basic PII scan
realitydb comply scan eu-banking.sql

# Full scan with JSON report
realitydb comply scan eu-banking.sql --tier full --json --output pii-scan.json

# Expected output for synthetic data:
# ✅ Synthetic provenance detected (_realitydb_meta present)
# ✅ PII-shaped columns: 6 (email, phone, name, address, iban, dob)
#    All confirmed synthetic — no real PII exposure
```

EU compliance note: This command satisfies GDPR Article 25 (data protection
by design) verification. The report documents that synthetic data does not
contain real personal information.

---

### `realitydb comply report`

Generate a compliance report against a regulatory framework.
Produces a structured JSON or HTML report mapping dataset properties
to regulatory requirements.

```
realitydb comply report [options]

Options:
  --file <file>          Dataset to assess (SQL or CSV) (required)
  --framework <name>     Framework: hipaa, gdpr, pci, soc2, eu-ai-act, dora
  --output <file>        Output path (default: auto-named)
  --json                 Output JSON instead of HTML
  -h, --help             Display help
```

Examples:
```bash
# EU AI Act Article 10 compliance report
realitydb comply report \
  --file eu-banking.sql \
  --framework eu-ai-act \
  --output eu-banking-aiact.json \
  --json

# GDPR compliance report
realitydb comply report \
  --file healthcare.sql \
  --framework gdpr \
  --output healthcare-gdpr.json \
  --json

# HIPAA compliance report
realitydb comply report \
  --file healthcare.sql \
  --framework hipaa \
  --output healthcare-hipaa.json \
  --json

# HTML report for sharing with compliance team
realitydb comply report \
  --file eu-banking.sql \
  --framework eu-ai-act \
  --output eu-banking-aiact-report.html
```

DORA report covers:
- Article 6: ICT risk management (version tracking, audit trail)
- Article 9: Protection (synthetic provenance, Ed25519 certificate)
- Article 10: Detection (FK integrity, temporal logic scores)
- Article 11: Response (deterministic seed = reproducible recovery)
- Article 12: Backup (audit log availability)
- Article 16: Third-party risk (on-premise CLI, vendor version)

EU AI Act report covers:
- Article 10(b): Data origin and provenance (_realitydb_meta watermark)
- Article 10(c): Data preparation operations documented
- Article 10(d): Assumptions and limitations
- Article 10(e): Quality assessment scores (FK, temporal, enum, overall)
- Article 10(f): Bias examination summary
- Article 11: Technical documentation readiness
- Article 12: Logging and audit trail

---

### `realitydb comply doctor`

Diagnose and fix common pack issues: format compatibility, FK references,
strategy assignments, enum completeness.

```
realitydb comply doctor [options]

Options:
  --pack <file>          Pack JSON file to diagnose
  --fix                  Auto-fix diagnosable issues
  --output <file>        Output fixed pack file (with --fix)
  -h, --help             Display help
```

Examples:
```bash
# Diagnose only
realitydb comply doctor --pack my-pack.json

# Diagnose and fix (outputs to fixed-pack.json)
realitydb comply doctor --pack my-pack.json --fix --output fixed-pack.json
```

Common issues detected:
- studio-v4 format (not CLI-compatible) → auto-converts with --fix
- Missing FK declarations on UUID columns
- timestamp columns using text strategy
- dependsOn properties (engine bug workaround)
- Missing weights on enum columns
- Invalid strategy names

---

### `realitydb comply temporal`

Detect and fix temporal ordering violations in generated SQL.
Use this when examine assess reports temporal logic below 95%.

```
realitydb comply temporal [options] <file>

Arguments:
  file                   SQL dataset to check and fix

Options:
  --pack <file>          Pack JSON for FK relationship context
  --fix                  Auto-fix detected violations
  --output <file>        Output fixed SQL file
  --json                 Output violation report as JSON
  -h, --help             Display help
```

Example:
```bash
# Check for temporal violations
realitydb comply temporal dataset.sql --pack my-pack.json --json

# Fix violations (creates new file)
realitydb comply temporal dataset.sql \
  --pack my-pack.json \
  --fix \
  --output dataset-fixed.sql
```

---

## Attest Namespace — Certification and Provenance

### `realitydb attest sign`

Generate an Ed25519 cryptographic certificate for a dataset.
The certificate records: dataset hash, generator version, timestamp,
template name, and a cryptographic signature.

```
realitydb attest sign [options] <file>

Arguments:
  file                   Dataset to certify (SQL or CSV)

Options:
  --key <path>           Path to Ed25519 private key file
                         (default: ~/.realitydb/private.key)
  --output <file>        Output certificate file path
  --json                 Output as JSON
  -h, --help             Display help
```

Key setup (one-time):
```powershell
# Generate an Ed25519 signing key
node -e "
const crypto = require('crypto');
const { privateKey } = crypto.generateKeyPairSync('ed25519');
const der = privateKey.export({ type: 'pkcs8', format: 'der' });
const fs = require('fs'); const path = require('path');
const dir = path.join(process.env.USERPROFILE || process.env.HOME, '.realitydb');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'private.key'), der.toString('hex'), 'utf8');
console.log('Key written to ~/.realitydb/private.key');
"
```

Examples:
```bash
# Sign a dataset
realitydb attest sign eu-banking-baseline.sql

# Output:
# 🔐 Certifying dataset...
# 🏷️ Certificate Generated
# ────────────────────────────────────
#    Template:      eu-banking
#    Template hash: sha256:a4f3c...
#    Tables:        11
#    Signature:     ed25519:b7f2a...
#    Certificate:   eu-banking-baseline.realitydb-cert.json

# Sign with specific key and output path
realitydb attest sign eu-banking.sql \
  --key /path/to/key.hex \
  --output eu-banking.cert.json
```

EU compliance note: The Ed25519 certificate satisfies EU AI Act Article 10(b)
cryptographic provenance requirements. The certificate can be verified by any
party with the corresponding public key, providing audit-proof provenance.

---

### `realitydb attest verify`

Verify a dataset certificate. Confirms the dataset has not been modified
since signing.

```
realitydb attest verify [options] <file>

Arguments:
  file                   Dataset or certificate file to verify

Options:
  --cert <file>          Certificate file path (if separate from dataset)
  --key <path>           Path to Ed25519 public key file
  -h, --help             Display help
```

Example:
```bash
realitydb attest verify eu-banking-baseline.sql \
  --cert eu-banking-baseline.realitydb-cert.json

# Output:
# ✅ Certificate valid
# ✅ Dataset hash matches
# ✅ Signature verified
# Signed: 2026-07-08T14:22:18Z
# Template: eu-banking v1.0
```

---

## Lab Namespace — Simulation Lab

The lab namespace creates and manages disposable PostgreSQL databases
with pre-loaded synthetic data. Labs expire after a TTL (default 1 hour).

### `realitydb lab create`

Create a disposable PostgreSQL database from a pack.

```
realitydb lab create [options] <template>

Arguments:
  template               Built-in pack name or pack file path

Options:
  --rows <n>             Number of rows (default: 1000)
  --ttl <minutes>        Time to live in minutes (default: 60)
  --seed <n>             Deterministic seed
  -h, --help             Display help
```

Example:
```bash
realitydb lab create healthcare --rows 5000 --ttl 120 --seed 42

# Output:
# ✅ Lab created: lab-3
# Host: lab-3.labs.realitydb.dev
# Port: 5432
# Database: realitydb_lab_3
# Username: lab_user
# Password: [generated]
# Expires: 2026-07-08T16:22:18Z (2 hours)
```

---

### `realitydb lab list`

List all active labs with status and expiry times.

```bash
realitydb lab list
```

---

### `realitydb lab connect`

Show the connection string for a lab.

```bash
realitydb lab connect 3
# postgresql://lab_user:pass@lab-3.labs.realitydb.dev:5432/realitydb_lab_3
```

---

### `realitydb lab extend`

Extend a lab's TTL.

```
realitydb lab extend [options] <n>

Arguments:
  n                      Lab number

Options:
  --minutes <n>          Additional minutes (default: 60)
  -h, --help             Display help
```

```bash
realitydb lab extend 3 --minutes 60
```

---

### `realitydb lab delete`

Destroy a lab and its database immediately.

```bash
realitydb lab delete 3
```

---

### `realitydb lab snapshot`

Create an immutable snapshot of a lab's current data state.

```
realitydb lab snapshot [options] <n>

Arguments:
  n                      Lab number

Options:
  --name <name>          Snapshot name
  --description <text>   Snapshot description
  -h, --help             Display help
```

```bash
realitydb lab snapshot 3 --name "after-fraud-injection" \
  --description "Post-anomaly state for testing"
```

---

### `realitydb lab publish`

Publish a lab snapshot to the public gallery for sharing.

```
realitydb lab publish [options]

Options:
  --snapshot <id>        Snapshot ID to publish
  --title <text>         Gallery title
  --description <text>   Gallery description
  --tags <list>          Comma-separated tags
  -h, --help             Display help
```

```bash
realitydb lab publish \
  --snapshot snap-42 \
  --title "EU Healthcare Lab — EHDS-compliant" \
  --description "14-table hospital schema with 5000 synthetic patients" \
  --tags "healthcare,eu,hipaa,ehr"
```

---

### `realitydb lab fork`

Fork a published lab from the gallery into a new disposable database.

```
realitydb lab fork [options] <slug>

Arguments:
  slug                   Gallery slug to fork

Options:
  --ttl <minutes>        TTL for the forked lab (default: 60)
  -h, --help             Display help
```

```bash
realitydb lab fork eu-healthcare-ehds --ttl 120
```

---

### `realitydb lab gallery`

Browse published labs in the gallery.

```
realitydb lab gallery [options]

Options:
  --tag <name>           Filter by tag
  --search <query>       Search by title or description
  --json                 Output as JSON
  -h, --help             Display help
```

```bash
realitydb lab gallery --tag healthcare
realitydb lab gallery --search "EU banking"
```

---

### `realitydb lab query:save` / `query:list` / `query:run`

Save, list, and execute SQL queries against a live lab.

```bash
# Save a query to the lab session
realitydb lab query:save 3 \
  --query "SELECT COUNT(*) FROM patients WHERE age > 65" \
  --name "elderly-patient-count"

# List saved queries
realitydb lab query:list 3

# Run a query and see results
realitydb lab query:run 3 --query-name "elderly-patient-count"
```

---

### `realitydb lab share`

Generate a shareable read-only connection string for a lab.

```bash
realitydb lab share 3
# Output:
# Shareable connection (read-only, expires 2026-07-08T16:00:00Z):
# postgresql://readonly:token@lab-3.labs.realitydb.dev:5432/realitydb_lab_3
```

---

## Authentication and Account Management

### `realitydb login`

Authenticate with an API key from your RealityDB account.

```
realitydb login [options]

Options:
  --api-key <key>        API key from dashboard
  -h, --help             Display help
```

```bash
realitydb login --api-key rdb_live_xxxxxxxxxxxxxxxx
```

---

### `realitydb logout`

Clear authentication credentials.

```bash
realitydb logout
```

---

### `realitydb status`

Show current plan, usage, and available features.

```bash
realitydb status

# Output:
# Plan: Core
# Rows this month: 245,320 / 500,000
# Commands available: all 65
# License: valid (expires 2027-01-15)
```

---

### `realitydb upgrade`

Open Stripe checkout to upgrade your plan.

```bash
realitydb upgrade
```

---

### `realitydb audit`

View operation history.

```
realitydb audit [options]

Options:
  --since <date>         Filter from date (YYYY-MM-DD)
  --command <name>       Filter by command name
  --limit <n>            Number of entries to show (default: 20)
  -h, --help             Display help
```

Examples:
```bash
realitydb audit
realitydb audit --since 2026-07-01
realitydb audit --command seed --limit 50
```

---

### `realitydb audit:export`

Export the audit log as JSON for compliance reporting.

```
realitydb audit:export [options]

Options:
  --since <date>         Filter from date
  --output <file>        Output JSON file path
  -h, --help             Display help
```

```bash
realitydb audit:export \
  --since 2026-01-01 \
  --output 2026-audit-log.json
```

EU compliance note: The audit log export satisfies DORA Article 12 ICT
operational event logging requirements.

---

### `realitydb analytics`

Show detailed usage analytics and compliance limits.

```bash
realitydb analytics

# Output:
# Command frequency (last 30 days):
#   run:              142 calls
#   examine assess:    38 calls
#   comply scan:       22 calls
#   attest sign:       11 calls
# ...
```

---

### `realitydb menu`

Interactive guided navigation for all commands.
Useful for new users exploring capabilities.

```bash
realitydb menu
```

---

## Common Workflows

### Workflow 1: Generate and Verify a Production Dataset

```bash
# 1. Validate the pack
realitydb pack:validate --pack healthcare.json

# 2. Generate 50K rows with deterministic seed
realitydb run --pack healthcare.json --rows 50000 \
  --format sql --seed 42 -o healthcare-50k.sql

# 3. PII scan (confirm synthetic)
realitydb comply scan healthcare-50k.sql

# 4. Quality assessment
realitydb examine assess healthcare-50k.sql \
  --pack healthcare.json --json --output healthcare-assess.json

# 5. EU AI Act compliance report
realitydb comply report \
  --file healthcare-50k.sql \
  --framework eu-ai-act \
  --output healthcare-aiact.json --json

# 6. Sign the dataset
realitydb attest sign healthcare-50k.sql
```

### Workflow 2: EU Enterprise Dataset Pipeline

```bash
# 1. Generate EU banking baseline
realitydb run --pack eu-banking.json --rows 50000 \
  --format sql --seed 42 -o eu-banking-50k-raw.sql

# 2. (For Atelier packs) Run enforcer script
node enforce-eu-banking-story.mjs eu-banking-50k-raw.sql eu-banking-baseline.sql

# 3. Assess enforced baseline (stricter 98+ threshold)
realitydb examine assess eu-banking-baseline.sql \
  --pack eu-banking.json \
  --standard gdpr \
  --json --output eu-banking-assess.json

# 4. EU AI Act report
realitydb comply report \
  --file eu-banking-baseline.sql \
  --framework eu-ai-act \
  --output eu-banking-aiact.json --json

# 5. GDPR report
realitydb comply report \
  --file eu-banking-baseline.sql \
  --framework gdpr \
  --output eu-banking-gdpr.json --json

# 6. Sign with Ed25519 for Article 10(b) provenance
realitydb attest sign eu-banking-baseline.sql \
  --output eu-banking-baseline.cert.json
```

### Workflow 3: CI/CD Pipeline Integration

```yaml
# .github/workflows/test-data.yml
name: Generate Test Data
on: [push, pull_request]
jobs:
  test-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install RealityDB CLI
        run: npm install -g realitydb
      - name: Generate test database
        run: |
          realitydb run \
            --pack fintech.json \
            --rows 5000 \
            --format sql \
            --seed 42 \
            -o test-data.sql
      - name: Assess quality gate
        run: |
          realitydb examine assess test-data.sql \
            --pack fintech.json \
            --min-confidence high
      - name: Seed test database
        run: |
          realitydb seed \
            --pack fintech.json \
            --rows 5000 \
            --connection "${{ secrets.TEST_DB_URL }}" \
            --create-tables --drop-tables \
            --seed 42
```

### Workflow 4: Bug Reproduction

```bash
# Developer A: Capture production environment
realitydb capture \
  --name bug-report-4821 \
  --connection "postgresql://readonly:pass@prod:5432/app" \
  --safe

# Share bug-report-4821.realitydb-pack.json via Slack or GitHub issue

# Developer B: Reproduce locally
realitydb load bug-report-4821.realitydb-pack.json \
  --connection "postgresql://postgres:pass@localhost:5432/local" \
  --drop-tables --confirm

# Now both developers have identical database state
```

---

## Pricing and Tier Reference

| Tier | Monthly Price | Row Limit | Commands |
|------|---------------|-----------|----------|
| Free | $0 | 50,000 rows | Core generation, pack management, validation |
| Core | $49/month | 500,000 rows | Everything including seed, simulate, mask, capture, lab, comply, attest |
| Enterprise | Contact | Unlimited | Custom SLA, on-premise, EU DPA, dedicated support |

EU Enterprise tier:
- Annual contract with EUR invoicing
- EU Data Processing Agreement (DPA) included
- SLA: 4-hour response for critical issues
- On-premise deployment option
- Dedicated account manager
- Custom pack development available

Contact: compliance@realitydb.dev for EU enterprise inquiries.

---

## Troubleshooting

### "error: unknown command"
Your CLI is outdated:
```bash
npm install -g realitydb
realitydb --version  # Should show 2.38 or higher
```

### "mock_past_date_XXX" in output
Timestamp column using wrong strategy:
```json
// Wrong
{ "name": "created_at", "strategy": "text" }
// Correct
{ "name": "created_at", "strategy": "timestamp" }
```

### FK violations in assess output
Child table references non-existent parent row. Check:
1. Tables are in correct FK dependency order in pack JSON
2. FK column has `foreignKey: { table: "parent", column: "id" }` declared
3. Run `realitydb comply doctor --pack pack.json` for auto-diagnosis

### Temporal logic below 95%
Child timestamps preceding parent timestamps. Fix:
1. Remove `created_at` from event tables (most common cause)
2. Run `realitydb comply temporal dataset.sql --fix --output fixed.sql`
3. For Atelier packs: ensure enforcer T5 (temporal ordering pass) runs

### "Signing key not found" (attest sign)
Set up the Ed25519 key:
```powershell
node -e "
const {privateKey} = require('crypto').generateKeyPairSync('ed25519');
const der = privateKey.export({type:'pkcs8', format:'der'});
const fs = require('fs'), path = require('path');
const dir = path.join(process.env.USERPROFILE||process.env.HOME,'.realitydb');
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'private.key'), der.toString('hex'), 'utf8');
console.log('Done');
"
```

### Connection timeout (Supabase)
Use the Session Pooler connection string (port 5432), not Direct Connection:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres
```

### "Free tier limit exceeded"
Check usage and upgrade:
```bash
realitydb status
realitydb upgrade
```

---

*RealityDB CLI Reference v2.38*
*Mpingo Systems LLC — Charlotte, NC*
*65 commands — Free and Core tiers*
*EU enterprise: compliance@realitydb.dev*
*GitHub: github.com/emkwambe/databox*
*npm: @realitydb/cli*
