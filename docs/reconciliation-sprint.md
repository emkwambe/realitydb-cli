# RealityDB Phase 2 — Reconciliation Sprint

**Context:** Claude Code already shipped Track 1 (audit log, tokenizer, value scanners) and Track 2 (use case guides) on branch `claude/databox-platform-setup-KfIH1`. This reconciliation sprint extends that work to match the full Privacy-Safe Analysis blueprint.

**What exists and should NOT be rewritten:**
- `packages/generators/src/mask/auditLog.ts` — SHA-256 hash chain, working
- `packages/generators/src/mask/tokenizer.ts` — Deterministic tokenization, working
- `packages/generators/src/mask/valueScanners.ts` — 6 pattern groups, working
- `docs/guides/` — 6 guides, working
- `apps/cli/src/commands/mask.ts` — `--tokenize`, `--token-map`, `--deep-scan` flags, working

---

## Reconciliation Sprint R1 — Extend Sanitization + Wire Analyze Pipeline

### Prompt for Claude Code

```
Read: packages/generators/src/mask/tokenizer.ts,
      packages/generators/src/mask/valueScanners.ts,
      packages/generators/src/mask/auditLog.ts,
      packages/generators/src/mask/piiDetector.ts,
      packages/generators/src/mask/maskEngine.ts,
      packages/generators/src/mask/index.ts,
      packages/generators/src/analyze/sampleAnalyzer.ts,
      packages/generators/src/analyze/columnDetector.ts,
      packages/generators/src/analyze/templateGenerator.ts,
      packages/generators/src/index.ts,
      packages/core/src/maskPipeline.ts,
      packages/core/src/scanPipeline.ts,
      packages/core/src/seedPipeline.ts,
      packages/core/src/index.ts,
      packages/config/src/types.ts,
      packages/shared/src/index.ts,
      apps/cli/src/commands/mask.ts,
      apps/cli/src/commands/scan.ts,
      apps/cli/src/commands/seed.ts,
      apps/cli/src/cli.ts,
      docs/architecture-guardrails.md

CONTEXT:
RealityDB v1.6.3 is shipped with MySQL support. The previous sprint added:
- auditLog.ts: SHA-256 hash chain for mask operations
- tokenizer.ts: Deterministic tokenization with plain-text token map export
- valueScanners.ts: 6 regex pattern groups for value-level PII scanning
- mask.ts CLI: --tokenize, --token-map, --deep-scan flags
- 6 use case guides in docs/guides/

These are all good and working. This sprint EXTENDS them — do NOT rewrite or 
replace these files. Add to them, create new files alongside them, and wire 
new integration points.

OBJECTIVE:
Six tasks that close the gaps between what exists and the full blueprint:
1. Expand pattern coverage from 6 to 16+ categories
2. Add per-pattern action modes (block/tokenize/mask)
3. Add free-text column detection with deep scanning
4. Encrypt the token map (AES-256-GCM)
5. Create the analyze pipeline with --auto-template
6. Add standalone audit CLI commands

═══════════════════════════════════════════════════════════
TASK 1: Expand Pattern Coverage in valueScanners.ts
═══════════════════════════════════════════════════════════

Add these pattern groups to the existing VALUE_PATTERNS array in valueScanners.ts:

- person_name: Names are hard to regex. Add patterns for common formats:
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/  (two capitalized words — medium confidence)
  /\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/  (title + name — high confidence)
  threshold: 0.3, strategy: 'replace_name'

- street_address:
  /\b\d{1,5}\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Ter|Cir|Pike|Highway|Hwy)\b/i
  threshold: 0.2, strategy: 'replace_address'

- date_of_birth:
  /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/
  /\b(19|20)\d{2}[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])\b/
  threshold: 0.15, strategy: 'shift_date'

- drivers_license:
  /\b[A-Z]\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/  (generic US format)
  threshold: 0.1, strategy: 'replace_ssn'

- passport:
  /\b[A-Z]\d{8}\b/
  threshold: 0.1, strategy: 'replace_ssn'

- medical_record (healthcare vertical):
  /\bMRN[-:\s]?\d{6,10}\b/i
  /\bNPI[-:\s]?\d{10}\b/i
  /\b\d{3}-\d{2}-\d{4}\b/  (SSN format in medical context)
  threshold: 0.1, strategy: 'redact'

- student_id (education vertical):
  /\b(SID|STU|STUDENT)[-:\s]?\d{5,10}\b/i
  threshold: 0.15, strategy: 'replace_ssn'

- case_number (legal vertical):
  /\b\d{2,4}[-]?[A-Z]{2,4}[-]?\d{3,8}\b/i
  threshold: 0.1, strategy: 'redact'

- vin:
  /\b[A-HJ-NPR-Z0-9]{17}\b/  (17 chars, no I/O/Q)
  threshold: 0.1, strategy: 'redact'

- bank_routing:
  /\b0[0-9]\d{7}\b|\b1[0-2]\d{7}\b|\b[2-3][0-9]\d{7}\b/  (valid ABA prefix ranges)
  threshold: 0.1, strategy: 'replace_ssn'

Also add a PIICategory type extension if needed to cover these new categories.
The existing categories in piiDetector.ts should be the source of truth — 
add any missing categories to that type.

═══════════════════════════════════════════════════════════
TASK 2: Per-Pattern Action Modes
═══════════════════════════════════════════════════════════

Add an `action` field to each pattern group in VALUE_PATTERNS:

```typescript
action: 'block' | 'tokenize' | 'mask'
```

Assignment:
- block (irreversible, highest sensitivity): ssn, credit_card (in financial), passport, drivers_license
- tokenize (reversible): email, phone, person_name, medical_record, student_id
- mask (partial reveal): date_of_birth (shift), ip_address (mask last octet), bank_routing (last 4)

Update scanColumnValues() to return the action in ValueScanResult.

Update the mask pipeline integration: when --tokenize is NOT specified,
use the per-pattern action mode instead of the global mask-everything approach.
When --tokenize IS specified, override all actions to 'tokenize' (existing behavior preserved).

═══════════════════════════════════════════════════════════
TASK 3: Free-Text Column Detection
═══════════════════════════════════════════════════════════

Add to valueScanners.ts:

```typescript
const FREE_TEXT_NAME_PATTERNS = /^(notes|bio|biography|description|comments|remarks|narrative|summary|details|message|body|content|text|memo|reason|observation|feedback|review)$/i;

