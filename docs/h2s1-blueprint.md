# RealityDB H2-S1 — Custom Template API

**Project:** RealityDB — Developer Reality Platform
**Horizon:** 2 — Ecosystem & Integrations
**Sprint:** H2-S1 — Custom Template API
**Status:** DRAFT
**Depends on:** H1-S4 (COMPLETE - 5 built-in templates, realitydb@0.4.1)
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)
**Executor:** Claude Code (Staff Engineer)

---

## Sprint Objective

Enable developers to create and use their own domain templates without modifying RealityDB source code. After this sprint, a developer can drop a `realitydb.template.json` file in their repo and `realitydb seed --template ./realitydb.template.json` uses it.

---

## What Must Be True After This Sprint

1. `realitydb seed --template ./my-template.json` loads a custom template from a JSON file.
2. `realitydb templates init` scaffolds a new template JSON file interactively.
3. `realitydb templates validate <file>` validates a custom template against the schema.
4. Custom templates support the same column strategies as built-in templates (enum, money, email, etc.).
5. Custom templates can be referenced by name if placed in `~/.realitydb/templates/`.
6. Version bumped to 0.5.0.

---

## Why This Matters

Five built-in templates cover common domains. But every company has unique schemas — CRM, logistics, insurance, gaming. Custom templates let any developer teach RealityDB about their domain. This is the first step toward a template ecosystem.

---

## Deliverables

| # | Deliverable | Location |
|---|------------|----------|
| D1 | Template JSON schema definition | `packages/templates/src/templateSchema.ts` |
| D2 | Template JSON loader (file → DomainTemplate) | `packages/templates/src/loadTemplate.ts` |
| D3 | Template validator | `packages/templates/src/validateTemplate.ts` |
| D4 | User template directory support | `packages/templates/src/userTemplates.ts` |
| D5 | `templates init` CLI command | `apps/cli/src/commands/templates.ts` |
| D6 | `templates validate` CLI command | `apps/cli/src/commands/templates.ts` |
| D7 | Custom template loading in seed/export | `apps/cli/src/commands/seed.ts` |
| D8 | Version bump to 0.5.0 | `apps/cli/package.json` |

---

## Sprint Prompt (for Claude Code)

```
Read: packages/templates/src/types.ts, packages/templates/src/registry.ts,
      packages/templates/src/domains/saas.ts,
      apps/cli/src/commands/seed.ts, apps/cli/src/commands/templates.ts,
      apps/cli/src/cli.ts, README.md, CHANGELOG.md

CONTEXT:
RealityDB v0.4.1 has 5 built-in domain templates. Templates are TypeScript
objects (DomainTemplate interface). We want developers to create custom
templates as JSON files without touching RealityDB source.

OBJECTIVE:
Add custom template support via JSON files and CLI tooling.

REQUIREMENTS:

--- Template JSON Schema (packages/templates) ---

1. src/templateSchema.ts:
   - Define the JSON schema for a custom template file
   - TemplateJSON type:
     {
       name: string
       version: string
       description: string
       tables: {
         [tableName: string]: {
           match: string | string[]    // table name patterns
           columns: {
             [columnName: string]: {
               match?: string | string[]  // column name patterns
               strategy: string           // "enum", "email", "money", etc.
               options?: Record<string, unknown>
             }
           }
         }
       }
     }

--- Template JSON Loader ---

2. src/loadTemplate.ts:
   - loadTemplateFromJSON(filePath: string) → Promise<DomainTemplate>
   - Reads JSON file, validates structure, converts to DomainTemplate
   - Throws clear errors for invalid structure
   - Maps strategy strings to ColumnStrategy kinds

3. src/validateTemplate.ts:
   - validateTemplateJSON(json: unknown) → ValidationResult
   - Returns { valid: boolean, errors: string[] }
   - Checks: name present, version present, at least one table,
     each table has at least one column, strategy kinds are valid

--- User Template Directory ---

4. src/userTemplates.ts:
   - getUserTemplateDir() → string (defaults to ~/.realitydb/templates/)
   - listUserTemplates() → Promise<{ name: string, filePath: string }[]>
   - Scans user template directory for .json files
   - This allows: realitydb seed --template my-custom
     (looks up ~/.realitydb/templates/my-custom.json)

--- Template Resolution ---

5. Update template resolution in seed/export commands:
   - If --template value is a file path (contains / or .json), load from file
   - If --template value matches a built-in name, use built-in
   - Otherwise, check user template directory
   - Clear error if not found anywhere

--- CLI Commands ---

6. `realitydb templates init`:
   - Scaffolds a realitydb.template.json file in current directory
   - Includes example structure with comments explaining each field
   - Output:
     Created realitydb.template.json
     Edit this file to define your custom template.
     Then run: realitydb seed --template ./realitydb.template.json

7. `realitydb templates validate <file>`:
   - Validates a custom template JSON file
   - Prints validation results
   - CI mode: JSON output

--- README Update ---

8. Add Custom Templates section to README:
   ## Custom Templates
   Create your own domain template as a JSON file...

--- Version + Changelog ---

9. Bump version to 0.5.0
10. Update CHANGELOG.md

CONSTRAINTS:
- Custom templates must support ALL existing strategy kinds
- Built-in templates continue to work unchanged
- Template JSON format must be stable (this becomes a public API)
- File-based templates take priority over user directory templates
- Commit message: "feat: add custom template API with JSON file support"

VERIFICATION:
1. pnpm build succeeds
2. realitydb templates init creates a valid JSON file
3. realitydb templates validate <file> validates it
4. realitydb seed --template ./realitydb.template.json works
Report: build status, template init output
```

---

## Sprint Checklist

```
## H2-S1 — Custom Template API

### Template JSON Schema (2 points)
- [ ] TemplateJSON type defined with name, version, description, tables
- [ ] Strategy strings map to all existing ColumnStrategy kinds

### Template Loader (3 points)
- [ ] loadTemplateFromJSON reads JSON and returns DomainTemplate
- [ ] Clear errors for invalid files (not JSON, missing fields)
- [ ] Strategy mapping covers: enum, email, money, text, uuid, etc.

### Template Validator (2 points)
- [ ] validateTemplateJSON checks required fields
- [ ] Returns specific error messages for each validation failure

### User Template Directory (2 points)
- [ ] getUserTemplateDir returns ~/.realitydb/templates/
- [ ] listUserTemplates scans directory for .json files

### Template Resolution (2 points)
- [ ] File path templates (./file.json) load from file
- [ ] Named templates check: built-in → user dir → error

### CLI Commands (3 points)
- [ ] templates init scaffolds a valid template JSON
- [ ] templates validate reports errors clearly
- [ ] CI mode works for validate

### Seed Integration (2 points)
- [ ] realitydb seed --template ./custom.json works end-to-end
- [ ] realitydb seed --template custom-name finds user dir template

### README + Version (2 points)
- [ ] Custom Templates section in README
- [ ] Version 0.5.0, CHANGELOG updated

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with correct message

Score: __/20 PASS
Gate: ALL must be ✅ before npm publish 0.5.0
```
