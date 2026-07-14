// Phase 4f–4i verification — geographic chain (city_eu, postal_code, address_eu, phone_eu).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-geo-'));
const packPath = join(dir, 'test-geo.json');
const outPath = join(dir, 'out.json');

// Column order matters: country_code → city → postal_code → address (chain).
const pack = {
  name: 'test-geo',
  tables: {
    records: {
      columns: {
        id: { strategy: 'uuid' },
        country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'PL'], weights: [1, 1, 1] } },
        city: { strategy: 'city_eu', options: { country_source: 'country_code' } },
        postal_code: { strategy: 'postal_code', options: { country_source: 'country_code', city_source: 'city' } },
        address: { strategy: 'address_eu', options: { country_source: 'country_code', city_source: 'city', postal_source: 'postal_code' } },
        phone: { strategy: 'phone_eu', options: { country_source: 'country_code' } },
      },
    },
  },
};
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '300', '--format', 'json', '--seed', '21', '-o', outPath], { stdio: 'ignore' });

const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows =
  Array.isArray(parsed) ? parsed :
  Array.isArray(parsed.records) ? parsed.records :
  parsed.tables?.records ?? parsed.data?.records ?? null;
if (!rows) {
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && 'city' in v[0]) { rows = v; break; }
    if (v && typeof v === 'object') for (const vv of Object.values(v))
      if (Array.isArray(vv) && vv.length && typeof vv[0] === 'object' && 'city' in vv[0]) { rows = vv; break; }
    if (rows) break;
  }
}
if (!rows) { console.error('No rows:', Object.keys(parsed)); process.exit(1); }

// Guard: hidden __city_entry__ keys must NOT have leaked into output columns.
const leakedKeys = Object.keys(rows[0]).filter((k) => k.startsWith('__'));

const DE_CITIES = new Set(['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen']);
const FR_CITIES = new Set(['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille']);
const DE_STREETS = ['Hauptstraße', 'Bahnhofstraße', 'Berliner Straße', 'Goethestraße', 'Schillerstraße'];
const CITY_PREFIX = { Berlin: '10', Hamburg: '20', Munich: '80' };

const de = rows.filter((r) => r.country_code === 'DE');
const fr = rows.filter((r) => r.country_code === 'FR');
const pl = rows.filter((r) => r.country_code === 'PL');

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });

// 1. no nulls in any column
let nulls = 0;
for (const r of rows) for (const c of ['city', 'postal_code', 'address', 'phone', 'country_code'])
  if (r[c] == null || r[c] === '') nulls++;
add('1. Zero null/undefined in any column', nulls === 0 && leakedKeys.length === 0, `${nulls} null; leaked keys: [${leakedKeys.join(',')}]`);

// 2. DE cities from DE list
const deCityBad = de.filter((r) => !DE_CITIES.has(r.city));
add('2. DE cities only from DE list', deCityBad.length === 0, `${deCityBad.length}/${de.length} bad`);

// 3. FR cities from FR list
const frCityBad = fr.filter((r) => !FR_CITIES.has(r.city));
add('3. FR cities only from FR list', frCityBad.length === 0, `${frCityBad.length}/${fr.length} bad`);

// 4. DE postal: 5 digits, start with city prefix
const dePostalBad = de.filter((r) => !/^\d{5}$/.test(String(r.postal_code)));
add('4. DE postal codes are 5 digits', dePostalBad.length === 0, `${dePostalBad.length}/${de.length} non-5-digit`);

// 5. DE addresses contain a DE street name
const deStreetBad = de.filter((r) => !DE_STREETS.some((s) => String(r.address).includes(s)));
add('5. DE addresses contain DE street names', deStreetBad.length === 0, `${deStreetBad.length}/${de.length} missing`);

// 6/7/8 phones
add('6. DE phones start +49', de.every((r) => String(r.phone).startsWith('+49')), `${de.filter(r=>!String(r.phone).startsWith('+49')).length} bad`);
add('7. FR phones start +33', fr.every((r) => String(r.phone).startsWith('+33')), `${fr.filter(r=>!String(r.phone).startsWith('+33')).length} bad`);
add('8. PL phones start +48', pl.every((r) => String(r.phone).startsWith('+48')), `${pl.filter(r=>!String(r.phone).startsWith('+48')).length} bad`);

// 9. postal↔city coherence for Berlin/Hamburg/Munich
let cohBad = 0, cohTot = 0;
for (const r of de) {
  const p = CITY_PREFIX[r.city];
  if (p) { cohTot++; if (!String(r.postal_code).startsWith(p)) cohBad++; }
}
add('9. postal↔city coherent (Berlin→10, Hamburg→20, Munich→80)', cohBad === 0 && cohTot > 0, `${cohBad}/${cohTot} incoherent`);

// 10. >=5 unique cities overall
const uniqCities = new Set(rows.map((r) => r.city));
add('10. >=5 unique cities in 300 rows', uniqCities.size >= 5, `${uniqCities.size} unique`);

console.log(`Total rows: ${rows.length}  (DE=${de.length} FR=${fr.length} PL=${pl.length})`);
console.log(`Sample DE row: ${JSON.stringify({ city: de[0]?.city, postal: de[0]?.postal_code, address: de[0]?.address, phone: de[0]?.phone })}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 10 CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
