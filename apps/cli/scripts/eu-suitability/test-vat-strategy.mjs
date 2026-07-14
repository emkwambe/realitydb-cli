// Phase 4e verification — vat strategy.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE', 'IE', 'PL', 'SE'];

const dir = mkdtempSync(join(tmpdir(), 'rdb-vat-'));
const packPath = join(dir, 'test-vat.json');
const outPath = join(dir, 'out.json');
const pack = {
  name: 'test-vat',
  tables: {
    records: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: COUNTRIES, weights: COUNTRIES.map(() => 1) } },
        vat_number: { strategy: 'vat', options: { country_source: 'country_code' } },
      },
    },
  },
};
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '1000', '--format', 'json', '--seed', '55', '-o', outPath], { stdio: 'ignore' });

const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows =
  Array.isArray(parsed) ? parsed :
  Array.isArray(parsed.records) ? parsed.records :
  parsed.tables?.records ?? parsed.data?.records ?? null;
if (!rows) {
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && 'vat_number' in v[0]) { rows = v; break; }
    if (v && typeof v === 'object') for (const vv of Object.values(v))
      if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'vat_number' in vv[0]) { rows = vv; break; }
    if (rows) break;
  }
}
if (!rows) { console.error('No rows:', Object.keys(parsed)); process.exit(1); }

const ES_LETTERS = 'ABCDEFGHJKLMNPQRSUVW';

// Independent IT check-digit recompute.
function itCheckValid(vat) {
  const body = vat.slice(2, 12); // 10 digits
  const check = vat.slice(12);   // 1 digit
  if (!/^\d{10}$/.test(body) || !/^\d$/.test(check)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = parseInt(body[i], 10);
    if (i % 2 === 0) sum += d;
    else { const dbl = d * 2; sum += dbl > 9 ? dbl - 9 : dbl; }
  }
  return ((10 - (sum % 10)) % 10) === parseInt(check, 10);
}

// country → predicate(vat) with descriptor
const rules = {
  DE: (v) => v.startsWith('DE') && v.length === 11 && /^\d{9}$/.test(v.slice(2)),
  FR: (v) => v.startsWith('FR') && v.length === 13 && (() => { const k = parseInt(v.slice(2, 4), 10); return k >= 0 && k <= 96 && /^\d{2}$/.test(v.slice(2, 4)) && /^\d{9}$/.test(v.slice(4)); })(),
  IT: (v) => v.startsWith('IT') && v.length === 13 && /^\d{11}$/.test(v.slice(2)) && itCheckValid(v),
  ES: (v) => v.startsWith('ES') && v.length === 11 && ES_LETTERS.includes(v[2]) && /^\d{8}$/.test(v.slice(3)),
  NL: (v) => v.startsWith('NL') && v.length === 14 && v[11] === 'B', // B at index 11 (see spec note)
  AT: (v) => v.startsWith('AT') && v.length === 11 && v[2] === 'U' && /^\d{8}$/.test(v.slice(3)),
  BE: (v) => v.startsWith('BE') && v.length === 12 && (v[2] === '0' || v[2] === '1') && /^\d{10}$/.test(v.slice(2)),
  IE: (v) => v.startsWith('IE') && v.length === 10,
  PL: (v) => v.startsWith('PL') && v.length === 12 && /^\d{10}$/.test(v.slice(2)),
  SE: (v) => v.startsWith('SE') && v.length === 14 && v.endsWith('01'),
};

let allPass = true;
const nullCount = rows.filter((r) => r.vat_number == null).length; // '' is allowed only for unknown countries (none here)
console.log(`Total rows: ${rows.length}\n`);

for (const c of COUNTRIES) {
  const sub = rows.filter((r) => r.country_code === c);
  const bad = sub.filter((r) => !rules[c](String(r.vat_number)));
  const ok = bad.length === 0 && sub.length > 0;
  if (!ok) allPass = false;
  const sample = sub[0]?.vat_number ?? '(none)';
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${c}  n=${sub.length}  bad=${bad.length}  e.g. ${sample}` + (bad.length ? `  BAD: ${bad.slice(0,3).map(r=>r.vat_number).join(',')}` : ''));
}

const nullOk = nullCount === 0;
if (!nullOk) allPass = false;
console.log(`\n  ${nullOk ? 'PASS' : 'FAIL'}  Zero null/undefined  [${nullCount} null]`);

const uniq = new Set(rows.map((r) => r.vat_number));
const uniqOk = uniq.size >= 900;
if (!uniqOk) allPass = false;
console.log(`  ${uniqOk ? 'PASS' : 'FAIL'}  >=900 unique VAT  [${uniq.size} unique]`);

console.log('\n' + (allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
