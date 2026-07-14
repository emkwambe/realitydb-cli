// ─── EU BIC/SWIFT banks (Blocker 10) ─────────────────────────────────────────
// ISO 9362: bankCode(4) + countryCode(2) + locationCode(2) = 8-char BIC.
// Real institutions per country. Feedback supplied DE+FR only (and with a
// malformed 'DRESDEFF'/'DZ Bank' entry — corrected here); IT/ES/NL/AT/BE/IE/PL/SE
// authored from well-known banks. Every entry is exactly 4+2+2. No engine imports.

export interface BICEntry {
  bankCode: string;     // 4 chars, e.g. "DEUT"
  countryCode: string;  // 2 chars, e.g. "DE"
  locationCode: string; // 2 chars, e.g. "FF"
  bankName: string;
}

export const EU_BIC_BANKS: Record<string, BICEntry[]> = {
  DE: [
    { bankCode: 'DEUT', countryCode: 'DE', locationCode: 'FF', bankName: 'Deutsche Bank' },
    { bankCode: 'COBA', countryCode: 'DE', locationCode: 'FF', bankName: 'Commerzbank' },
    { bankCode: 'HYVE', countryCode: 'DE', locationCode: 'MM', bankName: 'UniCredit Bank (HypoVereinsbank)' },
    { bankCode: 'DRES', countryCode: 'DE', locationCode: 'FF', bankName: 'Dresdner (Commerzbank heritage)' },
    { bankCode: 'GENO', countryCode: 'DE', locationCode: 'FF', bankName: 'DZ Bank' },
    { bankCode: 'PBNK', countryCode: 'DE', locationCode: 'FF', bankName: 'Postbank' },
  ],
  FR: [
    { bankCode: 'SOGE', countryCode: 'FR', locationCode: 'PP', bankName: 'Société Générale' },
    { bankCode: 'BNPA', countryCode: 'FR', locationCode: 'PP', bankName: 'BNP Paribas' },
    { bankCode: 'CRLY', countryCode: 'FR', locationCode: 'PP', bankName: 'LCL (Crédit Lyonnais)' },
    { bankCode: 'AGRI', countryCode: 'FR', locationCode: 'PP', bankName: 'Crédit Agricole' },
    { bankCode: 'PSST', countryCode: 'FR', locationCode: 'PP', bankName: 'La Banque Postale' },
  ],
  IT: [
    { bankCode: 'UNCR', countryCode: 'IT', locationCode: 'MM', bankName: 'UniCredit' },
    { bankCode: 'BCIT', countryCode: 'IT', locationCode: 'MM', bankName: 'Intesa Sanpaolo' },
    { bankCode: 'BPMO', countryCode: 'IT', locationCode: 'MM', bankName: 'Banco BPM' },
    { bankCode: 'BNLI', countryCode: 'IT', locationCode: 'RR', bankName: 'BNL (BNP Paribas)' },
  ],
  ES: [
    { bankCode: 'BBVA', countryCode: 'ES', locationCode: 'MM', bankName: 'BBVA' },
    { bankCode: 'CAIX', countryCode: 'ES', locationCode: 'BB', bankName: 'CaixaBank' },
    { bankCode: 'BSCH', countryCode: 'ES', locationCode: 'MM', bankName: 'Banco Santander' },
    { bankCode: 'BSAB', countryCode: 'ES', locationCode: 'BB', bankName: 'Banco Sabadell' },
  ],
  NL: [
    { bankCode: 'ABNA', countryCode: 'NL', locationCode: '2A', bankName: 'ABN AMRO' },
    { bankCode: 'INGB', countryCode: 'NL', locationCode: '2A', bankName: 'ING' },
    { bankCode: 'RABO', countryCode: 'NL', locationCode: '2U', bankName: 'Rabobank' },
    { bankCode: 'SNSB', countryCode: 'NL', locationCode: '2A', bankName: 'SNS Bank' },
  ],
  AT: [
    { bankCode: 'BKAU', countryCode: 'AT', locationCode: 'WW', bankName: 'UniCredit Bank Austria' },
    { bankCode: 'GIBA', countryCode: 'AT', locationCode: 'WW', bankName: 'Erste/Sparkasse' },
    { bankCode: 'RZBA', countryCode: 'AT', locationCode: 'WW', bankName: 'Raiffeisen' },
    { bankCode: 'BAWA', countryCode: 'AT', locationCode: 'WW', bankName: 'BAWAG' },
  ],
  BE: [
    { bankCode: 'GEBA', countryCode: 'BE', locationCode: 'BB', bankName: 'BNP Paribas Fortis' },
    { bankCode: 'GKCC', countryCode: 'BE', locationCode: 'BB', bankName: 'Belfius' },
    { bankCode: 'BBRU', countryCode: 'BE', locationCode: 'BB', bankName: 'ING Belgium' },
    { bankCode: 'KRED', countryCode: 'BE', locationCode: 'BB', bankName: 'KBC' },
  ],
  IE: [
    { bankCode: 'BOFI', countryCode: 'IE', locationCode: '2D', bankName: 'Bank of Ireland' },
    { bankCode: 'AIBK', countryCode: 'IE', locationCode: '2D', bankName: 'AIB' },
    { bankCode: 'IPBS', countryCode: 'IE', locationCode: '2D', bankName: 'Permanent TSB' },
  ],
  PL: [
    { bankCode: 'BPKO', countryCode: 'PL', locationCode: 'PW', bankName: 'PKO Bank Polski' },
    { bankCode: 'BREX', countryCode: 'PL', locationCode: 'PW', bankName: 'mBank' },
    { bankCode: 'WBKP', countryCode: 'PL', locationCode: 'PP', bankName: 'Santander Bank Polska' },
    { bankCode: 'INGB', countryCode: 'PL', locationCode: 'PW', bankName: 'ING Bank Śląski' },
  ],
  SE: [
    { bankCode: 'NDEA', countryCode: 'SE', locationCode: 'SS', bankName: 'Nordea' },
    { bankCode: 'ESSE', countryCode: 'SE', locationCode: 'SS', bankName: 'SEB' },
    { bankCode: 'HAND', countryCode: 'SE', locationCode: 'SS', bankName: 'Handelsbanken' },
    { bankCode: 'SWED', countryCode: 'SE', locationCode: 'SS', bankName: 'Swedbank' },
  ],
};
