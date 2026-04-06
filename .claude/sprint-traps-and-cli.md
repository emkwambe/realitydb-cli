# Item 2: Enriched SQL Traps Template

## Claude Code Sprint Prompt

```
Read: apps/sandbox/public/data/sql-traps.sql, apps/sandbox/src/templates.ts

CONTEXT:
RealityDB Sandbox has a "SQL Debugging Challenge" template with 4 tables (customers, orders, products, reviews) and 700 rows containing 5 query traps. The other templates now have 10-13 tables with 26K-50K rows. The traps template needs to scale up to be credible as a training environment while adding advanced traps.

OBJECTIVE:
Rewrite sql-traps.sql with expanded data and 5 additional traps (10 total). Update templates.ts with new suggested queries.

REQUIREMENTS:

### Expanded Schema (8 tables, ~5,000 rows)

Keep existing 4 tables but expand, add 4 new tables:

1. customers (500 rows) — KEEP but expand from 200
   - Add: loyalty_tier (gold/silver/bronze/none), signup_source (organic/referral/paid_ad/social)
   - TRAP: Two "John Smith" entries (keep), add two "Maria Garcia" entries
   - 30% have zero orders (increase from 25%)

2. orders (2000 rows) — KEEP but expand from 300
   - TRAP: cancelled orders total=0, returned orders total=negative (keep)
   - TRAP: Add orders from Dec 2024 and Jan 2025 with a 3-week gap (no orders Dec 15 - Jan 5) for temporal analysis
   - Add: discount_code VARCHAR, shipping_cost_cents INT

3. products (100 rows) — KEEP but expand from 50
   - TRAP: 15 products with zero orders (dead inventory)
   - Add: supplier_id FK, weight_grams INT, is_active BOOLEAN (10% inactive)

4. reviews (500 rows) — KEEP but expand from 150
   - TRAP: Some reviews have rating=5 but body contains words like "terrible", "broken", "worst" (fake review trap)
   - Add: is_verified BOOLEAN, helpful_count INT

5. NEW: suppliers (20 rows) — id, name, country, lead_time_days, reliability_score NUMERIC, created_at
   - TRAP: 3 suppliers have reliability_score = NULL (not zero — they're new, not unreliable)

6. NEW: order_items (5000 rows) — id, order_id FK, product_id FK, quantity INT, unit_price_cents INT, discount_cents INT, created_at
   - TRAP: Some order_items have discount_cents > unit_price_cents * quantity (over-discounting bug)
   - Enables: "order total doesn't match sum of items" trap

7. NEW: inventory_log (1500 rows) — id, product_id FK, change_type (restock/sale/return/adjustment), quantity_change INT, balance_after INT, created_at
   - TRAP: Running balance doesn't match current stock (adjustment entries that break the chain)
   - Enables: window function exercises (running total)

8. NEW: customer_events (3000 rows) — id, customer_id FK, event_type (page_view/add_to_cart/checkout_start/purchase/abandon), session_id VARCHAR, created_at
   - TRAP: Funnel analysis — 60% page_view, 30% add_to_cart, 15% checkout_start, 8% purchase, 20% abandon
   - Abandon events have created_at AFTER checkout_start (temporal trap)

### 10 Traps Total

**Original 5 (keep):**
1. JOIN trap — INNER vs LEFT JOIN loses customers
2. Aggregation trap — cancelled=$0, returned=negative distorts AVG
3. NULL trap — WHERE col != NULL returns 0
4. Duplicate name trap — GROUP BY name merges different people
5. Temporal gap trap — missing months in GROUP BY

**New 5:**
6. OVER-DISCOUNT trap — SUM(discount_cents) > SUM(unit_price_cents * quantity) for some orders
   Query: "Calculate profit per order" → naive SUM gives negative profit for valid orders
   Fix: Use GREATEST(0, subtotal - discount) or investigate the data quality issue

7. FAKE REVIEW trap — rating doesn't match sentiment
   Query: "Find products with highest average rating" → naive AVG includes fake 5-star reviews
   Fix: Cross-reference review body keywords or filter is_verified=true

8. NULL vs ZERO trap — suppliers with NULL reliability_score
   Query: "Find suppliers with lowest reliability" → ORDER BY reliability_score ASC puts NULLs first or last depending on DB
   Fix: Use COALESCE or NULLS LAST

9. RUNNING TOTAL trap — inventory_log running balance doesn't match
   Query: "Calculate current stock from inventory_log" → SUM(quantity_change) doesn't match balance_after
   Fix: Window function with proper ordering, identify adjustment entries

10. FUNNEL DROP-OFF trap — customer_events funnel
    Query: "Calculate conversion rate" → naive COUNT by event_type ignores that some users go page_view → purchase (skip cart)
    Fix: Use conditional aggregation with CASE WHEN per customer, not global COUNT

### Update templates.ts

Add 10 suggested queries (one per trap), all checkable:

```typescript
suggestedQueries: [
  // Original 5
  { label: 'Trap 1: Orders per customer', sql: '...', difficulty: 'intermediate', concept: 'JOIN trap', checkable: true, trapHint: '...' },
  { label: 'Trap 2: Average order amount', sql: '...', difficulty: 'intermediate', concept: 'Aggregation trap', checkable: true, trapHint: '...' },
  { label: 'Trap 3: Find unshipped orders', sql: '...', difficulty: 'beginner', concept: 'NULL trap', checkable: true, trapHint: '...' },
  { label: 'Trap 4: Top spenders by name', sql: '...', difficulty: 'advanced', concept: 'Duplicate name trap', checkable: true, trapHint: '...' },
  { label: 'Trap 5: Monthly revenue', sql: '...', difficulty: 'advanced', concept: 'Temporal gap trap', checkable: true, trapHint: '...' },
  // New 5
  { label: 'Trap 6: Profit per order', sql: '...', difficulty: 'advanced', concept: 'Over-discount trap', checkable: true, trapHint: '...' },
  { label: 'Trap 7: Best rated products', sql: '...', difficulty: 'intermediate', concept: 'Fake review trap', checkable: true, trapHint: '...' },
  { label: 'Trap 8: Least reliable suppliers', sql: '...', difficulty: 'beginner', concept: 'NULL vs ZERO trap', checkable: true, trapHint: '...' },
  { label: 'Trap 9: Current stock levels', sql: '...', difficulty: 'advanced', concept: 'Running total trap', checkable: true, trapHint: '...' },
  { label: 'Trap 10: Conversion funnel', sql: '...', difficulty: 'advanced', concept: 'Funnel analysis trap', checkable: true, trapHint: '...' },
]
```

CONSTRAINTS:
- Replace apps/sandbox/public/data/sql-traps.sql entirely
- Update the sql-traps entry in templates.ts
- Do NOT change other SQL data files or other template entries
- All traps must be subtle — the naive query should LOOK correct but produce wrong results
- Build must pass

Commit: "feat: enriched SQL Debugging Challenge — 8 tables, 5000 rows, 10 traps including funnel and running total"
```

