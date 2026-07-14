// Sprint 2 (Blocker 11) verification — email_eu strategy.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DE_DOMAINS = ['gmx.de', 'web.de', 't-online.de', 'posteo.de', 'mailbox.org', 'gmail.com'];
const FR_DOMAINS = ['orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'gmail.com', 'yahoo.fr'];

const dir = mkdtempSync(join(tmpdir(), 'rdb-email-'));
const packPath = join(dir, 'p.json');
const outPath = join(dir, 'out.json');
const pack = { name: 'test-email', tables: { records: { columns: {
  id: { strategy: 'uuid' },
  country_code: { strategy: 'enum', options: { values: ['DE', 'FR', 'IT', 'PL'], weights: [1, 1, 1, 1] } },
  gender: { strategy: 'enum', options: { values: ['M', 'F'], weights: [1, 1] } },
  first_name: { strategy: 'name_first', options: { country_source: 'country_code', gender_source: 'gender' } },
  last_name: { strategy: 'name_last', options: { country_source: 'country_code' } },
  email: { strategy: 'email_eu', options: { country_source: 'country_code', first_name_source: 'first_name', last_name_source: 'last_name' } },
} } } };
writeFileSync(packPath, JSON.stringify(pack));
execFileSync('node', ['dist/index.js', 'run', '--pack', packPath, '--rows', '400', '--format', 'json', '--seed', '27', '-o', outPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
let rows = Array.isArray(parsed) ? parsed : parsed.records ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'email' in v[0]) ?? Object.values(parsed.tables || {})[0];

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const by = (c) => rows.filter((r) => r.country_code === c);
const domainOf = (e) => String(e).split('@')[1];
const localOf = (e) => String(e).split('@')[0];

// 1. no nulls
add('1. Zero null/undefined emails', rows.every((r) => r.email != null && r.email !== ''), `${rows.filter(r=>r.email==null).length} null`);
// 2. pattern word.word@domain.tld
const re = /^[a-z]+\.[a-z]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const patBad = rows.filter((r) => !re.test(String(r.email)));
add('2. Matches first.last@domain.tld', patBad.length === 0, `${patBad.length} bad` + (patBad.length ? ` e.g. ${patBad[0].email}` : ''));
// 3. no diacritics
const diaBad = rows.filter((r) => /[^\x00-\x7f]/.test(String(r.email)));
add('3. Zero diacritics in emails', diaBad.length === 0, `${diaBad.length} bad` + (diaBad.length ? ` e.g. ${diaBad[0].email}` : ''));
// 4. DE domain in DE list
const deBad = by('DE').filter((r) => !DE_DOMAINS.includes(domainOf(r.email)));
add('4. DE emails use DE domains', deBad.length === 0, `${deBad.length}/${by('DE').length} bad`);
// 5. FR domain in FR list
const frBad = by('FR').filter((r) => !FR_DOMAINS.includes(domainOf(r.email)));
add('5. FR emails use FR domains', frBad.length === 0, `${frBad.length}/${by('FR').length} bad`);
// 6. no digits in local part
const digBad = rows.filter((r) => /\d/.test(localOf(r.email)));
add('6. Zero digits in local part', digBad.length === 0, `${digBad.length} bad` + (digBad.length ? ` e.g. ${digBad[0].email}` : ''));
// 7. >=15 unique domains overall
const uniqDomains = new Set(rows.map((r) => domainOf(r.email)));
add('7. >=15 unique domains across 400 rows', uniqDomains.size >= 15, `${uniqDomains.size} unique`);

console.log(`rows=${rows.length}  sample: ${['DE','FR','IT','PL'].map((c) => by(c)[0]?.email).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 7 EMAIL CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
