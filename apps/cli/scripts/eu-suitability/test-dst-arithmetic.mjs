// Sprint 6 verification 1 — DST arithmetic (getNthWeekdayOfMonth / isDST / getOffset).
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Transpile the pure-arithmetic module to CJS via esbuild (bundled with tsup) and require it.
const dir = mkdtempSync(join(tmpdir(), 'rdb-dst-'));
const cjs = join(dir, 'tz.cjs');
execFileSync('npx', ['esbuild', '../../packages/engine/src/data/eu-timezones.ts', '--bundle', '--format=cjs', '--platform=node', `--outfile=${cjs}`], { stdio: 'ignore', shell: true });
const tz = require(cjs);
const { getNthWeekdayOfMonth, isDST, getOffset, EU_TIMEZONES } = tz;

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const ymd = (date) => date.toISOString().slice(0, 10);

// getNthWeekdayOfMonth — 2024 DST transitions (month 0-indexed: 2=Mar, 9=Oct)
const deStart = getNthWeekdayOfMonth(2024, 2, -1, 0);
const deEnd = getNthWeekdayOfMonth(2024, 9, -1, 0);
add('DE dstStart 2024 == 2024-03-31', ymd(deStart) === '2024-03-31', ymd(deStart));
add('DE dstEnd 2024 == 2024-10-27', ymd(deEnd) === '2024-10-27', ymd(deEnd));
// IE uses same transition rule (EU-wide)
const ieStart = getNthWeekdayOfMonth(2024, EU_TIMEZONES.IE.dstStart.month, -1, 0);
const ieEnd = getNthWeekdayOfMonth(2024, EU_TIMEZONES.IE.dstEnd.month, -1, 0);
add('IE dstStart 2024 == 2024-03-31', ymd(ieStart) === '2024-03-31', ymd(ieStart));
add('IE dstEnd 2024 == 2024-10-27', ymd(ieEnd) === '2024-10-27', ymd(ieEnd));

// isDST for known dates
const D = (s) => new Date(s + 'T12:00:00Z');
const dstCases = [
  ['DE', '2024-01-15', false], ['DE', '2024-07-15', true],
  ['DE', '2024-03-31', true],  ['DE', '2024-10-27', false],
  ['IE', '2024-07-15', true],  ['IE', '2024-01-15', false],
];
for (const [c, d, exp] of dstCases) {
  const got = isDST(D(d), EU_TIMEZONES[c]);
  add(`isDST ${c} ${d} == ${exp}`, got === exp, String(got));
}

// getOffset
const offCases = [
  ['DE', '2024-01-15', '+01:00'], ['DE', '2024-07-15', '+02:00'],
  ['IE', '2024-01-15', '+00:00'], ['IE', '2024-07-15', '+01:00'],
];
for (const [c, d, exp] of offCases) {
  const got = getOffset(D(d), c);
  add(`getOffset ${c} ${d} == ${exp}`, got === exp, got);
}

let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [got: ${r.d}]`); }
console.log('\n' + (allPass ? 'ALL DST CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
