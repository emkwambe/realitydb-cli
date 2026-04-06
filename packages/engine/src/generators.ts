export function generateMockValue(colDef: any, colName?: string): any {
  if (typeof colDef === 'string') {
    return generateByStrategy(colDef, {}, colName);
  }
  if (colDef && typeof colDef === 'object') {
    return generateByStrategy(colDef.strategy || 'text', colDef.options || {}, colName);
  }
  return 'mock_value';
}

export function generateByStrategy(strategy: string, options: any, colName?: string): any {
  switch (strategy) {
    case 'uuid':
      return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${randomHex(4)}-${randomHex(12)}`;
    case 'company_name': {
      const companies = [
        'Sunrise Bistro', 'Golden Plate', 'Harbor Grill', 'Mountain View Cafe',
        'City Kitchen', 'The Local Table', 'Fresh & Co', 'Oak & Vine',
        'Blue Ocean Sushi', 'Red Pepper Thai', 'Corner Deli', 'The Rustic Fork',
        'Sage & Thyme', 'Firebird Pizza', 'Maple Street Diner', 'Cloud Nine Cafe',
        'The Brass Tap', 'Luna Restaurant', 'Green Leaf Bistro', 'Stone Oven Bakery',
      ];
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
      return parseFloat((Math.random() * (fmax - fmin) + fmin).toFixed(2));
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
    case 'string':
      return `sample_text_${Math.floor(Math.random() * 10000)}`;
    case 'name':
    case 'full_name': {
      const firstNames = ['James', 'Maria', 'Chen', 'Fatima', 'Alex', 'Priya', 'Omar', 'Sarah'];
      const lastNames = ['Smith', 'Garcia', 'Wang', 'Johnson', 'Patel', 'Kim', 'Brown', 'Ali'];
      return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }
    case 'address':
      return `${Math.floor(Math.random() * 9999)} Main St, City, ST ${Math.floor(10000 + Math.random() * 89999)}`;
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
