// Phase 4d verification — iban strategy.
// Generates 1000 rows via the built CLI and re-validates every IBAN independently.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const COUNTRIES = ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'BE', 'IE', 'PL', 'SE'];
const LENGTHS = { DE: 22, FR: 27, IT: 27, ES: 24, NL: 18, AT: 20, BE: 16, IE: 22, PL: 28, SE: 24 };
const DE_BANKS = ['37040044', '50010517', '70020270', '10020890'];
const NL_BANKS = ['ABNA', 'INGB', 'RABO'];

// Independent MOD-97 validator (does not import engine code — a true second opinion).
function validateIBAN(iban) {
  if (!iban) return false;
  const s = iban.replace(/\s+/g, '').toUpperCase();
  if (s.length < 15 || s.length > 34 || !/^[A-Z0-9]+$/.test(s)) return false;
  const re = s.slice(4) + s.slice(0, 4);
  let numeric = '';
  for (const ch of re) {
    const c = ch.charCodeAt(0);
    numeric += c >= 65 && c <= 90 ? String(c - 55) : ch;
  }
  let rem = 0n;
  for (const d of numeric) rem = (rem * 10n + BigInt(d.charCodeAt(0) - 48)) % 97n;
  return rem === 1n;
}

const dir = mkdtempSync(join(tmpdir(), 'rdb-iban-'));
const packPath = join(dir, 'test-iban.json');
const outPath = join(dir, 'out.json');
const pack = {
  name: 'test-iban',
  tables: {
    records: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: COUNTRIES, weights: COUNTRIES.map(() => 1) } },
        iban: { strategy: 'iban', options: { country_source: 'country_code' } },
      },
    },
  },
};
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '1000', '--format', 'json', '--seed', '99', '-o', outPath], { stdio: 'ignore' });

const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows =
  Array.isArray(parsed) ? parsed :
  Array.isArray(parsed.records) ? parsed.records :
  parsed.tables?.records ?? parsed.data?.records ?? null;
if (!rows) {
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && 'iban' in v[0]) { rows = v; break; }
    if (v && typeof v === 'object') for (const vv of Object.values(v))
      if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'iban' in vv[0]) { rows = vv; break; }
    if (rows) break;
  }
}
if (!rows) { console.error('No rows found:', Object.keys(parsed)); process.exit(1); }

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// 1. No null/undefined
const nullCount = rows.filter((r) => r.iban == null || r.iban === '').length;
add('1. No null/undefined IBANs', nullCount === 0, `${nullCount} null`);

// 2. 100% validate
const invalid = rows.filter((r) => !validateIBAN(r.iban));
add('2. 100% pass MOD-97 validateIBAN', invalid.length === 0, `${invalid.length}/${rows.length} invalid` + (invalid.length ? ' e.g. ' + invalid.slice(0,3).map(r=>r.iban).join(',') : ''));

// 3. Starts with country
const badPrefix = rows.filter((r) => !String(r.iban).startsWith(r.country_code));
add('3. Every IBAN starts with its country', badPrefix.length === 0, `${badPrefix.length} bad`);

// 4. Length matches config
const badLen = rows.filter((r) => String(r.iban).length !== LENGTHS[r.country_code]);
add('4. Length matches EU_IBAN_CONFIGS', badLen.length === 0, `${badLen.length} bad` + (badLen.length ? ' e.g. ' + badLen.slice(0,3).map(r=>`${r.country_code}:${r.iban.length}`).join(',') : ''));

// 5. >=950 unique
const uniq = new Set(rows.map((r) => r.iban));
add('5. >=950 unique IBANs', uniq.size >= 950, `${uniq.size} unique`);

// 6. DE bank codes
const deRows = rows.filter((r) => r.country_code === 'DE');
const deBad = deRows.filter((r) => !DE_BANKS.some((b) => String(r.iban).slice(4).startsWith(b)));
add('6. DE IBANs use known bank codes', deBad.length === 0, `${deBad.length}/${deRows.length} bad`);

// 7. NL bank codes (NL + 2 check digits + ABNA/INGB/RABO)
const nlRows = rows.filter((r) => r.country_code === 'NL');
const nlBad = nlRows.filter((r) => !NL_BANKS.some((b) => String(r.iban).slice(4).startsWith(b)));
add('7. NL IBANs use known bank codes', nlBad.length === 0, `${nlBad.length}/${nlRows.length} bad`);

console.log(`Total rows: ${rows.length}  (per-country ~${Math.round(rows.length/COUNTRIES.length)})\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 7 CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
