// Phase 4j verification — calibrated strategy (lognormal + gamma).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function gen(seed, outPath, packPath) {
  const pack = {
    name: 'test-calibrated',
    tables: {
      records: {
        columns: {
          id: { strategy: 'uuid' },
          country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'PL', 'NL'], weights: [1, 1, 1, 1] } },
          mortgage: { strategy: 'calibrated', options: { country_source: 'country_code', metric: 'mortgage_amount' } },
          txn_amount: { strategy: 'calibrated', options: { country_source: 'country_code', metric: 'transaction_amount' } },
        },
      },
    },
  };
  writeFileSync(packPath, JSON.stringify(pack));
  execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '500', '--format', 'json', '--seed', String(seed), '-o', outPath], { stdio: 'ignore' });
  const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
  let rows =
    Array.isArray(parsed) ? parsed :
    Array.isArray(parsed.records) ? parsed.records :
    parsed.tables?.records ?? parsed.data?.records ?? null;
  if (!rows) {
    for (const v of Object.values(parsed)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object' && 'mortgage' in v[0]) { rows = v; break; }
      if (v && typeof v === 'object') for (const vv of Object.values(v))
        if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'mortgage' in vv[0]) { rows = vv; break; }
      if (rows) break;
    }
  }
  return rows;
}

const dir = mkdtempSync(join(tmpdir(), 'rdb-calib-'));
const rows = gen(42, join(dir, 'a.json'), join(dir, 'pa.json'));
const rows2 = gen(42, join(dir, 'b.json'), join(dir, 'pb.json')); // determinism re-run
if (!rows || !rows2) { console.error('No rows'); process.exit(1); }

const MORT = { DE: [50000, 1200000], FR: [40000, 1000000], PL: [15000, 400000], NL: [50000, 2000000] };
const TXN = { DE: [1, 5000], FR: [1, 5000], NL: [1, 4000] };
const MORT_TARGET = { DE: 220000, FR: 180000, NL: 280000 };
const TXN_TARGET = { DE: 42, FR: 38 };

const by = (c) => rows.filter((r) => r.country_code === c);
const mean = (arr) => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// 1. no null/undefined/NaN
let bad1 = 0;
for (const r of rows) for (const k of ['mortgage', 'txn_amount']) {
  const v = r[k];
  if (v == null || typeof v !== 'number' || Number.isNaN(v)) bad1++;
}
add('1. No null/undefined/NaN', bad1 === 0, `${bad1} bad`);

// 2. mortgage bounds
let bad2 = 0;
for (const r of rows) { const [lo, hi] = MORT[r.country_code]; if (r.mortgage < lo || r.mortgage > hi) bad2++; }
add('2. Mortgage within spec bounds', bad2 === 0, `${bad2} out of bounds`);

// 3. txn bounds (PL uses generic fallback → just positive number)
let bad3 = 0;
for (const r of rows) {
  if (r.country_code === 'PL') { if (!(typeof r.txn_amount === 'number' && r.txn_amount > 0)) bad3++; }
  else { const [lo, hi] = TXN[r.country_code]; if (r.txn_amount < lo || r.txn_amount > hi) bad3++; }
}
add('3. Txn within bounds (PL fallback positive)', bad3 === 0, `${bad3} bad`);

// 4. means within 30%
const mm = {};
for (const c of ['DE', 'FR', 'NL']) mm[`${c}_mort`] = mean(by(c).map((r) => r.mortgage));
for (const c of ['DE', 'FR']) mm[`${c}_txn`] = mean(by(c).map((r) => r.txn_amount));
const within = (val, target) => val >= target * 0.7 && val <= target * 1.3;
let bad4 = [];
for (const [k, t] of [['DE_mort', 220000], ['FR_mort', 180000], ['NL_mort', 280000], ['DE_txn', 42], ['FR_txn', 38]])
  if (!within(mm[k], t)) bad4.push(`${k}=${Math.round(mm[k])} vs ${t}`);
add('4. Means within 30% of targets', bad4.length === 0, bad4.length ? bad4.join('; ') : 'all within');

// 5. Lognormal right-skew. Canonical signature: median < mean, plus a majority
// of values below the mean. NOTE: the original ">=60% below mean" bar is
// mathematically unreachable for DE's CV (=90000/220000=0.41): a true lognormal
// has P(X<mean)=Φ(σ/2)≈57.8%, confirmed empirically at N=5000 (57.5%). We test
// the real signature instead.
const deMort = by('DE').map((r) => r.mortgage);
const deSorted = [...deMort].sort((a, b) => a - b);
const deMean = mean(deMort);
const deMedian = deSorted[Math.floor(deSorted.length / 2)];
const belowMean = deMort.filter((v) => v < deMean).length;
const pct = belowMean / deMort.length;
add('5. Lognormal right-skew (median < mean, majority below mean)',
  deMedian < deMean && pct > 0.5,
  `median=${Math.round(deMedian)} < mean=${Math.round(deMean)}; ${(pct * 100).toFixed(1)}% below mean`);

// 6. determinism
const m1 = rows.map((r) => r.mortgage);
const m2 = rows2.map((r) => r.mortgage);
const identical = m1.length === m2.length && m1.every((v, i) => v === m2[i]);
add('6. Determinism (seed 42 twice, mortgage identical)', identical, identical ? 'byte-identical' : 'MISMATCH');

console.log(`Total rows: ${rows.length}  (DE=${by('DE').length} FR=${by('FR').length} PL=${by('PL').length} NL=${by('NL').length})`);
console.log('Means:', Object.fromEntries(Object.entries(mm).map(([k, v]) => [k, Math.round(v)])));
console.log('Targets: DE_mort=220000 FR_mort=180000 NL_mort=280000 DE_txn=42 FR_txn=38\n');
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 6 CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
