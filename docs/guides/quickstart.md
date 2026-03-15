# Zero to Seeded in 5 Minutes

Get from an empty database to 2,000 realistic rows in under 5 minutes.

## Prerequisites

- Node.js 20+
- A running PostgreSQL or MySQL database (Docker works great)

## Step 1: Start a Database

If you don't have a database running, spin one up with Docker:

```bash
# PostgreSQL
docker run -d --name realitydb-demo \
  -e POSTGRES_PASSWORD=demo \
  -e POSTGRES_DB=demo \
  -p 5432:5432 postgres:16

# Or MySQL
docker run -d --name realitydb-demo \
  -e MYSQL_ROOT_PASSWORD=demo \
  -e MYSQL_DATABASE=demo \
  -p 3306:3306 mysql:8
```

## Step 2: Create a Schema

Connect and create some tables. Here's a minimal SaaS schema:

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  plan_name VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Step 3: Install and Configure RealityDB

```bash
npm install -g realitydb
```

Run the setup wizard:

```bash
realitydb init
```

Or manually create `realitydb.config.json`:

```json
{
  "database": {
    "client": "postgres",
    "connectionString": "postgresql://postgres:demo@localhost:5432/demo"
  },
  "seed": {
    "defaultRecords": 500,
    "randomSeed": 42,
    "batchSize": 100
  }
}
```

## Step 4: Scan Your Schema

```bash
realitydb scan
```

Expected output:

```
RealityDB Scan
═══════════════════════════════════════
Tables found: 4

  organizations       (4 columns)
  users               (6 columns, 1 FK)
  subscriptions       (7 columns, 1 FK)
  payments            (6 columns, 1 FK)

Insertion order (FK-safe):
  1. organizations
  2. users
  3. subscriptions
  4. payments

No circular dependencies detected.
```

## Step 5: Seed with a Template

```bash
realitydb seed --template saas --seed 42
```

Expected output:

```
RealityDB Seed
═══════════════════════════════════════
Database: postgresql://postgres:***@localhost:5432/demo
Template: saas
Seed: 42
Records per table: 500

Seeding...

Writing to database...
  organizations: 150 rows inserted (2 batches, 8ms)
  users: 500 rows inserted (5 batches, 15ms)
  subscriptions: 600 rows inserted (6 batches, 18ms)
  payments: 600 rows inserted (6 batches, 20ms)

Seed complete. 1850 rows in 0.2s
```

## Step 6: Inspect the Data

```sql
SELECT full_name, email, status FROM users LIMIT 5;
```

```
     full_name      |          email           | status
--------------------+--------------------------+--------
 Sarah Chen         | sarah.chen@example.com   | active
 Marcus Rodriguez   | m.rodriguez@company.io   | active
 Priya Patel        | ppatel@startup.dev       | active
 James Kim          | jkim@enterprise.co       | inactive
 Aisha Mohammed     | aisha.m@company.io       | pending
```

The data is realistic because the `saas` template maps:
- `full_name` to realistic person names
- `email` to plausible email addresses
- `status` to weighted enum values (70% active, 15% inactive, 15% pending)
- `amount_cents` to realistic money values
- FK columns to valid references in parent tables

## Step 7: Reproducibility Check

Run the exact same command again (after a reset):

```bash
realitydb reset --confirm
realitydb seed --template saas --seed 42
```

You get **identical data**. Same names, same emails, same relationships. Change `--seed 43` and you get a completely different but equally realistic dataset.

## What's Next?

- **Custom templates**: See the [Custom Template Guide](./custom-template.md) to tailor data to your domain
- **CI/CD integration**: See the [CI/CD Guide](./ci-cd-integration.md) to use RealityDB in your test pipeline
- **Timeline mode**: Add `--timeline 12-months` for time-series data with growth curves
- **Scenarios**: Add `--scenario payment-failures --scenario-intensity high` to inject failure patterns
- **Lifecycle simulation**: Add `--lifecycle` for causally-connected entity state machines
