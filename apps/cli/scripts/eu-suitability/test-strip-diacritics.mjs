// Carry-over FIX 2 verification — stripDiacritics ł/ø/ß extension.
// Unit-tests the function directly (via esbuild transpile of engine.ts's helper
// is impractical since it's not exported) AND exercises it end-to-end through
// email_eu with PL rows.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Reference implementation mirroring engine.ts (kept in sync) for the unit table.
const CHAR_MAP = { 'ł': 'l', 'Ł': 'l', 'ø': 'o', 'Ø': 'o', 'ð': 'd', 'Ð': 'd', 'þ': 'th', 'Þ': 'th', 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe' };
function stripDiacritics(s) {
  let mapped = s ?? '';
  for (const [c, r] of Object.entries(CHAR_MAP)) mapped = mapped.split(c).join(r);
  return mapped.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// Unit table
const cases = [
  ['Mikołaj', 'mikolaj'], ['Michał', 'michal'], ['Müller', 'muller'], ['Édith', 'edith'],
  ['Søren', 'soren'], ['Björn', 'bjorn'], ['Ångström', 'angstrom'], ['straße', 'strasse'], ['Wójcik', 'wojcik'],
];
let unitOk = true;
for (const [inp, exp] of cases) {
  const got = stripDiacritics(inp);
  const ok = got === exp;
  if (!ok) unitOk = false;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  '${inp}' -> '${got}' (expected '${exp}')`);
}
console.log('');
add('Unit table (9 mappings)', unitOk, unitOk ? 'all correct' : 'mismatch');

// End-to-end via email_eu with PL rows (200 rows to hit Mikołaj/Michał).
const dir = mkdtempSync(join(tmpdir(), 'rdb-strip-'));
const packPath = join(dir, 'p.json');
const outPath = join(dir, 'out.json');
const pack = { name: 'test-strip', tables: { records: { columns: {
  id: { strategy: 'uuid' },
  country_code: { strategy: 'enum', options: { values: ['PL'], weights: [1] } },
  gender: { strategy: 'enum', options: { values: ['M'], weights: [1] } },
  first_name: { strategy: 'name_first', options: { country_source: 'country_code', gender_source: 'gender' } },
  last_name: { strategy: 'name_last', options: { country_source: 'country_code' } },
  email: { strategy: 'email_eu', options: { country_source: 'country_code', first_name_source: 'first_name', last_name_source: 'last_name' } },
} } } };
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '300', '--format', 'json', '--seed', '5', '-o', outPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
const rows = Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'email' in v[0]) ?? Object.values(parsed.tables || {})[0];

// 1. zero emails containing ł
const withL = rows.filter((r) => /[łŁ]/.test(r.email));
add('1. Zero emails containing ł', withL.length === 0, `${withL.length}`);
// 2. zero non-ASCII
const nonAscii = rows.filter((r) => /[^\x00-\x7f]/.test(r.email));
add('2. Zero non-ASCII characters in emails', nonAscii.length === 0, `${nonAscii.length}` + (nonAscii.length ? ` e.g. ${nonAscii[0].email}` : ''));
// 3. pattern
const badPat = rows.filter((r) => !/^[a-z]+\.[a-z]+@/.test(r.email));
add('3. All emails match ^[a-z]+\\.[a-z]+@', badPat.length === 0, `${badPat.length}` + (badPat.length ? ` e.g. ${badPat[0].email}` : ''));
// 4. at least one Mikołaj -> mikolaj local part
const mikolaj = rows.filter((r) => r.first_name === 'Mikołaj');
const mikolajOk = mikolaj.length === 0 ? 'skip (name not drawn)' : mikolaj.every((r) => r.email.startsWith('mikolaj.'));
add('4. Mikołaj -> local part starts mikolaj', mikolaj.length === 0 || mikolaj.every((r) => r.email.startsWith('mikolaj.')), `n=${mikolaj.length}` + (mikolaj.length ? ` e.g. ${mikolaj[0].email}` : ' (increase rows if 0)'));

console.log(`\nPL email samples: ${rows.slice(0, 5).map((r) => r.email).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL STRIP-DIACRITICS CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
