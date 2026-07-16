// ABA routing number (Federal Reserve routing symbol) checksum — a
// weighted-digit MOD-10 algorithm, distinct from IBAN's MOD-97. Kept in its
// own pure module mirroring iban-utils.ts: checksum math has no rng/IO
// dependency, the caller (generators.ts) supplies digits and this module
// only computes/validates the check digit.
//
// Algorithm (ABA/Federal Reserve routing number standard):
//   d0..d8 (9 digits), weights [3,7,1,3,7,1,3,7,1] applied positionally,
//   sum(weight[i] * d[i]) must be divisible by 10.

const WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1];

export function computeABACheckDigit(first8: number[]): number {
  if (first8.length !== 8) {
    throw new Error(`computeABACheckDigit expects exactly 8 digits, got ${first8.length}`);
  }
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += first8[i] * WEIGHTS[i];
  return (10 - (sum % 10)) % 10;
}

export function validateABA(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const digits = routing.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * WEIGHTS[i];
  return sum % 10 === 0;
}

// Real Federal Reserve routing-symbol prefixes associated with Charlotte
// NC-area / Southeast banks, per pack spec: 053 (Bank of America / Truist /
// First Citizens NC), 051 (Wells Fargo Southeast), 061 (SunTrust/Truist
// Georgia), 263 (Southeast credit unions).
const CHARLOTTE_AREA_PREFIXES = ['053', '051', '061', '263'];

export function generateABARouting(rng: () => number): string {
  const prefix = CHARLOTTE_AREA_PREFIXES[Math.floor(rng() * CHARLOTTE_AREA_PREFIXES.length)];
  const first8: number[] = prefix.split('').map(Number);
  for (let i = 0; i < 5; i++) first8.push(Math.floor(rng() * 10));

  const checkDigit = computeABACheckDigit(first8);
  const routing = first8.join('') + checkDigit;

  if (!validateABA(routing)) {
    throw new Error(`Generated invalid ABA routing number: ${routing}`);
  }
  return routing;
}
