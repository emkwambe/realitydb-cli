# AI-Assisted Schema Generation for RealityDB

## How It Works

Any AI (ChatGPT, Claude, DeepSeek, Gemini) can generate a RealityDB-compatible template. The user describes their system in natural language, the AI outputs a JSON file, and the user either:

1. **Imports into Studio** → visually refine → export → `realitydb run --pack`
2. **Runs directly with CLI** → `realitydb run --pack ai-generated.json --connection "..."`

## The Prompt Template

Copy and paste this prompt into any AI chat. Replace the description in brackets with your system:

---

### Prompt (copy this):

```
Generate a RealityDB CLI template JSON for [DESCRIBE YOUR SYSTEM HERE — e.g., "a task management SaaS with teams, members, projects, tasks with lifecycle rules for cancelled/backlog nullifying completed_at, and comments"].

Use this exact format:

{
  "name": "template-name",
  "version": "1.0.0",
  "description": "Template description",
  "tables": {
    "table_name": {
      "match": "table_name",
      "columns": {
        "id": { "strategy": "uuid" },
        "column_name": { "strategy": "strategy_name" },
        "fk_column": { "strategy": "uuid", "foreignKey": { "table": "parent_table", "column": "id" } },
        "enum_column": {
          "strategy": "enum",
          "options": {
            "values": ["value1", "value2", "value3"],
            "weights": [60, 30, 10],
            "lifecycleRules": [
              { "value": "value3", "nullFields": ["some_timestamp"] }
            ]
          }
        },
        "timestamp_with_dep": {
          "strategy": "timestamp",
          "options": { "dependsOn": "created_at", "dependencyRule": "after" }
        }
      }
    }
  },
  "generationConfig": {
    "database": { "client": "postgres" },
    "seed": { "defaultRecords": 1000, "randomSeed": 42 }
  }
}

Rules:
1. Every table MUST have an "id" column with strategy "uuid"
2. Every table MUST have a "created_at" column with strategy "timestamp"
3. FK columns use strategy "uuid" with a "foreignKey" object pointing to the parent table
4. Enum columns should have realistic weighted distributions (not uniform)
5. If a status enum has terminal states (cancelled, deleted, expired), add lifecycleRules to nullify dependent timestamp fields
6. If a timestamp represents completion/delivery/resolution, add dependsOn pointing to the creation timestamp with dependencyRule "after"
7. Use "match" field set to the table name

Available strategies: uuid, email, full_name, phone, address, company_name, text, integer, float, boolean, timestamp, enum

Output ONLY the JSON. No explanation, no markdown backticks, no preamble.
```

---

## Example: Task Management SaaS

### User says:
"Generate a RealityDB CLI template JSON for a task management SaaS with teams (name, plan), members (email, name, role), projects (name, status), tasks (title, status with lifecycle rules, priority, completed_at depends on created_at), and comments (body)."

### AI outputs:
```json
{
  "name": "taskflow",
  "version": "1.0.0",
  "description": "Task management SaaS with lifecycle rules and temporal dependencies",
  "tables": {
    "teams": {
      "match": "teams",
      "columns": {
        "id": { "strategy": "uuid" },
        "name": { "strategy": "company_name" },
        "plan": {
          "strategy": "enum",
          "options": {
            "values": ["free", "pro", "enterprise"],
            "weights": [60, 30, 10]
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    },
    "members": {
      "match": "members",
      "columns": {
        "id": { "strategy": "uuid" },
        "team_id": { "strategy": "uuid", "foreignKey": { "table": "teams", "column": "id" } },
        "email": { "strategy": "email" },
        "name": { "strategy": "full_name" },
        "role": {
          "strategy": "enum",
          "options": {
            "values": ["owner", "admin", "member", "viewer"],
            "weights": [5, 15, 60, 20]
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    },
    "projects": {
      "match": "projects",
      "columns": {
        "id": { "strategy": "uuid" },
        "team_id": { "strategy": "uuid", "foreignKey": { "table": "teams", "column": "id" } },
        "name": { "strategy": "text" },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["active", "archived", "completed"],
            "weights": [70, 15, 15]
          }
        },
        "created_at": { "strategy": "timestamp" }
      }
    },
    "tasks": {
      "match": "tasks",
      "columns": {
        "id": { "strategy": "uuid" },
        "project_id": { "strategy": "uuid", "foreignKey": { "table": "projects", "column": "id" } },
        "assignee_id": { "strategy": "uuid", "foreignKey": { "table": "members", "column": "id" } },
        "title": { "strategy": "text" },
        "status": {
          "strategy": "enum",
          "options": {
            "values": ["backlog", "todo", "in_progress", "done", "cancelled"],
            "weights": [10, 20, 35, 25, 10],
            "lifecycleRules": [
              { "value": "cancelled", "nullFields": ["completed_at"] },
              { "value": "backlog", "nullFields": ["completed_at"] }
            ]
          }
        },
        "priority": {
          "strategy": "enum",
          "options": {
            "values": ["critical", "high", "medium", "low"],
            "weights": [5, 20, 50, 25]
          }
        },
        "created_at": { "strategy": "timestamp" },
        "completed_at": {
          "strategy": "timestamp",
          "options": { "dependsOn": "created_at", "dependencyRule": "after" }
        }
      }
    },
    "comments": {
      "match": "comments",
      "columns": {
        "id": { "strategy": "uuid" },
        "task_id": { "strategy": "uuid", "foreignKey": { "table": "tasks", "column": "id" } },
        "author_id": { "strategy": "uuid", "foreignKey": { "table": "members", "column": "id" } },
        "body": { "strategy": "text" },
        "created_at": { "strategy": "timestamp" }
      }
    }
  },
  "generationConfig": {
    "database": { "client": "postgres" },
    "seed": { "defaultRecords": 1000, "randomSeed": 42 }
  }
}
```

