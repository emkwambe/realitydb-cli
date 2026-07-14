// Sprint 3 verification — expanded name pools (14M/14F/10 per country).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE', 'IE', 'PL', 'SE'];
const STUBS = ['IT', 'ES', 'NL', 'AT', 'BE', 'IE', 'PL', 'SE'];

function gen(seed, outPath, packPath) {
  const pack = { name: 'test-names-x', tables: { records: { columns: {
    id: { strategy: 'uuid' },
    country_code: { strategy: 'enum', options: { values: COUNTRIES, weights: COUNTRIES.map(() => 1) } },
    gender: { strategy: 'enum', options: { values: ['M', 'F'], weights: [1, 1] } },
    first_name: { strategy: 'name_first', options: { country_source: 'country_code', gender_source: 'gender' } },
    last_name: { strategy: 'name_last', options: { country_source: 'country_code' } },
  } } } };
  writeFileSync(packPath, JSON.stringify(pack));
  execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '1000', '--format', 'json', '--seed', String(seed), '-o', outPath], { stdio: 'ignore' });
  const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'first_name' in v[0]) ?? Object.values(parsed.tables || {})[0];
}

// Load the pools from source to build per-country membership sets.
const src = readFileSync(new URL('../../../../packages/engine/src/data/eu-names.ts', import.meta.url), 'utf8');
const poolFirst = {}; const poolFemaleOnly = {}; const poolMaleOnly = {};
{
  // crude but reliable parse: split per-country blocks, collect first-name entries
  for (const c of COUNTRIES) {
    const start = src.indexOf(`  ${c}: {`);
    const end = src.indexOf('\n  },', start);
    const block = src.slice(start, end);
    const firsts = [...block.matchAll(/name: '([^']+)', weight: [\d.]+, gender: '([MF])'/g)];
    const all = new Set(); const males = new Set(); const females = new Set();
    for (const m of firsts) { all.add(m[1]); (m[2] === 'M' ? males : females).add(m[1]); }
    poolFirst[c] = all;
    poolMaleOnly[c] = new Set([...males].filter((n) => !females.has(n)));
    poolFemaleOnly[c] = new Set([...females].filter((n) => !males.has(n)));
  }
}

const dir = mkdtempSync(join(tmpdir(), 'rdb-namesx-'));
const rows = gen(42, join(dir, 'a.json'), join(dir, 'pa.json'));
const rows2 = gen(42, join(dir, 'b.json'), join(dir, 'pb.json'));
if (!rows || !rows2) { console.error('No rows'); process.exit(1); }
const by = (c) => rows.filter((r) => r.country_code === c);

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// 1. no nulls
let nul = 0; for (const r of rows) if (!r.first_name || !r.last_name) nul++;
add('1. Zero null/undefined names', nul === 0, `${nul} null`);
// 2. per-country membership (0 cross-country leaks)
let leak = 0; for (const r of rows) if (!poolFirst[r.country_code].has(r.first_name)) leak++;
add('2. First name from own country pool (0 leaks)', leak === 0, `${leak} leaks`);
// 3. gender coupling
let gLeak = 0;
for (const r of rows) {
  if (r.gender === 'M' && poolFemaleOnly[r.country_code].has(r.first_name)) gLeak++;
  if (r.gender === 'F' && poolMaleOnly[r.country_code].has(r.first_name)) gLeak++;
}
add('3. Gender coupling (0 cross-gender)', gLeak === 0, `${gLeak} mismatches`);
// 4. >=200 unique first names
const uniq = new Set(rows.map((r) => r.first_name));
add('4. >=200 unique first names @1000 rows', uniq.size >= 200, `${uniq.size} unique`);
// 5. per stub country >=15 unique first names
let ok5 = true, d5 = [];
for (const c of STUBS) { const u = new Set(by(c).map((r) => r.first_name)).size; d5.push(`${c}:${u}`); if (u < 15) ok5 = false; }
add('5. >=15 unique first names per stub country', ok5, d5.join(' '));
// 6. IT includes Francesco/Sofia/Giulia/Alessandro, none of James/John/Sarah/Emily
const itNames = new Set(by('IT').map((r) => r.first_name));
const itHas = ['Francesco', 'Sofia', 'Giulia', 'Alessandro'].filter((n) => itNames.has(n));
const anglo = ['James', 'John', 'Sarah', 'Emily'].filter((n) => itNames.has(n));
add('6. IT pool Italian, zero Anglo', itHas.length >= 1 && anglo.length === 0, `italian present: ${itHas.join(',')}; anglo leaked: ${anglo.join(',') || 'none'}`);
// 7. determinism
const a = rows.map((r) => r.first_name + '|' + r.last_name);
const b = rows2.map((r) => r.first_name + '|' + r.last_name);
add('7. Determinism (seed 42 twice identical)', a.length === b.length && a.every((v, i) => v === b[i]), a.every((v, i) => v === b[i]) ? 'identical' : 'MISMATCH');

console.log(`rows=${rows.length}  unique first names=${uniq.size}`);
console.log(`sample: ${COUNTRIES.map((c) => `${c}:${by(c)[0]?.first_name} ${by(c)[0]?.last_name}`).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 8 CHECKS PASSED' : 'SOME CHECKS FAILED'));
console.log('UNIQUE_FIRST_NAME_COUNT=' + uniq.size);
process.exit(allPass ? 0 : 1);
