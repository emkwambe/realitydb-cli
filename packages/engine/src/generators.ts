export function generateMockValue(colDef: any, colName?: string, tableName?: string): any {
  if (typeof colDef === 'string') {
    return generateByStrategy(colDef, {}, colName, tableName);
  }
  if (colDef && typeof colDef === 'object') {
    return generateByStrategy(colDef.strategy || 'text', colDef.options || {}, colName, tableName);
  }
  return 'mock_value';
}

// Context-aware name pools for the company_name strategy — routed by table/column
// name below so a single generic strategy doesn't leak restaurant names into
// clinical, industrial, or device contexts.
const CLINICAL_SITE_NAMES = [
  'Memorial Cancer Center', 'University Medical Center',
  'Regional Medical Institute', 'Cancer Research Hospital',
  'Academic Health Center', 'National Oncology Institute',
  'St. Mary Medical Center', 'General Hospital',
  'Presbyterian Medical Center', 'Baptist Health Institute',
  'Mercy Cancer Center', 'Johns Hopkins Affiliate',
  'Stanford Cancer Institute', 'Mayo Clinic Partner Site',
  'Dana-Farber Affiliate', 'MD Anderson Partner',
];
const TRIAL_NAMES = [
  'BEACON-1 Phase III Study', 'HORIZON Randomized Trial',
  'CLARITY Phase II Investigation', 'SUMMIT Efficacy Study',
  'APEX Phase III Trial', 'MERIDIAN Safety Study',
  'PINNACLE Randomized Controlled Trial', 'ATLAS Phase I Study',
  'NEXUS Dose Escalation Study', 'VERTEX Phase III Protocol',
  'CASCADE Biomarker Study', 'FRONTIER Combination Trial',
];
const INDUSTRIAL_COMPANY_NAMES = [
  'Precision Industrial Corp', 'Advanced Manufacturing Ltd',
  'Global Components Inc', 'TechParts International',
  'Industrial Solutions Group', 'Prime Manufacturing Co',
  'Allied Components Corp', 'Strategic Suppliers Inc',
  'Continental Parts Ltd', 'Pacific Manufacturing Group',
  'Atlas Industrial Supply', 'Meridian Components Corp',
  'Apex Manufacturing Solutions', 'Summit Industrial Group',
  'Vector Parts International', 'Nexus Supply Chain Inc',
];
const DRUG_NAMES = [
  'Metformin', 'Lisinopril', 'Atorvastatin', 'Levothyroxine',
  'Amlodipine', 'Omeprazole', 'Losartan', 'Albuterol',
  'Gabapentin', 'Hydrochlorothiazide', 'Sertraline',
  'Montelukast', 'Fluticasone', 'Pantoprazole', 'Escitalopram',
  'Bupropion', 'Trazodone', 'Duloxetine', 'Tamsulosin',
  'Carvedilol', 'Furosemide', 'Warfarin', 'Metoprolol',
  'Prednisone', 'Acetaminophen', 'Ibuprofen', 'Amoxicillin',
];
const PHONE_MODEL_NAMES = [
  'Galaxy S24 Ultra', 'iPhone 15 Pro', 'Pixel 8 Pro',
  'OnePlus 12', 'Galaxy A54', 'iPhone 14', 'Moto G Power',
  'Galaxy S23', 'Pixel 7a', 'iPhone SE', 'Galaxy A34',
  'Redmi Note 13', 'Nothing Phone 2', 'Galaxy Z Fold 5',
  'iPhone 15 Plus', 'Pixel 8', 'Galaxy S24', 'OnePlus Nord',
];

function pickCompanyNamePool(colName?: string, tableName?: string): string[] {
  const t = (tableName || '').toLowerCase();
  const c = (colName || '').toLowerCase();

  if (t.includes('site') && c.includes('name')) return CLINICAL_SITE_NAMES;
  if (t.includes('trial') && c.includes('name')) return TRIAL_NAMES;
  if (t.includes('medication') || c === 'med_name' || c === 'drug_name') return DRUG_NAMES;
  if ((t.includes('supplier') || t.includes('vendor')) && c.includes('name')) return INDUSTRIAL_COMPANY_NAMES;
  if ((t.includes('device') || t.includes('inventory')) && c.includes('model')) return PHONE_MODEL_NAMES;
  if ((t.includes('carrier') || t.includes('manufacturer')) && c.includes('name')) return INDUSTRIAL_COMPANY_NAMES;

  return [
    'Sunrise Bistro', 'Golden Plate', 'Harbor Grill', 'Mountain View Cafe',
    'City Kitchen', 'The Local Table', 'Fresh & Co', 'Oak & Vine',
    'Blue Ocean Sushi', 'Red Pepper Thai', 'Corner Deli', 'The Rustic Fork',
    'Sage & Thyme', 'Firebird Pizza', 'Maple Street Diner', 'Cloud Nine Cafe',
    'The Brass Tap', 'Luna Restaurant', 'Green Leaf Bistro', 'Stone Oven Bakery',
  ];
}