---

# Item 3: CLI Completion Instructions

## What the CLI Needs to Be Complete

The RealityDB CLI is already powerful (15 commands, 5 templates, pack export, SQL export). But it needs polish to be ready for public launch:

### A. Missing: `--include-ddl` flag on `export --format sql`
**Problem:** SQL export produces INSERT statements only, no CREATE TABLE DDL.
**Impact:** Users can't load the SQL file into a fresh database without manually creating tables.
**Fix:** Add DDL generation to `exportToSql` in packages/generators or packages/core.

### B. Missing: `--batch-size` flag on `export --format sql`
**Problem:** Each row is a separate INSERT statement (8600 INSERTs for 8600 rows).
**Impact:** Slow to execute, large file size, PGLite can't handle efficiently.
**Fix:** Group rows into batched INSERT VALUES (...), (...), (...) statements.

### C. Missing: Sessions/Events in pack export
**Problem:** `realitydb pack export` drops sessions and events tables even though generateDataset produces them.
**Root cause:** The `exportRealityPack` function in packages/generators loses Map entries during serialization.
**Fix:** Ensure all Map entries from generateDataset are preserved during JSON serialization.

### D. Template Display
**Problem:** `realitydb templates` shows old description/target count for updated templates.
**Fix:** Update the `description` field in each template to reflect new table counts.

