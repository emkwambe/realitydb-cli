// Sprint 2 (Blocker 10) verification — bic strategy.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE', 'IE', 'PL', 'SE'];
const dir = mkdtempSync(join(tmpdir(), 'rdb-bic-'));
const packPath = join(dir, 'p.json');
const outPath = join(dir, 'out.json');
const pack = { name: 'test-bic', tables: { records: { columns: {
  id: { strategy: 'uuid' },
  country_code: { strategy: 'enum', options: { values: COUNTRIES, weights: COUNTRIES.map(() => 1) } },
  bic: { strategy: 'bic', options: { country_source: 'country_code' } },
} } } };
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '300', '--format', 'json', '--seed', '44', '-o', outPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows = Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'bic' in v[0]) ?? Object.values(parsed.tables || {})[0];

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const by = (c) => rows.filter((r) => r.country_code === c);

// 1. no nulls (XXXXXXXX fallback is acceptable)
add('1. Zero null/undefined', rows.every((r) => r.bic != null && r.bic !== ''), `${rows.filter(r=>r.bic==null).length} null`);
// 2. exactly 8 chars
const lenBad = rows.filter((r) => String(r.bic).length !== 8);
add('2. All exactly 8 chars', lenBad.length === 0, `${lenBad.length} bad` + (lenBad.length ? ` e.g. ${lenBad[0].bic}` : ''));
// 3. positions 4-5 == country_code
const ccBad = rows.filter((r) => String(r.bic).slice(4, 6) !== r.country_code);
add('3. Chars 4-5 match country code', ccBad.length === 0, `${ccBad.length} bad` + (ccBad.length ? ` e.g. ${ccBad[0].country_code}/${ccBad[0].bic}` : ''));
// 4. all 10 countries produce non-fallback
const fbCountries = COUNTRIES.filter((c) => by(c).some((r) => r.bic === 'XXXXXXXX') || by(c).length === 0);
add('4. All 10 countries produce non-fallback BICs', fbCountries.length === 0, fbCountries.length ? `fallback/empty: ${fbCountries.join(',')}` : 'all real');
// 5. >=2 unique per country
let uniqOk = true, ud = [];
for (const c of COUNTRIES) { const u = new Set(by(c).map((r) => r.bic)).size; ud.push(`${c}:${u}`); if (u < 2) uniqOk = false; }
add('5. >=2 unique BICs per country', uniqOk, ud.join(' '));
// 6. data integrity — the broken DRESDEFF/"DZ Bank" entry is fixed at source
const src = readFileSync(new URL('../../../../packages/engine/src/data/eu-bic.ts', import.meta.url), 'utf8');
const noBadCode = !/bankCode:\s*'DRESDEFF'/.test(src);
const dzIsGeno = /bankCode:\s*'GENO'[^}]*DZ Bank/.test(src);
const dresRelabeled = /bankCode:\s*'DRES'[^}]*Dresdner/.test(src);
const all4char = [...src.matchAll(/bankCode:\s*'([^']*)'/g)].every((m) => m[1].length === 4);
add('6. Broken DRESDEFF/DZ-Bank entry fixed at source', noBadCode && dzIsGeno && dresRelabeled && all4char,
  `noBadCode=${noBadCode} dzIsGeno=${dzIsGeno} dresRelabeled=${dresRelabeled} all4char=${all4char}`);

console.log(`rows=${rows.length}  sample: ${COUNTRIES.slice(0, 5).map((c) => `${c}:${by(c)[0]?.bic}`).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 6 BIC CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