export function generateByStrategy(strategy: string, options: any, colName?: string, tableName?: string): any {
  switch (strategy) {
    case 'uuid':
      return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${randomHex(4)}-${randomHex(12)}`;
    case 'company_name': {
      const companies = pickCompanyNamePool(colName, tableName);
      return companies[Math.floor(Math.random() * companies.length)];
    }
    case 'enum':
      if (options?.values && Array.isArray(options.values)) {
        if (options.weights && Array.isArray(options.weights)) {
          return weightedRandom(options.values, options.weights);
        }
        return options.values[Math.floor(Math.random() * options.values.length)];
      }
      return 'option_a';
    case 'timestamp': {
      const now = Date.now();
      const past = now - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000);
      return new Date(past).toISOString();
    }
    case 'integer':
    case 'int': {
      const min = options?.min ?? 1;
      const max = options?.max ?? 1000;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    case 'float':
    case 'decimal':
    case 'money': {
      const fmin = options?.min ?? 1;
      const fmax = options?.max ?? 999.99;
      const dist = options?.distribution ?? 'uniform';
      let fvalue: number;

      if (dist === 'normal') {
        // Box-Muller transform for Normal sampling
        const u1 = Math.random() || 1e-10; // avoid log(0)
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const mean = options?.mean ?? (fmin + fmax) / 2;
        const stddev = options?.stddev ?? (fmax - fmin) / 6;
        fvalue = mean + stddev * z;
      } else if (dist === 'weibull') {
        // Inverse CDF sampling: x = lambda * (-ln(1 - u))^(1/k)
        const u = Math.random();
        const k = options?.k ?? 1.5;
        const lambda = options?.lambda ?? (fmax - fmin) / 2;
        fvalue = lambda * Math.pow(-Math.log(1 - u), 1 / k);
      } else {
        // Uniform (default, unchanged behavior)
        fvalue = Math.random() * (fmax - fmin) + fmin;
      }

      // Clip to declared range
      fvalue = Math.max(fmin, Math.min(fmax, fvalue));
      return parseFloat(fvalue.toFixed(2));
    }
    case 'boolean':
      return Math.random() > 0.5;
    case 'email': {
      const emailPrefixes = ['alex', 'maria', 'chen', 'fatima', 'omar', 'priya', 'james', 'sarah', 'raj', 'elena'];
      const emailDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me'];
      return `${emailPrefixes[Math.floor(Math.random() * emailPrefixes.length)]}${Math.floor(Math.random() * 9999)}@${emailDomains[Math.floor(Math.random() * emailDomains.length)]}`;
    }
    case 'phone':
      return `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    case 'text':
    case 'string': {
      if (colName && /name/i.test(colName)) {
        const fn = ['James', 'Maria', 'Chen', 'Fatima', 'Alex', 'Priya', 'Omar', 'Sarah'];
        const ln = ['Smith', 'Garcia', 'Wang', 'Johnson', 'Patel', 'Kim', 'Brown', 'Ali'];
        return fn[Math.floor(Math.random() * fn.length)] + ' ' + ln[Math.floor(Math.random() * ln.length)];
      }
      return 'item_' + Math.floor(Math.random() * 10000);
    }
    case 'name':
    case 'full_name': {
      const firstNames = ['James', 'Maria', 'Chen', 'Fatima', 'Alex', 'Priya', 'Omar', 'Sarah'];
      const lastNames = ['Smith', 'Garcia', 'Wang', 'Johnson', 'Patel', 'Kim', 'Brown', 'Ali'];
      return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }
    case 'address':
      return `${Math.floor(Math.random() * 9999)} Main St, City, ST ${Math.floor(10000 + Math.random() * 89999)}`;
    case 'future_date': {
      const future = new Date(Date.now() + Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
      return future.toISOString();
    }
    case 'random_string': {
      const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet', 'kilo', 'lima', 'mike', 'nova', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango'];
      return words[Math.floor(Math.random() * words.length)] + '-' + words[Math.floor(Math.random() * words.length)] + '-' + Math.floor(Math.random() * 10000);
    }
    case 'past_date': {
      const minYears = options?.minYearsAgo ?? 0;
      const maxYears = options?.maxYearsAgo ?? 3;
      const pastNow = Date.now();
      const minMs = minYears * 365.25 * 24 * 60 * 60 * 1000;
      const maxMs = maxYears * 365.25 * 24 * 60 * 60 * 1000;
      const pastTime = pastNow - minMs - Math.floor(Math.random() * (maxMs - minMs || 1));
      return new Date(pastTime).toISOString();
    }
    case 'template': {
  // Read documented option key first (`pattern`), then legacy (`template`).
  const tmplSource = options?.pattern ?? options?.template;
  if (typeof tmplSource !== 'string' || tmplSource.length === 0) {
    // Fail loudly. The smoke test will catch this and the generation will abort.
    throw new Error(
      `template strategy requires options.pattern (string). ` +
      `Got: ${JSON.stringify(options)}`
    );
  }
 
  let tmpl = tmplSource;
 
  const tNames = ['james', 'maria', 'chen', 'fatima', 'alex', 'priya', 'omar', 'sarah', 'raj', 'elena'];
  const tDomains = ['example.dev', 'testmail.com', 'mockdata.io', 'synthetic.net'];
 
  // {{firstName}} — replace ALL occurrences (the old code used .replace which
  // only replaces the first match; multi-token patterns silently broke).
  while (tmpl.includes('{{firstName}}')) {
    tmpl = tmpl.replace('{{firstName}}', tNames[Math.floor(Math.random() * tNames.length)]);
  }
 
  // {{domain}} — replace all
  while (tmpl.includes('{{domain}}')) {
    tmpl = tmpl.replace('{{domain}}', tDomains[Math.floor(Math.random() * tDomains.length)]);
  }
 
  // {{rowIndex}} — replace all. Use threaded row index when available.
  while (tmpl.includes('{{rowIndex}}')) {
    const rowIdx = options?._rowIndex !== undefined
      ? options._rowIndex
      : Math.floor(Math.random() * 99999);
    tmpl = tmpl.replace('{{rowIndex}}', String(rowIdx));
  }
 
  // {{number}} — replace all, respecting options.min and options.max.
  // Schema convention: BR-{{number}} with min=1000, max=9999 produces BR-4521.
  // Each occurrence in a pattern (like fp_{{number}}_{{number}}) gets a fresh roll.
  while (tmpl.includes('{{number}}')) {
    const numMin = typeof options?.min === 'number' ? options.min : 1;
    const numMax = typeof options?.max === 'number' ? options.max : 9999;
    const span = Math.max(1, numMax - numMin);
    const numVal = numMin + Math.floor(Math.random() * (span + 1));
    tmpl = tmpl.replace('{{number}}', String(numVal));
  }
 
  // No silent {{value}} fallback. If a pack still used {{value}}, the literal
  // string remains in the output and the smoke test's val_X_Y check will catch it.
  return tmpl;
}
    case 'street_address': {
      const saStreets = ['Main St', 'Oak Ave', 'Park Blvd', 'Cedar Ln', 'Elm St', 'Maple Dr', 'Pine Rd', 'Lake Way'];
      return Math.floor(100 + Math.random() * 9900) + ' ' + saStreets[Math.floor(Math.random() * saStreets.length)];
    }
    case 'city': {
      const gCities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'London', 'Toronto', 'Berlin', 'Sydney', 'Mumbai', 'Nairobi', 'Lagos'];
      return gCities[Math.floor(Math.random() * gCities.length)];
    }
    case 'state': {
      const gStates = ['NY', 'CA', 'IL', 'TX', 'AZ', 'FL', 'WA', 'CO', 'GA', 'NC', 'ON', 'BC'];
      return gStates[Math.floor(Math.random() * gStates.length)];
    }
    case 'zip_code':
      return String(10000 + Math.floor(Math.random() * 89999));
    case 'ip_address':
      return [10, Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(1 + Math.random() * 254)].join('.');
    case 'number': {
      const nMin = options?.min ?? 1;
      const nMax = options?.max ?? 1000;
      const nPrec = options?.precision;
      const nVal = Math.random() * (nMax - nMin) + nMin;
      return nPrec !== undefined ? parseFloat(nVal.toFixed(nPrec)) : Math.floor(nVal);
    }
    default:
      return `mock_${strategy}_${Math.floor(Math.random() * 1000)}`;
  }
}

export function randomHex(length: number): string {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function weightedRandom(values: any[], weights: number[]): any {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < values.length; i++) {
    random -= weights[i];
    if (random <= 0) return values[i];
  }
  return values[values.length - 1];
}
