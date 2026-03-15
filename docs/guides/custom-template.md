# Custom Template from Your Schema

This guide walks through building a domain-specific template that transforms RealityDB's auto-inferred strategies into high-fidelity synthetic data tailored to your application.

## The Problem: Auto-Inference Gaps

When you run `realitydb seed` without a template, the engine infers column strategies from names and types. This works well for common patterns:

| Column Name | Inferred Strategy |
|-------------|------------------|
| `email` | Realistic email addresses |
| `full_name` | Person names |
| `phone` | Phone numbers |
| `amount_cents` | Money values |
| `status` | Weighted enum (active/inactive/pending) |
| `created_at` | Past timestamps |

But domain-specific columns fall through to generic fallbacks:

| Column Name | Without Template | With Template |
|-------------|-----------------|---------------|
| `grade_level` | Random short text | Weighted enum: K-12 |
| `risk_score` | Integer 0-10000 | Float 0.0-1.0, normal distribution |
| `plan_name` | Random short text | Weighted: starter/pro/enterprise |
| `industry` | Random short text | Realistic industry names |

## Step 1: Analyze Your Schema

The `analyze` command introspects your database and scores each column's inference confidence:

```bash
realitydb analyze
```

Output:

```
RealityDB Analyze
═══════════════════════════════════════

Table: users (6 columns)
  id             uuid          [high]  → uuid
  email          varchar(255)  [high]  → email
  full_name      varchar(255)  [high]  → full_name
  status         varchar(20)   [high]  → enum (active, inactive, pending)
  role           varchar(50)   [low]   → text (short)        ← needs override
  created_at     timestamp     [high]  → timestamp (past)

Table: courses (5 columns)
  id             uuid          [high]  → uuid
  title          varchar(255)  [low]   → text (medium)       ← needs override
  difficulty     varchar(20)   [low]   → text (short)        ← needs override
  max_enrollment int           [low]   → integer (0-10000)   ← needs override
  created_at     timestamp     [high]  → timestamp (past)

Confidence: 54% high, 12% medium, 34% low
```

Columns marked `[low]` are candidates for template overrides.

## Step 2: Generate a Template Scaffold

```bash
realitydb analyze --output my-template.json
```

This generates a JSON template pre-filled with inferred strategies. Open it and you'll see:

```json
{
  "name": "analyzed-schema",
  "version": "1.0",
  "description": "Auto-generated template from schema analysis",
  "tables": {
    "users": {
      "match": ["users", "*users*"],
      "columns": {
        "role": {
          "strategy": "text",
          "options": { "mode": "short" },
          "description": "Low confidence — consider overriding"
        }
      }
    },
    "courses": {
      "match": ["courses", "*courses*"],
      "columns": {
        "title": {
          "strategy": "text",
          "options": { "mode": "medium" },
          "description": "Low confidence — consider overriding"
        },
        "difficulty": {
          "strategy": "text",
          "options": { "mode": "short" },
          "description": "Low confidence — consider overriding"
        },
        "max_enrollment": {
          "strategy": "integer",
          "options": { "min": 0, "max": 10000 },
          "description": "Low confidence — consider overriding"
        }
      }
    }
  }
}
```

## Step 3: Enrich with Domain Knowledge

Edit the generated file to replace low-confidence strategies with domain-specific ones:

```json
{
  "name": "education-platform",
  "version": "1.0",
  "description": "Template for online education platform",
  "tables": {
    "users": {
      "match": ["users", "*user*"],
      "columns": {
        "role": {
          "strategy": "enum",
          "options": {
            "values": ["student", "instructor", "admin", "ta"],
            "weights": [0.75, 0.12, 0.05, 0.08]
          }
        }
      }
    },
    "courses": {
      "match": ["courses", "*course*"],
      "rowCountMultiplier": 0.3,
      "columns": {
        "title": {
          "strategy": "enum",
          "options": {
            "values": [
              "Introduction to Computer Science",
              "Data Structures and Algorithms",
              "Machine Learning Fundamentals",
              "Web Development Bootcamp",
              "Database Systems",
              "Operating Systems",
              "Calculus I",
              "Linear Algebra",
              "Statistics for Data Science",
              "Software Engineering"
            ]
          }
        },
        "difficulty": {
          "strategy": "enum",
          "options": {
            "values": ["beginner", "intermediate", "advanced"],
            "weights": [0.4, 0.4, 0.2]
          }
        },
        "max_enrollment": {
          "strategy": "integer",
          "options": { "min": 20, "max": 200 }
        }
      }
    }
  }
}
```

## Step 4: Seed with Your Template

```bash
realitydb seed --template ./my-template.json --seed 42
```

The template overlay algebra works as follows:

```
Final Strategy = Template Override ?? Auto-Inferred Strategy
```

- Columns with template overrides use the template strategy
- Columns without overrides still get auto-inference (email, timestamps, etc.)
- FK columns always use FK resolution regardless of template
- If a template enum conflicts with a MySQL ENUM column definition, values are intersected

## Template Reference

### Table Configuration

```json
{
  "match": ["exact_name", "*wildcard*"],
  "rowCountMultiplier": 0.5,
  "columns": { ... }
}
```

- `match`: Table name patterns. Exact match takes priority over wildcards.
- `rowCountMultiplier`: Scales the default row count (0.3 = 30% of default).

### Column Strategies

| Strategy | Options | Example Use |
|----------|---------|-------------|
| `enum` | `values`, `weights` | Status fields, categories |
| `integer` | `min`, `max` | Scores, counts, quantities |
| `float` | `min`, `max` | Percentages, rates |
| `money` | `min`, `max` | Prices, amounts (in cents) |
| `text` | `mode`: short/medium/long | Descriptions, titles |
| `email` | — | Email addresses |
| `full_name` | — | Person names |
| `first_name` | — | First names |
| `last_name` | — | Last names |
| `phone` | — | Phone numbers |
| `address` | — | Street addresses |
| `company_name` | — | Company/org names |
| `uuid` | — | UUIDs |
| `boolean` | `trueWeight` | Boolean flags |
| `timestamp` | `mode`: past/recent | Dates and timestamps |

### Built-in Templates

RealityDB includes five domain templates you can use directly or extend:

| Template | Target Domain | Key Tables |
|----------|--------------|------------|
| `saas` | SaaS applications | organizations, users, subscriptions, payments |
| `ecommerce` | Online stores | products, orders, customers, reviews |
| `education` | Learning platforms | students, courses, enrollments, grades |
| `fintech` | Financial services | accounts, transactions, transfers |
| `healthcare` | Health systems | patients, appointments, prescriptions |

Use a built-in template as a starting point:

```bash
# Use built-in directly
realitydb seed --template saas --seed 42

# Or use your custom file
realitydb seed --template ./my-template.json --seed 42
```

## Tips

1. **Start with `analyze --output`** — don't write templates from scratch
2. **Only override low-confidence columns** — let inference handle the rest
3. **Use `rowCountMultiplier`** — not every table needs the same number of rows (e.g., a `plans` table might only need 5 rows)
4. **Wildcard matching** — `*user*` matches `users`, `user_profiles`, `admin_users`
5. **Weights should sum to 1.0** — they represent probability distributions
6. **Test with `realitydb scan`** first — verify your schema is correctly detected before seeding