### E. Documentation
The CLI needs:
1. Updated README.md with all 15 commands documented
2. `--help` text improvements (some commands have sparse help)
3. Examples for common workflows:
   - "Generate 10K rows of SaaS data as CSV"
   - "Export SQL for PGLite sandbox"  
   - "Capture live database into Reality Pack"
   - "Use a custom template JSON"

### F. npm Package
Current: `realitydb` v2.0.0 on npm.
Needs: Updated package description, keywords, README for npm listing.

## Claude Code Sprint Prompt for CLI Polish

```
Read: apps/cli/src/commands/export.ts, apps/cli/src/cli.ts,
      packages/core/src/exportPipeline.ts, packages/generators/src/sqlExporter.ts,
      README.md

CONTEXT:
RealityDB CLI v2.0.0 is published on npm. It has 15 commands and 5 built-in templates (saas with 10 tables, ecommerce with 12, fintech with 10, healthcare with 13, education with 6). The SQL export works but produces individual INSERT statements without DDL.

OBJECTIVE:
Polish the CLI for public launch: add DDL to SQL export, batch INSERTs, fix template descriptions, update README.

REQUIREMENTS:

### 1. Add DDL to SQL export
In the function that handles --format sql (find it in packages/generators or packages/core):
- Prepend CREATE TABLE IF NOT EXISTS statements before INSERT statements
- Use the schema from the generation plan to infer column types
- Map strategy types to PostgreSQL DDL types (reuse strategyToSqlType from run.ts)
- Tables in FK dependency order
- Add file header comment with template name, records, seed, timestamp

### 2. Batch INSERT statements
- Default batch size: 50 rows per INSERT
- Add --batch-size <number> flag to export command
- Format: INSERT INTO "table" (cols) VALUES\n  (row1),\n  (row2),\n  ...;\n
- Proper SQL escaping: strings in single quotes, NULLs as NULL, booleans as true/false

### 3. Update template descriptions
In packages/templates/src/domains/*.ts, update the description field:
- saas: "SaaS platform with 10 tables: organizations, users, plans, features, subscriptions, invoices, payments, sessions, events"
- ecommerce: "E-commerce platform with 12 tables: customers, products, orders, payments, refunds, disputes, shipments, sessions, cart items"
- fintech: "Financial platform with 10 tables: accounts, transactions, transfers, cards, authorizations, settlements, fraud alerts, investigations, compliance"
- healthcare: "Healthcare network with 13 tables: patients, providers, encounters, diagnoses, procedures, prescriptions, labs, vitals, billing, insurance claims"
- education: "K-12 school system with 6 tables: teachers, classes, students, enrollments, grades, attendance"

### 4. Update README.md
Add a complete command reference with examples for each command.
Include the dogfood pipeline:
  realitydb pack export --template saas --records 5000
  node tools/pack-to-sql.js pack.json output.sql

### 5. Fix pack export serialization
In the function that serializes the reality pack (packages/generators or packages/core):
- Ensure all tables from generateDataset are included
- The dataset.tables Map must be fully serialized (sessions and events are currently dropped)

CONSTRAINTS:
- Do NOT change template table configs or column overrides
- Do NOT change the generation engine
- Maintain backward compatibility (existing json/csv export unchanged)
- Build must pass for all packages

Commit: "feat: CLI polish — DDL in SQL export, batched INSERTs, updated descriptions, README"
```
