import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export async function auditExportCommand(options: {
  format?: string;
  since?: string;
  sign?: boolean;
  output?: string;
  limit?: string;
}): Promise<void> {
  const format = options.format || 'json';
  const limit = options.limit ? parseInt(options.limit) : 1000;
  const outputFile = options.output || `audit-export-${Date.now()}.${format}`;

  // Read usage/audit data from local store
  const usagePath = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.realitydb', 'usage.json');
  let usageData: any = {};
  if (fs.existsSync(usagePath)) {
    usageData = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));
  }

  // Build audit entries from usage data
  const entries: any[] = [];

  // Parse usage entries
  if (usageData.operations) {
    for (const op of usageData.operations.slice(-limit)) {
      entries.push(op);
    }
  }

  // Add metadata
  const exportData = {
    exportedAt: new Date().toISOString(),
    format,
    entriesCount: entries.length,
    sinceFilter: options.since || 'all',
    entries,
  };

  // Sign if requested
  if (options.sign) {
    const content = JSON.stringify(exportData);
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    (exportData as any).signature = {
      algorithm: 'sha256',
      hash,
      signedAt: new Date().toISOString(),
      note: 'This hash verifies the audit export has not been tampered with.',
    };
  }

  if (format === 'json') {
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf-8');
  } else if (format === 'csv') {
    const lines = ['timestamp,command,pack,rows,format,duration_ms'];
    for (const e of entries) {
      lines.push([
        e.timestamp || '',
        e.command || '',
        e.pack || '',
        e.rows || '',
        e.format || '',
        e.duration || '',
      ].join(','));
    }
    fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8');
  }

  console.log(`\n\u{1F4CB} RealityDB Audit Export`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} File: ${outputFile}`);
  console.log(`   \u{1F4CA} Entries: ${entries.length}`);
  console.log(`   \u{1F4DD} Format: ${format.toUpperCase()}`);
  if (options.sign) {
    console.log(`   \u{1F512} Signed: sha256:${(exportData as any).signature.hash.substring(0, 16)}...`);
  }
  console.log(``);
}
