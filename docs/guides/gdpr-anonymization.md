# GDPR Data Anonymization Guide

This guide covers using RealityDB's masking engine to anonymize personal data in compliance with GDPR Article 4(5) pseudonymization and Recital 26 anonymization requirements.

## Quick Start

```bash
# Preview PII detection
realitydb mask --mode gdpr --dry-run

# Export anonymized dataset
realitydb mask --mode gdpr --output ./anonymized --output-format csv

# Full strict mode (masks quasi-identifiers too)
realitydb mask --mode strict --output ./anonymized --audit-log gdpr-audit.json
```

## GDPR vs Strict Mode

RealityDB offers two GDPR-relevant modes:

| Feature | `--mode gdpr` | `--mode strict` |
|---|---|---|
| Direct identifiers (name, email, phone) | Masked | Masked |
| Indirect identifiers (address, DOB) | Masked | Masked |
| Online identifiers (IP, username, URL) | Masked | Masked |
| Free-text fields (notes, bio, comments) | Masked | Masked |
| Quasi-identifiers (age, gender, salary) | Flagged only | Masked |
| Financial identifiers | Masked | Masked |

**When to use `strict`**: When quasi-identifiers could enable re-identification through combination (e.g., a dataset with age + gender + zip code in a small population).

## What Gets Detected

### Direct Personal Data (Article 4(1))
| Category | Examples | Strategy |
|---|---|---|
| Names | `first_name`, `surname`, `display_name` | Synthetic replacement |
| Email | `email`, `contact_email` | Domain-preserving replacement |
| Phone | `phone`, `mobile`, `fax` | Format-preserving replacement |
| Address | `street`, `city`, `postal_code` | Synthetic address |
| National IDs | `ssn`, `national_id`, `tax_id` | Format-preserving replacement |

### Online Identifiers (Recital 30)
| Category | Examples | Strategy |
|---|---|---|
| IP addresses | `ip_address`, `client_ip` | Randomized IP |
| Usernames | `username`, `login`, `handle` | Synthetic username |
| URLs | `profile_url`, `avatar_url` | Synthetic URL |

### Special Category Data (Article 9)
| Category | Examples | Strategy |
|---|---|---|
| Financial | `account_number`, `iban`, `card_number` | Format-preserving replacement |

### Free-Text Fields
In GDPR and strict modes, long text columns (`text`/`varchar` > 100 chars) with names like `notes`, `comment`, `bio`, `description`, `message`, or `about` are replaced with generic compliance text.

## Deep Scan for Embedded PII

Schema-level detection catches columns named `email` — but what about an email address buried in a `notes` column? Use `--deep-scan`:

```bash
realitydb mask --mode gdpr --deep-scan --dry-run
```

Deep scan samples 100 rows per text column and runs regex patterns against actual values. If >30% of samples contain email addresses, that column gets flagged and masked.

**Patterns detected in deep scan:**
- Email addresses
- Phone numbers
- SSN/national ID patterns
- IP addresses
- Credit card numbers
- IBAN numbers
- URLs

## Pseudonymization with Tokenization

GDPR Article 4(5) defines pseudonymization as replacing identifiers with tokens that can be reversed with a separately stored key. RealityDB supports this directly:

```bash
realitydb mask --mode gdpr --tokenize --token-map ./keys/token-map.json --output ./pseudonymized
```

Key properties:
- **Deterministic tokens**: Same value always produces the same token (preserves analytical relationships)
- **Separate key storage**: The token map must be stored separately from the pseudonymized data
- **Reversible**: Authorized users can restore original values using the token map

### Token Map Security

The token map file is the key to re-identification. Store it with:
- Access controls matching the original personal data
- Encryption at rest
- Separate from the pseudonymized dataset
- Audit logging for access

## Right to Erasure (Article 17)

For GDPR deletion requests, combine tokenization with selective erasure:

1. Mask with tokenization: `--tokenize --token-map tokens.json`
2. When a deletion request arrives, remove that person's entries from the token map
3. Without the token map entry, the pseudonymized data becomes effectively anonymous

## Audit Trail for Accountability (Article 5(2))

GDPR requires demonstrating compliance. The audit log provides evidence:

```bash
realitydb mask --mode gdpr --confirm --audit-log gdpr-audit.json
```

The audit log includes:
- Timestamp and compliance mode used
- Every table and column scanned
- PII classification with confidence levels
- Masking strategy applied per column
- Row counts affected
- SHA-256 hash chain proving the log hasn't been tampered with

### Verifying Audit Integrity

```typescript
import { verifyAuditLogIntegrity } from '@databox/core';

const log = JSON.parse(fs.readFileSync('gdpr-audit.json', 'utf-8'));
const { valid, brokenAt } = verifyAuditLogIntegrity(log);
```

## Export Formats

| Format | Use Case | Command |
|---|---|---|
| JSON | Application testing, API mocking | `--output-format json` |
| CSV | Analytics, spreadsheet review | `--output-format csv` |
| SQL | Database seeding, migration testing | `--output-format sql` |

## CI/CD Integration

Run masking as part of your deployment pipeline:

```bash
# In CI: create anonymized test database
realitydb mask --mode gdpr --seed 42 --output ./test-data --output-format sql --ci

# Verify previous audit log integrity
node -e "
  const { verifyAuditLogIntegrity } = require('@databox/core');
  const log = require('./gdpr-audit.json');
  const r = verifyAuditLogIntegrity(log);
  process.exit(r.valid ? 0 : 1);
"
```
