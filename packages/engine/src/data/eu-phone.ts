// ─── EU phone patterns (Blocker 9) ───────────────────────────────────────────
// Per-country mobile numbering: dial code + real mobile prefixes + subscriber
// length, so numbers pass libphonenumber-style structural validation.
// subscriberLength = national length − mobilePrefix length (uniform per country).
// Pure data. No engine imports.

export interface PhonePattern {
  countryCode: string;      // E.164 dial code, e.g. "+49"
  mobilePrefixes: string[]; // valid mobile prefixes after the dial code
  subscriberLength: number; // random digits AFTER the mobile prefix
}

export const EU_PHONE_PATTERNS: Record<string, PhonePattern> = {
  DE: { countryCode: '+49',  mobilePrefixes: ['151','152','153','157','159','160','162','163','170','171','172','173','174','175','176','177','178','179'], subscriberLength: 8 }, // total 11
  FR: { countryCode: '+33',  mobilePrefixes: ['6','7'], subscriberLength: 8 },                                   // total 9
  IT: { countryCode: '+39',  mobilePrefixes: ['3'], subscriberLength: 9 },                                       // total 10
  ES: { countryCode: '+34',  mobilePrefixes: ['6','7'], subscriberLength: 8 },                                   // total 9
  NL: { countryCode: '+31',  mobilePrefixes: ['6'], subscriberLength: 8 },                                       // total 9
  AT: { countryCode: '+43',  mobilePrefixes: ['650','660','670','680','690'], subscriberLength: 7 },             // total 10
  BE: { countryCode: '+32',  mobilePrefixes: ['47','48','49'], subscriberLength: 7 },                            // total 9
  IE: { countryCode: '+353', mobilePrefixes: ['83','85','86','87','89'], subscriberLength: 7 },                  // total 9
  PL: { countryCode: '+48',  mobilePrefixes: ['50','51','53','57','60','66','69','72','73','78','79','88'], subscriberLength: 7 }, // total 9
  SE: { countryCode: '+46',  mobilePrefixes: ['70','72','73','76'], subscriberLength: 7 },                       // total 9
};
