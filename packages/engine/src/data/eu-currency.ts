// ─── EU currency map (Blocker 5) ─────────────────────────────────────────────
// Pure data. Country → domestic currency. Eurozone members map to EUR; the six
// non-euro EU members keep their national currency. Self-contained: no imports.
// Coverage: 24 EU countries per EU-SUITABILITY-8-BLOCKERS spec.

export interface CurrencyEntry {
  code: string;
  name: string;
  symbol: string;
}

export const COUNTRY_CURRENCY: Record<string, CurrencyEntry> = {
  // ── Eurozone (EUR) ──
  DE: { code: 'EUR', name: 'Euro', symbol: '€' },
  FR: { code: 'EUR', name: 'Euro', symbol: '€' },
  IT: { code: 'EUR', name: 'Euro', symbol: '€' },
  ES: { code: 'EUR', name: 'Euro', symbol: '€' },
  NL: { code: 'EUR', name: 'Euro', symbol: '€' },
  AT: { code: 'EUR', name: 'Euro', symbol: '€' },
  BE: { code: 'EUR', name: 'Euro', symbol: '€' },
  IE: { code: 'EUR', name: 'Euro', symbol: '€' },
  PT: { code: 'EUR', name: 'Euro', symbol: '€' },
  GR: { code: 'EUR', name: 'Euro', symbol: '€' },
  FI: { code: 'EUR', name: 'Euro', symbol: '€' },
  SK: { code: 'EUR', name: 'Euro', symbol: '€' },
  SI: { code: 'EUR', name: 'Euro', symbol: '€' },
  EE: { code: 'EUR', name: 'Euro', symbol: '€' },
  LV: { code: 'EUR', name: 'Euro', symbol: '€' },
  LT: { code: 'EUR', name: 'Euro', symbol: '€' },
  HR: { code: 'EUR', name: 'Euro', symbol: '€' },
  BG: { code: 'EUR', name: 'Euro', symbol: '€' },
  // ── Non-eurozone EU ──
  CZ: { code: 'CZK', name: 'Czech koruna', symbol: 'Kč' },
  DK: { code: 'DKK', name: 'Danish krone', symbol: 'kr' },
  HU: { code: 'HUF', name: 'Hungarian forint', symbol: 'Ft' },
  PL: { code: 'PLN', name: 'Polish zloty', symbol: 'zł' },
  RO: { code: 'RON', name: 'Romanian leu', symbol: 'lei' },
  SE: { code: 'SEK', name: 'Swedish krona', symbol: 'kr' },
};
