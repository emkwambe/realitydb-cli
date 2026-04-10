import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  generateData,
  generateCreateTable,
  generateInsertStatements,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';
import { loadLicense } from '../auth/license';

interface AnomalyType {
  id: string;
  name: string;
  description: string;
  apply: (row: any, columns: string[], intensity: number) => { row: any; label: string; details: string };
}

const ANOMALY_TYPES: Record<string, AnomalyType> = {
  'extreme-value': {
    id: 'extreme-value',
    name: 'Extreme values',
    description: 'Multiply numeric columns by 10-100x their normal range',
    apply: (row, columns, intensity) => {
      const col = columns.find(c => typeof row[c] === 'number' && row[c] !== null);
      if (!col) return { row, label: 'none', details: 'no numeric column' };
      const multiplier = 10 * intensity;
      const original = row[col];
      row[col] = Math.round(original * multiplier * 100) / 100;
      return { row, label: 'extreme_value', details: `${col}: ${original} → ${row[col]} (${multiplier}x)` };
    },
  },
  'null-injection': {
    id: 'null-injection',
    name: 'Null injection',
    description: 'Set required fields to NULL (simulates data corruption)',
    apply: (row, columns, intensity) => {
      const eligible = columns.filter(c => row[c] !== null && c !== 'id' && !c.endsWith('_id'));
      const count = Math.max(1, Math.ceil(eligible.length * 0.1 * intensity));
      const nulled: string[] = [];
      for (let i = 0; i < count && i < eligible.length; i++) {
        const idx = Math.floor(Math.random() * eligible.length);
        const col = eligible.splice(idx, 1)[0];
        row[col] = null;
        nulled.push(col);
      }
      return { row, label: 'null_injection', details: `nulled: ${nulled.join(', ')}` };
    },
  },
  'duplicate-record': {
    id: 'duplicate-record',
    name: 'Duplicate records',
    description: 'Create near-duplicate rows with slight variations',
    apply: (row, columns, intensity) => {
      const clone = { ...row };
      clone.id = crypto.randomUUID();
      // Slightly modify one text field
      const textCols = columns.filter(c => typeof row[c] === 'string' && c !== 'id' && !c.endsWith('_id'));
      if (textCols.length > 0) {
        const col = textCols[Math.floor(Math.random() * textCols.length)];
        clone[col] = row[col] + ' ';  // trailing space = near-duplicate
      }
      return { row: clone, label: 'duplicate_record', details: 'near-duplicate with trailing space' };
    },
  },
  'timestamp-anomaly': {
    id: 'timestamp-anomaly',
    name: 'Timestamp anomalies',
    description: 'Set timestamps to future dates or impossible past dates',
    apply: (row, columns, intensity) => {
      const tsCols = columns.filter(c => typeof row[c] === 'string' && row[c] && row[c].match(/^\d{4}-\d{2}-\d{2}/));
      if (tsCols.length === 0) return { row, label: 'none', details: 'no timestamp column' };
      const col = tsCols[Math.floor(Math.random() * tsCols.length)];
      const futureDate = new Date(Date.now() + (365 * intensity) * 24 * 60 * 60 * 1000);
      const original = row[col];
      row[col] = futureDate.toISOString();
      return { row, label: 'timestamp_anomaly', details: `${col}: ${original.substring(0, 10)} → ${row[col].substring(0, 10)} (future)` };
    },
  },
  'enum-violation': {
    id: 'enum-violation',
    name: 'Enum violations',
    description: 'Insert values outside the expected enum set',
    apply: (row, columns, intensity) => {
      const enumLike = columns.filter(c => typeof row[c] === 'string' && row[c] && row[c].length < 30 && !row[c].includes('@') && !row[c].match(/^\d{4}-/));
      if (enumLike.length === 0) return { row, label: 'none', details: 'no enum-like column' };
      const col = enumLike[Math.floor(Math.random() * enumLike.length)];
      const original = row[col];
      row[col] = '__INVALID_' + Math.random().toString(36).substring(2, 6).toUpperCase();
      return { row, label: 'enum_violation', details: `${col}: "${original}" → "${row[col]}"` };
    },
  },
  'negative-value': {
    id: 'negative-value',
    name: 'Negative values',
    description: 'Flip positive numbers to negative (invalid amounts, negative ages)',
    apply: (row, columns, intensity) => {
      const numCols = columns.filter(c => typeof row[c] === 'number' && row[c] > 0 && c !== 'id');
      if (numCols.length === 0) return { row, label: 'none', details: 'no positive numeric column' };
      const col = numCols[Math.floor(Math.random() * numCols.length)];
      const original = row[col];
      row[col] = -Math.abs(original);
      return { row, label: 'negative_value', details: `${col}: ${original} → ${row[col]}` };
    },
  },
  'string-overflow': {
    id: 'string-overflow',
    name: 'String overflow',
    description: 'Insert extremely long strings that may break display or storage',
    apply: (row, columns, intensity) => {
      const textCols = columns.filter(c => typeof row[c] === 'string' && c !== 'id' && !c.endsWith('_id'));
      if (textCols.length === 0) return { row, label: 'none', details: 'no text column' };
      const col = textCols[Math.floor(Math.random() * textCols.length)];
      const len = 500 * intensity;
      row[col] = 'A'.repeat(len);
      return { row, label: 'string_overflow', details: `${col}: ${len} chars` };
    },
  },
  'type-mismatch': {
    id: 'type-mismatch',
    name: 'Type mismatch',
    description: 'Insert wrong data types (string in numeric field, number in text field)',
    apply: (row, columns, intensity) => {
      const numCols = columns.filter(c => typeof row[c] === 'number' && c !== 'id');
      if (numCols.length > 0) {
        const col = numCols[Math.floor(Math.random() * numCols.length)];
        const original = row[col];
        row[col] = 'NOT_A_NUMBER' as any;
        return { row, label: 'type_mismatch', details: `${col}: ${original} → "NOT_A_NUMBER"` };
      }
      return { row, label: 'none', details: 'no suitable column' };
    },
  },
};

