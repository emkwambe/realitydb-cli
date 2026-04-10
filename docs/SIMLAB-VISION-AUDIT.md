# Simulation Lab — Vision vs. Reality Audit

> **Date:** April 10, 2026 · **Purpose:** Map the enterprise Sim Lab PRD against what RealityDB has already shipped
> **Verdict:** You're 40-50% done with Phase 1 MVP. The engine IS the hard part, and it's shipped.

---

## Part 1: Command Roadmap — Done vs. To Build

### ✅ SHIPPED (20 commands, v2.20.0)

| Command | PRD Category | Status |
|---------|-------------|--------|
| `realitydb init` | Template Management | ✅ 4 presets |
| `realitydb run` | Core Engine | ✅ 210K rows/sec |
| `realitydb generate` | Core Engine | ✅ Alias |
| `realitydb export` | Core Engine | ✅ Alias |
| `realitydb scan` | Data Sources | ✅ PostgreSQL introspection |
| `realitydb analyze` | Quality | ✅ Enum detection with weights |
| `realitydb seed` | Data Sources | ✅ Direct PostgreSQL insert |
| `realitydb reset` | Data Sources | ✅ Drop seeded tables |
| `realitydb mask` | Privacy (PETs) | ✅ 16 PII categories, 3 modes |
| `realitydb simulate` | AI Simulation | ✅ 6 scenarios, S-curve timeline |
| `realitydb simulate split` | AI Simulation | ✅ Random/stratified/temporal, FK-safe |
| `realitydb capture` | Collaboration | ✅ DB snapshot with PII masking |
| `realitydb load` | Collaboration | ✅ Restore captured state |
| `realitydb pack` | Template Management | ✅ List packs |
| `realitydb pack:info` | Template Management | ✅ Inspect pack |
| `realitydb pack:validate` | Template Management | ✅ Schema validation |
| `realitydb upgrade` | Billing | ✅ Opens Stripe (placeholder URL) |
| `realitydb audit` | Compliance | ✅ Operation history |
| `realitydb login/logout/status` | Auth | ✅ API key + local license |
| `realitydb split` | AI Simulation | ✅ ML train/test/val splits |

**Output formats:** JSON ✅ | SQL ✅ | CSV ✅ | Parquet ✅ (CSV + DuckDB)

### 🟡 DESIGNED (Architecture docs exist, code not written)

| Command | PRD Category | Design Doc |
|---------|-------------|-----------|
| `realitydb lab create` | Sandbox | `docs/LAB-DESIGN.md` |
| `realitydb lab list` | Sandbox | Same |
| `realitydb lab connect` | Sandbox | Same |
| `realitydb lab delete` | Sandbox | Same |
| `realitydb lab extend` | Sandbox | Same |
| `realitydb lab share` | Sandbox | Same |

### 🔴 TO BUILD (No code or design yet)

| Command | PRD Category | Priority | Effort |
|---------|-------------|----------|--------|
| `realitydb lab snapshot` | Sandbox | P1 | Medium (Neon Time Travel API) |
| `realitydb simulate drift` | AI Simulation | P3 | Hard (distribution shifting) |
| `realitydb simulate anomaly` | AI Simulation | P2 | Medium (extend existing scenarios) |
| `realitydb simulate counterfactual` | AI Simulation | P4 | Hard (causal inference) |
| `realitydb ci start` | CI/CD | P1 | Easy (generate YAML snippets) |
| `realitydb ci test` | CI/CD | P1 | Medium (ephemeral sandbox + test runner) |
| `realitydb pack push` | Collaboration | P2 | Medium (need registry backend) |
| `realitydb pack pull` | Collaboration | P2 | Medium (need registry backend) |
| `realitydb audit export` | Compliance | P1 | Easy (extend existing audit) |
| `realitydb analyze fidelity` | Quality | P2 | Hard (KS test, Wasserstein distance) |
| `realitydb analyze privacy` | Quality | P2 | Medium (k-anonymity, l-diversity) |
| `realitydb mask report` | Compliance | P1 | Easy (extend existing mask) |
| `realitydb benchmark` | Quality | P1 | Easy (wrap existing perf metrics) |
| `realitydb rule add` | Advanced | P3 | Medium (interactive CLI + pack editor) |
| `realitydb rule list` | Advanced | P3 | Easy (read from pack) |
| `realitydb weight tune` | Advanced | P3 | Easy (update pack JSON) |
| `realitydb seed remote` | Advanced | P2 | Medium (connection pooling for cloud DBs) |

---

## Part 2: PRD Functional Requirements — Coverage Map

### FR-01 through FR-05: Core Engine ✅ COMPLETE

