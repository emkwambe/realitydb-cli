const TELEMETRY_URL = 'https://api.realitydb.dev/v1/telemetry';

interface TelemetryEvent {
  event: string;
  clientId: string;
  tier: string;
  command: string;
  rows?: number;
  tables?: number;
  format?: string;
  durationMs?: number;
  features?: string[];
  timestamp: string;
}

let telemetryEnabled = true;

export function disableTelemetry(): void {
  telemetryEnabled = false;
}

export async function sendTelemetry(event: TelemetryEvent): Promise<void> {
  if (!telemetryEnabled) return;

  // Check opt-out
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const optOutFile = path.join(os.homedir(), '.realitydb', 'no-telemetry');
  if (fs.existsSync(optOutFile)) return;

  try {
    // Fire-and-forget — never block the CLI
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timeout);
  } catch {
    // Silently fail — telemetry must never break the CLI
  }
}

export function buildTelemetryEvent(data: Partial<TelemetryEvent>): TelemetryEvent {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  let clientId = 'unknown';
  const clientIdFile = path.join(os.homedir(), '.realitydb', 'client_id');
  try { clientId = fs.readFileSync(clientIdFile, 'utf-8').trim(); } catch {}

  const { getTier } = require('../gate');

  return {
    event: 'command',
    clientId,
    tier: getTier(),
    command: data.command || 'unknown',
    rows: data.rows,
    tables: data.tables,
    format: data.format,
    durationMs: data.durationMs,
    features: data.features,
    timestamp: new Date().toISOString(),
  };
}
