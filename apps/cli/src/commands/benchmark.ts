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

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  const ordered = topologicalSort(tables);
  const rowsPerTable = distributeRows(ordered, rows);

  console.log(`\n\u{1F3CE}\uFE0F  RealityDB Benchmark`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Template: ${templateName || 'custom'}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Target rows: ${rows.toLocaleString()}`);
  console.log(`   Iterations: ${iterations}`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Running benchmark...\n`);

  const results: { rows: number; timeMs: number; speed: number }[] = [];

  for (let i = 0; i < iterations; i++) {
    // Force GC if available
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const { allData, actualTotal } = generateData(ordered, rowsPerTable);

    const endTime = performance.now();
    const endMem = process.memoryUsage().heapUsed;
    const timeMs = Math.round(endTime - startTime);
    const speed = Math.round(actualTotal / (timeMs / 1000));
    const memDelta = ((endMem - startMem) / (1024 * 1024)).toFixed(1);

    results.push({ rows: actualTotal, timeMs, speed });

    console.log(`   Run ${i + 1}/${iterations}: ${actualTotal.toLocaleString()} rows in ${timeMs}ms (${speed.toLocaleString()} rows/sec, +${memDelta}MB heap)`);
  }

  // Calculate stats
  const speeds = results.map(r => r.speed);
  const times = results.map(r => r.timeMs);
  const avgSpeed = Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length);
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const totalRows = results[0].rows;

  // Memory snapshot
  const mem = process.memoryUsage();
  const heapMB = (mem.heapUsed / (1024 * 1024)).toFixed(1);
  const rssMB = (mem.rss / (1024 * 1024)).toFixed(1);

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
  console.log(`${'\u2500'.repeat(40)}`);

  // Projections
  console.log(`\n   \u{1F4C8} Projections at avg speed:`);
  const projections = [10000, 100000, 500000, 1000000, 2000000];
  for (const p of projections) {
    const estTime = (p / avgSpeed).toFixed(2);
    const estMem = ((p / totalRows) * parseFloat(heapMB)).toFixed(0);
    console.log(`       ${(p / 1000).toLocaleString()}K rows: ~${estTime}s (~${estMem}MB)`);
  }

  console.log(``);
}
