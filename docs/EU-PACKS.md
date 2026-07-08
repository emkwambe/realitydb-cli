# RealityDB EU Pack Specifications
## Version 1.0 — July 2026
## Three packs designed for European enterprise compliance requirements

---

## Overview

These three packs are distinct from the existing CLI built-in packs.
They are purpose-built for European enterprises replacing MOSTLY AI's
managed platform, meeting EU AI Act Article 10 and DORA requirements.

All three packs require:
- Pack Requirements PR-001 through PR-023 (full EU requirements)
- Overall score 98+ (not 97+)
- Temporal logic 100% (not 95%+)
- compliance@realitydb.dev contact for DPA requests

Pack files: C:\Users\HP\Documents\databox\apps\cli\src\packs\
  eu-banking.json
  eu-healthcare.json
  eu-telecom.json

---

## Pack 1: eu-banking.json

### Domain Profile

Name: EU Banking and Financial Services
Regulation scope: SEPA, PSD2, MiFID II, DORA, GDPR, AMLD6
Primary buyer: Compliance officers and data engineers at EU banks,
  particularly those replacing MOSTLY AI's managed platform
Article 10 use case: AI model training for fraud detection, credit
  scoring, AML monitoring, and customer segmentation

### Design Rationale (PR-018)

This pack models a mid-sized European commercial bank operating under
the Single Euro Payments Area (SEPA) framework. The schema covers
retail banking, corporate banking, and payment processing — the three
functions most commonly affected by DORA ICT risk requirements and
AMLD6 AML obligations.

Table selection rationale:
- customers/entities: captures both retail and corporate account holders
- accounts: models SEPA account structures with IBAN format
- sepa_credit_transfers: the primary EU payment instrument (replacing wire)
- sepa_direct_debits: B2C recurring payment flows (PSD2 regulated)
- psd2_consents: open banking consent management (PSD2 Article 65-67)
- mifid_orders: investment order flow (MiFID II Article 25 suitability)
- kyc_records: CDD/EDD documentation per AMLD6 Article 13
- beneficial_owners: UBO register per AMLD5 Article 30
- fraud_alerts: suspicious transaction monitoring
- sar_filings: STR/SAR workflow per AMLD6 Article 33
- audit_logs: DORA ICT operational resilience audit trail

What this dataset IS designed to simulate:
  A mid-sized EU bank generating synthetic training data for ML models
  in fraud detection, AML monitoring, and credit risk assessment.
  Appropriate for: model training, test environment seeding, compliance
  demonstration, analyst training.

What this dataset is NOT designed to simulate:
  Real customer data. Real IBAN account numbers belonging to real people.
  Real transaction flows between real counterparties.
  Central bank reporting data or regulatory submissions.

### Tables (11)

Root tables (2):
  customers
  currencies

Child tables (9):
  accounts
  sepa_credit_transfers
  sepa_direct_debits
  psd2_consents
  mifid_orders
  kyc_records
  beneficial_owners
  fraud_alerts
  sar_filings

### Column Definitions

