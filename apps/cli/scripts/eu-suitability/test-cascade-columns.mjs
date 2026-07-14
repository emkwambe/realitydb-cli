// Sprint 1 verification — cascade_columns (Decision 5).
// Proves a child table inherits the parent's country_code and that the child's
// country-keyed strategy (iban) becomes coherent with the cascaded value.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-cascade-'));
const packPath = join(dir, 'test-cascade.json');
const outPath = join(dir, 'out.json');

const pack = {
  name: 'test-cascade',
  tables: {
    customers: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'PL'], weights: [1, 1, 1] } },
      },
    },
    accounts: {
      columns: {
        id: { strategy: 'uuid' },
        customer_id: { strategy: 'uuid', foreignKey: { table: 'customers', column: 'id' } },
        // NOTE: no own country_code strategy — it comes from cascade.
        iban: { strategy: 'iban', options: { country_source: 'country_code' } },
      },
      cascade_columns: { from: 'customers', via: 'customer_id', columns: ['country_code'] },
    },
  },
  relationships: [
    { targetTable: 'accounts', sourceTable: 'customers', cardinality: { strategy: 'poisson', mean: 2, min: 1, max: 5 } },
  ],
};
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '200', '--format', 'json', '--seed', '17', '-o', outPath], { stdio: 'ignore' });

const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
const pick = (name, key) =>
  parsed[name] ?? parsed.tables?.[name] ?? parsed.data?.[name] ??
  Object.values(parsed).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object' && key in v[0]);
const customers = pick('customers', 'country_code');
const accounts = pick('accounts', 'iban');
if (!customers || !accounts) { console.error('Missing tables. Keys:', Object.keys(parsed)); process.exit(1); }

// Build customer id → country lookup for the join.
const custCountry = new Map(customers.map((c) => [c.id, c.country_code]));

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// 1. Every accounts row has country_code populated
const missing = accounts.filter((a) => a.country_code == null || a.country_code === '');
add('1. Every account has country_code', missing.length === 0, `${missing.length}/${accounts.length} missing`);

// 2. accounts.country_code === parent customer's country_code
let mismatch = 0, joinable = 0;
for (const a of accounts) {
  const parentCountry = custCountry.get(a.customer_id);
  if (parentCountry === undefined) continue; // dangling FK — not counted
  joinable++;
  if (a.country_code !== parentCountry) mismatch++;
}
add('2. account.country_code === parent.country_code', mismatch === 0 && joinable > 0, `${mismatch}/${joinable} mismatched`);

// 3. iban starts with account.country_code
const ibanBad = accounts.filter((a) => !String(a.iban).startsWith(String(a.country_code)));
add('3. iban prefix === cascaded country_code', ibanBad.length === 0, `${ibanBad.length}/${accounts.length} bad` + (ibanBad.length ? ` e.g. ${ibanBad[0].country_code}/${ibanBad[0].iban}` : ''));

// 4. Zero null/undefined country_code (same as 1, explicit)
add('4. Zero null/undefined country_code', missing.length === 0, `${missing.length} null`);

// 5. All three countries represented in accounts
const present = new Set(accounts.map((a) => a.country_code));
add('5. All of DE/FR/PL present in accounts', ['DE', 'FR', 'PL'].every((c) => present.has(c)), `present: ${[...present].join(',')}`);

console.log(`customers=${customers.length} accounts=${accounts.length}`);
console.log(`sample accounts: ${accounts.slice(0, 3).map((a) => `${a.country_code}:${a.iban}`).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 5 CASCADE CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
