// Phase 4b verification — name_first / name_last strategies.
// Generates 500 rows via the built CLI and asserts country + gender coupling.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-names-'));
const packPath = join(dir, 'test-names.json');
const outPath = join(dir, 'out.json');

const pack = {
  name: 'test-names',
  tables: {
    records: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'PL'], weights: [1, 1, 1] } },
        gender: { strategy: 'enum', options: { values: ['M', 'F'], weights: [1, 1] } },
        first_name: { strategy: 'name_first', options: { country_source: 'country_code', gender_source: 'gender' } },
        last_name: { strategy: 'name_last', options: { country_source: 'country_code' } },
      },
    },
  },
};
writeFileSync(packPath, JSON.stringify(pack));

execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '500', '--format', 'json', '--seed', '13', '-o', outPath], { stdio: 'ignore' });

const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows =
  Array.isArray(parsed) ? parsed :
  Array.isArray(parsed.records) ? parsed.records :
  parsed.tables?.records ?? parsed.data?.records ?? null;
if (!rows) {
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && 'first_name' in v[0]) { rows = v; break; }
    if (v && typeof v === 'object') {
      for (const vv of Object.values(v)) {
        if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'first_name' in vv[0]) { rows = vv; break; }
      }
    }
    if (rows) break;
  }
}
if (!rows) { console.error('Could not locate rows:', Object.keys(parsed)); process.exit(1); }

// Expected pool membership — parsed from eu-names.ts source so it stays in sync
// with pool edits (was a frozen 10M/10F list; went stale after Sprint 3's 14/14).
const namesSrc = readFileSync(new URL('../../../../packages/engine/src/data/eu-names.ts', import.meta.url), 'utf8');
function poolSets(country) {
  const start = namesSrc.indexOf(`  ${country}: {`);
  const end = namesSrc.indexOf('\n  },', start);
  const block = namesSrc.slice(start, end);
  const entries = [...block.matchAll(/name: '([^']+)', weight: [\d.]+, gender: '([MF])'/g)];
  const all = new Set(), males = new Set(), females = new Set();
  for (const m of entries) { all.add(m[1]); (m[2] === 'M' ? males : females).add(m[1]); }
  return { all, males, females };
}
const de = poolSets('DE'), fr = poolSets('FR');
const DE_FIRST = de.all;
const FR_FIRST = fr.all;
const DE_FEMALE_ONLY = new Set([...de.females].filter((n) => !de.males.has(n)));
const DE_MALE_ONLY = new Set([...de.males].filter((n) => !de.females.has(n)));

const results = [];
const add = (name, ok, detail) => results.push({ name, ok, detail });

// 1. No null/undefined names
let nameNull = 0;
for (const r of rows) if (r.first_name == null || r.first_name === '' || r.last_name == null || r.last_name === '') nameNull++;
add('1. No null/undefined first/last name', nameNull === 0, `${nameNull} null(s)`);

// 2. German rows → first_name in DE pool
const deRows = rows.filter((r) => r.country_code === 'DE');
const deBad = deRows.filter((r) => !DE_FIRST.has(r.first_name));
add('2. German first names in DE pool', deBad.length === 0, `${deBad.length} outside pool (of ${deRows.length})`);

// 3. French rows → first_name in FR pool
const frRows = rows.filter((r) => r.country_code === 'FR');
const frBad = frRows.filter((r) => !FR_FIRST.has(r.first_name));
add('3. French first names in FR pool', frBad.length === 0, `${frBad.length} outside pool (of ${frRows.length})`);

// 4. Male DE rows → no female-only names
const deMale = deRows.filter((r) => r.gender === 'M');
const deMaleBad = deMale.filter((r) => DE_FEMALE_ONLY.has(r.first_name));
add('4. Male DE rows have no female-only names', deMaleBad.length === 0, `${deMaleBad.length} leaked (of ${deMale.length})`);

// 5. Female DE rows → no male-only names
const deFemale = deRows.filter((r) => r.gender === 'F');
const deFemaleBad = deFemale.filter((r) => DE_MALE_ONLY.has(r.first_name));
add('5. Female DE rows have no male-only names', deFemaleBad.length === 0, `${deFemaleBad.length} leaked (of ${deFemale.length})`);

// 6. ≥8 unique first names across dataset
const uniqFirst = new Set(rows.map((r) => r.first_name));
add('6. >=8 unique first names overall', uniqFirst.size >= 8, `${uniqFirst.size} unique`);

// 7. >=5 unique last names in DE rows
const uniqDeLast = new Set(deRows.map((r) => r.last_name));
add('7. >=5 unique DE last names', uniqDeLast.size >= 5, `${uniqDeLast.size} unique`);

console.log(`Total rows: ${rows.length}  (DE=${deRows.length} FR=${frRows.length} PL=${rows.filter(r=>r.country_code==='PL').length})\n`);
let allPass = true;
for (const r of results) {
  if (!r.ok) allPass = false;
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  [${r.detail}]`);
}
console.log('\n' + (allPass ? 'ALL 7 CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