#### customers (root)
```json
{
  "customers": {
    "match": "customers",
    "columns": {
      "id": { "strategy": "uuid" },
      "customer_type": {
        "strategy": "enum",
        "options": {
          "values": ["retail_individual","retail_joint","sme","corporate","financial_institution","government"],
          "weights": [55, 8, 18, 12, 4, 3],
          "_citation": "ECB Banking Supervision Annual Report 2024 — EU bank customer segment distribution"
        }
      },
      "full_name": { "strategy": "full_name" },
      "email": { "strategy": "email" },
      "country_of_residence": {
        "strategy": "enum",
        "options": {
          "values": ["DE","AT","FR","NL","BE","ES","IT","PL","CZ","SK","HU","HR","SE","DK","FI","IE","PT","RO","BG","GB","CH","US","CN","IN","AE"],
          "weights": [20,12,10,8,6,6,6,5,4,3,3,2,2,2,2,2,2,2,1,3,2,2,1,1,1],
          "_citation": "ECB Payment Statistics 2024 — cross-border payment origination by country"
        }
      },
      "risk_rating": {
        "strategy": "enum",
        "options": {
          "values": ["low","medium","high","pep","sanctioned"],
          "weights": [62, 25, 10, 2, 1],
          "_citation": "FATF Guidance on Risk-Based Approach 2023 — typical customer risk distribution"
        }
      },
      "kyc_status": {
        "strategy": "enum",
        "options": {
          "values": ["verified","pending_review","edd_required","expired","rejected"],
          "weights": [74, 12, 8, 4, 2],
          "_citation": "Thomson Reuters Know Your Customer Surveys 2024 — EU bank KYC completion rates"
        }
      },
      "onboarding_channel": {
        "strategy": "enum",
        "options": {
          "values": ["branch","online","mobile","broker","referral"],
          "weights": [28, 35, 25, 8, 4],
          "_citation": "EY European Banking Barometer 2024 — digital onboarding adoption rates"
        }
      },
      "created_at": { "strategy": "timestamp" }
    }
  }
}
```

#### currencies (root, reference, 5 rows)
```json
{
  "currencies": {
    "match": "currencies",
    "columns": {
      "id": { "strategy": "uuid" },
      "code": {
        "strategy": "enum",
        "options": {
          "values": ["EUR","GBP","CHF","PLN","CZK"],
          "weights": [60, 15, 10, 8, 7],
          "_citation": "BIS Triennial Central Bank Survey 2022 — European currency transaction share"
        }
      },
      "name": {
        "strategy": "enum",
        "options": {
          "values": ["Euro","British Pound","Swiss Franc","Polish Zloty","Czech Koruna"],
          "weights": [60, 15, 10, 8, 7]
        }
      },
      "is_sepa_currency": {
        "strategy": "enum",
        "options": {
          "values": ["true","false"],
          "weights": [80, 20],
          "_citation": "European Payments Council — SEPA currency eligibility"
        }
      }
    }
  }
}
```