const FREE_TEXT_TYPE_PATTERNS = ['text', 'mediumtext', 'longtext'];

export function isFreeTextColumn(columnName: string, dataType: string, maxLength: number | null): boolean {
  if (FREE_TEXT_NAME_PATTERNS.test(columnName)) return true;
  if (FREE_TEXT_TYPE_PATTERNS.includes(dataType.toLowerCase())) return true;
  if (maxLength !== null && maxLength > 500) return true;
  return false;
}
```

Update scanColumnValues() signature:
```typescript
export function scanColumnValues(
  values: unknown[],
  options?: {
    maxSampleSize?: number,    // default 100
    isFreeText?: boolean,      // default false — if true, use 3x sample and all patterns
  }
): ValueScanResult[]
```

When isFreeText is true:
- Increase maxSampleSize to min(300, values.length)
- Lower all thresholds by 50% (e.g., 0.3 → 0.15) to catch sparse PII
- Log: "[realitydb] Deep scanning free-text column — enhanced detection active"

Update ValueScanResult to include:
```typescript
isFreeTextField: boolean
```

═══════════════════════════════════════════════════════════
TASK 4: Encrypted Token Map Export
═══════════════════════════════════════════════════════════

Add to tokenizer.ts:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';

/**
 * Encrypts a token map using AES-256-GCM with a user-provided passphrase.
 * Key derived via PBKDF2 (100,000 iterations, SHA-512).
 * This is the ONLY way token map data should leave process memory.
 */
export function encryptTokenMap(tokenMap: TokenMap, passphrase: string): string {
  const salt = randomBytes(16);
  const key = pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  const plaintext = JSON.stringify(tokenMap);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Pack: salt (16) + iv (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([salt, iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypts a token map using the passphrase used during encryption.
 * Throws if passphrase is wrong or data is tampered.
 */
export function decryptTokenMap(encryptedBase64: string, passphrase: string): TokenMap {
  const packed = Buffer.from(encryptedBase64, 'base64');
  
  const salt = packed.subarray(0, 16);
  const iv = packed.subarray(16, 28);
  const authTag = packed.subarray(28, 44);
  const ciphertext = packed.subarray(44);
  
  const key = pbkdf2Sync(passphrase, salt, 100000, 32, 'sha512');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch {
    throw new Error('[realitydb] Decryption failed — wrong passphrase or corrupted data');
  }
}
```