| Requirement | PRD Target | RealityDB Actual |
|-------------|-----------|-----------------|
| FR-01: 2M rows ≤10s | 200K rows/sec | ✅ 210K rows/sec verified |
| FR-02: Lifecycle rules | State transitions | ✅ Shipped, gated to Core tier |
| FR-03: Temporal ordering | Chronological sequences | ✅ created_at < updated_at < shipped_at |
| FR-04: Enum weights | Research-based distributions | ✅ Configurable per column |
| FR-05: All data types | UUID, string, int, float, bool, timestamp, enum, email, IP | ✅ 12 strategies (missing: IP dedicated generator) |

### FR-10 through FR-13: Sandbox 🟡 DESIGNED

| Requirement | PRD Target | Status |
|-------------|-----------|--------|
| FR-10: Create branch ≤2s | Neon branching | 🟡 Design in LAB-DESIGN.md |
| FR-11: Multiple concurrent | Per-user limits | 🟡 Design complete |
| FR-12: Auto-delete TTL | CRON cleanup | 🟡 Design complete |
| FR-13: Connection string | PostgreSQL-compatible | 🟡 Design complete |

### FR-20 through FR-22: Template Management ✅ MOSTLY COMPLETE

| Requirement | Status |
|-------------|--------|
| FR-20: Browse catalog | 🟡 CLI-only (pack list), no web UI |
| FR-21: Clone + customize | ✅ scan → edit → run pipeline |
| FR-22: Import/export JSON | ✅ Full pack system |

### FR-30 through FR-33: Developer Experience 🟡 PARTIAL

| Requirement | Status |
|-------------|--------|
| FR-30: CLI with DB write | ✅ `realitydb seed` |
| FR-31: REST API | 🔴 Not built |
| FR-32: Python SDK | 🔴 Not built |
| FR-33: Web UI | 🟡 Studio exists (internal only) |

### FR-40 through FR-43: Collaboration & Governance 🟡 PARTIAL

| Requirement | Status |
|-------------|--------|
| FR-40: Team workspaces | 🔴 Not built |
| FR-41: Audit log | ✅ Local audit command |
| FR-42: Data lineage | 🔴 Not built |
| FR-43: Quality reports | 🔴 Not built (analyze exists but no report export) |

---

## Part 3: Non-Functional Requirements

| Requirement | Target | Current |
|-------------|--------|---------|
| NFR-01: Throughput | 200K rows/sec | ✅ 210K rows/sec |
| NFR-02: Sandbox latency | ≤2s | 🟡 Not measured (Neon claims 1-2s) |
| NFR-03: API p95 | ≤500ms | 🔴 No API yet |
| NFR-04: Availability | 99.9% | 🟡 Cloudflare Pages (high uptime, no SLA tracking) |
| NFR-05: Compliance | SOC 2, HIPAA, GDPR | 🔴 Not started |
| NFR-06: Max dataset | 1TB per tenant | ✅ No limit in CLI (file-based) |

---

## Part 4: Infrastructure Stack — What Exists vs. PRD

| PRD Component | PRD Tech | Current RealityDB | Gap |
|---------------|----------|-------------------|-----|
| Frontend | React 18 + TS | Studio (React, internal) + Sandbox (React, public) | Need public-facing template UI |
| CLI | Go | Node.js/TypeScript (Commander.js) | Works. Go migration is optional optimization |
| API Gateway | Kong/NGINX | None | Cloudflare Worker can serve as lightweight API |
| Backend Services | Node.js/FastAPI | Cloudflare Workers (2 deployed) | Need more Workers for lab, billing |
| Generation Engine | Rust + Python | TypeScript (packages/engine/) | Works at 210K/sec. Rust is future optimization |
| Production DB | Supabase | ✅ Supabase (project cfpongy...) | Done |
| Simulation DB | Neon | 🔴 Not set up | Create Neon account + project |
| Message Queue | Redis/BullMQ | None | Cloudflare Queues or Durable Objects |
| Object Storage | S3/R2 | Cloudflare R2 (available) | Need to configure |
| Observability | OpenTelemetry | None | Post-launch |
| CI/CD | GitHub Actions | None | Need to add |
| Infra | Kubernetes | Cloudflare Workers (serverless) | No K8s needed at current scale |

**Key insight:** The PRD assumes Kubernetes, Kong, Redis, Rust — enterprise-scale infra. But RealityDB's current stack (Cloudflare Workers + Supabase + npm) can deliver Phase 1 MVP without any of that. Scale the infra when you scale the revenue.

---

## Part 5: Phase Mapping — Timeline Acceleration

### Phase 1: Core Sandbox MVP (PRD says 3 months)

