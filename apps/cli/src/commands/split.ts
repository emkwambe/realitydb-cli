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

interface SplitConfig {
  train: number;   // e.g. 0.7
  test: number;    // e.g. 0.2
  validation: number; // e.g. 0.1
}

/**
 * Deterministic shuffle using seed
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    const j = Math.abs(s) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get the value of a stratify column from a row
 */
function getStratifyValue(row: any, column: string): string {
  const val = row[column];
  if (val === null || val === undefined) return '__null__';
  return String(val);
}

/**
 * Temporal split: assign rows to splits based on created_at timestamp
 */
function temporalSplit(rows: any[], config: SplitConfig, timeColumn: string): { train: any[]; test: any[]; validation: any[] } {
  // Sort by time column
  const sorted = [...rows].sort((a, b) => {
    const ta = a[timeColumn] ? new Date(a[timeColumn]).getTime() : 0;
    const tb = b[timeColumn] ? new Date(b[timeColumn]).getTime() : 0;
    return ta - tb;
  });

  const trainEnd = Math.floor(sorted.length * config.train);
  const testEnd = Math.floor(sorted.length * (config.train + config.test));

  return {
    train: sorted.slice(0, trainEnd),
    test: sorted.slice(trainEnd, testEnd),
    validation: sorted.slice(testEnd),
  };
}

/**
 * Stratified split: maintain distribution of stratify column across splits
 */