### User runs:
```bash
realitydb run --pack taskflow.json --connection "postgresql://localhost:5432/mydb" --records 5000 --seed 42
```

### Result:
5 tables, 25,000 rows, correct FKs, lifecycle rules enforced, temporal ordering guaranteed.

---

## Studio Import Prompt

If the user wants to import into Studio (for visual editing before export), use this modified prompt that outputs the Studio Pack format:

```
Generate a RealityDB Studio Pack JSON for [DESCRIBE YOUR SYSTEM].

Use this exact format:

{
  "tables": [
    {
      "id": "tbl-001",
      "name": "table_name",
      "columns": [
        { "id": "tbl-001-c1", "name": "id", "type": "uuid", "isPK": true, "isFK": false, "nullable": false, "strategy": "uuid", "options": {} },
        { "id": "tbl-001-c2", "name": "column_name", "type": "string", "isPK": false, "isFK": false, "nullable": false, "strategy": "name", "options": {} },
        { "id": "tbl-001-c3", "name": "fk_col", "type": "uuid", "isPK": false, "isFK": true, "nullable": false, "strategy": "uuid", "options": {}, "fkTarget": { "tableId": "tbl-002", "columnId": "tbl-002-c1" } }
      ],
      "position": { "x": 100, "y": 100 }
    }
  ],
  "relationships": [
    {
      "id": "rel-001",
      "sourceTableId": "tbl-002",
      "sourceColumnId": "tbl-002-c1",
      "targetTableId": "tbl-001",
      "targetColumnId": "tbl-001-c3",
      "type": "one-to-many",
      "semantic": "connection"
    }
  ],
  "version": "1.0.0"
}

Rules:
- Table IDs: tbl-001, tbl-002, etc.
- Column IDs: tbl-001-c1, tbl-001-c2, etc.
- Position tables in a grid: x = 100 + (index % 3) * 350, y = 100 + floor(index / 3) * 300
- Column types: uuid, string, email, enum, timestamp, integer, decimal
- Strategies: uuid, random_string, email, enum, past_date, integer, decimal, name, company_name
- For enum options, include values, weights, and lifecycleRules where appropriate
- For temporal dependencies, add to options: "dependsOn": "column_name", "dependencyRule": "after"
- sourceTableId in relationships = the parent (PK) table
- targetTableId = the child (FK) table

Output ONLY the JSON.
```

The user saves the output as a `.json` file and clicks **Import** in Studio.

---

## Tips for Best Results

1. **Be specific about distributions** — "70% active, 20% archived, 10% deleted" produces better templates than just listing values
2. **Name your lifecycle states** — "cancelled orders should not have shipped_at" tells the AI exactly what to nullify
3. **Specify temporal relationships** — "completed_at must be after created_at" maps directly to dependsOn rules
4. **Include the domain context** — "healthcare system" vs "e-commerce" helps the AI pick appropriate column names and distributions
5. **Start simple, iterate** — generate 3-5 tables first, verify with `--dry-run`, then add complexity