| Task | PRD Estimate | Accelerated | Why Faster |
|------|-------------|------------|-----------|
| Generation engine | 4-6 weeks | ✅ DONE | Already shipped at 210K rows/sec |
| Template catalog | 2-3 weeks | ✅ DONE | 8+ templates exist |
| CLI tool | 3-4 weeks | ✅ DONE | 20 commands shipped |
| Lifecycle rules | 2-3 weeks | ✅ DONE | Gated, tested |
| Temporal ordering | 1-2 weeks | ✅ DONE | Built into engine |
| ML splits | 1-2 weeks | ✅ DONE | 3 strategies shipped |
| Parquet output | 1 week | ✅ DONE | CSV + DuckDB approach |
| Neon sandbox integration | 2-3 weeks | 🔴 TO DO | LAB-DESIGN.md ready |
| REST API (Cloudflare Worker) | 2-3 weeks | 🔴 TO DO | |
| User accounts (Supabase Auth) | 1-2 weeks | 🟡 PARTIAL | Supabase project exists |
| Stripe billing | 1 week | 🟡 PARTIAL | upgrade command exists |
| Landing page | 1 week | 🔴 TO DO | |

**Accelerated Phase 1 timeline: 4-6 weeks (not 12)**

### Phase 2: Collaborative Sim Lab (PRD says 3 months)

| Task | Status | Remaining |
|------|--------|-----------|
| Team workspaces | 🔴 | 3-4 weeks |
| Sandbox sharing | 🟡 Design exists | 1-2 weeks |
| CI/CD integration | 🔴 | 2-3 weeks |
| `simulate split` | ✅ DONE | 0 |
| RBAC | 🔴 | 2-3 weeks |

**Accelerated Phase 2 timeline: 6-8 weeks (not 12)**

### Phase 3: Enterprise (PRD says 3 months)

All 🔴 — SSO, SCIM, SOC 2, HIPAA, private tenants. This is where the real enterprise investment begins. No shortcuts here.

---

## Part 6: Domain Template Variants — The Revenue Catalog

Each domain needs multiple template variants targeting different personas and use cases. This is the content that justifies enterprise pricing.

### 🏦 Financial Services (BFSI)

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `bfsi-fraud-aml` | 16 | Fraud Analyst, AML Investigator | Transaction laundering patterns, suspicious activity reports, entity resolution networks |
| `bfsi-credit-risk` | 14 | Credit Risk Modeler | Loan applications, credit scores, default events, recovery rates, vintage analysis |
| `bfsi-insurance-claims` | 18 | Actuary, Claims Director | Policy lifecycle, claims with injury codes, subrogation, reserve calculations |
| `bfsi-capital-markets` | 20 | Trade Compliance Officer | Order book, trade executions, T+1 settlement, wash trade patterns, insider trading flags |
| `bfsi-payments` | 12 | Payment Product Manager | Card transactions, chargebacks, 3DS authentication, merchant risk scoring |
| `bfsi-retail-banking` | 16 | ✅ EXISTS (Banking template) | Accounts, transactions, loans, ATMs, fraud alerts — SHIPPED |

### 🏥 Healthcare & Life Sciences

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `health-ehr-clinical` | 22 | CMIO, Clinical Researcher | Patient demographics, encounters, diagnoses (ICD-10), medications, lab results, FHIR-compatible |
| `health-clinical-trials` | 20 | ✅ EXISTS (Oncology template) | Patients, trials, enrollments, genomics, adverse events, regulatory — SHIPPED |
| `health-claims-billing` | 16 | Payer Operations Lead | Claims lifecycle (submitted→adjudicated→paid/denied), CPT codes, EOBs, provider networks |
| `health-pharmacy` | 14 | Pharmacy Director | Prescriptions, drug interactions, formulary, refill patterns, controlled substance tracking |
| `health-mental-health` | 12 | Behavioral Health Director | PHQ-9/GAD-7 scores, treatment plans, session notes, crisis events, outcome measures |
| `health-population` | 18 | Population Health Analyst | Social determinants, risk stratification, care gaps, quality measures (HEDIS) |

### 🛡️ Cybersecurity

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `cyber-insider-threat` | 16 | SOC Manager | Employee activity logs, file access, email patterns, VPN sessions, UEBA scores |
| `cyber-network-ids` | 14 | Security Engineer | Network flows, firewall logs, DNS queries, intrusion alerts, MITRE ATT&CK mapping |
| `cyber-phishing` | 12 | Security Awareness Lead | Email metadata, URL analysis, user click rates, training completion, incident reports |
| `cyber-cloud-security` | 18 | Cloud Security Architect | IAM events, resource configs, compliance checks, drift detection, vulnerability scans |
| `cyber-incident-response` | 14 | IR Manager | Alert triage, escalation chains, containment actions, forensic artifacts, post-mortem |

