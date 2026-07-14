// ─── EU geography (Blocker 3) ────────────────────────────────────────────────
// Pure data. Country → cities (population-weighted), postal/address format,
// phone prefix, timezone, and street-name pool. DE and FR are full (per spec).
// The other eight carry stub city lists (≥3 cities each) so the Phase 4f–4i
// strategies never throw. Stub populations are approximate.

export interface CityEntry {
  name: string;
  postalPrefix: string;
  population: number;
}

export interface CountryGeography {
  cities: CityEntry[];
  postalFormat: string;   // e.g. "DDDDD" = 5 digits
  addressFormat: string;  // token template: {street} {number} {postal} {city}
  phonePrefix: string;    // E.164 prefix, e.g. "+49"
  timezone: string;       // IANA tz, e.g. "Europe/Berlin"
  streetNames: string[];
}

export const EU_GEOGRAPHY: Record<string, CountryGeography> = {
  // ── DE (full — per spec) ──
  DE: {
    cities: [
      { name: 'Berlin', postalPrefix: '10', population: 3669491 },
      { name: 'Hamburg', postalPrefix: '20', population: 1847253 },
      { name: 'Munich', postalPrefix: '80', population: 1488202 },
      { name: 'Cologne', postalPrefix: '50', population: 1087863 },
      { name: 'Frankfurt', postalPrefix: '60', population: 763380 },
      { name: 'Stuttgart', postalPrefix: '70', population: 635911 },
      { name: 'Düsseldorf', postalPrefix: '40', population: 645923 },
      { name: 'Leipzig', postalPrefix: '04', population: 601866 },
      { name: 'Dortmund', postalPrefix: '44', population: 593317 },
      { name: 'Essen', postalPrefix: '45', population: 582415 },
    ],
    postalFormat: 'DDDDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+49',
    timezone: 'Europe/Berlin',
    streetNames: ['Hauptstraße', 'Bahnhofstraße', 'Berliner Straße', 'Goethestraße', 'Schillerstraße'],
  },
  // ── FR (full — per spec) ──
  FR: {
    cities: [
      { name: 'Paris', postalPrefix: '75', population: 2165423 },
      { name: 'Marseille', postalPrefix: '13', population: 873076 },
      { name: 'Lyon', postalPrefix: '69', population: 522250 },
      { name: 'Toulouse', postalPrefix: '31', population: 504078 },
      { name: 'Nice', postalPrefix: '06', population: 340951 },
      { name: 'Nantes', postalPrefix: '44', population: 323204 },
      { name: 'Strasbourg', postalPrefix: '67', population: 290576 },
      { name: 'Montpellier', postalPrefix: '34', population: 299096 },
      { name: 'Bordeaux', postalPrefix: '33', population: 261804 },
      { name: 'Lille', postalPrefix: '59', population: 234475 },
    ],
    postalFormat: 'DDDDD',
    addressFormat: '{number} {street}\n{postal} {city}',
    phonePrefix: '+33',
    timezone: 'Europe/Paris',
    streetNames: ['Rue de la Paix', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain', 'Rue de Rivoli'],
  },
  // ── IT (stub) ──
  IT: {
    cities: [
      { name: 'Rome', postalPrefix: '00', population: 2872800 },
      { name: 'Milan', postalPrefix: '20', population: 1396059 },
      { name: 'Naples', postalPrefix: '80', population: 962003 },
    ],
    postalFormat: 'DDDDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+39',
    timezone: 'Europe/Rome',
    streetNames: ['Via Roma', 'Via Nazionale', 'Corso Vittorio Emanuele', 'Via Garibaldi'],
  },
  // ── ES (stub) ──
  ES: {
    cities: [
      { name: 'Madrid', postalPrefix: '28', population: 3223334 },
      { name: 'Barcelona', postalPrefix: '08', population: 1620343 },
      { name: 'Valencia', postalPrefix: '46', population: 791413 },
    ],
    postalFormat: 'DDDDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+34',
    timezone: 'Europe/Madrid',
    streetNames: ['Calle Mayor', 'Gran Vía', 'Calle de Alcalá', 'Paseo de la Castellana'],
  },
  // ── NL (stub) ──
  NL: {
    cities: [
      { name: 'Amsterdam', postalPrefix: '10', population: 872680 },
      { name: 'Rotterdam', postalPrefix: '30', population: 651446 },
      { name: 'The Hague', postalPrefix: '25', population: 545838 },
    ],
    postalFormat: 'DDDD LL',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+31',
    timezone: 'Europe/Amsterdam',
    streetNames: ['Damrak', 'Kalverstraat', 'Prinsengracht', 'Herengracht'],
  },
  // ── AT (stub) ──
  AT: {
    cities: [
      { name: 'Vienna', postalPrefix: '10', population: 1911191 },
      { name: 'Graz', postalPrefix: '80', population: 291134 },
      { name: 'Linz', postalPrefix: '40', population: 206595 },
    ],
    postalFormat: 'DDDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+43',
    timezone: 'Europe/Vienna',
    streetNames: ['Mariahilfer Straße', 'Kärntner Straße', 'Ringstraße', 'Graben'],
  },
  // ── BE (stub) ──
  BE: {
    cities: [
      { name: 'Brussels', postalPrefix: '10', population: 1211035 },
      { name: 'Antwerp', postalPrefix: '20', population: 529247 },
      { name: 'Ghent', postalPrefix: '90', population: 262219 },
    ],
    postalFormat: 'DDDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+32',
    timezone: 'Europe/Brussels',
    streetNames: ['Rue Neuve', 'Avenue Louise', 'Meir', 'Chaussée de Waterloo'],
  },
  // ── IE (stub) ──
  IE: {
    cities: [
      { name: 'Dublin', postalPrefix: 'D0', population: 1173179 },
      { name: 'Cork', postalPrefix: 'T1', population: 210000 },
      { name: 'Limerick', postalPrefix: 'V9', population: 94192 },
    ],
    postalFormat: 'LLL LLLL',
    addressFormat: '{number} {street}\n{city} {postal}',
    phonePrefix: '+353',
    timezone: 'Europe/Dublin',
    streetNames: ["O'Connell Street", 'Grafton Street', 'Henry Street', 'Dame Street'],
  },
  // ── PL (stub) ──
  PL: {
    cities: [
      { name: 'Warsaw', postalPrefix: '00', population: 1790658 },
      { name: 'Kraków', postalPrefix: '30', population: 779115 },
      { name: 'Łódź', postalPrefix: '90', population: 677286 },
    ],
    postalFormat: 'DD-DDD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+48',
    timezone: 'Europe/Warsaw',
    streetNames: ['Marszałkowska', 'Nowy Świat', 'Aleje Jerozolimskie', 'Floriańska'],
  },
  // ── SE (stub) ──
  SE: {
    cities: [
      { name: 'Stockholm', postalPrefix: '11', population: 975551 },
      { name: 'Gothenburg', postalPrefix: '40', population: 583056 },
      { name: 'Malmö', postalPrefix: '20', population: 347949 },
    ],
    postalFormat: 'DDD DD',
    addressFormat: '{street} {number}\n{postal} {city}',
    phonePrefix: '+46',
    timezone: 'Europe/Stockholm',
    streetNames: ['Drottninggatan', 'Kungsgatan', 'Sveavägen', 'Götgatan'],
  },
};
