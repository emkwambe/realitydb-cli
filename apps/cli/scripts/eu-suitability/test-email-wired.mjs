// email_eu wired into eu-banking — verification (Blocker 11, pack).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DE_DOMAINS = ['gmx.de', 'web.de', 't-online.de', 'posteo.de', 'mailbox.org', 'gmail.com'];
const FR_DOMAINS = ['orange.fr', 'free.fr', 'sfr.fr', 'laposte.net', 'gmail.com', 'yahoo.fr'];
const CHAR_MAP = { 'ł': 'l', 'Ł': 'l', 'ø': 'o', 'Ø': 'o', 'ð': 'd', 'Ð': 'd', 'þ': 'th', 'Þ': 'th', 'ß': 'ss', 'æ': 'ae', 'Æ': 'ae', 'œ': 'oe', 'Œ': 'oe' };
const strip = (s) => { let m = s ?? ''; for (const [c, r] of Object.entries(CHAR_MAP)) m = m.split(c).join(r); return m.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, ''); };

const dir = mkdtempSync(join(tmpdir(), 'rdb-emailwire-'));
function gen(seed) {
  const out = join(dir, `o-${seed}.json`);
  execFileSync('node', ['dist/index.js', 'run', '--pack', 'dist/packs/eu-banking.json', '--rows', '1000', '--format', 'json', '--seed', String(seed), '-o', out], { stdio: 'ignore' });
  const parsed = JSON.parse(readFileSync(out, 'utf8'));
  return parsed.customers ?? parsed.tables?.customers ?? Object.values(parsed).find((v) => Array.isArray(v) && v[0] && 'email' in v[0] && 'first_name' in v[0]);
}
const rows = gen(42);
const rows2 = gen(42);

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
const by = (c) => rows.filter((r) => r.country_of_residence === c);
const domainOf = (e) => String(e).split('@')[1];
const localOf = (e) => String(e).split('@')[0];

add('1. Zero null/undefined emails', rows.every((r) => r.email), `${rows.filter(r=>!r.email).length} null`);
const re = /^[a-z]+\.[a-z]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const patBad = rows.filter((r) => !re.test(r.email));
add('2. Matches first.last@domain.tld', patBad.length === 0, `${patBad.length}` + (patBad.length ? ` e.g. ${patBad[0].email}` : ''));
const nonAscii = rows.filter((r) => /[^\x00-\x7f]/.test(r.email));
add('3. Zero non-ASCII', nonAscii.length === 0, `${nonAscii.length}` + (nonAscii.length ? ` e.g. ${nonAscii[0].email}` : ''));
const digits = rows.filter((r) => /\d/.test(localOf(r.email)));
add('4. Zero digits in local part', digits.length === 0, `${digits.length}` + (digits.length ? ` e.g. ${digits[0].email}` : ''));
const deBad = by('DE').filter((r) => !DE_DOMAINS.includes(domainOf(r.email)));
add('5. DE customers use DE domains', deBad.length === 0, `${deBad.length}/${by('DE').length} bad`);
const frBad = by('FR').filter((r) => !FR_DOMAINS.includes(domainOf(r.email)));
add('6. FR customers use FR domains', frBad.length === 0, `${frBad.length}/${by('FR').length} bad`);
const plL = by('PL').filter((r) => /[łŁ]/.test(r.email));
add('7. PL emails: zero ł character', plL.length === 0, `${plL.length}/${by('PL').length}`);
const derBad = rows.filter((r) => localOf(r.email) !== `${strip(r.first_name)}.${strip(r.last_name)}`);
add('8. Local part = strip(first).strip(last)', derBad.length === 0, `${derBad.length} bad` + (derBad.length ? ` e.g. ${derBad[0].first_name}/${derBad[0].last_name}->${derBad[0].email}` : ''));
const uniqDomains = new Set(rows.map((r) => domainOf(r.email)));
add('9. >=8 unique domains', uniqDomains.size >= 8, `${uniqDomains.size} unique`);
const a = rows.map((r) => r.email), b = rows2.map((r) => r.email);
add('10. Determinism (seed 42 twice)', a.length === b.length && a.every((v, i) => v === b[i]), a.every((v, i) => v === b[i]) ? 'identical' : 'MISMATCH');

console.log(`customers=${rows.length}  samples: ${['DE','FR','IT','PL'].map((c) => by(c)[0]?.email).join('  ')}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 10 EMAIL-WIRED CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
