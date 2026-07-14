// Sprint 6 verification 2 — business_date strategy.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-bizdate-'));
const packPath = join(dir, 'p.json');
const countries = ['DE', 'FR', 'IE', 'PL'];
const pack = { name: 'test-bizdate', tables: { records: { columns: {
  id: { strategy: 'uuid' },
  country_code: { strategy: 'enum', options: { values: countries, weights: countries.map(() => 1) } },
  transaction_date: { strategy: 'business_date', options: { country_source: 'country_code', min: '2024-01-01T00:00:00Z', max: '2024-12-31T23:59:59Z' } },
} } } };
writeFileSync(packPath, JSON.stringify(pack));

function gen(seed) {
  const outPath = join(dir, `out-${seed}.json`);
  execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '500', '--format', 'json', '--seed', String(seed), '-o', outPath], { stdio: 'ignore' });
  const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'transaction_date' in v[0]) ?? Object.values(parsed.tables || {})[0];
}
const rows = gen(42);
const rows2 = gen(42);

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const by = (c) => rows.filter((r) => r.country_code === c);
const off = (s) => s.slice(-6); // +01:00
const utc = (s) => new Date(s); // offset-aware ISO parses to correct instant
const wall = (s) => s.slice(0, 19); // wall-clock components (no offset)

// 1. no nulls
add('1. Zero null/undefined dates', rows.every((r) => r.transaction_date), `${rows.filter(r=>!r.transaction_date).length} null`);
// 2. valid ISO 8601 with offset
const isoRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const badIso = rows.filter((r) => !isoRe.test(r.transaction_date) || isNaN(utc(r.transaction_date)));
add('2. Valid ISO 8601 with offset', badIso.length === 0, `${badIso.length} bad` + (badIso.length ? ` e.g. ${badIso[0].transaction_date}` : ''));
// 3. offsets per country
const okOff = (c, set) => by(c).every((r) => set.includes(off(r.transaction_date)));
const o3 = okOff('DE', ['+01:00', '+02:00']) && okOff('FR', ['+01:00', '+02:00']) && okOff('IE', ['+00:00', '+01:00']) && okOff('PL', ['+01:00', '+02:00']);
add('3. Country offsets correct (IE +00/+01, others +01/+02)', o3, o3 ? 'ok' : 'bad offsets');
// 4. no weekends (from wall-clock UTC date)
const dow = (s) => new Date(wall(s) + 'Z').getUTCDay();
const weekend = rows.filter((r) => dow(r.transaction_date) === 0 || dow(r.transaction_date) === 6);
add('4. Zero weekend dates', weekend.length === 0, `${weekend.length} weekend` + (weekend.length ? ` e.g. ${weekend[0].transaction_date}` : ''));
// 5. DE holidays
const mmdd = (s) => s.slice(5, 10);
const deHol = ['01-01', '05-01', '10-03', '12-25', '12-26'];
const deBad = by('DE').filter((r) => deHol.includes(mmdd(r.transaction_date)));
add('5. Zero DE dates on 2024 holidays', deBad.length === 0, `${deBad.length}` + (deBad.length ? ` e.g. ${deBad[0].transaction_date}` : ''));
// 6. FR holidays (07-14, 11-11 among others)
const frHol = ['07-14', '11-11'];
const frBad = by('FR').filter((r) => frHol.includes(mmdd(r.transaction_date)));
add('6. Zero FR dates on 2024-07-14 / 11-11', frBad.length === 0, `${frBad.length}`);
// 7. within min-max range
const lo = new Date('2024-01-01T00:00:00Z').getTime(), hi = new Date('2024-12-31T23:59:59Z').getTime();
const outRange = rows.filter((r) => { const t = utc(r.transaction_date).getTime(); return t < lo - 86400000 || t > hi + 86400000; });
add('7. All dates within range', outRange.length === 0, `${outRange.length} out of range`);
// 8. hours 08-17 (wall-clock)
const hour = (s) => parseInt(s.slice(11, 13), 10);
const badHour = rows.filter((r) => hour(r.transaction_date) < 8 || hour(r.transaction_date) > 17);
add('8. Business hours 08-17', badHour.length === 0, `${badHour.length} bad` + (badHour.length ? ` e.g. ${badHour[0].transaction_date}` : ''));
// 9. DE summer/winter offset split
const deOffsets = new Set(by('DE').map((r) => off(r.transaction_date)));
add('9. DE has both +01:00 and +02:00', deOffsets.has('+01:00') && deOffsets.has('+02:00'), [...deOffsets].join(','));
// 10. determinism
const a = rows.map((r) => r.transaction_date), b = rows2.map((r) => r.transaction_date);
add('10. Determinism (seed 42 twice)', a.length === b.length && a.every((v, i) => v === b[i]), a.every((v, i) => v === b[i]) ? 'identical' : 'MISMATCH');

console.log(`rows=${rows.length}  sample: ${countries.map((c) => `${c}:${by(c)[0]?.transaction_date}`).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 10 BUSINESS_DATE CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
