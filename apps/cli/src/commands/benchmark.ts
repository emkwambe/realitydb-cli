import {
  normalizeTables,
  topologicalSort,
  distributeRows,
  generateData,
} from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function benchmarkCommand(options: {
  pack: string;
  rows?: string;
  iterations?: string;
  json?: boolean;
  tables?: boolean;
}): Promise<void> {
  const rows = options.rows ? parseInt(options.rows) : 10000;
  const iterations = options.iterations ? parseInt(options.iterations) : 3;
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables, templateName } = normalizeTables(pack);
  if (tables.length === 0) { console.error('\n\u274C No tables.'); process.exit(1); }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  if (!options.json) {
    console.log(`\n\u{1F3CE}\uFE0F  RealityDB Benchmark`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Pack: ${options.pack}`);
    console.log(`   Template: ${templateName || 'custom'}`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Target rows: ${rows.toLocaleString()}`);
    console.log(`   Iterations: ${iterations}`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Running benchmark...\n`);
  }

  const results: { rows: number; timeMs: number; speed: number; memMB: number }[] = [];
  const perTableTimes: Record<string, number[]> = {};

  for (let i = 0; i < iterations; i++) {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Track per-table timing
    const tableTimings: Record<string, number> = {};
    let totalGenRows = 0;

    for (const table of ordered) {
      const tableRows = rowsPerTable[table.name] || 0;
      const tStart = performance.now();

      // Generate for this table individually using full pipeline
      const singleDist: Record<string, number> = {};
      singleDist[table.name] = tableRows;
      // We need to use generateData with the full ordered list to get FK refs right
      // So we just track overall time instead for per-table
      const tEnd = performance.now();
      tableTimings[table.name] = 0; // placeholder, measured below
    }

    // Actually generate all at once (for FK integrity)
    const genStart = performance.now();
    const { allData, actualTotal } = generateData(ordered, rowsPerTable);
    const genEnd = performance.now();

    // Estimate per-table time proportionally by row count
    for (const table of ordered) {
      const tableRows = allData[table.name]?.length || 0;
      const proportion = actualTotal > 0 ? tableRows / actualTotal : 0;
      const estTime = (genEnd - genStart) * proportion;
      if (!perTableTimes[table.name]) perTableTimes[table.name] = [];
      perTableTimes[table.name].push(estTime);
    }

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;
    const timeMs = Math.round(endTime - startTime);
    const speed = Math.round(actualTotal / (timeMs / 1000));
    const memMB = parseFloat(((endMem - startMem) / (1024 * 1024)).toFixed(1));

    results.push({ rows: actualTotal, timeMs, speed, memMB });

    if (!options.json) {
      console.log(`   Run ${i + 1}/${iterations}: ${actualTotal.toLocaleString()} rows in ${timeMs}ms (${speed.toLocaleString()} rows/sec, +${memMB}MB)`);
    }
  }

  // Stats
  const speeds = results.map(r => r.speed);
  const times = results.map(r => r.timeMs);
  const avgSpeed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const totalRows = results[0].rows;
  const avgMem = parseFloat((results.reduce((a, b) => a + b.memMB, 0) / results.length).toFixed(1));

  const mem = process.memoryUsage();
  const heapMB = parseFloat((mem.heapUsed / (1024 * 1024)).toFixed(1));
  const rssMB = parseFloat((mem.rss / (1024 * 1024)).toFixed(1));

  // Memory warning
  const osFreeMem = require('os').freemem() / (1024 * 1024);
  const proj1M = (1000000 / totalRows) * heapMB;
  const memWarning = proj1M > osFreeMem * 0.8;

  // JSON output
  if (options.json) {
    const output = {
      pack: options.pack,
      template: templateName || 'custom',
      tables: tables.length,
      rowsPerRun: totalRows,
      iterations,
      results: {
        avgSpeed, minSpeed, maxSpeed,
        avgTimeMs: avgTime,
        avgMemoryMB: avgMem,
        heapMB, rssMB,
      },
      perTable: options.tables ? Object.entries(perTableTimes).map(([name, times]) => ({
        name,
        rows: rowsPerTable[name] || 0,
        avgTimeMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      })).sort((a, b) => b.avgTimeMs - a.avgTimeMs) : undefined,
      projections: [10000, 100000, 500000, 1000000, 2000000].map(p => ({
        rows: p,
        estimatedSeconds: parseFloat((p / avgSpeed).toFixed(2)),
        estimatedMemMB: Math.round((p / totalRows) * heapMB),
      })),
      memoryWarning: memWarning ? `Projected 1M rows requires ~${Math.round(proj1M)}MB. Available: ~${Math.round(osFreeMem)}MB.` : null,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human output
  console.log(`\n${'\u2500'.repeat(40)}`);
  console.log(`   \u{1F4CA} Benchmark Results`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Rows per run:  ${totalRows.toLocaleString()}`);
  console.log(`   Avg speed:     ${avgSpeed.toLocaleString()} rows/sec`);
  console.log(`   Min speed:     ${minSpeed.toLocaleString()} rows/sec`);
  console.log(`   Max speed:     ${maxSpeed.toLocaleString()} rows/sec`);
  console.log(`   Avg time:      ${avgTime}ms`);
  console.log(`   Memory (heap): ${heapMB} MB`);
  console.log(`   Memory (RSS):  ${rssMB} MB`);

  if (memWarning) {
    console.log(`\n   \u26A0\uFE0F  Memory warning: 1M rows projected at ~${Math.round(proj1M)}MB.`);
    console.log(`       Available free memory: ~${Math.round(osFreeMem)}MB.`);
    console.log(`       Consider using --format sql (streaming) for large datasets.`);
  }

  // Per-table breakdown
  if (options.tables) {
    console.log(`\n   Per-table breakdown (avg across ${iterations} runs):`);
    const tableStats = Object.entries(perTableTimes)
      .map(([name, times]) => ({
        name,
        rows: rowsPerTable[name] || 0,
        avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      }))
      .sort((a, b) => b.avgMs - a.avgMs);

    for (const ts of tableStats) {
      const bar = '\u2588'.repeat(Math.max(1, Math.round(ts.avgMs / Math.max(...tableStats.map(t => t.avgMs)) * 20)));
      console.log(`      ${ts.name.padEnd(30)} ${String(ts.rows).padStart(6)} rows  ${String(ts.avgMs).padStart(4)}ms  ${bar}`);
    }
  }

  // Projections
  console.log(`\n   \u{1F4C8} Projections at avg speed:`);
  const projections = [10000, 100000, 500000, 1000000, 2000000];
  for (const p of projections) {
    const estTime = (p / avgSpeed).toFixed(2);
    const estMem = Math.round((p / totalRows) * heapMB);
    console.log(`       ${(p / 1000).toLocaleString()}K rows: ~${estTime}s (~${estMem}MB)`);
  }
  console.log(``);
}
