// Sprint 4 verification — loans table + calibrated wiring.
// Uses JSON output (seed 42, same data as the SQL run) for reliable field access
// rather than regex-parsing SQL INSERT column order (loans has a cascade-injected
// country_of_residence column, so key-value access is safer).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'rdb-loans-'));
const outPath = join(dir, 'out.json');
// Larger run → more loans per country for mean validation.
execFileSync('node', ['dist/index.js', 'run', '--pack', 'dist/packs/eu-banking.json', '--rows', '12000', '--format', 'json', '--seed', '42', '-o', outPath], { stdio: 'ignore' });
const parsed = JSON.parse(readFileSync(outPath, 'utf8'));
const pick = (name, key) =>
  parsed[name] ?? parsed.tables?.[name] ?? parsed.data?.[name] ??
  Object.values(parsed).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object' && key in v[0]);
const customers = pick('customers', 'country_of_residence');
const loans = pick('loans', 'loan_amount');

const results = [];
const add = (n, ok, d) => results.push({ n, ok, d });
if (!Array.isArray(loans)) { console.error('No loans table found'); process.exit(1); }

const custCountry = new Map(customers.map((c) => [c.id, c.country_of_residence]));
const LOAN_COLS = ['id', 'customer_id', 'loan_type', 'loan_amount', 'currency_code', 'interest_rate', 'origination_date', 'disbursement_date', 'maturity_date', 'country_of_residence'];
const TARGET = { DE: 220000, FR: 180000, NL: 280000, PL: 60000, SE: 250000, AT: 190000 };
const CUR = { DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', AT: 'EUR', BE: 'EUR', IE: 'EUR', PL: 'PLN', SE: 'SEK' };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const loansBy = (c) => loans.filter((l) => l.country_of_residence === c);

// 1. loans exist, count 10-60% of customers
const ratio = loans.length / customers.length;
add('1. loans exist, 10-60% of customers', loans.length > 0 && ratio >= 0.10 && ratio <= 0.60, `loans=${loans.length} customers=${customers.length} ratio=${(ratio * 100).toFixed(1)}%`);

// 2. all loan_amount positive numbers
const badAmt = loans.filter((l) => typeof l.loan_amount !== 'number' || Number.isNaN(l.loan_amount) || l.loan_amount <= 0);
add('2. loan_amount all positive numbers', badAmt.length === 0, `${badAmt.length} bad`);

// 3. means within 30% per country (skip <5 loans)
let ok3 = true, d3 = [];
for (const [c, t] of Object.entries(TARGET)) {
  const amts = loansBy(c).map((l) => l.loan_amount);
  if (amts.length < 5) { d3.push(`${c}:n=${amts.length}(skip)`); continue; }
  const m = mean(amts);
  const within = m >= t * 0.7 && m <= t * 1.3;
  if (!within) ok3 = false;
  d3.push(`${c}:${Math.round(m)}${within ? '' : '(!' + t + ')'}(n=${amts.length})`);
}
add('3. loan_amount means within 30% of targets', ok3, d3.join(' '));

// 4. currency matches country
const badCur = loans.filter((l) => CUR[l.country_of_residence] !== l.currency_code);
add('4. currency_code matches country', badCur.length === 0, `${badCur.length} mismatch` + (badCur.length ? ` e.g. ${badCur[0].country_of_residence}/${badCur[0].currency_code}` : ''));

// 5. cascade: loans.country_of_residence === parent customer's
let cas = 0, casJoin = 0;
for (const l of loans) { const pc = custCountry.get(l.customer_id); if (pc === undefined) continue; casJoin++; if (pc !== l.country_of_residence) cas++; }
add('5. cascade country matches parent customer', cas === 0 && casJoin > 0, `${cas}/${casJoin} mismatch`);

// 6. disbursement > origination
const t = (d) => new Date(d).getTime();
const badDisb = loans.filter((l) => t(l.disbursement_date) <= t(l.origination_date));
add('6. disbursement_date > origination_date', badDisb.length === 0, `${badDisb.length} violations`);

// 7. maturity > origination
const badMat = loans.filter((l) => t(l.maturity_date) <= t(l.origination_date));
add('7. maturity_date > origination_date', badMat.length === 0, `${badMat.length} violations`);

// 8. loan_type distribution
const tally = {}; for (const l of loans) tally[l.loan_type] = (tally[l.loan_type] || 0) + 1;
const pct = (k) => (tally[k] || 0) / loans.length * 100;
const band = { mortgage: [40, 70], personal: [15, 35], auto: [5, 22], business: [2, 18] };
let ok8 = true, d8 = [];
for (const [k, [lo, hi]] of Object.entries(band)) { const p = pct(k); d8.push(`${k}:${p.toFixed(0)}%`); if (p < lo || p > hi) ok8 = false; }
add('8. loan_type distribution within bands', ok8, d8.join(' '));

// 9. interest_rate in [0.5, 15.0]
const badRate = loans.filter((l) => typeof l.interest_rate !== 'number' || l.interest_rate < 0.5 || l.interest_rate > 15.0);
add('9. interest_rate in [0.5, 15.0]', badRate.length === 0, `${badRate.length} out of range` + (badRate.length ? ` e.g. ${badRate[0].interest_rate}` : ''));

// 10. zero null in any loan column
let nul = 0; for (const l of loans) for (const c of LOAN_COLS) if (l[c] === null || l[c] === undefined || l[c] === '') nul++;
add('10. Zero null in any loan column', nul === 0, `${nul} null`);

console.log(`loans=${loans.length} customers=${customers.length}`);
console.log(`sample loan: ${JSON.stringify({ country: loans[0].country_of_residence, type: loans[0].loan_type, amount: loans[0].loan_amount, cur: loans[0].currency_code, rate: loans[0].interest_rate })}\n`);
let allPass = true;
for (const r of results) { if (!r.ok) allPass = false; console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.n}  [${r.d}]`); }
console.log('\n' + (allPass ? 'ALL 10 LOAN CHECKS PASSED' : 'SOME CHECKS FAILED'));
process.exit(allPass ? 0 : 1);
