import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TELEMETRY_URL = 'https://realitydb-telemetry.eddy-078.workers.dev/v1/telemetry';
const REALITYDB_DIR = path.join(os.homedir(), '.realitydb');

interface TelemetryEvent {
  clientId: string;
  tier: string;
  command: string;
  rows?: number;
  tables?: number;
  format?: string;
  durationMs?: number;
  features?: string[];
  cliVersion?: string;
  osPlatform?: string;
}

function isOptedOut(): boolean {
  return fs.existsSync(path.join(REALITYDB_DIR, 'no-telemetry'));
}

function getClientId(): string {
  const clientIdFile = path.join(REALITYDB_DIR, 'client_id');
  try { return fs.readFileSync(clientIdFile, 'utf-8').trim(); } catch { return 'unknown'; }
}

export async function sendTelemetry(data: Partial<TelemetryEvent>): Promise<void> {
  if (isOptedOut()) return;

  const event: TelemetryEvent = {
    clientId: data.clientId || getClientId(),
    tier: data.tier || 'free',
    command: data.command || 'unknown',
    rows: data.rows,
    tables: data.tables,
    format: data.format,
    durationMs: data.durationMs,
    features: data.features,
    cliVersion: data.cliVersion || 'unknown',
    osPlatform: os.platform(),
  };

  try {
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
    // Never block the CLI
  }
}
