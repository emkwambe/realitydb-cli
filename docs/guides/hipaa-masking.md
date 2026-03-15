# HIPAA Compliance Masking Guide

This guide covers using RealityDB's masking engine to de-identify Protected Health Information (PHI) in compliance with the HIPAA Safe Harbor method.

## Quick Start

```bash
# Preview what will be masked (no changes)
realitydb mask --mode hipaa --dry-run

# Export masked data to files
realitydb mask --mode hipaa --output ./masked-data --output-format sql

# Write masked data back to database
realitydb mask --mode hipaa --confirm --audit-log hipaa-audit.json
```

## What HIPAA Mode Detects

RealityDB's HIPAA mode automatically detects and masks the 18 Safe Harbor identifiers:

| PHI Category | Column Patterns Detected | Masking Strategy |
|---|---|---|
| Patient names | `first_name`, `last_name`, `patient_name` | Synthetic name replacement |
| Email addresses | `email`, `contact_email` | Domain-preserving replacement |
| Phone/fax numbers | `phone`, `mobile`, `fax` | Format-preserving replacement |
| Physical addresses | `address`, `street`, `city`, `zip` | Synthetic address |
| Dates (DOB, admission) | `date_of_birth`, `dob`, `admission_date` | Date shifting (preserves day-of-week) |
| SSN | `ssn`, `social_security` | Format-preserving replacement |
| Medical record numbers | `mrn`, `medical_record` | Redacted |
| Insurance IDs | `insurance_id`, `policy_number` | Redacted |
| Diagnoses/conditions | `diagnosis`, `condition`, `medication` | Redacted |
| IP addresses | `ip_address`, `client_ip` | Randomized IP |

## HIPAA-Specific Behaviors

### Medical Columns Are Redacted (Not Replaced)
In HIPAA mode, medical columns (`diagnosis`, `medication`, `treatment`, `prescription`) are fully redacted to `[REDACTED]` rather than replaced with synthetic values. This prevents any risk of synthetic medical data being mistaken for real data.

### Date Shifting Preserves Temporal Patterns
Dates are shifted by a random offset (30-365 days) rounded to week boundaries. This preserves:
- Day-of-week patterns (important for appointment analysis)
- Relative ordering between dates in the same record
- Seasonal patterns (approximately)

### Foreign Keys Are Never Masked
Primary keys and foreign keys are automatically excluded from masking to preserve referential integrity. A patient ID used as a foreign key in an `appointments` table will remain consistent.

## Deep Scan for Embedded PHI

Use `--deep-scan` to catch PHI hidden in free-text columns like `notes` or `comments`:

```bash
realitydb mask --mode hipaa --deep-scan --dry-run
```

This samples up to 100 rows per column and scans for:
- Email addresses embedded in text
- Phone numbers in notes
- SSN patterns in comments
- IP addresses in log fields

## Tokenization for Research Use Cases

If your research team needs reversible de-identification (e.g., to link records across datasets):

```bash
realitydb mask --mode hipaa --tokenize --token-map ./token-map.json --output ./research-data
```

The token map file enables re-identification and must be stored with the same security controls as the original PHI.

## Audit Trail

Every masking run produces a tamper-evident audit log with SHA-256 hash chain:

```bash
realitydb mask --mode hipaa --confirm --audit-log hipaa-audit.json
```

The audit log records:
- Every column scanned and its PII classification
- Confidence level and detection reason
- Masking strategy applied
- Number of rows affected
- SHA-256 hash chain for tamper detection

### Verifying Audit Log Integrity

```typescript
import { verifyAuditLogIntegrity } from '@databox/core';

const log = JSON.parse(fs.readFileSync('hipaa-audit.json', 'utf-8'));
const result = verifyAuditLogIntegrity(log);
// { valid: true } or { valid: false, brokenAt: 'tableName' }
```

## Deterministic Masking

Use `--seed` to produce identical masked output across runs:

```bash
realitydb mask --mode hipaa --seed 12345 --output ./masked-v1
realitydb mask --mode hipaa --seed 12345 --output ./masked-v2
# masked-v1 and masked-v2 are identical
```

This is useful for:
- Reproducible test environments
- Validating masking before production runs
- CI/CD pipeline consistency

## CI/CD Integration

```bash
realitydb mask --mode hipaa --dry-run --ci
```

Returns machine-readable JSON output for pipeline integration. Exit code 0 on success, 1 on failure.
