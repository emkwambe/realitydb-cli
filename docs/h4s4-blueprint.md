# H4-S4 — System Behavior Simulation (v1.3.0)

## Sprint Goal
Simulate entire product lifecycle events — not just database states. Generate event streams, webhook payloads, API traffic patterns, and multi-system correlated sequences. This transforms RealityDB from a database seeder into a Reality Engine.

## Architecture

```
packages/generators/src/simulate/
├── eventStream.ts           # Event stream types + generator
├── webhooks/
│   ├── stripe.ts            # Stripe webhook event templates
│   ├── github.ts            # GitHub webhook event templates
│   └── generic.ts           # Generic webhook builder
├── apiTraffic.ts            # API traffic pattern generator
├── correlation.ts           # Multi-system event correlation
├── report.ts                # Simulation report formatting
└── index.ts                 # Re-exports

packages/core/src/simulatePipeline.ts    # Orchestrates simulation runs

apps/cli/src/commands/simulate.ts        # CLI subcommands
```

## Sprint Checklist

| # | Deliverable | Points | Score |
|---|-------------|--------|-------|
| 1 | `SimulationEvent` type with timestamp, source, type, payload, correlationId | 3 | |
| 2 | `EventStreamGenerator` — configurable event streams with temporal distribution | 3 | |
| 3 | Built-in event catalog: user_signup, page_view, purchase, subscription_change, login, logout, api_call, error | 3 | |
| 4 | Stripe webhook templates: payment_intent.succeeded/failed, customer.subscription.created/updated/deleted, invoice.paid, charge.refunded | 3 | |
| 5 | GitHub webhook templates: push, pull_request.opened/merged/closed, issues.opened/closed, release.published | 3 | |
| 6 | Generic webhook builder for custom event sources | 2 | |
| 7 | API traffic pattern generator: normal load, spike, gradual ramp, burst | 3 | |
| 8 | Multi-system correlation: user action → payment → notification → analytics chain | 3 | |
| 9 | `SimulationProfile` presets: saas-startup, ecommerce-peak, api-service | 2 | |
| 10 | `simulatePipeline.ts` — orchestrate: build profile → generate events → correlate → export | 3 | |
| 11 | CLI `simulate` command group: run, profiles, webhooks | 3 | |
| 12 | Output formats: JSON event log, NDJSON stream, webhook replay file | 2 | |
| 13 | Simulation report with event counts, timeline coverage, correlation chains | 2 | |
| 14 | Generators index exports for simulate module | 1 | |
| 15 | Core index exports for simulate pipeline | 1 | |
| 16 | Version bump to 1.3.0 across all version constants | 1 | |
| 17 | README System Simulation section + commands table update | 2 | |
| 18 | CHANGELOG v1.3.0 entry | 1 | |
| 19 | Build passes with zero errors | 2 | |
| **Total** | | **43** | |

## Event Structure

```typescript
interface SimulationEvent {
  id: string;
  timestamp: string;         // ISO 8601
  source: string;            // 'app' | 'stripe' | 'github' | 'api' | custom
  type: string;              // 'user.signup' | 'payment_intent.succeeded' | etc.
  correlationId: string;     // Links related events across systems
  sessionId?: string;        // Groups events in a user session
  actor?: { id: string; type: string };
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

## Simulation Profiles

```typescript
interface SimulationProfile {
  name: string;
  description: string;
  duration: string;          // '1-hour' | '1-day' | '1-week'
  eventSources: EventSourceConfig[];
  correlationRules: CorrelationRule[];
  trafficPattern: TrafficPattern;
}
```

## CLI Commands

```bash
realitydb simulate run --profile saas-startup --duration 1-day --output events.json
realitydb simulate run --profile ecommerce-peak --format ndjson --output stream.ndjson
realitydb simulate profiles                    # List available profiles
realitydb simulate webhooks --source stripe --events 100 --output webhooks.json
realitydb simulate webhooks --source github --events 50 --output gh-events.json
```
