// Sprint 2 (Blocker 9) verification — phone_eu structural rework.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Real prefix sets (mirror eu-phone.ts). NOTE: check 3 validates against the
// ACTUAL DE set, not the shorter/typo'd inline list in the brief — the data file
// is the source of truth (deviation flagged in the report).
const PREFIX = {
  DE: ['151','152','153','157','159','160','162','163','170','171','172','173','174','175','176','177','178','179'],
  FR: ['6','7'],
  IE: ['83','85','86','87','89'],
  PL: ['50','51','53','57','60','66','69','72','73','78','79','88'],
};
const DIAL = { DE: '+49', FR: '+33', IE: '+353', PL: '+48' };

const dir = mkdtempSync(join(tmpdir(), 'rdb-phone-'));
const packPath = join(dir, 'p.json');
const outPath = join(dir, 'out.json');
const countries = ['DE', 'FR', 'IE', 'PL'];
const pack = { name: 'test-phone', tables: { records: { columns: {
  id: { strategy: 'uuid' },
  country_code: { strategy: 'enum', options: { values: countries, weights: countries.map(() => 1) } },
  phone: { strategy: 'phone_eu', options: { country_source: 'country_code' } },
} } } };
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '500', '--format', 'json', '--seed', '31', '-o', outPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows = Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'phone' in v[0]) ?? Object.values(parsed.tables || {})[0];

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const by = (c) => rows.filter((r) => r.country_code === c);
// prefix after the dial code
const afterDial = (r) => String(r.phone).slice(DIAL[r.country_code].length);
const matchedPrefix = (r) => PREFIX[r.country_code].find((p) => afterDial(r).startsWith(p));

// 1. no nulls
add('1. Zero null/undefined', rows.every((r) => r.phone != null && r.phone !== ''), `${rows.filter(r=>r.phone==null).length} null`);
// 2. correct country dial code
const dialBad = rows.filter((r) => !String(r.phone).startsWith(DIAL[r.country_code]));
add('2. Correct dial code (DE+49/FR+33/IE+353/PL+48)', dialBad.length === 0, `${dialBad.length} bad`);
// 3. DE mobile prefix in actual DE set
const deBad = by('DE').filter((r) => !matchedPrefix(r));
add('3. DE mobile prefix in EU_PHONE_PATTERNS.DE set', deBad.length === 0, `${deBad.length}/${by('DE').length} bad` + (deBad.length ? ` e.g. ${deBad[0].phone}` : ''));
// 4. FR prefix in {6,7}
const frBad = by('FR').filter((r) => !['6', '7'].includes(afterDial(r)[0]));
add('4. FR mobile prefix in [6,7]', frBad.length === 0, `${frBad.length}/${by('FR').length} bad`);
// 5. DE total length: +49 + 11 digits
const deLenBad = by('DE').filter((r) => !/^\+49\d{11}$/.test(String(r.phone)));
add('5. DE total length correct (+49 + 11 digits)', deLenBad.length === 0, `${deLenBad.length}/${by('DE').length} wrong length`);
// 6. no wrong-prefix (old-format) numbers, all countries
const wrongPrefix = rows.filter((r) => !matchedPrefix(r));
add('6. Zero phones with invalid mobile prefix', wrongPrefix.length === 0, `${wrongPrefix.length} bad`);
// 7. >=8 unique per country
let uniqOk = true, uniqDetail = [];
for (const c of countries) { const u = new Set(by(c).map((r) => r.phone)).size; uniqDetail.push(`${c}:${u}`); if (u < 8) uniqOk = false; }
add('7. >=8 unique phones per country', uniqOk, uniqDetail.join(' '));

console.log(`rows=${rows.length}  sample: ${countries.map((c) => by(c)[0]?.phone).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 7 PHONE CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
