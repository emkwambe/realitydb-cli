# RealityDB New Chat Prompt — Copy and Paste This

---

## For Dataset Generation (Financial Variants)

```
You are helping me build production-quality synthetic database templates for RealityDB, a CLI tool that generates realistic test data.

BEFORE DOING ANYTHING, read these three documents from our GitHub repo:

1. https://raw.githubusercontent.com/emkwambe/databox/main/docs/NEW-CHAT-GENERATION-GUIDE.md
2. https://raw.githubusercontent.com/emkwambe/databox/main/docs/QUALITY-STANDARDS.md
3. https://raw.githubusercontent.com/emkwambe/databox/main/docs/DATASET-GENERATION-PROTOCOL.md

These documents contain:
- The 6 moats every dataset MUST meet (FK integrity, temporal ordering, lifecycle states, cardinality, provenance, quality score ≥95)
- The 7-gate protocol for generating and publishing datasets
- Critical NEVER-DO rules (wrong file for run handler, turbo cache, BOM encoding, etc.)
- The exact file locations, CLI commands, and deployment steps

CRITICAL RULES:
- The ACTUAL `run` command handler is in `apps/cli/src/index.ts` (~line 155), NOT in `apps/cli/src/commands/run.ts`
- Always clear global turbo cache after engine changes: Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force
- Every enum MUST have research-backed weights with a `_citation` field. NO uniform distributions.
- NO mock placeholders (mock_past_date, sample_text_, etc.) — if found, fix `packages/engine/src/generators.ts`
- Templates are created in Studio v4 format (array-based with fkTarget), then converted with `comply doctor --fix`
- All PowerShell commands must use absolute paths, never `cd`
- File writes must use `[System.IO.File]::WriteAllText()` for BOM-free UTF-8
- Run smoke test (`npm test` in apps/cli/) before ANY publish — must be 146+ tests, all green

CURRENT STATE:
- CLI version: v2.37.7 published to npm (@realitydb/cli)
- 13 templates in R2 (8 original + 5 oncology v2)
- 6 templates bundled in CLI (universal, healthcare, oncology, supply-chain, telecom, fintech)
- Smoke test: 146 auto-scaling tests, wired to prepublishOnly
- Engine: Real data generators (no more mock placeholders)
- Assessment: Synthetic provenance detection (Privacy 100/100 for RealityDB-generated data)

TASK: Build financial domain variant schemas using the research in:
C:\Users\HP\Documents\realitydb-internal\FINANCIAL-VARIANTS-RESEARCH.md

Priority order:
1. AML (Anti-Money Laundering) — smurfing/layering with <2% fraud class imbalance
2. Credit Risk & Default — loan portfolio with FICO-correlated defaults
3. Impossible Travel Fraud — geographically impossible card transactions
4. Insurance Lifecycle — quote → bind → incident → claim → payout
5. SaaS Fintech Billing — subscriptions with dunning cycles

For EACH variant:
1. Research enum distributions with web search (cite sources)
2. Create schema JSON in Studio v4 format (array-based tables with fkTarget)
3. Save to C:\Users\HP\Documents\realityDB Packs\Finance_v1\
4. Run: comply doctor --fix → run --rows 500 → inspect for mocks → assess (must be ≥95)
5. If passes: generate 5K + 10K → upload to R2
6. Follow the 7-gate protocol exactly

The schema format template is in the generation guide. Use the project management SaaS template from the guide as structural reference.

Windows PowerShell only. All file paths are Windows. The databox repo is at C:\Users\HP\Documents\databox.
```

---

## For CLI/Engine Bug Fixes

```
You are helping me fix bugs in the RealityDB CLI, a synthetic data generation tool.

BEFORE DOING ANYTHING, read this document:
https://raw.githubusercontent.com/emkwambe/databox/main/docs/NEW-CHAT-GENERATION-GUIDE.md

CRITICAL CONTEXT:
- The ACTUAL `run` command handler is in `apps/cli/src/index.ts` (~line 155), NOT `apps/cli/src/commands/run.ts`
- The CLI uses tsup (ESBuild) with turbo caching. After ANY engine change, clear GLOBAL cache:
  npx turbo daemon stop
  Remove-Item "$env:LOCALAPPDATA\turbo" -Recurse -Force
  Remove-Item "C:\Users\HP\Documents\databox\apps\cli\dist" -Recurse -Force
  npm run build
- Engine generators are in `packages/engine/src/generators.ts`
- Assessment logic is in `apps/cli/src/commands/assess.ts`
- `@databox/templates` is EXTERNAL in tsup.config.ts — changes to templates package won't be bundled
- NEVER run `pnpm add/remove` in `apps/cli/` — breaks workspace junction
- Always run smoke test after fixes: `npm test` in apps/cli/ (146+ tests)
- Use `[System.IO.File]::WriteAllText()` for all file writes (BOM-free UTF-8)
- Use absolute paths in PowerShell, never `cd`

GitHub: https://github.com/emkwambe/databox
CLI: @realitydb/cli@2.37.7 on npm
Windows PowerShell only.
```