### 🚗 Automotive & IoT

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `auto-av-sensor` | 20 | Perception Engineer | LiDAR point clouds, camera frames, radar returns, object detection labels, edge cases |
| `auto-adas-driver` | 16 | ADAS Engineering Director | Driver behavior events, lane departures, braking patterns, drowsiness detection |
| `auto-connected-vehicle` | 14 | Connected Services PM | Telematics data, OTA updates, diagnostic codes, fleet management |
| `iot-industrial` | 16 | IIoT Platform Engineer | Sensor readings, equipment health, predictive maintenance, anomaly detection |

### 🛒 Retail & E-Commerce

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `retail-ecommerce` | 14 | ✅ EXISTS (E-commerce preset) | Customers, products, orders, payments, reviews — SHIPPED |
| `retail-supply-chain` | 24 | ✅ EXISTS (Supply Chain template) | Warehouses, shipments, inventory — SHIPPED |
| `retail-personalization` | 16 | Personalization Engineer | User sessions, product views, recommendations, A/B test assignments, conversion events |
| `retail-loyalty` | 12 | CRM Director | Loyalty tiers, point transactions, reward redemptions, churn prediction features |
| `retail-pos` | 14 | Retail Operations | POS transactions, inventory movements, shrinkage, employee schedules |

### 🎓 Education

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `edu-k12-mtss` | 30 | ✅ EXISTS (EduNode template) | Students, risk evaluations, interventions, dosage, sessions — SHIPPED |
| `edu-higher-ed` | 18 | University Registrar | Courses, enrollments, grades, degree audits, financial aid, retention prediction |
| `edu-lms-analytics` | 14 | Instructional Designer | Course modules, assignments, quiz attempts, engagement metrics, completion rates |
| `edu-assessment` | 12 | Assessment Director | Test items, student responses, IRT parameters, score reports, growth measures |

### 📡 Telecommunications

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `telco-network` | 18 | Network Operations | Cell towers, traffic patterns, outage events, capacity planning, QoS metrics |
| `telco-customer` | 14 | Customer Analytics | Subscribers, usage patterns, billing, churn events, NPS surveys |
| `telco-fraud` | 12 | Revenue Assurance | SIM swap attempts, subscription fraud, roaming abuse, interconnect fraud |

### ⚡ Energy & Utilities

| Template | Tables | Target Persona | Key Features |
|----------|--------|---------------|-------------|
| `energy-smart-grid` | 16 | Grid Operations | Smart meter readings, demand response events, outage management, renewable forecasts |
| `energy-trading` | 14 | Energy Trader | Market prices, futures contracts, weather correlations, settlement data |

---

## Part 7: Template Count Summary

| Domain | Existing | To Build | Total Variants |
|--------|----------|----------|---------------|
| 🏦 Financial Services | 1 | 5 | 6 |
| 🏥 Healthcare | 1 | 5 | 6 |
| 🛡️ Cybersecurity | 0 | 5 | 5 |
| 🚗 Automotive/IoT | 0 | 4 | 4 |
| 🛒 Retail/E-Commerce | 2 | 3 | 5 |
| 🎓 Education | 1 | 3 | 4 |
| 📡 Telecom | 0 | 3 | 3 |
| ⚡ Energy | 0 | 2 | 2 |
| 🍽️ Restaurant | 1 | 0 | 1 |
| **TOTAL** | **6** | **30** | **36** |

**Current catalog: 6 templates (+ 4 init presets)**
**Target catalog: 36 templates across 9 verticals**

Each template includes: schema JSON, lifecycle rules, weighted enums, temporal ordering, and documentation.

---

## Part 8: What to Build Next (Ordered by Revenue Impact)

| Priority | Action | Revenue Unlock |
|----------|--------|---------------|
| 1 | **Neon sandbox (lab create)** | Core platform differentiator, enables SaaS model |
| 2 | **REST API (Cloudflare Worker)** | Enables CI/CD integration, programmatic access |
| 3 | **Stripe billing (real links)** | Convert free users to Core ($49/mo) |
| 4 | **Landing page rewrite** | Drive inbound signups |
| 5 | **BFSI templates (fraud-aml, credit-risk)** | Highest-paying vertical ($12K-$60K/yr) |
| 6 | **Healthcare templates (EHR, claims)** | Second-highest vertical, HIPAA unlocks enterprise |
| 7 | **CI/CD integration (ci start)** | Developer stickiness, team adoption |
| 8 | **SSO/SCIM** | Enterprise gate-opener |
| 9 | **Cybersecurity templates** | Third vertical |
| 10 | **SOC 2 Type I** | Required for enterprise contracts |

---

*Simulation Lab Vision Audit v1.0 · April 10, 2026 · Mpingo Systems LLC*
