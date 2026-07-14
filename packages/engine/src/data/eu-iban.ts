// ─── EU IBAN configs (Blocker 1) ─────────────────────────────────────────────
// Pure data. Per-country IBAN length + realistic bank codes. Check digits are
// computed at generation time in Phase 4d via iban-utils.ts (MOD-97). This file
// carries no logic. Bank codes reproduced exactly from the spec.

export interface IBANConfig {
  countryCode: string;
  length: number;
  bankCodes: string[];
}

export const EU_IBAN_CONFIGS: Record<string, IBANConfig> = {
  DE: { countryCode: 'DE', length: 22, bankCodes: ['37040044', '50010517', '70020270', '10020890'] },
  FR: { countryCode: 'FR', length: 27, bankCodes: ['20041', '30003', '10268'] },
  IT: { countryCode: 'IT', length: 27, bankCodes: ['X05428', 'Y02008', 'Z03002'] },
  ES: { countryCode: 'ES', length: 24, bankCodes: ['2100', '0049', '0075'] },
  NL: { countryCode: 'NL', length: 18, bankCodes: ['ABNA', 'INGB', 'RABO'] },
  AT: { countryCode: 'AT', length: 20, bankCodes: ['19043', '20111', '12000'] },
  BE: { countryCode: 'BE', length: 16, bankCodes: ['539', '310', '733'] },
  IE: { countryCode: 'IE', length: 22, bankCodes: ['AIBK', 'BOFI', 'BSCH'] },
  PL: { countryCode: 'PL', length: 28, bankCodes: ['10901014', '11402010', '10201010'] },
  SE: { countryCode: 'SE', length: 24, bankCodes: ['500', '600', '800'] },
};
