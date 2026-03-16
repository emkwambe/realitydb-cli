# RealityDB Format Reference

## RealityDB Template Format

The template JSON is the contract between Studio and CLI. It defines what tables to create and how to generate data for each column.

### Full Example

```json
{
  "name": "my-app-template",
  "version": "1.0.0",
  "description": "Template for my application",
  "tables": {
    "users": {
      "match": "users",
      "rowCountMultiplier": 1,
      "columns": {
        "id": {
          "strategy": "uuid"
        },
        "email": {
          "strategy": "email"
        },
        "name": {
          "strategy": "full_name"
        },
        "role": {
          "strategy": "enum",
          "options": {
            "values": ["admin", "member", "viewer"],
            "weights": [10, 70, 20]
          }
        },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["active", "suspended", "deleted"],
            "weights": [85, 10, 5],
            "lifecycleRules": [
              {
                "value": "deleted",
                "nullFields": ["last_login_at"]
              },
              {
                "value": "suspended",
                "nullFields": ["last_login_at"]
              }
            ]
          }
        },
        "created_at": {
          "strategy": "timestamp"
        },
        "last_login_at": {
          "strategy": "timestamp",
          "options": {
            "dependsOn": "created_at",
            "dependencyRule": "after"
          }
        }
      }
    },
    "posts": {
      "match": "posts",
      "columns": {
        "id": {
          "strategy": "uuid"
        },
        "user_id": {
          "strategy": "uuid",
          "foreignKey": {
            "table": "users",
            "column": "id"
          }
        },
        "title": {
          "strategy": "text"
        },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["draft", "published", "archived"],
            "weights": [20, 70, 10]
          }
        },
        "published_at": {
          "strategy": "timestamp",
          "options": {
            "dependsOn": "created_at",
            "dependencyRule": "after"
          }
        },
        "created_at": {
          "strategy": "timestamp"
        }
      }
    }
  },
  "simulation": {
    "seed": 42,
    "timelineDays": 365,
    "growthCurve": "s-curve",
    "anomalyRate": 0.05
  },
  "generationConfig": {
    "database": {
      "client": "postgres"
    },
    "seed": {
      "defaultRecords": 1000,
      "randomSeed": 42
    }
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Template name |
| `version` | string | Semver version |
| `description` | string | Human-readable description |
| `tables` | object | Table definitions keyed by name |

### Table Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match` | string or string[] | Yes | Table name pattern for matching |
| `rowCountMultiplier` | number | No | Multiplier for row count |
| `columns` | object | Yes | Column definitions keyed by name |

### Column Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `strategy` | string | Yes | Generation strategy name |
| `options` | object | No | Strategy-specific options |
| `foreignKey` | object | No | FK reference: `{ table, column }` |
| `description` | string | No | Human-readable description |
| `match` | string or string[] | No | Column name pattern for matching |

### Strategy Options

**enum:**
```json
{
  "values": ["active", "inactive", "pending"],
  "weights": [60, 20, 20],
  "lifecycleRules": [
    { "value": "inactive", "nullFields": ["last_active_at"] }
  ]
}
```

**integer / float / money:**
```json
{
  "min": 1,
  "max": 10000
}
```

**timestamp:**
```json
{
  "mode": "past",
  "dependsOn": "created_at",
  "dependencyRule": "after"
}
```

**text:**
```json
{
  "mode": "short"
}
```

---

## RealityPack Format

A RealityPack is a self-contained environment snapshot. It includes schema, generation plan, and data.

### Structure

```json
{
  "format": "realitydb-pack",
  "version": "1.0",
  "metadata": {
    "name": "bug-4821",
    "description": "Order processing failure when payment is refunded",
    "createdAt": "2026-03-16T19:00:00.000Z",
    "createdBy": "realitydb-cli",
    "seed": 42,
    "totalRows": 28800,
    "tableCount": 6,
    "ddl": "CREATE TABLE ...",
    "capturedFrom": "postgresql://user:****@host:5432/db",
    "safeMode": "masked",
    "piiSummary": {
      "columnsDetected": 14,
      "tablesAffected": 6,
      "categoriesFound": ["email", "phone", "name", "financial"]
    }
  },
  "schema": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "dataType": "uuid", "nullable": false },
          { "name": "email", "dataType": "varchar(255)", "nullable": false }
        ],
        "primaryKey": "id"
      }
    ],
    "foreignKeys": [
      {
        "sourceTable": "orders",
        "sourceColumn": "user_id",
        "targetTable": "users",
        "targetColumn": "id"
      }
    ]
  },
  "plan": { },
  "dataset": {
    "tables": {
      "users": {
        "columns": ["id", "email", "name"],
        "rows": [
          ["abc-123", "morgan.lee@demo.net", "Morgan Lee"],
          ["def-456", "jordan.taylor@test.org", "Jordan Taylor"]
        ],
        "rowCount": 2
      }
    }
  }
}
```

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Pack name |
| `description` | string | Human-readable description |
| `createdAt` | string | ISO timestamp |
| `seed` | number | Random seed used |
| `totalRows` | number | Total rows in dataset |
| `tableCount` | number | Number of tables |
| `ddl` | string | SQL DDL for schema creation |
| `capturedFrom` | string | Source database (connection masked) |
| `safeMode` | string | `raw`, `masked`, `tokenized`, or `redacted` |
| `piiSummary` | object | PII detection results |

### Safe Mode Values

| Mode | Description |
|------|-------------|
| `raw` | No PII sanitization (internal use only) |
| `masked` | PII replaced with realistic synthetic values |
| `tokenized` | PII replaced with deterministic tokens |
| `redacted` | PII replaced with `[REDACTED]` |
| *(absent)* | Legacy pack, captured before safe mode was available |

---

## Config File Format

```json
{
  "database": {
    "connectionString": "postgresql://user:password@host:5432/database",
    "client": "postgres"
  },
  "seed": {
    "defaultRecords": 1000,
    "batchSize": 1000,
    "randomSeed": 42,
    "environment": "dev"
  },
  "template": "saas"
}
```

### Connection String Formats

**PostgreSQL:**
```
postgresql://user:password@host:5432/database
postgres://user:password@host:5432/database
```

**MySQL:**
```
mysql://user:password@host:3306/database
```

### Environment Values

| Value | Description |
|-------|-------------|
| `dev` | Development (default) |
| `staging` | Staging environment |
| `test` | Test/CI environment |
