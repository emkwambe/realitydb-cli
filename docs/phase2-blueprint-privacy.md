# RealityDB Phase 2 Blueprint — Privacy-Safe Analysis

**Project:** RealityDB — Developer Reality Platform  
**Phase:** 2 of N — Privacy-Safe Analysis Pipeline  
**Status:** DRAFT  
**Depends on:** v1.6.3 (MySQL support shipped, all 10 releases verified)  
**Owner:** Eddy (Technical Director) + Claude Chat (Lead Architect)  
**Executor:** Claude Code (Staff Engineer)

---

## Phase 2 Objective

Build a **PII sanitization layer** that makes `realitydb analyze` safe to run against production databases. After Phase 2, the analyze pipeline can read sample data from any database, detect and sanitize PII before it reaches the inference engine, generate enriched templates without exposing real values, and produce a compliance audit log — all in a single command.

At the end of Phase 2, the following must be true:

1. A sanitization engine detects PII in sample query results using regex patterns + optional NLP.
2. All sample values pass through sanitization before reaching `sampleAnalyzer` or `templateGenerator`.
3. PII is replaced with typed tokens (`[EMAIL_1]`, `[PERSON_1]`) using an in-memory-only token map.
4. The token map is **never persisted** — no disk, no database, no logs.
5. A SHA-256 hash-chain audit log records sanitization actions (counts and types, never actual PII values).
6. `realitydb analyze` is safe-by-default (`--unsafe-analyze` to bypass for local dev databases).
7. `realitydb analyze --auto-template` runs the full pipeline: connect → introspect → sample → sanitize → infer → generate template.

