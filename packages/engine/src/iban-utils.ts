// ─── IBAN structural validity — ISO 13616 + ISO 7064 MOD-97-10 ───────────────
// Standalone helper for Blocker 1 (IBAN). Phase 2: NOT wired into engine.ts yet.
// Zero-dependency, deterministic, uses native BigInt (Node 20+). No Math.random.

/**
 * Converts an IBAN (or partial IBAN) to its numeric MOD-97 form.
 * Letters A–Z become 10–35 per ISO 13616. Digits pass through unchanged.
 * Input is upper-cased so lower-case letters map identically.
 */
export function ibanToNumeric(iban: string): string {
  return iban
    .toUpperCase()
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) return String(code - 55); // A=10 … Z=35
      return char; // digits (and any already-numeric chars)
    })
    .join('');
}

/**
 * Computes the 2-digit ISO 7064 MOD-97-10 check digits for a country + BBAN.
 * Rearrange = BBAN + countryCode + "00", convert to numeric, then
 * checkDigits = 98 − (numeric mod 97), left-padded to 2 digits.
 */
export function computeIBANCheckDigits(countryCode: string, bban: string): string {
  const rearranged = bban + countryCode.toUpperCase() + '00';
  const numeric = ibanToNumeric(rearranged);

  let remainder = 0n;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10n + BigInt(numeric.charCodeAt(i) - 48)) % 97n;
  }

  const checkDigits = 98 - Number(remainder);
  return String(checkDigits).padStart(2, '0');
}

/**
 * Validates an IBAN via MOD-97: rearrange (move first 4 chars to end),
 * convert letters to numbers, and confirm the remainder mod 97 equals 1.
 * Returns false for anything outside ISO length bounds (15–34) or with
 * non-alphanumeric characters.
 */
export function validateIBAN(iban: string): boolean {
  if (!iban) return false;
  const normalized = iban.replace(/\s+/g, '').toUpperCase();
  if (normalized.length < 15 || normalized.length > 34) return false;
  if (!/^[A-Z0-9]+$/.test(normalized)) return false;

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = ibanToNumeric(rearranged);

  let remainder = 0n;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10n + BigInt(numeric.charCodeAt(i) - 48)) % 97n;
  }

  return remainder === 1n;
}

// NOTE: The Phase-2 inline `require.main === module` test runner was removed here.
// Once this module is imported by engine.ts, esbuild bundles it into the single
// CLI entry module — where `require.main === module` evaluates TRUE on every CLI
// invocation, so the runner executed and its process.exit() aborted generation.
// The six known-IBAN checks now live in the Phase 4d verification script and move
// into the smoke suite in Phase 6.