export async function anomalyCommand(options: {
  pack: string;
  inject?: string;
  frequency?: string;
  rows?: string;
  output?: string;
  format?: string;
  intensity?: string;
  seed?: string;
  listTypes?: boolean;
  labelColumn?: string;
}): Promise<void> {
  if (options.listTypes) {
    console.log(`\n\u{1F9EA} Available Anomaly Types`);
    console.log(`${'\u2500'.repeat(40)}`);
    for (const [key, anomaly] of Object.entries(ANOMALY_TYPES)) {
      console.log(`   \u{1F534} ${key}`);
      console.log(`      ${anomaly.description}`);
    }
    console.log(`\n   Usage: realitydb anomaly --pack <file> --inject extreme-value,null-injection --frequency 2`);
    console.log(``);
    return;
  }

  const license = loadLicense();
  const startTime = Date.now();
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const format = options.format || 'json';
  const frequency = options.frequency ? parseFloat(options.frequency) / 100 : 0.02;
  const intensity = options.intensity ? parseInt(options.intensity) : 2;
  const labelCol = options.labelColumn || '_anomaly_label';
  const seed = options.seed ? parseInt(options.seed) : undefined;

  if (seed !== undefined) {
    // Seed the random number generator (basic LCG)
    let s = seed;
    const origRandom = Math.random;
    Math.random = () => { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; };
  }

  const injectTypes = options.inject ? options.inject.split(',').map(s => s.trim()) : ['extreme-value'];
  for (const t of injectTypes) {
    if (!ANOMALY_TYPES[t]) {
      console.error(`\n\u274C Unknown anomaly type: ${t}`);
      console.error(`   Available: ${Object.keys(ANOMALY_TYPES).join(', ')}`);
      console.error(`   List all: realitydb anomaly --list-types`);
      process.exit(1);
    }
  }

  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);
  if (tables.length === 0) { console.error(`\n\u274C No tables found.`); process.exit(1); }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  console.log(`\n\u{1F9EA} RealityDB Anomaly Injection`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
  }
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Inject: ${injectTypes.join(', ')}`);
  console.log(`   Frequency: ${(frequency * 100).toFixed(1)}% of rows`);
  console.log(`   Intensity: ${intensity}`);
  console.log(`   Label column: ${labelCol}`);
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Tables: ${tables.length}`);
  if (seed !== undefined) console.log(`   Seed: ${seed} (deterministic)`);
  console.log(`${'\u2500'.repeat(40)}`);

  console.log(`   Generating base data...`);
  const { allData, actualTotal, elapsed } = generateData(ordered, rowsPerTable);

  console.log(`   Injecting anomalies...`);

  let totalInjected = 0;
  let totalNormal = 0;
  const anomalyLog: { table: string; row: number; type: string; details: string }[] = [];
  const perTableStats: Record<string, { injected: number; total: number }> = {};

  for (const tableName of Object.keys(allData)) {
    const tableRows = allData[tableName];
    if (!tableRows || tableRows.length === 0) continue;

    const columns = Object.keys(tableRows[0]);
    let tableInjected = 0;

    for (let i = 0; i < tableRows.length; i++) {
      if (Math.random() < frequency) {
        const anomalyType = injectTypes[Math.floor(Math.random() * injectTypes.length)];
        const anomaly = ANOMALY_TYPES[anomalyType];
        const result = anomaly.apply(tableRows[i], columns, intensity);

        if (result.label !== 'none') {
          tableRows[i] = result.row;
          tableRows[i][labelCol] = result.label;
          tableRows[i]['_anomaly_details'] = result.details;
          tableInjected++;
          totalInjected++;
          anomalyLog.push({ table: tableName, row: i, type: result.label, details: result.details });
        } else {
          tableRows[i][labelCol] = 'normal';
          totalNormal++;
        }
      } else {
        tableRows[i][labelCol] = 'normal';
        totalNormal++;
      }
    }

    perTableStats[tableName] = { injected: tableInjected, total: tableRows.length };
    if (tableInjected > 0) {
      console.log(`   \u{1F534} ${tableName}: ${tableInjected} anomalies injected (${(tableInjected / tableRows.length * 100).toFixed(1)}%)`);
    }
  }

  // Output
  const outputFile = options.output || `anomaly-${Date.now()}.${format}`;

  if (format === 'sql') {
    const fd = fs.openSync(outputFile, 'w');
    fs.writeSync(fd, [
      '-- ============================================',
      '-- RealityDB Anomaly Injection',
      `-- Types: ${injectTypes.join(', ')}`,
      `-- Frequency: ${(frequency * 100).toFixed(1)}%`,
      `-- Injected: ${totalInjected} anomalies in ${actualTotal} rows`,
      `-- Generated: ${new Date().toISOString()}`,
      '-- ============================================',
      '', '',
    ].join('\n'));

    for (const table of ordered) {
      const ddl = generateCreateTable(table);
      fs.writeSync(fd, `DROP TABLE IF EXISTS "${table.name}" CASCADE;\n`);
      fs.writeSync(fd, ddl + '\n\n');
    }

    for (const table of ordered) {
      const tableData = allData[table.name];
      if (!tableData || tableData.length === 0) continue;
      const sql = generateInsertStatements(table.name, tableData);
      fs.writeSync(fd, sql + '\n\n');
    }
    fs.closeSync(fd);
  } else if (format === 'csv') {
    const outDir = outputFile.replace(/\.[^.]+$/, '');
    fs.mkdirSync(outDir, { recursive: true });
    for (const [tableName, tableRows] of Object.entries(allData)) {
      if (!tableRows || tableRows.length === 0) continue;
      const cols = Object.keys(tableRows[0]);
      const lines = [cols.join(',')];
      for (const row of tableRows) {
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

    // Write anomaly manifest
    fs.writeFileSync(path.join(outDir, 'anomaly-manifest.json'), JSON.stringify({
      types: injectTypes,
      frequency: frequency * 100,
      intensity,
      totalInjected,
      totalRows: actualTotal,
      labelColumn: labelCol,
      perTable: perTableStats,
      log: anomalyLog.slice(0, 100),
    }, null, 2), 'utf-8');
  } else {
    // JSON
    fs.writeFileSync(outputFile, JSON.stringify({
      _meta: {
        generator: 'realitydb-anomaly',
        types: injectTypes,
        frequency: frequency * 100,
        intensity,
        totalInjected,
        totalRows: actualTotal,
        labelColumn: labelCol,
        seed: seed ?? null,
        generatedAt: new Date().toISOString(),
      },
      anomalyLog: anomalyLog.slice(0, 200),
      tables: allData,
    }, null, 2), 'utf-8');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const anomalyRate = (totalInjected / actualTotal * 100).toFixed(2);

  console.log(`\n\u2705 Anomaly injection complete!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} Output: ${outputFile}`);
  console.log(`   \u{1F4CA} Total rows: ${actualTotal.toLocaleString()}`);
  console.log(`   \u{1F534} Anomalies: ${totalInjected.toLocaleString()} (${anomalyRate}%)`);
  console.log(`   \u{1F7E2} Normal: ${totalNormal.toLocaleString()} (${(100 - parseFloat(anomalyRate)).toFixed(2)}%)`);
  console.log(`   \u{1F3F7}\uFE0F  Label column: "${labelCol}" (values: normal, ${injectTypes.map(t => ANOMALY_TYPES[t].id.replace(/-/g, '_')).join(', ')})`);
  console.log(`   \u23F1\uFE0F  Time: ${totalTime}s`);

  // Distribution summary
  const typeCounts: Record<string, number> = {};
  for (const entry of anomalyLog) {
    typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
  }
  if (Object.keys(typeCounts).length > 0) {
    console.log(`\n   Anomaly distribution:`);
    for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${type}: ${count} (${(count / totalInjected * 100).toFixed(1)}%)`);
    }
  }
  console.log(``);
}