#### accounts (child of customers)
Key columns:
- iban: generated in SEPA IBAN format (XX##-####-####-####-####-##)
  Note: use sentence strategy with IBAN-pattern override or explicit enum
- account_type: current 48, savings 28, business_current 15, investment 9
  Source: ECB Banking Structures Data 2024
- status: active 84, dormant 8, frozen 4, closed 4
- currency_code: FK to currencies.code
- country_code: matches customer country_of_residence (same weights)

#### sepa_credit_transfers (child of accounts)
Key columns:
- transfer_type: standard 65, instant 28, future_dated 7
  Source: EPC SEPA Credit Transfer Statistics 2024
- amount_eur: normal mean 1250, stddev 3800, min 0.01, max 500000
  Source: ECB SEPA Statistics 2024 — average SCT transaction EUR 1,247
- status: settled 88, pending 8, rejected 3, returned 1
  Source: EPC SEPA Scheme Statistics 2024 — rejection rates
- rejection_reason: format_error 35, insufficient_funds 28, account_closed 18,
  duplicate 12, compliance_hold 7 (only when status=rejected)
  Source: SWIFT Payment Exception and Investigation Guidelines 2024
- purpose_code (ISO 20022): SALA 22, SUPP 18, RENT 12, DIVI 8, FEES 8,
  CHAR 7, TRAD 7, GDDS 6, LOAN 5, OTHR 7
  Source: ISO 20022 payment purpose code usage statistics, EPC 2024
- initiated_at, settled_at: settled_at must be after initiated_at
  Standard: SCT settles same business day, SCTInst within 10 seconds

#### sepa_direct_debits (child of accounts)
Key columns:
- scheme: CORE 72, B2B 28
  Source: EPC SEPA Direct Debit Statistics 2024
- status: collected 78, rejected 10, returned 8, cancelled 4
- rejection_reason: insufficient_funds 45, account_closed 20, refusal 20,
  mandate_invalid 15 (only when status=rejected/returned)
  Source: EPC SDD Reject and Return Rate Statistics 2024
- amount_eur: normal mean 85, stddev 140, min 1, max 25000
  Source: ECB SEPA Statistics 2024 — average SDD transaction EUR 82

#### psd2_consents (child of customers)
Key columns: PSD2 open banking consent management
- tpp_name: enum of fictional TPP names (not real institutions)
- consent_type: account_information 55, payment_initiation 30, confirmation_of_funds 15
  Source: EBA PSD2 API Monitoring Report 2024
- status: active 62, expired 25, revoked 10, pending 3
- scope: accounts 40, transactions 35, balances 15, beneficiaries 10
- expiry_date: timestamp between 90 and 180 days after granted_at

#### mifid_orders (child of accounts)
Key columns: Investment order flow per MiFID II
- instrument_type: equity 45, bond 25, fund 18, etf 8, derivative 4
  Source: ESMA MiFID II/MiFIR Annual Review 2024
- order_type: market 55, limit 30, stop 10, stop_limit 5
  Source: ESMA Trading Data 2024
- side: buy 52, sell 48
- status: executed 75, cancelled 15, expired 7, rejected 3
- venue: XEUR 28, XAMS 18, XPAR 15, XLON 12, XMAD 10, other 17
  Source: ESMA Market Data 2024 — EU trading venue market share

#### kyc_records (child of customers)
Key columns: CDD/EDD per AMLD6
- document_type: passport 38, national_id 32, residence_permit 15,
  drivers_license 10, utility_bill 5
  Source: EBA Guidelines on Customer Due Diligence 2024
- verification_method: automated 45, manual_review 30, third_party 15,
  biometric 10
  Source: Refinitiv Global KYC Survey 2024
- verification_status: verified 75, pending 12, expired 8, failed 5
- edd_required: true 15, false 85
  Source: FATF RBA Guidance — EDD triggers in EU banking

#### beneficial_owners (child of customers)
Key columns: UBO register per AMLD5 Article 30
- ownership_pct: normal mean 35, stddev 20, min 10, max 100
  Note: EU UBO disclosure threshold is 25%
- country_of_residence: same distribution as customers.country_of_residence
- pep_flag: true 2, false 98
  Source: FATF Guidance on PEPs — EU banking PEP exposure ~2%
- sanctions_flag: true 0.5, false 99.5
  Source: EU Sanctions Regulation compliance statistics
- id_verified: true 82, false 18

#### fraud_alerts (child of accounts)
Key columns: Suspicious transaction monitoring per AMLD6
- alert_type: unusual_transaction_pattern 28, high_value_cash 22,
  cross_border_transfer 18, rapid_movement 15, structuring 10,
  geographic_anomaly 7
  Source: ACFE Report to the Nations Europe 2024
- severity: low 42, medium 32, high 18, critical 8
- status: open 22, under_investigation 28, closed_false_positive 35,
  escalated_to_compliance 10, filed_str 5
  Source: Wolfsberg Group AML Principles — industry SAR filing rates

#### sar_filings (child of customers)
Key columns: STR/SAR workflow per AMLD6 Article 33
- activity_type: structuring 24, money_laundering 19, terrorist_financing 4,
  fraud 28, tax_evasion 12, sanctions_evasion 6, other 7
  Source: Europol Financial Intelligence Report 2024
- filing_status: draft 22, filed 55, supplemental 15, withdrawn 8
- competent_authority: country-specific FIU names
  (DE: FIU, AT: Geldwäschemeldestelle, FR: TRACFIN, NL: FIU-Nederland)

### Bias Examination (PR-022)

Demographic groups represented:
- Customer types: retail individual 55%, SME 18%, corporate 12%, joint 8%
- Geographic coverage: 25 countries, EU-27 primary
- Risk rating: low 62%, medium 25%, high 10%, PEP 2%, sanctioned 0.5%
- No demographic group has zero representation

Known subgroup limitations:
- Eastern EU countries (PL, CZ, SK, HU, HR, RO, BG) underweighted vs western EU
- Justification: reflects actual banking activity volumes (ECB 2024)
- Mitigation: users can override country_of_residence weights for specific markets

---

## Pack 2: eu-healthcare.json

### Domain Profile

Name: EU Healthcare and Clinical Data
Regulation scope: GDPR Article 9 (special categories), European Health Data
  Space Regulation (EHDS, effective March 2025), MDR, IVDR
Primary buyer: Health data scientists, clinical informaticists, pharma
  companies building models on EU patient populations
Article 10 use case: AI model training for diagnostic support, treatment
  outcome prediction, readmission risk, and clinical NLP

### Design Rationale (PR-018)

This pack models a European academic hospital with outpatient and inpatient
services. Schema reflects ICD-10-CM diagnosis coding, EU drug regulation
(EMA), and EHDS secondary use requirements. The pack is structurally
compatible with HL7 FHIR R4 resource types.

GDPR Article 9 note: The synthetic data generated from this pack is NOT
special category personal data. No real patient data is used as input.
The _realitydb_meta watermark confirms synthetic origin. Users deploying
this data in AI training should conduct their own DPIA for the downstream
AI system.

What this dataset IS designed to simulate:
  Structured electronic health record data for a EU academic hospital.
  Appropriate for: AI model training, clinical NLP development, healthcare
  analytics education, system integration testing.

What this dataset is NOT designed to simulate:
  Real patient records. Real clinical trial data. Regulatory submissions.
  Public health surveillance data. Reimbursement data.

### Tables (14)

Root tables (3):
  patients
  providers
  icd10_codes (reference, ~50 common codes)

Child tables (11):
  encounters
  diagnoses
  medications_prescribed
  procedures
  lab_results
  vital_signs
  imaging_studies
  insurance_claims
  referrals
  allergies
  discharge_summaries

### Key Column Definitions

#### patients (root)
- country_of_birth distribution (EU focus):
  DE 18, FR 12, IT 10, ES 9, PL 7, RO 6, NL 5, BE 4, PT 3, GR 3, other_EU 15, other 8
  Source: Eurostat Healthcare Statistics 2024
- age_bracket: 0-17: 12%, 18-44: 25%, 45-64: 32%, 65-79: 21%, 80+: 10%
  Source: Eurostat Population Statistics 2024
- gender: female 51, male 48, non_binary 1
  Source: WHO European Region Health Data 2024
- insurance_type: statutory_GKV 72, private_PKV 11, EU_cross_border 9,
  uninsured 5, other 3
  Source: OECD Health Statistics Europe 2024 (Germany-weighted for GKV/PKV)
- language_preference: German 20, French 12, Italian 10, Spanish 9, Polish 7,
  Romanian 6, Dutch 5, English 12, Arabic 5, Turkish 4, other 10
  Source: Eurostat Migration Statistics 2024

#### encounters (child of patients and providers)
- encounter_type: outpatient 52, inpatient 28, emergency 12, day_surgery 5, telehealth 3
  Source: OECD Health at a Glance: Europe 2024
- admission_type (inpatient only): elective 58, emergency 32, transfer 10
  Source: EUROSTAT Hospital Discharge Statistics 2024
- drg_code: top 20 EU DRG codes weighted by frequency
  Source: EuroDRG Project 2024 hospital discharge data
- length_of_stay_days (inpatient): normal mean 5.8, stddev 4.2, min 1, max 90
  Source: OECD Average Length of Stay in Hospital 2024 (EU average 7.8 days,
  weighted shorter for elective)
- discharge_disposition: home 68, rehabilitation 12, skilled_nursing 8,
  transferred 7, deceased 3, left_against_advice 2
  Source: EUROSTAT Hospital Discharge Data 2024

#### diagnoses (child of encounters)
- icd10_category: Z-codes (preventive) 18, E-codes (endocrine/metabolic) 14,
  I-codes (circulatory) 13, J-codes (respiratory) 11, M-codes (musculoskeletal) 9,
  K-codes (digestive) 8, F-codes (mental) 7, N-codes (genitourinary) 6,
  C-codes (neoplasms) 5, other 9
  Source: EUROSTAT European Health Interview Survey 2024 — EU disease burden
- diagnosis_role: primary 45, secondary 35, comorbidity 15, complication 5
- coding_system: ICD-10-CM (for US-compatible packs), ICD-10-WHO (EU standard)
  Note: EU uses ICD-10-WHO; ICD-11 transition began 2022

#### medications_prescribed (child of encounters)
- atc_class (WHO ATC Classification):
  C (cardiovascular) 22, A (alimentary/metabolic) 18, N (nervous system) 14,
  B (blood/forming organs) 10, J (anti-infectives) 9, R (respiratory) 8,
  M (musculoskeletal) 7, L (antineoplastic) 4, other 8
  Source: OECD Pharmaceutical Consumption Statistics Europe 2024
- prescribing_authority: GP 52, specialist 32, hospital 14, emergency 2
  Source: EMA Medicines Usage in the EU 2024
- medication_name: top 30 EU prescribed generics by ATC class
  Source: IQVIA Top 200 Medicines EU 2024

#### lab_results (child of encounters)
- test_type: CBC 18, basic_metabolic 15, lipid_panel 12, thyroid_function 10,
  liver_function 9, urinalysis 8, HbA1c 7, coagulation 6, cultures 5, other 10
  Source: EFLM European Federation of Clinical Chemistry — test ordering patterns
- abnormality_flag: normal 68, low 14, high 15, critical 3
  Source: EFLM Reference Values Studies 2024

#### vital_signs (child of encounters)
Key distributions (EU adult population):
- systolic_bp: normal mean 121, stddev 15, min 70, max 220
  Source: ESC European Heart Journal 2024 — EU population BP statistics
- bmi: normal mean 26.8, stddev 4.8, min 14, max 55
  Source: OECD/EU Obesity Report 2024 — EU average BMI 26.8

### Bias Examination (PR-022)

Demographic groups represented:
- Age: all brackets 0–80+ with EU-realistic weighting
- Gender: female 51%, male 48%, non_binary 1%
- Country: 25+ EU countries in origin distribution
- Language: 11 languages covering major EU linguistic groups
- Insurance: statutory/private mix reflects major EU health systems

Known limitations:
- Diagnosis distributions weighted toward Western EU disease burden
- Rare diseases (<1% prevalence) not represented in current pack
- Mental health diagnoses (F-codes) may be underweighted vs EU burden
- Recommend: validate demographic distributions against local population
  statistics before deploying for national AI models

---

## Pack 3: eu-telecom.json

### Domain Profile

Name: EU Telecommunications and Digital Services
Regulation scope: BEREC guidelines, European Electronic Communications Code
  (EECC), GDPR consent management, ePrivacy Directive, DORA for critical
  infrastructure operators
Primary buyer: Data engineers at EU telecoms (Deutsche Telekom, Orange,
  Telefónica DE, KPN, Vodafone EU) and EU regulator analytics teams
Article 10 use case: AI model training for churn prediction, network
  quality optimization, fraud detection, and customer service automation

### Design Rationale (PR-018)

This pack models a mid-sized EU mobile network operator operating across
three countries (primary market: DACH). Schema reflects the European
regulatory environment: GDPR consent management, BEREC-mandated QoS
reporting, and the EECC's portability requirements.

What this dataset IS designed to simulate:
  A EU mobile operator's subscriber, usage, and network data.
  Appropriate for: churn model training, network capacity planning,
  regulatory reporting analytics, customer service AI training.

What this dataset is NOT designed to simulate:
  Real subscriber personal data. Real network topology.
  Real CDR data that could identify individuals.
  Regulatory submissions or spectrum license applications.

### Tables (12)

Root tables (2):
  subscribers
  network_sites

Child tables (10):
  subscriptions
  usage_records
  invoices
  payments
  support_tickets
  gdpr_consents
  number_portability_requests
  roaming_records
  network_quality_measurements
  churn_events

### Key Column Definitions

#### subscribers (root)
- country: DE 42, AT 18, CH 15, NL 10, BE 8, other_EU 7
  Source: BEREC Market Analysis 2024 — DACH-region operator subscriber share
- age_bracket: 18-24: 12%, 25-34: 22%, 35-44: 20%, 45-54: 18%, 55-64: 15%, 65+: 13%
  Source: BEREC End-User Survey 2024 — EU mobile subscriber demographics
- language: German 55, French 20, Dutch 12, English 8, other 5
- acquisition_channel: online 38, store 28, telesales 18, mvno_partner 10, corporate 6
  Source: BEREC Retail Market Analysis 2024

#### subscriptions (child of subscribers)
- plan_type: postpaid_individual 48, postpaid_family 18, prepaid 22, business 12
  Source: BEREC EU-wide Telecom Market Report 2024
- contract_duration_months: monthly 35, 12_months 30, 24_months 25, no_contract 10
  Source: EECC Article 105 — EU maximum 24-month contract requirement
- arpu_eur: normal mean 28, stddev 12, min 5, max 120
  Source: BEREC Key Indicators 2024 — EU average ARPU EUR 15-45 by country
- status: active 79, suspended 8, porting_out 5, terminated 8
- roaming_enabled: true 68, false 32
  Source: BEREC International Roaming Monitoring 2024

#### gdpr_consents (child of subscribers)
- consent_type: marketing_email 45, marketing_sms 40, location_data 30,
  profiling_behavioral 25, third_party_sharing 20, analytics_optional 55
  Note: These are independent boolean columns, not mutually exclusive
  Source: EDPB Guidelines 05/2020 on Consent — typical EU telco consent patterns
- consent_status: given 62, withdrawn 28, pending 10
  Source: GDPR enforcement statistics — EU consent withdrawal rates in telecom
- consent_channel: app 45, website 30, store 15, ivr 10
- withdrawal_reason (when withdrawn): no_longer_relevant 35, concerns 28,
  too_many_messages 22, other 15
  Source: GDPR supervisory authority annual reports 2024

#### number_portability_requests (child of subscribers)
- direction: porting_in 48, porting_out 52
  Source: BEREC Number Portability Data 2024
- status: completed 72, rejected 15, pending 10, withdrawn 3
- rejection_reason: active_contract 45, debt_outstanding 30, invalid_format 15,
  technical_error 10 (only when status=rejected)
  Source: BEREC Number Portability Annual Statistics 2024
- completion_days: normal mean 1.8, stddev 0.8, min 1, max 10
  Source: EECC Article 106 — maximum 1 working day for EU number portability

#### network_quality_measurements (child of network_sites)
- measurement_type: download_speed 30, upload_speed 25, latency 25, packet_loss 20
- technology: 5G_SA 12, 5G_NSA 18, LTE_A 35, LTE 28, UMTS 7
  Source: BEREC Net Neutrality Guidelines 2024 — EU technology deployment
- download_mbps (for download type): normal mean 185, stddev 80, min 1, max 1000
  Source: BEREC 5G Coverage Report 2024 — EU average 5G download speed
- latency_ms (for latency type): normal mean 22, stddev 12, min 5, max 200
  Source: BEREC QoS Monitoring 2024 — EU mobile network latency benchmarks
- qos_class: excellent 28, good 42, acceptable 22, poor 8
  Source: BEREC Net Neutrality Measurement 2024

#### churn_events (child of subscribers)
- churn_reason: price 38, network_quality 22, competitor_offer 18,
  coverage 10, customer_service 8, relocation 4
  Source: BEREC End-User Survey 2024 — EU subscriber churn reasons
  Note: Price is higher in EU vs US (41% US, 38% EU) — BEREC vs J.D. Power
- churn_type: voluntary 72, involuntary 18, porting_out 10
  Source: BEREC Market Analysis 2024
- days_before_churn_first_complaint: normal mean 45, stddev 30, min 0, max 365
  Source: BEREC Consumer Complaints Database 2024

### Bias Examination (PR-022)

Demographic groups represented:
- Country: 6 EU countries with DACH primary weighting
- Age: all adult brackets 18–65+
- Language: 5 languages covering DACH and Benelux
- Plan type: postpaid/prepaid mix, individual/business split
- Technology: all generations 3G–5G represented

Known limitations:
- Pack is DACH-weighted — not representative of southern/eastern EU operators
- Prepaid subscribers underweighted vs some EU markets (ES/IT higher prepaid)
- B2B IoT subscriber segment not modeled
- Recommendation: adjust country weights for non-DACH deployments

---

## Shared EU Pack Requirements

All three EU packs share these production requirements before shipping:

### Pack Spec Documentation
Each pack must have a spec document at:
  C:\Users\HP\Documents\realitydb-internal\EU-BANKING-PACK-SPEC.md
  C:\Users\HP\Documents\realitydb-internal\EU-HEALTHCARE-PACK-SPEC.md
  C:\Users\HP\Documents\realitydb-internal\EU-TELECOM-PACK-SPEC.md

Each spec must contain sections:
  Design Rationale (PR-018)
  Limitations (PR-020)
  Bias Examination (PR-022)
  Article 10 Compliance Mapping
  GDPR Data Protection by Design Statement (PR-023)
  Citation index (all sources cited in column definitions)

### Quality Thresholds (EU tier — stricter)
  FK integrity:      100% (same)
  Enum validity:     100% (same)
  Temporal logic:    100% (stricter than 95% standard)
  Overall score:      98+ (stricter than 97+ standard)
  Privacy:           100% (same)

### Assessment Command
```bash
realitydb examine assess [pack]-baseline.sql \
  --pack [pack].json \
  --standard gdpr \
  --json \
  --output [pack]-eu-assess-report.json
```

### Compliance Report Command
```bash
realitydb comply report \
  --file [pack]-baseline.sql \
  --framework eu-ai-act \
  --output [pack]-eu-aiact-report.json \
  --json

realitydb comply report \
  --file [pack]-baseline.sql \
  --framework gdpr \
  --output [pack]-eu-gdpr-report.json \
  --json
```

### Build Priority

| Pack           | Priority | Blocker                              |
|----------------|----------|--------------------------------------|
| eu-banking.json| 1        | Erste Group George Lab outreach       |
| eu-healthcare.json | 2    | EHDS enforcement + pharma L&D market |
| eu-telecom.json| 3        | Telefónica DE + Deutsche Telekom      |

eu-banking.json ships first because it directly supports the
Erste Group conversation identified in REALITYDB-EUROPEAN-VACUUM-REPORT-2026.md.

---

## Implementation Instructions for Claude Code

When authoring these packs, read in this order:
1. C:\Users\HP\Documents\databox\docs\PACK-REQUIREMENTS.md (the new consolidated standard)
2. C:\Users\HP\Documents\databox\apps\cli\src\packs\fintech.json (structural reference)
3. C:\Users\HP\Documents\databox\apps\cli\src\packs\healthcare.json (healthcare reference)
4. This document (EU-PACKS.md) for EU-specific column definitions

Then follow the eight-gate pipeline from PACK-REQUIREMENTS.md exactly.
EU packs require all eight gates including Gate 8 (EU compliance docs).

---

*RealityDB EU Pack Specifications v1.0*
*Mpingo Systems LLC — Charlotte, NC*
*Primary regulation: EUR-Lex Regulation (EU) 2024/1689, GDPR, DORA*
*Effective: July 2026*
