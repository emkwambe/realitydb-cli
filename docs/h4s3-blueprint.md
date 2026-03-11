# H4-S3 — Education & Classroom Mode (v1.2.0)

## Sprint Goal
Provide curated datasets and exercise packs for SQL courses, analytics bootcamps, and data science education. Students load a course, work through exercises with progressive difficulty, and track completion. Instructors create custom exercise packs.

## Architecture

```
packages/generators/src/classroom/
├── courseRegistry.ts        # Registry of built-in courses
├── courses/
│   ├── sql101.ts            # SQL 101 course definition
│   ├── analyticsIntro.ts    # Analytics intro course
│   └── dataModeling.ts      # Data modeling course
├── exercisePack.ts          # Exercise pack types + loader
├── progressTracker.ts       # Student progress (local file)
├── instructorMode.ts        # Custom exercise pack scaffolding
└── index.ts                 # Re-exports

packages/core/src/classroomPipeline.ts   # Orchestrates course loading + exercise tracking

apps/cli/src/commands/classroom.ts       # CLI subcommands
```

## Sprint Checklist

| # | Deliverable | Points | Score |
|---|-------------|--------|-------|
| 1 | `CourseDefinition` type with metadata, schema DDL, seed data, exercises | 3 | |
| 2 | `CourseRegistry` with register/get/list operations | 2 | |
| 3 | `sql-101` course: 10 exercises (SELECT, WHERE, JOIN, GROUP BY, subqueries) | 3 | |
| 4 | `analytics-intro` course: 8 exercises (aggregation, window functions, CTEs) | 3 | |
| 5 | `data-modeling` course: 6 exercises (normalization, relationships, constraints) | 3 | |
| 6 | `ExercisePack` type with difficulty levels (beginner/intermediate/advanced) | 2 | |
| 7 | `ProgressTracker` — read/write progress to `~/.realitydb/progress.json` | 3 | |
| 8 | `InstructorMode` — scaffold custom course JSON + validate | 2 | |
| 9 | `classroomPipeline.ts` — orchestrate: load course → create tables → seed data → track progress | 3 | |
| 10 | CLI `classroom` command group: `list`, `start`, `status`, `reset`, `create` | 3 | |
| 11 | CLI `classroom start <course>` loads schema + data into database | 2 | |
| 12 | CLI `classroom status` shows exercise completion progress | 2 | |
| 13 | Generators index exports for classroom module | 1 | |
| 14 | Core index exports for classroom pipeline | 1 | |
| 15 | Version bump to 1.2.0 across all version constants | 1 | |
| 16 | README Education section + commands table update | 2 | |
| 17 | CHANGELOG v1.2.0 entry | 1 | |
| 18 | Build passes with zero errors | 2 | |
| **Total** | | **39** | |

## Course Structure

Each course contains:
- **metadata**: name, description, difficulty, estimated time
- **schema**: DDL statements to create tables
- **seedData**: rows to insert for exercises
- **exercises**: ordered list with SQL hints, expected output description, difficulty

## Exercise Format

```typescript
interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  hint: string;
  tables: string[];           // tables involved
  expectedConcept: string;    // what SQL concept this teaches
}
```

## Progress Storage

Progress is stored locally at `~/.realitydb/progress.json`:
```json
{
  "courses": {
    "sql-101": {
      "startedAt": "2026-03-11T...",
      "exercises": {
        "select-basics": { "completed": true, "completedAt": "..." },
        "where-filters": { "completed": false }
      }
    }
  }
}
```

## CLI Commands

```bash
realitydb classroom                          # List available courses
realitydb classroom list                     # Same as above
realitydb classroom start sql-101            # Load course into database
realitydb classroom status                   # Show progress across courses
realitydb classroom status sql-101           # Show progress for specific course
realitydb classroom complete sql-101 ex-3    # Mark exercise as completed
realitydb classroom reset sql-101            # Reset course progress
realitydb classroom create my-course         # Scaffold custom course JSON
```
