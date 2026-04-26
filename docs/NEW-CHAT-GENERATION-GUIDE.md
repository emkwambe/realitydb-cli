# RealityDB New Chat Generation Guide

> **Classification:** Internal — Mpingo Systems LLC
> **Version:** 2.0
> **Date:** April 25, 2026
> **Purpose:** ANY new chat session that touches CLI, engine, templates, or data generation MUST read this guide FIRST.
> **GitHub:** https://github.com/emkwambe/databox (CLI + engine)
> **Save to:** `C:\Users\HP\Documents\realitydb-internal\NEW-CHAT-GENERATION-GUIDE.md`

---

## ⛔ BEFORE YOU DO ANYTHING

### Read These Documents (in order)

1. **This guide** — You're reading it
2. **QUALITY-STANDARDS.md** — The 6 moats every dataset must meet
3. **DATASET-GENERATION-PROTOCOL.md** — 7-gate quality system
4. **PRODUCT-CLARITY-MATRIX.md** — What each product does and for whom

All documents live in: `C:\Users\HP\Documents\realitydb-internal\`

### Critical Files on GitHub

| File | Location | What it is |
|---|---|---|
| CLI entry point | `apps/cli/src/index.ts` | The ACTUAL `run` command handler (~line 155) |
| CLI commands (dead code for run) | `apps/cli/src/commands/run.ts` | NOT the active run handler — used by old seeder |
| Engine generators | `packages/engine/src/generators.ts` | All data generation strategies |
| Assessment engine | `apps/cli/src/commands/assess.ts` | Quality scoring with synthetic provenance |
| Smoke test | `apps/cli/smoke-test.cjs` | 146+ auto-scaling tests |
| CLI package.json | `apps/cli/package.json` | Version, scripts, prepublishOnly |
| tsup config | `apps/cli/tsup.config.ts` | Build config — `@databox/templates` is EXTERNAL |
| Bundled packs | `apps/cli/src/packs/*.json` | 6 built-in template JSON files |
| Built-in pack resolver | `apps/cli/src/index.ts` (~line 190) | BUILT_IN_PACKS resolution logic |

---

## 🚫 NEVER DO THESE THINGS

### Build Rules (WILL BREAK THE CLI)

1. **NEVER run `pnpm add` or `pnpm remove` in `apps/cli/`**
   - Breaks `@realitydb/engine` workspace junction
   - Restore: `New-Item -ItemType Junction -Path C:\Users\HP\Documents\databox\node_modules\@realitydb\engine -Target C:\Users\HP\Documents\databox\packages\engine -Force`

2. **NEVER edit `apps/cli/src/commands/run.ts` expecting it to affect `realitydb run --pack`**
   - The ACTUAL run handler is in `apps/cli/src/index.ts` (around line 155)
   - `commands/run.ts` contains the OLD database seeder (requires `--connection`)
   - Changes to `run.ts` will compile but NEVER execute for the `--pack` workflow

3. **NEVER skip clearing the turbo cache after engine changes**
   ```powershell
   npx turbo daemon stop
   Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force
   Remove-Item "C:\Users\HP\Documents\databox\.turbo" -Recurse -Force -ErrorAction SilentlyContinue
   Remove-Item "C:\Users\HP\Documents\databox\apps\cli\dist" -Recurse -Force
   npm run build
   ```
   - Turbo has a GLOBAL cache at `$env:LOCALAPPDATA\turbo`
   - Deleting local `.turbo` and `dist` is NOT enough
   - If `npm run build` shows "11 cached" after engine changes, your changes didn't compile

4. **NEVER publish without running the smoke test**
   ```powershell
   Set-Location C:\Users\HP\Documents\databox\apps\cli
   npm test  # Runs smoke-test.cjs — must be 146+ tests, ALL green
   ```
   - The `prepublishOnly` hook runs: build → postbuild → smoke test → version check
   - If any test fails, DO NOT force publish

5. **NEVER use `cd` in PowerShell commands — use absolute paths**
   - Bad: `cd apps/cli && npx tsup`
   - Good: `Set-Location C:\Users\HP\Documents\databox\apps\cli; npx tsup`

6. **NEVER create files with BOM encoding**
   - Always use: `[System.IO.File]::WriteAllText("path", $content)`
   - Not: `Set-Content` or `Out-File` (these add BOM)

7. **NEVER publish datasets with mock placeholders**
   - Check for: `mock_past_date`, `mock_template`, `sample_text_`, `mock_city`, `mock_state`, `mock_ip`, `mock_number`
   - If found: the engine `generators.ts` is missing a strategy case

8. **NEVER publish datasets with uniform enum distributions**
   - Every enum MUST have `weights` array with `_citation` field
   - Protocol Gate 2 must show: "Weighted: N | Uniform: 0"

---

## ✅ HOW TO GENERATE A NEW DATASET (step by step)

### Step 0: Understand the Format

Templates come in TWO formats:

| Format | Structure | Used by |
|---|---|---|
| **Studio v4** | `{ tables: [...], relationships: [...] }` — array-based with `fkTarget` | Studio app export |
| **Studio export** | `{ tables: { tableName: { columns: {...} } } }` — object-keyed with `foreignKey` | CLI `--pack` |

The CLI ONLY accepts studio-export format. Use `comply doctor --fix` to convert:
```powershell
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply doctor --pack input.json --fix --output ready.json
```

### Step 1: Research Domain (Gate 2)

Before writing any JSON:
1. Search for peer-reviewed sources for EVERY enum distribution
2. Document the citation with the weight
3. Verify weights sum to ~100

Example research-backed enum:
```json
{
  "values": ["HR+/HER2-", "HR+/HER2+", "HR-/HER2+", "Triple-Negative"],
  "weights": [73, 10, 5, 12],
  "_citation": "Howlader JNCI 2014: HR+/HER2- 72.7%, TNBC 12.2%, HR+/HER2+ 10.3%, HR-/HER2+ 4.6%"
}
```

### Step 2: Create Schema JSON (Studio v4 format)

Use this template structure:
```json
{
  "tables": [
    {
      "id": "tbl-001",
      "name": "table_name",
      "columns": [
        {
          "id": "tbl-001-c1",
          "name": "id",
          "type": "uuid",
          "isPK": true,
          "isFK": false,
          "nullable": false,
          "strategy": "uuid",
          "options": {}
        },
        {
          "id": "tbl-001-c2",
          "name": "parent_id",
          "type": "uuid",
          "isPK": false,
          "isFK": true,
          "nullable": false,
          "strategy": "uuid",
          "options": {},
          "fkTarget": { "tableId": "tbl-XXX", "columnId": "tbl-XXX-c1" }
        }
      ],
      "position": { "x": 100, "y": 100 }
    }
  ],
  "relationships": [
    {
      "id": "rel-001",
      "sourceTableId": "tbl-XXX",
      "sourceColumnId": "tbl-XXX-c1",
      "targetTableId": "tbl-YYY",
      "targetColumnId": "tbl-YYY-cN",
      "type": "one-to-many",
      "semantic": "connection"
    }
  ],
  "version": "1.0.0"
}
```

**Strategy types available in the engine:**
- `uuid` — unique identifier
- `full_name` — realistic names (James Smith, Maria Garcia)
- `email` — alex1234@gmail.com pattern
- `template` — `{{firstName}}`, `{{rowIndex}}`, `{{domain}}`, `{{number}}`
- `enum` — weighted random from values array
- `past_date` — ISO timestamp with `minYearsAgo`/`maxYearsAgo`
- `future_date` — ISO timestamp ahead
- `timestamp` — random past timestamp
- `integer` / `int` — min/max range
- `float` / `decimal` / `money` — min/max with precision
- `number` — min/max/precision (generic)
- `boolean` — true/false (use `trueWeight` for weighting)
- `company_name` — business names
- `phone` — +1XXXXXXXXXX
- `city` — 12 city names
- `state` — 12 state codes
- `zip_code` — 5-digit codes
- `street_address` — 1234 Main St pattern
- `ip_address` — RFC 1918 private ranges (10.x.x.x)
- `random_string` — word-word-number pattern
- `text` / `string` — context-aware (detects `name` columns)

### Step 3: Save and Doctor Check (Gate 3)

```powershell
# Save the schema
# Directory: C:\Users\HP\Documents\realityDB Packs\{Domain}\

# Doctor check
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply doctor --pack "path\to\schema.json"

# Expected: 0 critical (except format, which --fix handles), 0 warnings

# Fix format
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js comply doctor --pack "path\to\schema.json" --fix --output "path\to\ready.json"
```

### Step 4: Generate and Inspect (Gate 4)

```powershell
# Generate small sample (100-500 rows)
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 500 --format sql --seed 42 -o "path\to\inspect.sql"

# Check for mock values (ALL must be PASS)
$content = Get-Content "path\to\inspect.sql" -Raw
@('mock_past_date', 'mock_future_date', 'mock_template', 'sample_text_', 'mock_city', 'mock_state', 'mock_ip', 'mock_number') | ForEach-Object {
  if ($content -match $_) { Write-Host "FAIL: Found '$_'" -ForegroundColor Red }
  else { Write-Host "PASS: No '$_'" -ForegroundColor Green }
}

# Inspect actual data rows
$lines = Get-Content "path\to\inspect.sql"
$ins = ($lines | Select-String "INSERT INTO" | Select-Object -First 1).LineNumber
for ($i = $ins; $i -le ($ins + 3); $i++) {
  Write-Host $lines[$i].Substring(0, [Math]::Min(140, $lines[$i].Length))
}
```

### Step 5: Quality Assessment (Gate 5)

```powershell
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js examine assess "path\to\inspect.sql"

# MUST meet:
# Overall ≥ 95/100
# Privacy = 100/100 (synthetic provenance detected)
# No mock values in data
```

### Step 6: Generate Production Sizes

```powershell
# 5K rows
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 5000 --format sql --seed 42 -o "path\to\template-5k.sql"

# 10K rows (same schema, more data)
node C:\Users\HP\Documents\databox\apps\cli\dist\index.js run --pack "path\to\ready.json" --rows 10000 --format sql --seed 42 -o "path\to\template-10k.sql"
```

### Step 7: Upload to R2 (Gate 7)

```powershell
Set-Location C:\Users\HP\Documents\databox\workers\lab-api

npx wrangler r2 object put realitydb-templates/templates/{name}-5k.sql --file "path\to\template-5k.sql" --remote
npx wrangler r2 object put realitydb-templates/templates/{name}-10k.sql --file "path\to\template-10k.sql" --remote
```

### Step 8: Add to Store Catalog (if needed)

Update these files:
1. **Lab API** — `workers/lab-api/src/index.ts` → `DATASET_PRICING` object
2. **DataStorePage** — `realitydb-sandbox/src/components/DataStorePage.tsx` → `TEMPLATE_META`
3. **SimLabPage** — `realitydb-sandbox/src/components/SimLabPage.tsx` → `TEMPLATE_META`

Deploy:
```powershell
# Lab API
Set-Location C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler deploy

# Sandbox
Set-Location C:\Users\HP\Documents\realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true
```

### Step 9: Bundle in CLI (if appropriate)

Only bundle templates that are FREE and universally useful:
```powershell
# Copy pack to CLI packs directory
Copy-Item "path\to\ready.json" "C:\Users\HP\Documents\databox\apps\cli\src\packs\{name}.json"

# Add to BUILT_IN_PACKS in index.ts (~line 190)
# Rebuild
Set-Location C:\Users\HP\Documents\databox\apps\cli
npx tsup
npm run postbuild

# Test
node dist\index.js run --pack list
node dist\index.js run --pack {name} --rows 100 --format sql --seed 42 -o test.sql

# Run smoke test (will auto-discover new pack)
npm test

# Bump version + publish
npm publish
```

---

## 📋 CURRENT STATE REFERENCE

### CLI Version: v2.37.7

### Published npm: `@realitydb/cli@2.37.7`

### Smoke Test: 146 tests (auto-scales with packs)

### Templates in R2 (13 total):

| # | Name | R2 Key | Tables | Score | Enums |
|---|---|---|---|---|---|
| 1 | universal | templates/universal-{5k,10k}.sql | 6 | 100 | UNIFORM ⚠️ |
| 2 | healthcare | templates/healthcare-{5k,10k}.sql | 14 | 99 | UNIFORM ⚠️ |
| 3 | oncology | templates/oncology-{5k,10k}.sql | 20 | 100 | UNIFORM ⚠️ |
| 4 | supply-chain | templates/supply-chain-{5k,10k}.sql | 24 | 100 | UNIFORM ⚠️ |
| 5 | telecom | templates/telecom-{5k,10k}.sql | 21 | 100 | UNIFORM ⚠️ |
| 6 | fintech | templates/fintech-{5k,10k}.sql | 5 | 95 | UNIFORM ⚠️ |
| 7 | banking | templates/banking-{5k,10k}.sql | 16 | — | UNIFORM ⚠️ |
| 8 | iot-sensors | templates/iot-sensors-{5k,10k}.sql | 5 | 96 | UNIFORM ⚠️ |
| 9 | breast-cancer | templates/breast-cancer-{5k,10k}.sql | 12 | 99 | WEIGHTED ✅ |
| 10 | lung-cancer | templates/lung-cancer-{5k,10k}.sql | 14 | 99 | WEIGHTED ✅ |
| 11 | clinical-trial | templates/clinical-trial-{5k,10k}.sql | 15 | 100 | WEIGHTED ✅ |
| 12 | rwd-ehr | templates/rwd-ehr-{5k,10k}.sql | 16 | 99 | WEIGHTED ✅ |
| 13 | immuno-oncology | templates/immuno-oncology-{5k,10k}.sql | 12 | 99 | WEIGHTED ✅ |

### Bundled in CLI (6):
universal, healthcare, oncology, supply-chain, telecom, fintech

### Templates in Store Catalog (Lab API):
banking, oncology, healthcare, supply-chain, iot-sensors, telecom, fintech, universal

**Note:** Oncology v2 variants (breast-cancer, lung-cancer, clinical-trial, rwd-ehr, immuno-oncology) are in R2 but NOT yet in the Store catalog or CLI. They need to be added to DATASET_PRICING and TEMPLATE_META.

### Pack Files Location:
```
C:\Users\HP\Documents\realityDB Packs\
├── Universal\
├── Banking\
├── healthcare\
├── Oncology\
├── Oncology_v.2\          ← NEW: 5 research-backed variants
│   ├── breast-cancer-v1.json / breast-cancer-ready.json / breast-cancer-{5k,10k}.sql
│   ├── lung-cancer-v1.json / lung-cancer-ready.json / lung-cancer-{5k,10k}.sql
│   ├── clinical-trial-v1.json / clinical-trial-ready.json / clinical-trial-{5k,10k}.sql
│   ├── rwd-ehr-v1.json / rwd-ehr-ready.json / rwd-ehr-{5k,10k}.sql
│   └── immuno-oncology-v1.json / immuno-oncology-ready.json / immuno-oncology-{5k,10k}.sql
├── Supply Chain & Logistics\
├── Telecommunications\
├── fintech\
└── IOTSensors\
```

### Internal Docs:
```
C:\Users\HP\Documents\realitydb-internal\
├── NEW-CHAT-GENERATION-GUIDE.md      ← THIS FILE
├── QUALITY-STANDARDS.md               ← 6 moats definition
├── DATASET-GENERATION-PROTOCOL.md     ← 7-gate protocol
├── PRODUCT-CLARITY-MATRIX.md          ← Products → personas
├── ONCOLOGY-VARIANTS-RESEARCH.md      ← Cited distributions
├── FINANCIAL-VARIANTS-RESEARCH.md     ← Cited distributions for 10 fin variants
├── NEW-CHAT-OPS-GUIDE.md             ← Infrastructure reference
├── DISCOVERY-PROMPT.md                ← Landing page audit
├── USE-CASE-PRICING-GUIDE.md         ← Pricing by persona
└── ENTERPRISE-PRICING-SPEC.md        ← Corporate tiers
```

---

## 🔧 INFRASTRUCTURE REFERENCE

### Cloudflare Workers
- **Lab API:** `realitydb-lab-api.eddy-078.workers.dev`
- **Sandbox:** `sandbox.realitydb.dev` (Cloudflare Pages)

### R2 Bucket
- **Name:** `realitydb-templates`
- **Path:** `templates/{name}-{size}.sql`

### Deploy Commands
```powershell
# Lab API
Set-Location C:\Users\HP\Documents\databox\workers\lab-api
npx wrangler deploy

# Sandbox
Set-Location C:\Users\HP\Documents\realitydb-sandbox
npm run build
npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true
```

### GitHub Repos
- **CLI + Engine:** https://github.com/emkwambe/databox
- **Sandbox:** https://github.com/emkwambe/realitydb-sandbox (if separate)
- **Studio:** https://github.com/emkwambe/realityDB-sutudio

---

## 🏗️ KNOWN GAPS (P0 fixes needed)

| Gap | Impact | Location | Fix |
|---|---|---|---|
| Lifecycle rules not enforced | Moat 3 fails silently | Engine | Implement state machine validation |
| Cardinality not measured | Assess shows "0/0" | `assess.ts` | Parse FK references, measure ratios |
| Older templates have UNIFORM enums | Moat violated | 8 pack files | Research + add weights |
| `templates` command broken | `unknown command` | `cli.ts` | Wire to registry or remove |
| Dead code in `commands/run.ts` | Confusion | `run.ts` | Clean up or document |

---

## 📌 GOLDEN RULES

1. **Quality first, speed second.** Assess before uploading. Never upload a dataset that scores < 95.

2. **Research before weights.** Every enum needs a citation. No guessing.

3. **Smoke test before publish.** 146+ tests must pass. Zero exceptions.

4. **The 6 moats are non-negotiable.** A customer only needs ONE counter-example.

5. **The actual run handler is in `index.ts`, not `run.ts`.** This has caused hours of wasted debugging.

6. **Clear the global turbo cache** after ANY engine change: `Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force`

7. **Use `[System.IO.File]::WriteAllText()` for all file writes.** PowerShell default encoding adds BOM.

8. **Always use absolute paths** in PowerShell commands. Never `cd` then relative path.

9. **Test with `npx tsup` directly** if `npm run build` shows cached results. This bypasses turbo.

10. **Commit early, commit often.** Every significant change gets its own commit with a descriptive message.

---

*Mpingo Systems LLC — Precision Tools built to stay.*
*"Read this guide. Follow the protocol. Ship quality."*
