// Phase 4a verification — currency strategy.
// Generates a minimal pack via the built CLI and asserts currency↔country mapping.
// Temporary: lives only for the Phase 4a commit.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-currency-'));
const packPath = join(dir, 'test-currency.json');
const outPath = join(dir, 'out.json');

// Minimal pack. country_code uses `enum` (a root weighted pick) rather than
// `dependent_enum` — the engine's dependent_enum requires a parent column, so it
// cannot be a root generator. currency reads country_code via country_source.
const pack = {
  name: 'test-currency',
  tables: {
    records: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'PL'], weights: [1, 1, 1] } },
        currency: { strategy: 'currency', options: { country_source: 'country_code' } },
      },
    },
  },
};
writeFileSync(packPath, JSON.stringify(pack));

execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '100', '--format', 'json', '--seed', '7', '-o', outPath], { stdio: 'ignore' });

// Locate the row array regardless of top-level shape (array | {records:[...]} | {tables:{records:[...]}}).
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows =
  Array.isArray(parsed) ? parsed :
  Array.isArray(parsed.records) ? parsed.records :
  parsed.tables?.records ?? parsed.data?.records ?? null;
if (!rows) {
  // Fallback: first array of objects found in the structure.
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') { rows = v; break; }
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v)) {
        if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'currency' in vv[0]) { rows = vv; break; }
      }
    }
    if (rows) break;
  }
}
if (!rows) { console.error('Could not locate rows in output:', Object.keys(parsed)); process.exit(1); }

const expect = { DE: 'EUR', FR: 'EUR', PL: 'PLN' };
const counts = { DE: 0, FR: 0, PL: 0 };
let correct = 0, wrong = 0, nullish = 0;
const wrongSamples = [];

for (const r of rows) {
  const c = r.country_code;
  const cur = r.currency;
  if (c in counts) counts[c]++;
  if (cur === null || cur === undefined || cur === '') { nullish++; continue; }
  if (expect[c] === cur) correct++;
  else { wrong++; if (wrongSamples.length < 5) wrongSamples.push({ country: c, got: cur, want: expect[c] }); }
}

console.log(`Total rows: ${rows.length}`);
console.log(`Country distribution: DE=${counts.DE} FR=${counts.FR} PL=${counts.PL}`);
console.log(`Correct: ${correct}  Wrong: ${wrong}  Null/undefined: ${nullish}`);
if (wrongSamples.length) console.log('Wrong samples:', JSON.stringify(wrongSamples));

const allPresent = counts.DE > 0 && counts.FR > 0 && counts.PL > 0;
const pass = wrong === 0 && nullish === 0 && allPresent && rows.length === 100;
console.log('\n' + (pass ? 'PASS — all DE/FR→EUR, PL→PLN, no nulls' : 'FAIL'));
process.exit(pass ? 0 : 1);
