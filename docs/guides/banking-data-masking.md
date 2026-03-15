# Banking & Financial Data Masking Guide

This guide covers masking sensitive financial data for bank development teams, QA environments, and demo databases. Designed for Charlotte bank demo scenarios and financial services compliance.

## Quick Start

```bash
# Preview what financial PII is detected
realitydb mask --mode strict --dry-run

# Create a masked demo database export
realitydb mask --mode strict --seed 42 --output ./demo-data --output-format sql --audit-log bank-audit.json

# Deep scan to catch account numbers in free-text fields
realitydb mask --mode strict --deep-scan --dry-run
```

## Why Strict Mode for Banking

Banking data requires `--mode strict` because:
1. **Quasi-identifiers matter**: Age + zip code + account type can identify customers in small branches
2. **Regulatory overlap**: Banks face GLBA, PCI-DSS, SOX, and state privacy laws simultaneously
3. **Free-text risk**: Loan officer notes often contain SSNs, account numbers, and customer details

## Financial Data Detection

### Automatically Detected
| Data Type | Column Patterns | Strategy |
|---|---|---|
| Account numbers | `account_number`, `account_num` | Format-preserving replacement |
| Routing numbers | `routing_number` | Format-preserving replacement |
| Card numbers | `card_number`, `credit_card` | Format-preserving replacement |
| IBAN | `iban` | Format-preserving replacement |
| SWIFT/BIC | `swift` | Format-preserving replacement |
| SSN/Tax ID | `ssn`, `tax_id`, `social_security` | Format-preserving replacement |
| Customer names | `first_name`, `last_name`, `customer_name` | Synthetic replacement |
| Contact info | `email`, `phone`, `address` | Synthetic replacement |
| Date of birth | `dob`, `date_of_birth` | Date shifting |
| Income/salary | `income`, `salary` (strict mode) | Noise injection (+-10%) |

### Deep Scan Catches
With `--deep-scan`, RealityDB samples cell values and detects:
- Credit card numbers (16-digit patterns) in `notes` or `comments` columns
- SSNs in free-text fields
- Email addresses in `description` columns
- IBAN patterns in transaction memo fields

```bash
realitydb mask --mode strict --deep-scan --output ./clean-demo --output-format sql
```

## Demo Database Workflow

### Creating a Realistic Demo Database

```bash
# Step 1: Seed with realistic financial data
realitydb seed --template fintech --rows 10000

# Step 2: Mask all PII for demo use
realitydb mask --mode strict --seed 42 --confirm --audit-log demo-audit.json

# Step 3: Verify the audit trail
realitydb mask --mode strict --seed 42 --dry-run --ci
```

### Deterministic Demos
Use `--seed` to ensure every demo environment gets identical masked data:

```bash
# All three produce identical output
realitydb mask --mode strict --seed 42 --output ./demo-v1
realitydb mask --mode strict --seed 42 --output ./demo-v2
realitydb mask --mode strict --seed 42 --output ./demo-v3
```

## Tokenization for Internal Analytics

When the analytics team needs to join masked datasets while preserving customer linkage:

```bash
# Mask with tokenization — same customer gets the same token everywhere
realitydb mask --mode strict --tokenize --token-map ./secure/tokens.json --output ./analytics-data
```

Properties:
- Customer "John Smith" (ID 1234) becomes `TOK-a1b2c3d4e5f6` consistently
- Join operations on tokenized IDs still work correctly
- The token map enables authorized re-identification if needed
- Foreign keys are preserved — no broken relationships

### Token Map Security for Banking

The token map is equivalent to a customer master key. Store it with:
- HSM or KMS encryption
- Role-based access (DBA + compliance officer dual authorization)
- Separate network segment from masked data
- Full access audit logging

## Compliance Audit Trail

Every masking operation produces a tamper-evident audit log:

```bash
realitydb mask --mode strict --confirm --audit-log compliance/mask-2024-q1.json
```

The audit log includes:
- SHA-256 hash chain (tamper-evident — any modification breaks the chain)
- Per-column PII classification with confidence levels
- Detection reasoning (why each column was flagged)
- Row counts and masking strategies used

### Audit Verification

```typescript
import { verifyAuditLogIntegrity } from '@databox/core';
import auditLog from './compliance/mask-2024-q1.json';

const { valid, brokenAt } = verifyAuditLogIntegrity(auditLog);
if (!valid) {
  console.error(`Audit log tampered at: ${brokenAt}`);
  process.exit(1);
}
```

### What Auditors See

```
RealityDB Mask Audit Log
===========================
Database: bank_demo
Compliance mode: strict
Seed: 42

Summary
---------------------------
  Tables scanned: 12
  Tables with PII: 8
  PII columns detected: 23
  Columns masked: 23
  Total rows masked: 45,000

Integrity Chain
---------------------------
  Algorithm: sha256
  Genesis: a1b2c3d4e5f6g7h8...
  Final:   z9y8x7w6v5u4t3s2...
  Status:  VERIFIED
```

## PCI-DSS Considerations

For cardholder data environments:
- Card numbers are replaced with format-valid synthetic numbers (not real PANs)
- CVV, expiry, and cardholder name are all independently masked
- Masked data should still be treated as "out of scope" for PCI — verify with your QSA
- Export to a separate non-production environment: `--output ./pci-clean`

## CI/CD Pipeline Integration

```yaml
# GitHub Actions example
- name: Create masked test database
  run: |
    realitydb mask --mode strict --seed ${{ github.run_number }} \
      --output ./test-fixtures --output-format sql \
      --audit-log ./audit/mask-${{ github.sha }}.json \
      --deep-scan --ci

- name: Verify audit integrity
  run: |
    node -e "
      const { verifyAuditLogIntegrity } = require('@databox/core');
      const log = require('./audit/mask-${{ github.sha }}.json');
      if (!verifyAuditLogIntegrity(log).valid) process.exit(1);
    "
```

## Common Banking Table Patterns

RealityDB recognizes these person-context tables automatically:
- `customers`, `customer`, `clients`, `client`
- `users`, `user`, `members`, `member`
- `employees`, `employee`, `staff`
- `contacts`, `contact`

Columns on these tables get higher PII confidence (e.g., a `name` column on a `customers` table is treated as a person name, while `name` on a `products` table is not).
