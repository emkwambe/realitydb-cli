// ─── EU VAT formats (Blocker 6) ──────────────────────────────────────────────
// Pure data. Per-country VAT prefix, total length, and a human-readable format
// descriptor. NO checksum logic here — the FR (MOD-97) and IT (Luhn-like)
// check-digit algorithms are code and land in Phase 4e. Lengths include the
// 2-char country prefix. Reproduced from the spec's VAT format table.

export interface VATConfig {
  prefix: string;
  length: number;
  format: string;
}

export const VAT_GENERATORS: Record<string, VATConfig> = {
  DE: { prefix: 'DE', length: 11, format: 'DE + 9 digits' },
  FR: { prefix: 'FR', length: 13, format: 'FR + 2 check chars + 9 digit SIREN' },
  IT: { prefix: 'IT', length: 13, format: 'IT + 11 digits' },
  ES: { prefix: 'ES', length: 11, format: 'ES + 1 letter + 8 digits' },
  NL: { prefix: 'NL', length: 14, format: 'NL + 9 digits + B + 2 check digits' },
  AT: { prefix: 'AT', length: 11, format: 'AT + U + 8 digits' },
  BE: { prefix: 'BE', length: 12, format: 'BE + 10 digits' },
  IE: { prefix: 'IE', length: 10, format: 'IE + 7 digits + 1-2 letters' },
  PL: { prefix: 'PL', length: 12, format: 'PL + 10 digits' },
  SE: { prefix: 'SE', length: 14, format: 'SE + 12 digits' },
};