Update the mask CLI (apps/cli/src/commands/mask.ts):
- When --token-map <path> is used:
  * Prompt for a passphrase using readline (mask input — don't echo)
  * Call encryptTokenMap() instead of serializeTokenMap()
  * Write the encrypted base64 blob to the file
  * Print: "Token map exported (AES-256-GCM encrypted) → <path>"
  * Print: "⚠️  Store the passphrase securely — it cannot be recovered"

For Windows PowerShell readline compatibility:
  Use the same callback-based readline pattern from the init wizard
  (NOT readline/promises — it doesn't work in Windows PowerShell).

═══════════════════════════════════════════════════════════
TASK 5: Analyze Pipeline + Auto-Template
═══════════════════════════════════════════════════════════

Create packages/core/src/analyzePipeline.ts:

```typescript
export interface AnalyzeOptions {
  safeMode: boolean;         // default: true — sanitize samples
  autoTemplate: boolean;     // default: false
  outputPath?: string;       // template output path
  sampleSize?: number;       // rows per column, default 100
}

export interface AnalyzeResult {
  schema: DatabaseSchema;
  confidenceBreakdown: { high: number; medium: number; low: number };
  sanitizationReport?: { totalScanned: number; totalDetections: number; byCategory: Record<string, number> };
  templatePath?: string;
}
```

Flow:
a. Connect to database (using existing client from @databox/db)
b. Introspect schema (existing introspectDatabase from @databox/schema)
c. For each table, for each column:
   - Query: SELECT DISTINCT "column" FROM "table" LIMIT {sampleSize}
   - If safeMode: run scanColumnValues() on the results
     * If column passes isFreeTextColumn(): use isFreeText: true option
   - Feed sanitized/clean statistics to columnDetector.ts for confidence scoring
d. If autoTemplate: run templateGenerator.ts to produce a domain template
   - Write template to outputPath
e. Close connection (try/finally)
f. Return AnalyzeResult

Import the existing analyzeSamples/refineDetection/generateTemplate functions 
from packages/generators/src/analyze/. Wire the valueScanners.scanColumnValues() 
as a sanitization layer BEFORE the analysis logic sees the data.

The KEY INSIGHT: when PII is detected in sample values, it IMPROVES inference:
- Emails found → confirm kind: 'email' at HIGH confidence
- Phone numbers found → confirm kind: 'phone' at HIGH confidence
- Person names found → confirm kind: 'full_name' at HIGH confidence
Feed ValueScanResult back into refineDetection() as positive signal.

Export analyzePipeline from packages/core/src/index.ts.

Create apps/cli/src/commands/analyze.ts:

Command: realitydb analyze

Options:
  --unsafe-analyze     Disable PII sanitization (local dev only)
  --auto-template      Generate template from analysis
  --output <path>      Template output (default: ./realitydb-template.json)
  --sample-size <n>    Rows per column (default: 100)

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

Template generated: ./realitydb-template.json

Analysis complete. Use: realitydb seed --template ./realitydb-template.json --seed 42
```

If --unsafe-analyze:
```
PII Sanitization: ⚠️  DISABLED (--unsafe-analyze)
  Warning: Sample values were NOT sanitized. Do not use on production databases.
```

Wire the analyze command into apps/cli/src/cli.ts.

Also add --auto-template to the seed command:
  realitydb seed --auto-template --records 500 --seed 42
  This runs: analyze → generate template → feed into overlay → seed.

═══════════════════════════════════════════════════════════
TASK 6: Standalone Audit CLI Commands
═══════════════════════════════════════════════════════════

Create apps/cli/src/commands/audit.ts:

Command: realitydb audit <subcommand>

Subcommands:
  realitydb audit verify <log-file>
    - Read the JSON audit log file
    - Call verifyAuditLogIntegrity()
    - Print:
      ```
      Audit Chain Verification
      ══════════════════════════════════
      File: .realitydb-audit-2026-03-14.json
      Entries: 12
      Chain integrity: ✅ VERIFIED (all hashes valid)
      ```
    - If broken:
      ```
      Chain integrity: ❌ BROKEN at table "users"
      The audit log has been tampered with.
      ```

  realitydb audit summary <log-file>
    - Read the JSON audit log file
    - Print the formatted compliance summary (use existing formatAuditLog)

  realitydb audit re-identify --token-map <file>
    - Prompt for passphrase (masked input via readline)
    - Call decryptTokenMap() with the passphrase
    - Print the token → original value mappings
    - Print count: "Restored {n} token mappings"
    - Print warning: "These are real PII values. Handle according to your data policy."

Wire the audit command into apps/cli/src/cli.ts.

═══════════════════════════════════════════════════════════

CONSTRAINTS:
- Do NOT rewrite auditLog.ts, tokenizer.ts, or valueScanners.ts from scratch — EXTEND them
- Do NOT break existing mask command (--tokenize, --token-map, --deep-scan must still work)
- Do NOT break existing scan, seed, reset, export commands
- The analyze command must NOT contain business logic — delegate to analyzePipeline
- Token map encryption uses Node.js crypto only (no external dependencies)
- readline for passphrase must use callback-based pattern (not readline/promises — Windows PowerShell compatibility)
- Free-text detection must not add any new npm dependencies
- Bump version to 1.7.0 in apps/cli/package.json
- Commit with message: "feat: privacy-safe analyze pipeline with encrypted tokenization and audit CLI"

VERIFICATION:
After completing, run:
1. pnpm build — all packages compile, zero errors
2. Verify existing commands still work:
   - realitydb scan (unchanged)
   - realitydb seed --template saas --records 20 --seed 42 (unchanged)
   - realitydb mask --help (shows --tokenize, --deep-scan — still works)
3. Verify new commands:
   - realitydb analyze --help (shows --unsafe-analyze, --auto-template, --output, --sample-size)
   - realitydb audit --help (shows verify, summary, re-identify subcommands)
4. Verify encryption round-trip:
   - Run mask with --tokenize --token-map test.enc
   - Enter passphrase when prompted
   - Run realitydb audit re-identify --token-map test.enc
   - Enter same passphrase — should display mappings
   - Enter wrong passphrase — should show "Decryption failed" error
5. Verify valueScanners has 16+ pattern categories
6. Verify isFreeTextColumn() detects "notes", "bio", "description"
7. Self-verify against this checklist (38 points)

Report: build status, command help outputs, encryption test result, score
```

---

## Reconciliation Sprint Checklist

```
## Sprint R1 — Reconciliation: Extend Sanitization + Wire Analyze

### Task 1: Expanded Patterns (4 points)
- [ ] VALUE_PATTERNS expanded to 16+ categories (from 6)
- [ ] person_name, street_address, date_of_birth patterns added
- [ ] Vertical patterns added: medical_record, student_id, case_number
- [ ] passport, drivers_license, vin, bank_routing patterns added

### Task 2: Per-Pattern Action Modes (3 points)
- [ ] Each pattern has action: 'block' | 'tokenize' | 'mask'
- [ ] SSN, credit_card, passport, drivers_license → block
- [ ] --tokenize flag overrides all actions to 'tokenize' (backward compatible)

### Task 3: Free-Text Detection (3 points)
- [ ] isFreeTextColumn() exported from valueScanners.ts
- [ ] Free-text columns get 3x sample size and lowered thresholds
- [ ] ValueScanResult includes isFreeTextField boolean

### Task 4: Encrypted Token Map (4 points)
- [ ] encryptTokenMap() uses AES-256-GCM + PBKDF2 (100K iterations)
- [ ] decryptTokenMap() restores TokenMap from encrypted blob
- [ ] Wrong passphrase throws clear error message
- [ ] --token-map in CLI prompts for passphrase (masked input)

### Task 5: Analyze Pipeline (10 points)
- [ ] analyzePipeline.ts created in packages/core/
- [ ] Connects to DB, introspects schema, samples columns
- [ ] safeMode runs scanColumnValues() on samples before analysis
- [ ] Free-text columns detected and deep-scanned
- [ ] PII detection feeds back as positive signal to confidence scoring
- [ ] --auto-template generates domain template file
- [ ] Template file contains NO raw sample values
- [ ] analyze CLI command shows confidence breakdown
- [ ] analyze CLI shows sanitization report (counts only)
- [ ] seed --auto-template runs analyze → template → seed in one command

### Task 6: Audit CLI (4 points)
- [ ] realitydb audit verify <file> validates hash chain
- [ ] realitydb audit summary <file> prints compliance report
- [ ] realitydb audit re-identify --token-map <file> decrypts and displays
- [ ] All audit subcommands wired into cli.ts

### Backward Compatibility (4 points)
- [ ] realitydb scan still works unchanged
- [ ] realitydb seed --template saas still works unchanged
- [ ] realitydb mask --tokenize --deep-scan still works
- [ ] realitydb mask --token-map still works (now encrypted)

### Security (4 points)
- [ ] No raw PII values in generated templates
- [ ] No raw PII values in audit log entries
- [ ] Token map only leaves memory via encryption
- [ ] Passphrase never logged or stored

### Build + Git (2 points)
- [ ] pnpm build succeeds with zero errors
- [ ] Commit with message "feat: privacy-safe analyze pipeline with encrypted tokenization and audit CLI"

Score: __/38 PASS
```
