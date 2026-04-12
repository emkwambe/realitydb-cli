# RealityDB Telemetry Worker

## Endpoint
POST https://api.realitydb.dev/v1/telemetry

## Request Body
{
  "event": "command",
  "clientId": "uuid",      // anonymous, no PII
  "tier": "core",
  "command": "run",
  "rows": 50000,
  "tables": 16,
  "format": "sql",
  "durationMs": 280,
  "features": ["mask-pii", "cardinality-scale"],
  "timestamp": "2026-04-11T20:00:00Z"
}

## Storage: Cloudflare D1 (SQLite)

CREATE TABLE telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  command TEXT NOT NULL,
  rows INTEGER,
  tables INTEGER,
  format TEXT,
  duration_ms INTEGER,
  features TEXT,
  received_at TEXT DEFAULT (datetime('now'))
);

## Queries for Dashboard

-- DAU/MAU
SELECT COUNT(DISTINCT client_id) FROM telemetry
WHERE received_at > datetime('now', '-1 day');

-- Most used commands
SELECT command, COUNT(*) as cnt FROM telemetry
GROUP BY command ORDER BY cnt DESC LIMIT 10;

-- Conversion funnel
SELECT tier, COUNT(DISTINCT client_id) FROM telemetry
GROUP BY tier;

-- Avg rows per run
SELECT AVG(rows) FROM telemetry WHERE command = 'run';

-- Format popularity
SELECT format, COUNT(*) FROM telemetry
WHERE format IS NOT NULL GROUP BY format;

-- Churn signal (active last month but not this month)
SELECT client_id FROM telemetry
WHERE received_at BETWEEN datetime('now', '-60 days') AND datetime('now', '-30 days')
AND client_id NOT IN (
  SELECT client_id FROM telemetry WHERE received_at > datetime('now', '-30 days')
);

## Privacy
- No PII collected (client_id is random UUID)
- Opt-out: touch ~/.realitydb/no-telemetry
- Data retained 90 days
- Never sold or shared
