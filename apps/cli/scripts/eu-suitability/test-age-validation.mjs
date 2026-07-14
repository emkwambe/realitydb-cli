// Sprint 5 verification — date_of_birth + Blocker 12 age validation.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-age-'));
const outPath = join(dir, 'out.json');
const sqlPath = join(dir, 'out.sql');
// JSON for reliable field access; SQL for the assessor's Semantic rules line.
execFileSync('node', ['dist/index.js', 'run', '--pack', 'dist/packs/eu-banking.json', '--rows', '6000', '--format', 'json', '--seed', '42', '-o', outPath], { stdio: 'ignore' });
execFileSync('node', ['dist/index.js', 'run', '--pack', 'dist/packs/eu-banking.json', '--rows', '6000', '--format', 'sql', '--seed', '42', '-o', sqlPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
const pick = (name, key) => parsed[name] ?? parsed.tables?.[name] ??
  Object.values(parsed).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object' && key in v[0]);
const customers = pick('customers', 'date_of_birth');
const ubos = pick('beneficial_owners', 'date_of_birth');

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const t = (d) => new Date(d).getTime();
const ageAt = (birth, event) => (t(event) - t(birth)) / (365.25 * 24 * 60 * 60 * 1000);

// 1. zero null dob
const nullDob = customers.filter((c) => c.date_of_birth == null || c.date_of_birth === '');
add('1. Zero null date_of_birth', nullDob.length === 0, `${nullDob.length} null`);
// 2. all parse
const badParse = customers.filter((c) => isNaN(t(c.date_of_birth)));
add('2. All date_of_birth parse as valid dates', badParse.length === 0, `${badParse.length} unparseable`);
// 3. all >=18 at created_at
const under18 = customers.filter((c) => ageAt(c.date_of_birth, c.created_at) < 18.0);
add('3. All customers >=18 at created_at', under18.length === 0, `${under18.length} under 18` + (under18.length ? ` e.g. ${ageAt(under18[0].date_of_birth, under18[0].created_at).toFixed(1)}y` : ''));
// 4. dob in [1940-01-01, 2006-12-31]
const lo = t('1940-01-01'), hi = t('2006-12-31T23:59:59Z');
const outRange = customers.filter((c) => t(c.date_of_birth) < lo || t(c.date_of_birth) > hi);
add('4. date_of_birth within 1940-01-01..2006-12-31', outRange.length === 0, `${outRange.length} out of range`);
// 5. dob < created_at
const notBefore = customers.filter((c) => t(c.date_of_birth) >= t(c.created_at));
add('5. date_of_birth < created_at for all rows', notBefore.length === 0, `${notBefore.length} violations`);
// 6. >=4 of 7 birth decades populated
const decades = new Set(customers.map((c) => Math.floor(new Date(c.date_of_birth).getUTCFullYear() / 10) * 10).filter((y) => y >= 1940 && y <= 2000));
add('6. >=4 distinct birth decades', decades.size >= 4, `${decades.size} decades: ${[...decades].sort().join(',')}`);
// 7. UBO dob present + >=18 at created_at
const uboNull = (ubos || []).filter((u) => u.date_of_birth == null || u.date_of_birth === '');
const uboUnder = (ubos || []).filter((u) => ageAt(u.date_of_birth, u.created_at) < 18.0);
add('7. beneficial_owners dob present + >=18', (ubos?.length ?? 0) > 0 && uboNull.length === 0 && uboUnder.length === 0, `n=${ubos?.length ?? 0} null=${uboNull.length} under18=${uboUnder.length}`);
// 8. assessor Semantic rules 100%
const assessOut = execFileSync('node', ['dist/index.js', 'examine', 'assess', sqlPath, '--pack', 'dist/packs/eu-banking.json'], { encoding: 'utf8' });
const m = assessOut.match(/Semantic rules:\s*(\d+)\/(\d+)\s*rules satisfied/);
const sem100 = m && m[1] === m[2] && Number(m[2]) > 0;
add('8. Assessor Semantic rules metric 100%', !!sem100, m ? `${m[1]}/${m[2]}` : 'line not found');

console.log(`customers=${customers.length} ubos=${ubos?.length ?? 0}`);
console.log(`sample: dob=${customers[0].date_of_birth?.slice(0,10)} created=${customers[0].created_at?.slice(0,10)} age=${ageAt(customers[0].date_of_birth, customers[0].created_at).toFixed(1)}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 8 AGE CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
