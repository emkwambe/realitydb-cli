// ─── EU VAT number generators (Blocker 6) ────────────────────────────────────
// Per-country VAT generation. FR (MOD-97 key) and IT (Luhn-like) carry real
// check-digit algorithms; the rest are format-valid. Deterministic: every draw
// goes through the injected rng. No inline runner (see iban-utils.ts Phase 4d
// note on why bundled require.main runners are unsafe).
import { VAT_GENERATORS } from './data/eu-vat';

type VATGen = (rng: () => number) => string;

function digits(rng: () => number, n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10);
  return s;
}

// DE: DE + 9 digits (format-only, no checksum). 11 chars.
export function generateDE_VAT(rng: () => number): string {
  return 'DE' + digits(rng, 9);
}

// FR: FR + 2-digit MOD-97 key + 9-digit SIREN. 13 chars.
export function generateFR_VAT(rng: () => number): string {
  const siren = Math.floor(rng() * 900000000) + 100000000; // 100000000–999999999
  const checkKey = String((12 + 3 * (siren % 97)) % 97).padStart(2, '0');
  return 'FR' + checkKey + siren;
}

// IT: IT + 10 digits + Luhn-like check digit. 13 chars.
export function generateIT_VAT(rng: () => number): string {
  const body = digits(rng, 10);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = parseInt(body[i], 10);
    if (i % 2 === 0) {
      sum += d; // odd positions (1-indexed): weight 1
    } else {
      const doubled = d * 2; // even positions: weight 2, digital root
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return 'IT' + body + checkDigit;
}

// ES: ES + 1 letter + 8 digits. 11 chars.
export function generateES_VAT(rng: () => number): string {
  const letters = 'ABCDEFGHJKLMNPQRSUVW';
  const letter = letters[Math.floor(rng() * letters.length)];
  return 'ES' + letter + digits(rng, 8);
}

// NL: NL + 9 digits + literal 'B' + 2 digits (01–99). 14 chars. e.g. NL123456789B01.
export function generateNL_VAT(rng: () => number): string {
  const body = digits(rng, 9);
  const suffix = String(Math.floor(rng() * 99) + 1).padStart(2, '0');
  return 'NL' + body + 'B' + suffix;
}

// AT: AT + literal 'U' + 8 digits. 11 chars.
export function generateAT_VAT(rng: () => number): string {
  return 'ATU' + digits(rng, 8);
}

// BE: BE + leading 0|1 + 9 digits. 12 chars.
export function generateBE_VAT(rng: () => number): string {
  const first = Math.floor(rng() * 2); // 0 or 1
  return 'BE' + first + digits(rng, 9);
}

// IE: IE + 7 digits + 1 uppercase letter. 10 chars.
export function generateIE_VAT(rng: () => number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(rng() * letters.length)];
  return 'IE' + digits(rng, 7) + letter;
}

// PL: PL + 10 digits. 12 chars.
export function generatePL_VAT(rng: () => number): string {
  return 'PL' + digits(rng, 10);
}

// SE: SE + 10 digits + literal '01'. 14 chars.
export function generateSE_VAT(rng: () => number): string {
  return 'SE' + digits(rng, 10) + '01';
}

// Wraps a generator with a loud length self-check against eu-vat.ts (dev aid;
// also the reference that keeps eu-vat.ts in the bundle). All generators above
// already produce the declared length, so this never throws in practice.
function withLengthCheck(country: string, fn: VATGen): VATGen {
  return (rng) => {
    const v = fn(rng);
    const expected = VAT_GENERATORS[country]?.length;
    if (expected !== undefined && v.length !== expected) {
      throw new Error(`VAT length mismatch for ${country}: got "${v}" (${v.length}), expected ${expected}`);
    }
    return v;
  };
}

export const VAT_STRATEGY_GENERATORS: Record<string, VATGen> = {
  DE: withLengthCheck('DE', generateDE_VAT),
  FR: withLengthCheck('FR', generateFR_VAT),
  IT: withLengthCheck('IT', generateIT_VAT),
  ES: withLengthCheck('ES', generateES_VAT),
  NL: withLengthCheck('NL', generateNL_VAT),
  AT: withLengthCheck('AT', generateAT_VAT),
  BE: withLengthCheck('BE', generateBE_VAT),
  IE: withLengthCheck('IE', generateIE_VAT),
  PL: withLengthCheck('PL', generatePL_VAT),
  SE: withLengthCheck('SE', generateSE_VAT),
};
