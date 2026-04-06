import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const AUDIT_DIR = path.join(os.homedir(), '.realitydb');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.log');

export function logAuditEvent(event: {
  command: string;
  pack?: string;
  rows?: number;
  tables?: number;
  connection?: string;
  format?: string;
  duration?: string;
}): void {
  try {
    if (!fs.existsSync(AUDIT_DIR)) fs.mkdirSync(AUDIT_DIR, { recursive: true });

    const entry = {
      timestamp: new Date().toISOString(),
      ...event,
      connection: event.connection?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'),
    };

    fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch {
    // Silent fail — audit logging should never break the CLI
  }
}

export async function auditCommand(options: {
  since?: string;
  command?: string;
  limit?: string;
  clear?: boolean;
}): Promise<void> {
  console.log(`\n\u{1F4DC} RealityDB Audit Log`);
  console.log(`${'\u2500'.repeat(40)}`);

  if (options.clear) {
    try {
      if (fs.existsSync(AUDIT_FILE)) {
        fs.unlinkSync(AUDIT_FILE);
        console.log(`   \u2705 Audit log cleared.\n`);
      } else {
        console.log(`   No audit log found.\n`);
      }
    } catch (e: any) {
      console.error(`   \u274C Failed to clear: ${e.message}\n`);
    }
    return;
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    console.log(`   No audit history yet.`);
    console.log(`   Operations are logged automatically when you run commands.`);
    console.log(`   Log location: ${AUDIT_FILE}\n`);
    return;
  }

  const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').split('\n').filter(l => l.trim());
  let entries = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  // Filter by date
  if (options.since) {
    const since = new Date(options.since).getTime();
    entries = entries.filter(e => new Date(e.timestamp).getTime() >= since);
  }

  // Filter by command
  if (options.command) {
    entries = entries.filter(e => e.command === options.command);
  }

  // Limit
  const limit = options.limit ? parseInt(options.limit) : 50;
  const total = entries.length;
  entries = entries.slice(-limit);

  console.log(`   Location: ${AUDIT_FILE}`);
  console.log(`   Total entries: ${total}`);
  if (options.since) console.log(`   Since: ${options.since}`);
  if (options.command) console.log(`   Filter: ${options.command}`);
  console.log(`   Showing: ${entries.length}`);
  console.log(`${'\u2500'.repeat(40)}`);

  if (entries.length === 0) {
    console.log(`   No matching entries.\n`);
    return;
  }

  for (const entry of entries) {
    const time = new Date(entry.timestamp).toLocaleString();
    const details: string[] = [];
    if (entry.pack) details.push(`pack: ${entry.pack}`);
    if (entry.rows) details.push(`rows: ${entry.rows.toLocaleString()}`);
    if (entry.tables) details.push(`tables: ${entry.tables}`);
    if (entry.format) details.push(`format: ${entry.format}`);
    if (entry.duration) details.push(`time: ${entry.duration}`);
    if (entry.connection) details.push(`db: ${entry.connection}`);

    console.log(`   [${time}] ${entry.command}${details.length > 0 ? ' — ' + details.join(', ') : ''}`);
  }

  console.log(``);
}