**Phase 2 does NOT include:** Differential privacy (ε, δ) formalization, cloud LLM routing, or masking of existing database rows (that's the `realitydb mask` command, a separate feature).

---

## Architecture: The Sanitization Flow

```
realitydb analyze [--auto-template] [--unsafe-analyze]
  │
  ├─ Schema Introspection (safe — metadata only, no sample data)
  │   └─ introspectDatabase() → DatabaseSchema
  │
  ├─ Sample Query Phase (PII risk zone)
  │   ├─ For each table/column: SELECT DISTINCT col FROM table LIMIT N
  │   ├─ Raw sample results
  │   │
  │   └─ ┌─────────────────────────────────────┐
  │      │  PII SANITIZATION BOUNDARY           │
  │      │                                       │
  │      │  1. Regex detection (70+ patterns)    │
  │      │  2. NLP detection (compromise lib)    │
  │      │  3. Vertical patterns (education,     │
  │      │     healthcare, fintech, legal)       │
  │      │  4. Token replacement                 │
  │      │     "john@bank.com" → [EMAIL_1]       │
  │      │     "Jane Smith" → [PERSON_1]         │
  │      │  5. Token map: in-memory ONLY         │
  │      │  6. Audit log entry (counts, no PII)  │
  │      └─────────────────────────────────────┘
  │
  ├─ Sanitized Statistics → sampleAnalyzer
  │   └─ { distinctCount: 847, nullRatio: 0.02, topTokens: ["[EMAIL_1]", ...] }
  │   └─ refineDetection() uses statistics, NOT raw values
  │
  ├─ Template Generation
  │   └─ generateTemplate() writes strategies, NOT sample values
  │   └─ For enums: if PII detected in values → use column name heuristic instead
  │
  ├─ Audit Log Finalized
  │   └─ { columns_analyzed: 47, pii_detected: 12, types: {email: 3, name: 5, phone: 2, ssn: 1, address: 1} }
  │   └─ SHA-256 hash chain for tamper detection
  │
  └─ Token map garbage-collected — real values gone
```

---

## Phase 2 Sprints

Phase 2 is divided into **3 sprints**.

---

### Sprint P1 — PII Sanitization Engine

**Objective:** Build the core sanitization engine in `packages/shared/src/security/` with regex-based PII detection, optional NLP detection, vertical-specific patterns, token replacement, and an in-memory token map.

#### Sprint P1 Prompt (for Claude Code)

```
Read: packages/shared/src/index.ts, packages/shared/src/types.ts,
      packages/shared/src/logger.ts, packages/shared/src/random.ts,
      packages/generators/src/analyze/sampleAnalyzer.ts,
      packages/generators/src/analyze/columnDetector.ts,
      packages/generators/src/analyze/templateGenerator.ts,
      packages/generators/src/mask/piiDetector.ts

CONTEXT:
RealityDB v1.6.3 is shipped. The `analyze` pipeline (sampleAnalyzer + columnDetector + 
templateGenerator) reads sample data from live databases to refine low-confidence column 
detections. The existing piiDetector.ts in the mask/ directory detects PII for the 
`realitydb mask` command using 70+ column NAME patterns — but it operates on column 
metadata, not on actual cell VALUES.

We need a new sanitization engine that operates on sample data VALUES — the actual 
cell contents returned by SELECT DISTINCT queries — to prevent PII from reaching the 
inference engine when analyzing production databases.

This is adapted from the OnPremAI sanitization architecture, which uses a 6-layer 
defense-in-depth approach with regex detection, NLP detection, tokenization, in-memory 
token maps, and audit logging.

OBJECTIVE:
Build a PII sanitization engine that detects and replaces PII in arbitrary string 
values, with an in-memory token map for reversible tokenization and three action modes.

REQUIREMENTS:

--- Core Types (packages/shared/src/security/types.ts) ---

1. PIICategory — union type:
   'ssn' | 'credit_card' | 'email' | 'phone' | 'date_of_birth' | 'ip_address' |
   'drivers_license' | 'bank_routing' | 'street_address' | 'person_name' |
   'organization_name' | 'medical_record' | 'student_id' | 'employee_id' |
   'passport' | 'vin'

2. PIIAction — 'block' | 'tokenize' | 'mask'
   - block: Replace entirely with [CATEGORY_BLOCKED] (e.g., [SSN_BLOCKED])
   - tokenize: Replace with numbered token [CATEGORY_N] (e.g., [EMAIL_1], [PERSON_2])
   - mask: Partially reveal (e.g., last 4 digits: "***-**-1234")

3. PIIPattern — { category: PIICategory, regex: RegExp, action: PIIAction, confidence: 'high' | 'medium' | 'low' }

4. PIIDetection — { 
     category: PIICategory, 
     action: PIIAction, 
     confidence: string,
     originalLength: number,     // length only, NOT the value
     replacement: string         // the token/mask that replaced it
   }

5. SanitizationResult — {
     sanitizedValue: string,
     detections: PIIDetection[],
     wasModified: boolean
   }

6. TokenMap — {
     tokens: Map<string, string>,    // "[EMAIL_1]" → original value
     counters: Map<PIICategory, number>,  // track next token number per category
   }
   CRITICAL: This type must have a JSDoc comment stating:
   "This map is held in process memory ONLY. It MUST NOT be serialized, 
   persisted to disk, written to logs, or transmitted over any network."

7. SanitizationReport — {
     totalValuesProcessed: number,
     totalDetections: number,
     detectionsByCategory: Record<PIICategory, number>,
     detectionsByAction: Record<PIIAction, number>
   }
   Note: This report contains COUNTS only, never actual PII values.

--- Pattern Registry (packages/shared/src/security/patterns.ts) ---

8. Universal PII patterns (HIGH confidence, action: block):
   - SSN: /\b\d{3}-\d{2}-\d{4}\b/ and /\b\d{9}\b/ (9 consecutive digits)
   - Credit card: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/
   - Passport: /\b[A-Z]\d{8}\b/i (US format)

9. Universal PII patterns (HIGH confidence, action: tokenize):
   - Email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i
   - Phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
   - IP address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/

10. Universal PII patterns (MEDIUM confidence, action: tokenize):
    - Date of birth: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/ (must validate as plausible date)
    - Street address: /\b\d{1,5}\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Ter|Cir)\b/i
    - Bank routing: /\b\d{9}\b/ (overlaps with SSN — check context)

11. Vertical-specific patterns (MEDIUM confidence, action: tokenize):
    - Healthcare: MRN /\bMRN[-:]?\s*\d{6,10}\b/i, NPI /\b\d{10}\b/ (with NPI context check)
    - Education: Student ID /\b(SID|STU)[-:]?\s*\d{5,10}\b/i
    - Fintech: Account number /\b\d{8,17}\b/ (only if column context suggests financial)
    - Legal: Case number /\b\d{2,4}[-]?[A-Z]{2,4}[-]?\d{3,8}\b/i

--- NLP Detection (packages/shared/src/security/nlpDetector.ts) ---

12. Optional NLP-based detection using the `compromise` library:
    - detectPersonNames(text: string): string[] — finds person names via NLP tagging
    - detectOrganizationNames(text: string): string[] — finds org names
    - detectPlaces(text: string): string[] — finds location names
    
    CRITICAL: This module must gracefully handle the case where `compromise` is NOT 
    installed. Use a try/catch dynamic import:
    
    ```typescript
    let nlp: any = null;
    try { nlp = (await import('compromise')).default; } catch { /* not installed */ }
    ```
    
    If `compromise` is not available, these functions return empty arrays and log a 
    debug message: "[realitydb] NLP detection unavailable — install 'compromise' for 
    enhanced name detection"
    
    `compromise` should be listed as an OPTIONAL peer dependency in packages/shared/package.json,
    NOT a required dependency.

--- Sanitizer Engine (packages/shared/src/security/sanitizer.ts) ---

13. createSanitizer(options?: { verticals?: string[] }): Sanitizer
    - Builds the pattern registry based on which verticals are enabled
    - Default verticals: all enabled
    - Returns a Sanitizer instance

14. Sanitizer class/object with methods:
    
    sanitizeValue(value: unknown, context?: { tableName?: string, columnName?: string }): SanitizationResult
    - If value is not a string, return unchanged (numbers, booleans, nulls are not PII)
    - Run all regex patterns against the string value
    - If NLP is available, also run NLP detection
    - For each detection, apply the configured action (block/tokenize/mask)
    - Multiple detections in a single value are all replaced
    - Context (table/column name) can influence confidence (e.g., a 10-digit number 
      in a column named "phone" is HIGH confidence phone, but in a column named 
      "total_amount" it's not PII)
    
    sanitizeSampleResults(samples: unknown[], context?: { tableName?: string, columnName?: string }): { sanitized: unknown[], report: SanitizationReport }
    - Batch sanitize an array of sample values
    - Return both the sanitized array and a summary report
    
    getTokenMap(): TokenMap (read-only access)
    - Returns the current token map for potential detokenization
    - Used ONLY for displaying results back to the user in the same process
    
    getReport(): SanitizationReport
    - Returns detection counts by category and action
    
    destroy(): void
    - Clears the token map from memory
    - Should be called when the analyze operation completes
    - After destroy(), getTokenMap() returns an empty map

--- Free-Text Deep Scanning (packages/shared/src/security/sanitizer.ts) ---

15. Free-text column detection and deep scanning:
    
    The sanitizer must identify **free-text columns** — columns where users type 
    arbitrary prose that may contain embedded PII. Detection heuristics:
    - Column name matches: /notes|bio|description|comments|remarks|narrative|summary|details|message|body|content|text|memo|reason/i
    - Column data type is TEXT, MEDIUMTEXT, LONGTEXT, or VARCHAR with maxLength > 500
    - Column is nullable (free-text fields are almost always nullable)
    
    When a column is identified as free-text:
    - Increase sample size: scan up to 3x the normal sample count for this column
    - Apply ALL regex patterns (not just high-confidence ones)
    - If NLP is available: always run NLP detection on free-text samples
    - Log: "[realitydb] Column {table}.{col}: identified as free-text — applying deep PII scan"
    
    Add to SanitizationResult:
    - isFreeTextField: boolean
    
    Add to SanitizationReport:
    - freeTextColumnsScanned: number
    - freeTextDetections: number

--- Authorized Re-Identification Export (packages/shared/src/security/sanitizer.ts) ---

16. Optional encrypted token map export for authorized re-identification:
    
    exportTokenMap(passphrase: string): string
    - Encrypts the current token map using AES-256-GCM with a user-provided passphrase
    - Uses Node.js crypto: crypto.createCipheriv('aes-256-gcm', ...)
    - Key derived from passphrase via PBKDF2 (100,000 iterations, SHA-512)
    - Returns a base64-encoded encrypted blob
    - This is the ONLY way token mappings can leave process memory
    - The exported blob is useless without the passphrase
    
    importTokenMap(encrypted: string, passphrase: string): TokenMap
    - Static method — creates a new TokenMap from an encrypted export
    - Decrypts with the provided passphrase
    - Returns the restored token map for re-identification
    - Throws clear error if passphrase is wrong
    
    Use case: A compliance officer runs `realitydb analyze`, the system detects PII 
    and generates a token map. The officer exports the map with a passphrase they 
    choose. Later, they can re-import it to map "[EMAIL_1]" back to the original 
    email for an authorized audit investigation — but only with the passphrase.
    
    CLI integration:
    - `realitydb analyze --export-token-map ./token-map.enc`
      → Prompts for passphrase (never shown on screen)
      → Writes encrypted blob to file
    - `realitydb audit re-identify --token-map ./token-map.enc`
      → Prompts for passphrase
      → Prints the token → original value mapping
    
    CRITICAL: The encrypted file and passphrase are the user's responsibility.
    RealityDB does not store either. If the passphrase is lost, the mapping is
    unrecoverable — this is by design.

--- Index Exports (packages/shared/src/security/index.ts) ---

17. Export: createSanitizer, all types
    Do NOT export the raw patterns array — it's internal to the sanitizer.
    Do NOT export the TokenMap values — only the Sanitizer methods expose them.

16. packages/shared/src/index.ts — add re-export from security/

CONSTRAINTS:
- The TokenMap MUST NOT be serializable — do not implement toJSON() on it
- No detection result may contain the original PII value — only category, action, confidence, and originalLength
- The sanitizer must be stateful (tracks token counters across multiple calls in one session) but NOT persistent
- All pattern matching must be case-insensitive where appropriate
- Do NOT modify any existing files in packages/generators/src/mask/ — that's a separate system
- Do NOT modify any CLI commands — Sprint P2 handles integration
- Do NOT add `compromise` as a required dependency — optional peer only
- Commit with message: "feat: add PII sanitization engine with tokenization and NLP detection"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify createSanitizer is exported from @databox/shared
3. Write an inline test:
   ```
   const s = createSanitizer();
   const r1 = s.sanitizeValue("john.smith@bankofamerica.com");
   // r1.sanitizedValue should be "[EMAIL_1]"
   // r1.detections[0].category should be "email"
   
   const r2 = s.sanitizeValue("My SSN is 123-45-6789");
   // r2.sanitizedValue should be "My SSN is [SSN_BLOCKED]"
   
   const r3 = s.sanitizeValue("Call me at 704-555-1234");
   // r3.sanitizedValue should be "Call me at [PHONE_1]"
   
   const report = s.getReport();
   // report.totalDetections should be 3
   // report.detectionsByCategory.email should be 1
   
   s.destroy();
   // s.getTokenMap().tokens.size should be 0
   ```
4. Verify compromise is NOT in dependencies, only optionalPeerDependencies
Report: build status, inline test results, exported symbols
```

#### Sprint P1 Checklist

```
## Sprint P1 — PII Sanitization Engine

### Types (7 points)
- [ ] PIICategory union type with 16 categories
- [ ] PIIAction with block/tokenize/mask modes
- [ ] PIIPattern with category, regex, action, confidence
- [ ] PIIDetection contains NO original PII value (only category, length, replacement)
- [ ] SanitizationResult with sanitizedValue, detections, wasModified
- [ ] TokenMap has JSDoc warning about in-memory-only requirement
- [ ] SanitizationReport contains counts only, never PII values

### Pattern Registry (5 points)
- [ ] SSN, credit card, passport patterns (HIGH confidence, block action)
- [ ] Email, phone, IP patterns (HIGH confidence, tokenize action)
- [ ] Date of birth, street address patterns (MEDIUM confidence, tokenize)
- [ ] Vertical patterns: healthcare MRN/NPI, education student ID, fintech account, legal case
- [ ] All patterns are case-insensitive where appropriate

### NLP Detection (3 points)
- [ ] Person name detection via compromise (when available)
- [ ] Graceful fallback when compromise not installed (empty arrays, debug log)
- [ ] compromise listed as optional peer dependency only

### Sanitizer Engine (7 points)
- [ ] createSanitizer() builds pattern registry with configurable verticals
- [ ] sanitizeValue() detects and replaces PII in string values
- [ ] sanitizeValue() passes through non-string values unchanged
- [ ] sanitizeValue() uses context (table/column name) to adjust confidence
- [ ] sanitizeSampleResults() batch-processes arrays and returns report
- [ ] getTokenMap() provides read-only access to in-memory map
- [ ] destroy() clears all token data from memory

### Security Invariants (4 points)
- [ ] TokenMap is NOT serializable (no toJSON)
- [ ] No PIIDetection contains original PII value
- [ ] Token map never written to disk/database/logs (except via encrypted export)
- [ ] SanitizationReport contains counts only

### Free-Text Deep Scanning (3 points)
- [ ] Free-text columns detected by name pattern and data type
- [ ] Deep scan applies all patterns + NLP to free-text columns
- [ ] SanitizationReport includes freeTextColumnsScanned and freeTextDetections counts

### Authorized Re-Identification (4 points)
- [ ] exportTokenMap() encrypts with AES-256-GCM + PBKDF2 passphrase
- [ ] importTokenMap() decrypts and restores the token map
- [ ] Wrong passphrase throws clear error (does not silently produce garbage)
- [ ] No unencrypted token data ever written to disk

### Architecture (2 points)
- [ ] No modifications to existing mask/ directory
- [ ] Exported from @databox/shared via security/index.ts

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add PII sanitization engine with tokenization and NLP detection"

Score: __/37 PASS
Gate: ALL must be ✅ to proceed to Sprint P2
```

---

### Sprint P2 — Integrate Sanitizer into Analyze Pipeline + Auto-Template

**Objective:** Wire the sanitization engine into the `sampleAnalyzer` and `templateGenerator` pipeline so all sample data is sanitized before reaching the inference engine. Add the `--auto-template` and `--unsafe-analyze` flags.

#### Sprint P2 Prompt (for Claude Code)

```
Read: packages/generators/src/analyze/sampleAnalyzer.ts,
      packages/generators/src/analyze/columnDetector.ts,
      packages/generators/src/analyze/templateGenerator.ts,
      packages/shared/src/security/sanitizer.ts,
      packages/shared/src/security/types.ts,
      packages/shared/src/security/index.ts,
      packages/core/src/scanPipeline.ts,
      packages/core/src/seedPipeline.ts,
      apps/cli/src/commands/scan.ts,
      apps/cli/src/commands/seed.ts,
      packages/config/src/types.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint P1 built the PII sanitization engine in packages/shared/src/security/ with 
regex + NLP detection, three action modes (block/tokenize/mask), in-memory token map, 
and a SanitizationReport that contains counts but never PII values.

Now we wire it into the analyze pipeline so `realitydb analyze` is safe-by-default 
against production databases, and add `--auto-template` to close the inference gap.

OBJECTIVE:
Integrate the sanitization boundary into the sample analysis pipeline and add the 
auto-template generation flow.

REQUIREMENTS:

--- Sanitized Sample Analyzer (packages/generators/src/analyze/) ---

1. Modify sampleAnalyzer.ts to accept a Sanitizer instance:
   
   analyzeSamples(pool, schema, options?: { sanitizer?: Sanitizer }): AnalysisResults
   
   Before processing sample values:
   - If sanitizer is provided: call sanitizer.sanitizeSampleResults() on each 
     column's sample values
   - Pass ONLY the sanitized values to the existing analysis logic
   - The analysis logic (distinct count, null ratio, top values) works on 
     sanitized tokens — this is fine because:
     * distinctCount is preserved (tokenization is 1:1)
     * nullRatio is preserved (nulls aren't tokenized)
     * Top values become tokens — but the COUNT is what matters for enum detection
   
   - If sanitizer is NOT provided (--unsafe-analyze mode): existing behavior unchanged

2. Modify templateGenerator.ts:
   
   When generating enum strategies from sample data:
   - If sample values contain PII tokens (match /\[.*_\d+\]/ or /\[.*_BLOCKED\]/):
     * Do NOT include tokenized values in the template's enum values
     * Instead, fall back to the column name heuristic from strategyInference.ts
     * Log: "[realitydb] Column {table}.{col}: PII detected in sample values, 
       using name-based inference instead of sample-derived enum"
   - If sample values are clean: use them as enum values (existing behavior)

3. Modify refineDetection() in templateGenerator.ts:
   - Accept optional SanitizationReport for the column
   - If PII was detected: upgrade confidence for PII-type strategies
     * If column had emails detected → force kind: 'email' at HIGH confidence
     * If column had phone numbers → force kind: 'phone' at HIGH confidence
     * If column had person names → force kind: 'full_name' or 'first_name'/'last_name' at HIGH confidence
   - This is the KEY INSIGHT: PII detection IMPROVES inference accuracy. 
     Finding real emails in the sample CONFIRMS the column is an email column.

--- Analyze Pipeline (packages/core/src/analyzePipeline.ts) — NEW FILE ---

4. Create a new pipeline orchestrator:
   
   analyzeDatabase(config: DataboxConfig, options: AnalyzeOptions): Promise<AnalyzeResult>
   
   AnalyzeOptions = {
     safeMode: boolean,          // default: true (sanitization on)
     autoTemplate: boolean,      // default: false
     outputPath?: string,        // where to write the generated template
     sampleSize?: number,        // default: 100 rows per column
     verticals?: string[],       // which PII verticals to detect
   }
   
   AnalyzeResult = {
     schema: DatabaseSchema,
     analysis: AnalysisResults,
     template?: object,          // if autoTemplate is true
     sanitizationReport?: SanitizationReport,  // if safeMode is true
     templatePath?: string,      // if template was written to disk
   }
   
   Flow:
   a. Create Postgres/MySQL pool from config
   b. Test connection
   c. Introspect schema
   d. If safeMode: create sanitizer with configured verticals
   e. Run analyzeSamples(pool, schema, { sanitizer })
   f. If autoTemplate: run generateTemplate(analysis) → write to outputPath
   g. Sanitizer.destroy() — clear token map from memory
   h. Close connection
   i. Return AnalyzeResult with sanitization report
   
   Must close connection AND destroy sanitizer in all code paths (try/finally)

5. Export from packages/core/src/index.ts

--- CLI Integration (apps/cli/) ---

6. Create apps/cli/src/commands/analyze.ts:
   
   Command: realitydb analyze
   
   Options:
   --unsafe-analyze    Disable PII sanitization (for local dev databases only)
   --auto-template     Generate a domain template from analysis results
   --output <path>     Output path for generated template (default: ./realitydb-template.json)
   --sample-size <n>   Number of sample rows per column (default: 100)
   --verticals <list>  Comma-separated PII verticals to detect (default: all)
   
   Output format:
   ```
   RealityDB Schema Analysis
   ══════════════════════════════════
   Database: postgres://user:****@localhost:5432/mydb
   Tables: 26 | Columns: 516 | Foreign Keys: 52
   
   Analysis Summary:
     High confidence:   278 columns (54%)
     Medium confidence:  154 columns (30%)
     Low confidence:      84 columns (16%)
   
   PII Sanitization: ✅ ENABLED
     Values scanned:     2,600
     PII detected:       47 instances
     Categories:         email (12), phone (8), person_name (15), address (7), ssn (3), student_id (2)
     Action:             All sanitized before inference — no PII in output
   
   Template generated: ./realitydb-template.json
     Columns enriched by sample analysis: 154 (30% uplift from auto-inference alone)
   
   Analysis complete. Use: realitydb seed --template ./realitydb-template.json --seed 42
   ```
   
   If --unsafe-analyze:
   ```
   PII Sanitization: ⚠️  DISABLED (--unsafe-analyze)
     Warning: Sample values were NOT sanitized. Do not use this mode on production databases.
   ```
   
   If --export-token-map <path>:
   - Prompt for passphrase (use readline, mask input)
   - Call sanitizer.exportTokenMap(passphrase)
   - Write encrypted blob to the specified path
   - Print: "Token map exported (AES-256-GCM encrypted) → <path>"

7. Wire the analyze command into apps/cli/src/cli.ts

8. Add to apps/cli/src/commands/audit.ts (extend from Sprint P3):
   
   Subcommand: realitydb audit re-identify --token-map <path>
   - Prompt for passphrase
   - Decrypt and import token map
   - Print the token → original value mappings
   - Destroy the imported map after display

--- Auto-Template Integration with Seed ---

8. Modify apps/cli/src/commands/seed.ts to accept --auto-template:
   
   realitydb seed --auto-template --records 500 --seed 42
   
   This runs: analyze → generate template → feed template into overlay algebra → seed
   All in one command. The sanitizer is active during the analyze phase.

--- Config Extension ---

9. Extend DataboxConfig type in packages/config/src/types.ts:
   
   analyze?: {
     safeMode?: boolean,         // default: true
     sampleSize?: number,        // default: 100
     verticals?: string[],       // default: all
     autoTemplateOutput?: string  // default: './realitydb-template.json'
   }

CONSTRAINTS:
- Sanitizer.destroy() MUST be called in all code paths (try/finally)
- --unsafe-analyze must print a visible warning
- Template files must NEVER contain raw sample values — only strategy definitions
- The analyze command must NOT contain business logic — delegate to analyzePipeline
- Do NOT modify the existing mask/ directory or mask command
- Do NOT break any existing commands (scan, seed, reset, export)
- Commit with message: "feat: wire PII sanitization into analyze pipeline with auto-template"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Verify `realitydb analyze --help` shows all options
3. Verify `realitydb analyze` against a local database:
   - Shows analysis summary with confidence breakdown
   - Shows sanitization report with detection counts
   - If --auto-template: generates template file
4. Verify `realitydb analyze --unsafe-analyze` prints warning
5. Verify generated template file contains NO raw sample values
6. Verify sanitizer is destroyed after analyze completes (no memory leak)
Report: build status, analyze output, template file contents (spot-check for PII)
```

#### Sprint P2 Checklist

```
## Sprint P2 — Integrate Sanitizer into Analyze Pipeline

### Sample Analyzer Integration (4 points)
- [ ] analyzeSamples accepts optional Sanitizer instance
- [ ] Sample values pass through sanitizer before analysis logic
- [ ] Statistics (distinctCount, nullRatio) preserved after sanitization
- [ ] Without sanitizer (unsafe mode): existing behavior unchanged

### Template Generator Integration (3 points)
- [ ] Enum values from PII-contaminated samples trigger fallback to name heuristic
- [ ] PII detection IMPROVES inference (email found → confirm kind: 'email')
- [ ] Generated template contains NO raw sample values

### Analyze Pipeline (5 points)
- [ ] analyzePipeline.ts orchestrates: connect → introspect → sanitize → analyze → template
- [ ] Sanitizer.destroy() called in all code paths (try/finally)
- [ ] Connection closed in all code paths
- [ ] Returns SanitizationReport with counts (no PII values)
- [ ] Exported from @databox/core

### CLI Analyze Command (7 points)
- [ ] `realitydb analyze` works with formatted output
- [ ] --unsafe-analyze disables sanitization with visible warning
- [ ] --auto-template generates template file
- [ ] --output controls template file path
- [ ] --export-token-map prompts for passphrase and writes encrypted file
- [ ] Analyze command contains NO business logic (delegates to pipeline)
- [ ] `realitydb audit re-identify --token-map <path>` decrypts and displays mappings

### Auto-Template in Seed (2 points)
- [ ] `realitydb seed --auto-template` runs analyze → template → seed in one command
- [ ] Sanitizer active during analyze phase of auto-template seed

### Config Extension (2 points)
- [ ] DataboxConfig extended with analyze section
- [ ] Default values applied for all optional fields

### Security Invariants (3 points)
- [ ] Template file verified PII-free (no raw values, only strategy definitions)
- [ ] Sanitizer destroyed after every analyze operation
- [ ] --unsafe-analyze warning clearly visible in output

### Architecture (2 points)
- [ ] No modifications to existing mask/ directory
- [ ] No existing commands broken (scan, seed, reset, export)

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: wire PII sanitization into analyze pipeline with auto-template"

Score: __/30 PASS
Gate: ALL must be ✅ to proceed to Sprint P3
```

---

### Sprint P3 — SHA-256 Audit Trail + Compliance Documentation

**Objective:** Build a tamper-evident audit log for all sanitization and analysis operations, producing compliance-ready evidence for SOC 2 / GDPR / HIPAA reviews.

#### Sprint P3 Prompt (for Claude Code)

```
Read: packages/shared/src/security/sanitizer.ts,
      packages/shared/src/security/types.ts,
      packages/core/src/analyzePipeline.ts,
      apps/cli/src/commands/analyze.ts,
      docs/architecture-guardrails.md

CONTEXT:
Sprint P1 built the PII sanitization engine. Sprint P2 integrated it into the 
analyze pipeline with auto-template generation. The system now safely analyzes 
production databases without exposing PII.

Now we add a tamper-evident audit trail that documents every sanitization operation 
for compliance reviews.

OBJECTIVE:
Build a SHA-256 hash-chain audit log that records analysis and sanitization events 
with tamper detection, suitable for SOC 2 Type II and GDPR Article 30 evidence.

REQUIREMENTS:

--- Audit Types (packages/shared/src/security/auditTypes.ts) ---

1. AuditEntry = {
     id: string,                    // UUID
     timestamp: string,             // ISO 8601
     eventType: AuditEventType,
     details: AuditEventDetails,
     previousHash: string,          // SHA-256 of previous entry (chain link)
     hash: string                   // SHA-256 of this entry (including previousHash)
   }

2. AuditEventType = 
   'analysis_started' | 'analysis_completed' |
   'sanitization_applied' | 'sanitization_bypassed' |
   'template_generated' | 'pii_detected_summary' |
   'connection_established' | 'connection_closed'

3. AuditEventDetails (discriminated union by eventType):
   
   analysis_started: {
     database: string,             // connection string with password masked
     tableCount: number,
     safeMode: boolean,
     verticals: string[]
   }
   
   pii_detected_summary: {
     tableName: string,
     columnName: string,
     detectionsCount: number,
     categories: PIICategory[],    // which types found (NOT the values)
     actionsTaken: PIIAction[]     // which actions applied
   }
   NOTE: This entry NEVER contains actual PII values — only categories and counts.
   
   sanitization_applied: {
     totalValuesProcessed: number,
     totalDetections: number,
     detectionsByCategory: Record<PIICategory, number>,
     safeMode: true
   }
   
   sanitization_bypassed: {
     reason: 'unsafe_analyze_flag',
     safeMode: false
   }
   
   template_generated: {
     outputPath: string,
     columnsEnriched: number,
     confidenceBreakdown: { high: number, medium: number, low: number }
   }
   
   analysis_completed: {
     duration_ms: number,
     tablesAnalyzed: number,
     columnsAnalyzed: number,
     piiDetections: number,
     templateGenerated: boolean
   }

--- Audit Logger (packages/shared/src/security/auditLogger.ts) ---

4. createAuditLogger(): AuditLogger

5. AuditLogger methods:
   
   log(eventType: AuditEventType, details: AuditEventDetails): AuditEntry
   - Creates a new AuditEntry with:
     * UUID id
     * Current ISO timestamp
     * SHA-256 hash of: previousHash + timestamp + eventType + JSON(details)
     * Links to previous entry's hash (genesis entry has previousHash = "0")
   - Appends to in-memory chain
   - Returns the new entry
   
   getChain(): AuditEntry[]
   - Returns the full chain (read-only copy)
   
   verify(): { valid: boolean, brokenAt?: number }
   - Walks the chain and recomputes hashes
   - If any entry's hash doesn't match recomputation: returns { valid: false, brokenAt: index }
   - If chain is intact: returns { valid: true }
   
   exportJSON(): string
   - Serializes the full chain as JSON
   - Suitable for writing to file or attaching to compliance reports
   - CRITICAL: Verify no PII values leaked into any entry before export
   
   exportForCompliance(): ComplianceReport
   - Produces a summary document with:
     * Chain length and integrity status
     * Total PII detections by category
     * Sanitization actions summary
     * Database analyzed (masked connection string)
     * Timestamp range
     * Template generation details

6. SHA-256 hashing:
   - Use Node.js crypto module: crypto.createHash('sha256')
   - Hash input: `${previousHash}|${timestamp}|${eventType}|${JSON.stringify(details)}`
   - Output as hex string

--- Integration into Analyze Pipeline ---

7. Modify analyzePipeline.ts:
   - Create AuditLogger at start of analyzeDatabase()
   - Log 'analysis_started' when connecting
   - Log 'pii_detected_summary' for each column where PII was found
   - Log 'sanitization_applied' or 'sanitization_bypassed' based on safeMode
   - Log 'template_generated' if auto-template was used
   - Log 'analysis_completed' with timing and summary stats
   - Include the audit chain in AnalyzeResult
   - Write audit log to file: `.realitydb-audit-{timestamp}.json`

8. Modify CLI analyze command:
   - Print audit summary at end of output:
     ```
     Audit Trail: 12 entries | Chain integrity: ✅ VERIFIED
     Audit log written to: .realitydb-audit-2026-03-14T20-30-00.json
     ```
   - If --verbose: print each audit entry

--- Compliance Report Command ---

9. Create apps/cli/src/commands/audit.ts:
   
   Command: realitydb audit <log-file>
   
   Subcommands:
   - realitydb audit verify <log-file>     — Verify chain integrity
   - realitydb audit summary <log-file>    — Print compliance summary
   
   Output for verify:
   ```
   Audit Chain Verification
   ══════════════════════════════════
   File: .realitydb-audit-2026-03-14T20-30-00.json
   Entries: 12
   Chain integrity: ✅ VERIFIED (all hashes valid)
   Time range: 2026-03-14T20:30:00Z — 2026-03-14T20:30:04Z
   ```
   
   Output for summary:
   ```
   Compliance Summary
   ══════════════════════════════════
   Database: postgres://user:****@localhost:5432/mydb
   Analysis date: 2026-03-14T20:30:00Z
   
   PII Detection:
     Total detections: 47
     email: 12 | phone: 8 | person_name: 15 | address: 7 | ssn: 3 | student_id: 2
   
   Sanitization:
     Mode: SAFE (all PII sanitized before inference)
     Values processed: 2,600
     All detections handled: ✅
   
   Template:
     Generated: Yes → ./realitydb-template.json
     Columns enriched: 154
   
   Chain integrity: ✅ VERIFIED
   
   This report is suitable for SOC 2 Type II, GDPR Article 30, 
   and HIPAA Privacy Rule compliance evidence.
   ```

10. Wire audit command into apps/cli/src/cli.ts

CONSTRAINTS:
- Audit entries MUST NOT contain actual PII values — only categories and counts
- SHA-256 hashing must use Node.js crypto (already available, no new dependency)
- Audit log files should be .gitignore-able but not auto-gitignored
- The audit command must work offline (reads a JSON file, no DB connection needed)
- Do NOT modify the sanitizer engine (Sprint P1) — only consume its report
- Commit with message: "feat: add SHA-256 hash-chain audit trail for compliance"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile
2. Run `realitydb analyze --auto-template` against local database
3. Verify audit log file is created
4. Run `realitydb audit verify <log-file>` — should show ✅ VERIFIED
5. Run `realitydb audit summary <log-file>` — should show compliance report
6. Inspect audit log JSON — verify NO PII values in any entry
7. Tamper test: manually edit one hash in the log file, re-run verify — should show ❌ BROKEN
Report: build status, audit verify output, audit summary output, tamper test result
```

#### Sprint P3 Checklist

```
## Sprint P3 — SHA-256 Audit Trail + Compliance Documentation

### Audit Types (3 points)
- [ ] AuditEntry with id, timestamp, eventType, details, previousHash, hash
- [ ] AuditEventType covers all 7 event types
- [ ] AuditEventDetails discriminated union — NO PII values in any variant

### Audit Logger (6 points)
- [ ] createAuditLogger() produces a new logger with genesis hash "0"
- [ ] log() creates hash-chained entries with SHA-256
- [ ] getChain() returns read-only copy of chain
- [ ] verify() walks chain and detects tampered entries
- [ ] exportJSON() serializes chain (verified PII-free)
- [ ] exportForCompliance() produces summary report

### Pipeline Integration (4 points)
- [ ] analyzePipeline creates AuditLogger and logs all events
- [ ] analysis_started logged with masked connection string
- [ ] pii_detected_summary logged per-column (counts only)
- [ ] Audit chain included in AnalyzeResult

### CLI Commands (4 points)
- [ ] Analyze output shows audit summary line
- [ ] Audit log file written to .realitydb-audit-{timestamp}.json
- [ ] `realitydb audit verify` validates chain integrity
- [ ] `realitydb audit summary` prints compliance report

### Security Invariants (3 points)
- [ ] No audit entry contains actual PII values (verified by inspection)
- [ ] Tamper test: modified hash detected by verify command
- [ ] Audit log uses SHA-256 via Node.js crypto (no external dependency)

### Architecture (2 points)
- [ ] Audit command works offline (no DB connection needed)
- [ ] No modifications to Sprint P1 sanitizer engine

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: add SHA-256 hash-chain audit trail for compliance"

Score: __/24 PASS
Gate: ALL must be ✅ to close Phase 2
```

---

## Phase 2 Architecture Compliance Matrix

| # | Guardrail | Sprint P1 | Sprint P2 | Sprint P3 | Status |
|---|-----------|-----------|-----------|-----------|--------|
| 1 | Thin CLI / Strong Core | N/A | Analyze delegates to pipeline | Audit delegates to logger | ☐ |
| 2 | Schema Normalized Once | N/A | Analyze uses normalized schema | N/A | ☐ |
| 3 | Separate Planning from Execution | N/A | Analysis phase separate from generation | N/A | ☐ |
| 4 | Deterministic Generation | N/A | Sanitization doesn't affect seed determinism | N/A | ☐ |
| 5 | Dependency Safety | N/A | N/A | N/A | ☐ |
| 6 | Reality Packs Core Artifact | N/A | N/A | Audit log is compliance artifact | ☐ |
| 7 | Domain Templates First-Class | N/A | Auto-template generates domain templates | N/A | ☐ |
| 8 | Simulation Extensible | N/A | N/A | N/A | ☐ |
| 9 | Configuration Explicit | N/A | analyze config section in DataboxConfig | N/A | ☐ |
| 10 | Testability Non-Negotiable | Sanitizer is pure/testable | Pipeline testable with mock pool | Audit logger testable standalone | ☐ |
| 11 | Performance Must Scale | N/A | Sample size configurable | N/A | ☐ |
| 12 | Safe by Default | Sanitization default-on | --unsafe-analyze requires explicit flag | N/A | ☐ |
| 13 | Feature Discipline | No scope creep | No scope creep | No scope creep | ☐ |

---

## Phase 2 Completion Criteria

| Criteria | Requirement |
|----------|------------|
| Sprint P1 checklist | 37/37 ✅ |
| Sprint P2 checklist | 30/30 ✅ |
| Sprint P3 checklist | 24/24 ✅ |
| Architecture compliance | 13/13 ✅ (or N/A) |
| Demo walkthrough | `realitydb analyze --auto-template` against EduNode Supabase |
| Security test | Template file verified PII-free, audit chain verified |
| Git | 3 commits on feature branch |

**Phase 2 is COMPLETE when all criteria are met.**

---

## What Phase 3 Will Build On

Phase 3 — **Compliance Use Case Guides** (3 guides, ready after Phase 2 ships):

| # | Guide | Audience | Content |
|---|-------|----------|---------|
| 3.1 | HIPAA Compliance Masking | Healthcare teams (Atrium Health, Novant Health) | End-to-end walkthrough: connect to EHR schema → `realitydb analyze --auto-template` → verify PHI detection → `realitydb mask --mode hipaa` → export audit log → attach to privacy impact assessment |
| 3.2 | GDPR Data Anonymization | EU-facing SaaS teams | Walkthrough: identify PII columns → `realitydb mask --mode gdpr` → verify Article 30 audit log → export anonymized dataset → demonstrate data subject erasure compliance |
| 3.3 | Banking & Financial Data Masking | Charlotte banking corridor (Truist, BoA, Ally) | Walkthrough: connect to fintech schema → detect account numbers, SSNs, routing numbers → `realitydb mask --mode strict` → generate Reality Pack with zero PII → attach audit chain to SOC 2 Type II evidence package |

Additional Phase 3 options (Eddy's decision):
- **MySQL hardening sprint** — test against diverse MySQL column types (JSON, SET, GEOMETRY, GENERATED columns)
- **Reality Pack capture/load verification** — collaboration story
- **Normalizer column sort fix** — close the reproducibility theorem gap (add `columns.sort()` by ordinalPosition)
- **RESEARCH.md update** — add "Known Limitations and Open Problems" section
- **Landing page "Trust & Compliance" section** — driven by the masking + audit features from Phase 2

The Privacy-Safe Analysis pipeline from Phase 2 becomes the foundation for:
- Enterprise demos ("we can analyze your prod database without touching PII")
- PhD defense ("privacy by construction with audit evidence")
- Landing page "Trust & Compliance" section
