// ============================================
// src/commands/convert.ts
// ============================================

import * as fs from 'fs';
import * as path from 'path';

export async function convertCommand(options: {
  input: string;
  format: string;
  output?: string;
}): Promise<void> {
  const startTime = Date.now();
  const inputPath = path.resolve(options.input);
  const format = options.format;

  if (!fs.existsSync(inputPath)) {
    console.error(`\n\u274C File not found: ${inputPath}`);
    process.exit(1);
  }

  if (!['json', 'csv', 'sql'].includes(format)) {
    console.error(`\n\u274C Unsupported target format: ${format}`);
    console.error(`   Supported: json, csv, sql`);
    process.exit(1);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const baseName = path.basename(inputPath, ext);
  const outputPath = options.output || `${baseName}.${format}`;

  console.log(`\n\u{1F504} RealityDB Convert`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Format: ${ext.replace('.', '')} \u2192 ${format}`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Read input
  let data: Record<string, any[]>;

  if (ext === '.json') {
    const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    data = raw.tables || raw.data || raw;
    // Handle case where data is an object of arrays
    if (!data || typeof data !== 'object') {
      console.error(`\n\u274C Could not find table data in JSON file.`);
      process.exit(1);
    }
  } else if (ext === '.csv') {
    // Single CSV file — treat as one table
    const lines = fs.readFileSync(inputPath, 'utf-8').split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      console.error(`\n\u274C CSV file is empty or has no data rows.`);
      process.exit(1);
    }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, idx) => { row[h] = vals[idx] || null; });
      rows.push(row);
    }
    data = { [baseName]: rows };
  } else {
    console.error(`\n\u274C Unsupported input format: ${ext}`);
    console.error(`   Supported inputs: .json, .csv`);
    process.exit(1);
  }

  const tableNames = Object.keys(data).filter(k => Array.isArray(data[k]));
  const totalRows = tableNames.reduce((s, t) => s + data[t].length, 0);

  // Write output
  if (format === 'json') {
    fs.writeFileSync(outputPath, JSON.stringify({ tables: data }, null, 2), 'utf-8');
  } else if (format === 'csv') {
    const outDir = outputPath.endsWith('.csv') ? outputPath.replace('.csv', '') : outputPath;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    for (const [tableName, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const lines = [cols.join(',')];
      for (const row of rows) {
        lines.push(cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return '';
          if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
          if (typeof v === 'object') return '"' + JSON.stringify(v).replace(/"/g, '""') + '"';
          return String(v);
        }).join(','));
      }
      fs.writeFileSync(path.join(outDir, `${tableName}.csv`), lines.join('\n'), 'utf-8');
    }
  } else if (format === 'sql') {
    const fd = fs.openSync(outputPath, 'w');
    fs.writeSync(fd, '-- Converted by RealityDB CLI\n\n');
    for (const [tableName, rows] of Object.entries(data)) {
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const cols = Object.keys(rows[0]);
      const quotedCols = cols.map(c => `"${c}"`).join(', ');

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const values = batch.map(row => {
          const vals = cols.map(c => {
            const v = row[c];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            if (typeof v === 'number') return String(v);
            if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            return `'${String(v).replace(/'/g, "''")}'`;
          });
          return `(${vals.join(', ')})`;
        }).join(',\n');
        fs.writeSync(fd, `INSERT INTO "${tableName}" (${quotedCols}) VALUES\n${values};\n\n`);
      }
    }
    fs.closeSync(fd);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const outSize = format === 'csv'
    ? 'directory'
    : (fs.statSync(outputPath).size / 1024).toFixed(1) + ' KB';

  console.log(`\n\u2705 Conversion complete!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} Output: ${outputPath} (${outSize})`);
  console.log(`   \u{1F4CA} Tables: ${tableNames.length} | Rows: ${totalRows.toLocaleString()}`);
  console.log(`   \u23F1\uFE0F  Time: ${elapsed}s\n`);
}
