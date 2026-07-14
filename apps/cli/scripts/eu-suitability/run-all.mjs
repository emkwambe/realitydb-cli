#!/usr/bin/env node
/**
 * EU Suitability Regression Suite — run-all.mjs
 * Runs all 17 verification scripts in order.
 * Usage: node scripts/eu-suitability/run-all.mjs
 *
 * Exit code 0 if all pass, 1 if any fail.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const scripts = readdirSync(__dirname)
  .filter(f => f.endsWith('.mjs') && f !== 'run-all.mjs')
  .sort();

console.log('EU Suitability Regression Suite');
console.log('================================');
console.log(`Running ${scripts.length} scripts...\n`);

let passed = 0;
let failed = 0;
const failures = [];
const startTime = Date.now();

for (const script of scripts) {
  const scriptPath = join(__dirname, script);
  process.stdout.write(`  ${script.padEnd(45)}`);

  await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [scriptPath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('PASS');
        passed++;
      } else {
        console.log('FAIL');
        failed++;
        failures.push({ script, stdout, stderr });
      }
      resolve();
    });
  });
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('\n================================');
console.log(`Results: ${passed} passed, ${failed} failed (${elapsed}s)`);

if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`\n  ${f.script}:`);
    const output = (f.stdout + f.stderr).trim();
    output.split('\n').slice(-10).forEach(l =>
      console.log(`    ${l}`)
    );
  }
  process.exit(1);
}

console.log('\nAll EU suitability checks passed.');
process.exit(0);