function stratifiedSplit(rows: any[], config: SplitConfig, stratifyColumn: string, seed: number): { train: any[]; test: any[]; validation: any[] } {
  // Group by stratify value
  const groups: Record<string, any[]> = {};
  for (const row of rows) {
    const key = getStratifyValue(row, stratifyColumn);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const train: any[] = [];
  const test: any[] = [];
  const validation: any[] = [];

  // Split each group proportionally
  for (const [key, groupRows] of Object.entries(groups)) {
    const shuffled = seededShuffle(groupRows, seed + key.length);
    const trainEnd = Math.floor(shuffled.length * config.train);
    const testEnd = Math.floor(shuffled.length * (config.train + config.test));

    train.push(...shuffled.slice(0, trainEnd));
    test.push(...shuffled.slice(trainEnd, testEnd));
    validation.push(...shuffled.slice(testEnd));
  }

  return { train, test, validation };
}

/**
 * Random split with seed
 */
function randomSplit(rows: any[], config: SplitConfig, seed: number): { train: any[]; test: any[]; validation: any[] } {
  const shuffled = seededShuffle(rows, seed);
  const trainEnd = Math.floor(shuffled.length * config.train);
  const testEnd = Math.floor(shuffled.length * (config.train + config.test));

  return {
    train: shuffled.slice(0, trainEnd),
    test: shuffled.slice(trainEnd, testEnd),
    validation: shuffled.slice(testEnd),
  };
}

/**
 * Resolve FK references within a split — ensure child rows only reference parents in the same split
 */
function resolveFK(
  splitData: Record<string, any[]>,
  tables: any[],
  allData: Record<string, any[]>
): Record<string, any[]> {
  const resolved: Record<string, any[]> = {};

  // Build ID sets for each table in this split
  const idSets: Record<string, Set<string>> = {};
  for (const [tableName, rows] of Object.entries(splitData)) {
    idSets[tableName] = new Set(rows.map(r => r.id));
  }

  for (const table of tables) {
    const tableName = table.name;
    const rows = splitData[tableName];
    if (!rows) { resolved[tableName] = []; continue; }

    const cols = Array.isArray(table.columns) ? table.columns : Object.values(table.columns || {});
    const fkCols = cols.filter((c: any) => c.isFK || c.foreignKey || c.fkTarget);

    if (fkCols.length === 0) {
      // Root table — keep all rows
      resolved[tableName] = rows;
    } else {
      // Filter: only keep rows whose FK references exist in this split
      resolved[tableName] = rows.filter((row: any) => {
        for (const fk of fkCols) {
          const fkName = fk.name;
          const fkValue = row[fkName];
          if (!fkValue) continue; // NULL FK is ok

          // Find the referenced table
          let refTable: string | undefined;
          if (fk.foreignKey?.table) refTable = fk.foreignKey.table;
          else if (fk.fkTarget?.tableId) {
            const target = tables.find((t: any) => t.id === fk.fkTarget.tableId);
            refTable = target?.name;
          }

          if (refTable && idSets[refTable] && !idSets[refTable].has(fkValue)) {
            return false; // FK reference doesn't exist in this split
          }
        }
        return true;
      });
    }
  }

  return resolved;
}

export async function splitCommand(options: {
  pack: string;
  rows?: string;
  output?: string;
  format?: string;
  seed?: string;
  trainRatio?: string;
  testRatio?: string;
  validationRatio?: string;
  strategy?: string;  // 'random', 'temporal', 'stratified'
  stratifyColumn?: string;
  timeColumn?: string;
  noValidation?: boolean;
}): Promise<void> {
  const license = loadLicense();
  const startTime = Date.now();
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const format = options.format || 'csv';
  const seed = options.seed ? parseInt(options.seed) : 42;
  const strategy = options.strategy || 'random';

  // Parse ratios
  let trainRatio = options.trainRatio ? parseFloat(options.trainRatio) : 0.7;
  let testRatio = options.testRatio ? parseFloat(options.testRatio) : 0.2;
  let validationRatio = options.validationRatio ? parseFloat(options.validationRatio) : 0.1;

  if (options.noValidation) {
    validationRatio = 0;
    if (!options.trainRatio && !options.testRatio) {
      trainRatio = 0.8;
      testRatio = 0.2;
    }
  }

  // Normalize ratios
  const total = trainRatio + testRatio + validationRatio;
  if (Math.abs(total - 1.0) > 0.01) {
    console.error(`\n\u274C Split ratios must sum to 1.0. Got: ${trainRatio} + ${testRatio} + ${validationRatio} = ${total}`);
    process.exit(1);
  }

  const config: SplitConfig = { train: trainRatio, test: testRatio, validation: validationRatio };

  // Read pack
  // Resolve built-in pack name (e.g. "fintech", "eu-banking") to its bundled
  // file path — mirrors the run command's resolution logic.
  if (!options.pack.includes('/') && !options.pack.includes('\\') && !options.pack.endsWith('.json')) {
    const packDir = path.resolve(path.dirname(process.argv[1] || __filename), 'packs');
    const bundledPath = path.resolve(packDir, options.pack + '.json');
    if (fs.existsSync(bundledPath)) {
      options.pack = bundledPath;
    } else {
      const userDir = path.resolve(process.env.HOME || process.env.USERPROFILE || '.', '.realitydb', 'templates');
      const userPath = path.resolve(userDir, options.pack + '.json');
      if (fs.existsSync(userPath)) options.pack = userPath;
    }
  }

  const packPath = path.resolve(options.pack);
  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  console.log(`\n\u{1F52C} RealityDB ML Split`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
    console.log(`   Plan: ${license.tier.toUpperCase()}`);
  }
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Strategy: ${strategy}`);
  console.log(`   Ratios: train=${trainRatio} | test=${testRatio}${validationRatio > 0 ? ' | val=' + validationRatio : ''}`);
  console.log(`   Seed: ${seed}`);
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Tables: ${tables.length}`);
  if (strategy === 'stratified' && options.stratifyColumn) {
    console.log(`   Stratify on: ${options.stratifyColumn}`);
  }
  if (strategy === 'temporal') {
    console.log(`   Time column: ${options.timeColumn || 'created_at'}`);
  }
  console.log(`${'\u2500'.repeat(40)}`);

  // Generate base data
  console.log(`   Generating base data...`);
  const { allData, actualTotal, elapsed } = generateData(ordered, rowsPerTable);

  // Split each table
  console.log(`   Splitting data (${strategy})...`);

  const splits: Record<string, { train: Record<string, any[]>; test: Record<string, any[]>; validation: Record<string, any[]> }> = {
    result: { train: {}, test: {}, validation: {} }
  };

  for (const tableName of Object.keys(allData)) {
    const tableRows = allData[tableName];
    if (!tableRows || tableRows.length === 0) {
      splits.result.train[tableName] = [];
      splits.result.test[tableName] = [];
      splits.result.validation[tableName] = [];
      continue;
    }

    let split;
    if (strategy === 'temporal') {
      const timeCol = options.timeColumn || 'created_at';
      split = temporalSplit(tableRows, config, timeCol);
    } else if (strategy === 'stratified' && options.stratifyColumn) {
      split = stratifiedSplit(tableRows, config, options.stratifyColumn, seed);
    } else {
      split = randomSplit(tableRows, config, seed);
    }

    splits.result.train[tableName] = split.train;
    splits.result.test[tableName] = split.test;
    splits.result.validation[tableName] = split.validation;
  }

  // Resolve FK integrity within each split
  console.log(`   Resolving FK integrity per split...`);
  splits.result.train = resolveFK(splits.result.train, ordered, allData);
  splits.result.test = resolveFK(splits.result.test, ordered, allData);
  if (validationRatio > 0) {
    splits.result.validation = resolveFK(splits.result.validation, ordered, allData);
  }

  // Calculate counts
  const trainTotal = Object.values(splits.result.train).reduce((s, r) => s + r.length, 0);
  const testTotal = Object.values(splits.result.test).reduce((s, r) => s + r.length, 0);
  const valTotal = Object.values(splits.result.validation).reduce((s, r) => s + r.length, 0);

  // Output
  const baseDir = options.output || `./realitydb_split_${Date.now()}`;
  fs.mkdirSync(baseDir, { recursive: true });

  const splitNames = validationRatio > 0 ? ['train', 'test', 'validation'] : ['train', 'test'];

  for (const splitName of splitNames) {
    const splitData = splits.result[splitName as keyof typeof splits.result];
    const splitDir = path.join(baseDir, splitName);
    fs.mkdirSync(splitDir, { recursive: true });

    if (format === 'sql') {
      const fd = fs.openSync(path.join(splitDir, `${splitName}.sql`), 'w');
      fs.writeSync(fd, `-- RealityDB ML Split: ${splitName}\n`);
      fs.writeSync(fd, `-- Strategy: ${strategy} | Seed: ${seed}\n\n`);

      for (const table of ordered) {
        const ddl = generateCreateTable(table);
        fs.writeSync(fd, `DROP TABLE IF EXISTS "${table.name}" CASCADE;\n`);
        fs.writeSync(fd, ddl + '\n\n');
        const rows = splitData[table.name];
        if (rows && rows.length > 0) {
          const sql = generateInsertStatements(table.name, rows);
          fs.writeSync(fd, sql + '\n\n');
        }
      }
      fs.closeSync(fd);
    } else if (format === 'json') {
      fs.writeFileSync(
        path.join(splitDir, `${splitName}.json`),
        JSON.stringify({ _meta: { split: splitName, strategy, seed, rows: Object.values(splitData).reduce((s, r) => s + r.length, 0) }, tables: splitData }, null, 2),
        'utf-8'
      );
    } else {
      // CSV (default for ML)
      for (const [tableName, tableRows] of Object.entries(splitData)) {
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
        fs.writeFileSync(path.join(splitDir, `${tableName}.csv`), lines.join('\n'), 'utf-8');
      }
    }
  }

  // Write split manifest
  const manifest = {
    generator: 'realitydb-split',
    strategy,
    seed,
    ratios: { train: trainRatio, test: testRatio, validation: validationRatio },
    stratifyColumn: options.stratifyColumn || null,
    timeColumn: strategy === 'temporal' ? (options.timeColumn || 'created_at') : null,
    counts: {
      train: trainTotal,
      test: testTotal,
      validation: valTotal,
      total: trainTotal + testTotal + valTotal,
    },
    tables: Object.keys(allData).map(t => ({
      name: t,
      train: splits.result.train[t]?.length || 0,
      test: splits.result.test[t]?.length || 0,
      validation: splits.result.validation[t]?.length || 0,
    })),
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print distribution report
  console.log(`\n\u2705 ML Split complete!`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4C1} Output: ${baseDir}/`);
  console.log(`        \u{1F7E2} train/     ${trainTotal.toLocaleString()} rows (${(trainTotal / actualTotal * 100).toFixed(1)}%)`);
  console.log(`        \u{1F7E1} test/      ${testTotal.toLocaleString()} rows (${(testTotal / actualTotal * 100).toFixed(1)}%)`);
  if (validationRatio > 0) {
    console.log(`        \u{1F535} validation/ ${valTotal.toLocaleString()} rows (${(valTotal / actualTotal * 100).toFixed(1)}%)`);
  }
  console.log(`        \u{1F4CB} manifest.json`);

  // Show per-table distribution for stratified
  if (strategy === 'stratified' && options.stratifyColumn) {
    console.log(`\n   Stratification on "${options.stratifyColumn}":`);
    const firstTable = Object.keys(allData)[0];
    const trainDist: Record<string, number> = {};
    const testDist: Record<string, number> = {};
    for (const row of splits.result.train[firstTable] || []) {
      const v = getStratifyValue(row, options.stratifyColumn);
      trainDist[v] = (trainDist[v] || 0) + 1;
    }
    for (const row of splits.result.test[firstTable] || []) {
      const v = getStratifyValue(row, options.stratifyColumn);
      testDist[v] = (testDist[v] || 0) + 1;
    }
    const allVals = new Set([...Object.keys(trainDist), ...Object.keys(testDist)]);
    for (const v of allVals) {
      const tr = trainDist[v] || 0;
      const te = testDist[v] || 0;
      const total = tr + te;
      console.log(`      ${v}: train=${tr} (${(tr/total*100).toFixed(0)}%) test=${te} (${(te/total*100).toFixed(0)}%)`);
    }
  }

  console.log(`\n   \u{1F4CA} Total rows generated: ${actualTotal.toLocaleString()}`);
  console.log(`   \u{1F512} FK integrity preserved per split`);
  console.log(`   \u23F1\uFE0F  Time: ${totalTime}s`);
  console.log(``);
}