---

## For Landing Page / Product Page Work

```
You are helping me update the RealityDB product pages (landing page, store, simlab, enterprise).

BEFORE DOING ANYTHING, read these documents:
1. https://raw.githubusercontent.com/emkwambe/databox/main/docs/NEW-CHAT-GENERATION-GUIDE.md (infrastructure section)
2. C:\Users\HP\Documents\realitydb-internal\PRODUCT-CLARITY-MATRIX.md (product definitions)
3. C:\Users\HP\Documents\realitydb-internal\USE-CASE-PRICING-GUIDE.md (pricing)

CURRENT STATE:
- Sandbox: sandbox.realitydb.dev (Cloudflare Pages, repo: C:\Users\HP\Documents\realitydb-sandbox)
- 13 templates in R2 Store (8 original + 5 oncology v2)
- Oncology v2 variants NOT yet in Store catalog or SimLab UI (need DATASET_PRICING + TEMPLATE_META updates)
- Deploy: npm run build && npx wrangler pages deploy dist --project-name realitydb-sandbox --commit-dirty=true

KEY PRODUCT RULE:
- Generation = synthetic from scratch (zero PII)
- Masking = sanitize production data (replace PII)
- NEVER conflate these two. They serve different personas.

App.tsx render chain (order matters):
Line ~878: Store bypass
Line ~882: HireSQL bypass
Line ~886: Certify bypass
Line ~890: SimLab bypass → SimLabPage
Line ~894: Enterprise bypass → EnterprisePage
Line ~898: showLanding guard → LandingPage
Line ~920: Learn flow
Line ~1020: ProductHub catch-all

All product page callbacks must use navigateToProduct(), not setShowXxx().
Product checks go BEFORE the showLanding guard.
```

---

## For Oncology v2 Continuation

```
You are helping me build oncology dataset variants for RealityDB.

BEFORE DOING ANYTHING, read:
1. https://raw.githubusercontent.com/emkwambe/databox/main/docs/NEW-CHAT-GENERATION-GUIDE.md
2. https://raw.githubusercontent.com/emkwambe/databox/main/docs/QUALITY-STANDARDS.md
3. C:\Users\HP\Documents\realitydb-internal\ONCOLOGY-VARIANTS-RESEARCH.md

COMPLETED VARIANTS (all in R2, all 99-100/100):
- breast-cancer: 12 tables, 85 cols (Howlader JNCI 2014, ACS 2024)
- lung-cancer: 14 tables, 105 cols (PMC8085514, NCCN)
- clinical-trial: 15 tables, 113 cols (CTCAE v5.0, ICH E2A)
- rwd-ehr: 16 tables, 125 cols (CMS, LOINC, CPT)
- immuno-oncology: 12 tables, 103 cols (Chen-Mellman, iRECIST)

Pack files: C:\Users\HP\Documents\realityDB Packs\Oncology_v.2\

REMAINING WORK:
- Add 5 oncology v2 variants to Store catalog (DATASET_PRICING in Lab API)
- Add to SimLabPage and DataStorePage TEMPLATE_META
- Optionally bundle in CLI
- Create additional sub-variants if needed

Every enum must have research-backed weights with _citation field.
Follow the 7-gate protocol for any new variant.
```

---

## Quick Reference for ANY New Chat

```
ESSENTIAL CONTEXT FOR REALITYDB WORK:

GitHub: https://github.com/emkwambe/databox
Docs: https://raw.githubusercontent.com/emkwambe/databox/main/docs/NEW-CHAT-GENERATION-GUIDE.md

Key locations:
- CLI entry point: apps/cli/src/index.ts (the ACTUAL run handler)
- Engine: packages/engine/src/generators.ts
- Assessment: apps/cli/src/commands/assess.ts
- Packs: apps/cli/src/packs/*.json
- Smoke test: apps/cli/smoke-test.cjs (146+ tests)
- Internal docs: C:\Users\HP\Documents\realitydb-internal\

NEVER:
- Edit commands/run.ts for --pack changes (dead code)
- Skip turbo cache clearing after engine changes
- Publish without smoke test (npm test)
- Use uniform enum distributions without citation
- Ship data with mock_past_date or sample_text_ values
- Run pnpm add/remove in apps/cli/
- Use Set-Content (adds BOM) — use [System.IO.File]::WriteAllText()

ALWAYS:
- Read the generation guide first
- Research enum weights with citations
- Follow 7-gate protocol
- Assess quality ≥95 before uploading
- Use absolute paths in PowerShell
- Clear global turbo cache after engine changes
- Run smoke test before publish
```
