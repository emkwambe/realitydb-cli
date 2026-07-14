import type { NormalizedTable, GenerationResult } from './types';
import { generateMockValue, createRng, deriveBaseEpoch, weightedRandom } from './generators';
import { COUNTRY_CURRENCY } from './data/eu-currency'; // Phase 4a: currency strategy (also keeps eu-currency.ts in the bundle)
import { EU_NAME_POOLS } from './data/eu-names';       // Phase 4b: name_first / name_last
import { EU_IBAN_CONFIGS } from './data/eu-iban';      // Phase 4d: iban
import { computeIBANCheckDigits, validateIBAN } from './iban-utils';
import { VAT_STRATEGY_GENERATORS } from './vat-generators'; // Phase 4e: vat
import { EU_GEOGRAPHY } from './data/eu-geography';          // Phase 4f–4i: city_eu / postal_code / address_eu / phone_eu
import { EU_FINANCIAL_DISTRIBUTIONS, DistributionParams } from './data/eu-financial'; // Phase 4j: calibrated
import { EU_PHONE_PATTERNS } from './data/eu-phone';         // Sprint 2 (Blocker 9): phone_eu structural validity
import { EU_BIC_BANKS } from './data/eu-bic';                // Sprint 2 (Blocker 10): bic
import { EU_EMAIL_DOMAINS } from './data/eu-domains';        // Sprint 2 (Blocker 11): email_eu
import { generateBusinessDate, EU_TIMEZONES } from './data/eu-timezones'; // Sprint 6 (Blocker 7): business_date

export function topologicalSort(tables: NormalizedTable[]): NormalizedTable[] {
  const tableMap = new Map(tables.map(t => [t.name, t]));
  const visited = new Set<string>();
  const result: NormalizedTable[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);
    const table = tableMap.get(name);
    if (!table) return;
    for (const fk of table.foreignKeys) {
      if (tableMap.has(fk.references.table)) {
        visit(fk.references.table);
      }
    }
    result.push(table);
  }

  for (const table of tables) {
    visit(table.name);
  }

  return result;
}


// --- Variable Cardinality Support ---

function samplePoisson(lambda: number, rng: () => number = Math.random): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  } else {
    const u = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
}

function sampleCardinality(config: any, rng: () => number = Math.random): number {
  if (!config || !config.strategy) return 1;
  let count: number;
  switch (config.strategy) {
    case 'fixed':
      count = config.mean || 1;
      break;
    case 'poisson':
      count = samplePoisson(config.mean || 1, rng);
      break;
    case 'uniform':
      count = Math.floor(rng() * ((config.max || 3) - (config.min || 1) + 1)) + (config.min || 1);
      break;
    default:
      count = 1;
  }
  if (config.min !== undefined) count = Math.max(count, config.min);
  if (config.max !== undefined) count = Math.min(count, config.max);
  return Math.max(0, Math.round(count));
}

// Build cardinality lookup from pack relationships
export function buildCardinalityMap(pack: any): Record<string, any> {
  const map: Record<string, any> = {};
  const rels = pack?.relationships || [];
  const tablesRaw = pack?.tables || {};

  // Normalize to array form. Two pack formats are supported:
  //   - dict format: tables.customers = {...}  (oncology-style, most marketplace packs)
  //   - array format: tables[0] = { name: 'customers', ... }  (banking-style, scan exports)
  const tables: any[] = Array.isArray(tablesRaw)
    ? tablesRaw
    : Object.entries(tablesRaw).map(([name, def]) => ({ name, ...(def as any) }));

  // Build ID → name lookup for scan-format packs (tbl-01 → table_name)
  const idToName: Record<string, string> = {};
  for (const t of tables) {
    if (t.id && t.name) {
      idToName[t.id] = t.name;
    }
  }

  for (const rel of rels) {
    if (!rel.cardinality) continue;

    // Resolve target table name from either format
    let targetName = rel.targetTable || rel.child;
    if (!targetName && rel.targetTableId) {
      targetName = idToName[rel.targetTableId];
    }

    if (targetName) {
      // If multiple relationships point to same table, keep the one with highest mean
      if (!map[targetName] || (rel.cardinality.mean || 1) > (map[targetName].mean || 1)) {
        map[targetName] = rel.cardinality;
      }
    }
  }
  return map;
}

export function distributeRows(ordered: NormalizedTable[], totalRows: number): Record<string, number> {
  const rowsPerTable: Record<string, number> = {};
  const rootCount = ordered.filter(t => t.foreignKeys.length === 0).length;
  const childCount = ordered.length - rootCount;
  const totalWeight = rootCount * 2 + childCount;

  for (const t of ordered) {
    const weight = t.foreignKeys.length === 0 ? 2 : 1;
    rowsPerTable[t.name] = Math.ceil((totalRows * weight) / totalWeight);
  }

  // Scale to hit exact target
  const totalPlanned = Object.values(rowsPerTable).reduce((a, b) => a + b, 0);
  const scale = totalRows / totalPlanned;
  for (const name of Object.keys(rowsPerTable)) {
    rowsPerTable[name] = Math.max(1, Math.round(rowsPerTable[name] * scale));
  }

  return rowsPerTable;
}



// Variable cardinality distribution — uses pack relationship configs
export function distributeRowsVariable(
  ordered: NormalizedTable[],
  totalRows: number,
  pack: any
): Record<string, number> {
  const cardMap = buildCardinalityMap(pack);
  const hasAnyCardinality = Object.keys(cardMap).length > 0;
  
  if (!hasAnyCardinality) {
    return distributeRows(ordered, totalRows);
  }
  
  const rowsPerTable: Record<string, number> = {};
  
  const rootTables = ordered.filter(t => t.foreignKeys.length === 0);
  const childTables = ordered.filter(t => t.foreignKeys.length > 0);
  const rootCount = rootTables.length || 1;
  
  // Step 1: Give roots a fair share — at least totalRows / (tables * 0.5)
  const rootRowsEach = Math.max(10, Math.ceil(totalRows / (ordered.length * 2)));
  
  for (const t of rootTables) {
    rowsPerTable[t.name] = rootRowsEach;
  }
  
  // Step 2: For each child, compute rows from cardinality relative to its PRIMARY parent
  for (const t of childTables) {
    const config = cardMap[t.name];
    if (config) {
      const parentName = t.foreignKeys[0]?.references?.table;
      const parentRows = rowsPerTable[parentName] || rootRowsEach;
      const mean = config.mean || 1;
      // Cap the mean to prevent explosion (max 20x parent)
      const cappedMean = Math.min(mean, 20);
      const estimatedChildRows = Math.round(parentRows * cappedMean);
      rowsPerTable[t.name] = Math.max(1, estimatedChildRows);
    } else {
      // No cardinality — default to same as parent
      const parentName = t.foreignKeys[0]?.references?.table;
      const parentRows = rowsPerTable[parentName] || rootRowsEach;
      rowsPerTable[t.name] = Math.max(1, parentRows);
    }
  }
  
  // Step 3: Scale to hit target total while preserving relative proportions
  const totalPlanned = Object.values(rowsPerTable).reduce((a, b) => a + b, 0);
  if (totalPlanned > 0 && totalPlanned !== totalRows) {
    const scale = totalRows / totalPlanned;
    for (const name of Object.keys(rowsPerTable)) {
      rowsPerTable[name] = Math.max(1, Math.round(rowsPerTable[name] * scale));
    }
  }
  
  // Step 4 (removed in v2.39.0): The 40% per-table cap was clamping declared cardinality
  // to ~1:2:2 ratios regardless of pack declarations, defeating variable cardinality.
  // Step 2's per-relationship 20x mean cap remains as protection against runaway declarations.
  
  return rowsPerTable;
}

export function generateData(
  ordered: NormalizedTable[],
  rowsPerTable: Record<string, number>,
  pack: any,
  seed?: number,
): GenerationResult {
  const startTime = Date.now();
  // Single shared seeded stream for the whole generation; undefined seed → Math.random.
  const rng = createRng(seed);
  const baseEpoch = deriveBaseEpoch(seed);
  const generatedIds: Record<string, any[]> = {};
  const allData: Record<string, any[]> = {};

  for (const table of ordered) {
    const tableRows = rowsPerTable[table.name];
    const tableData: any[] = [];
    const ids: any[] = [];

    // Cascade setup (Decision 5). If this child table declares cascade_columns,
    // build a parent-id → parent-row lookup ONCE. Parents precede children in the
    // topological `ordered`, so allData[from] is fully populated — and already
    // carries its OWN cascaded values, which is what makes multi-level propagation
    // (customer → account → transaction) work automatically.
    const cascade = (table as any).cascade_columns as
      { from: string; via: string; columns: string[] } | undefined;
    const cascadeSet = new Set<string>(cascade?.columns ?? []);
    let cascadeParentMap: Map<any, any> | null = null;
    if (cascade && Array.isArray(allData[cascade.from])) {
      cascadeParentMap = new Map();
      for (const p of allData[cascade.from]) cascadeParentMap.set(p.id, p);
    }

    for (let i = 0; i < tableRows; i++) {
      const row: Record<string, any> = {};
      const activeLifecycleNulls: string[] = [];

      // First pass: generate enum values to determine lifecycle nulls
      for (const [colName, colDef] of Object.entries(table.columns)) {
        const def = colDef as any;
        if (def?.strategy === 'enum' && def?.options?.lifecycleRules) {
          const enumValue = generateMockValue(def, colName, table.name, rng, baseEpoch);
          row[colName] = enumValue;
          for (const rule of def.options.lifecycleRules) {
            if (rule.value === enumValue && rule.nullFields) {
              activeLifecycleNulls.push(...rule.nullFields);
            }
          }
        }
      }

      // Second pass: generate all other columns
      for (const [colName, colDef] of Object.entries(table.columns)) {
        const def = colDef as any;

        // Skip if already generated (enum with lifecycle)
        if (row[colName] !== undefined) continue;

        // Apply lifecycle null rules
        if (activeLifecycleNulls.includes(colName)) {
          row[colName] = null;
          continue;
        }

        // Foreign key resolution
        if (def?.foreignKey) {
          const refTable = def.foreignKey.table;
          const refIds = generatedIds[refTable];
          if (refIds && refIds.length > 0) {
            row[colName] = refIds[Math.floor(rng() * refIds.length)];
          } else {
            row[colName] = generateMockValue(def, colName, table.name, rng, baseEpoch);
          }
        } else if (
          (def?.options?.dependsOn && def?.options?.dependencyRule === 'after') ||
          def?.strategy === 'dependent_enum' ||
          def?.strategy === 'dependent_email' ||
          def?.options?.country_source !== undefined ||  // EU row-dependent strategies → Pass 3
          cascadeSet.has(colName)                         // value comes from the cascade step below
        ) {
          // Skip — handled in third pass after all other columns have values
          continue;
        } else {
          row[colName] = generateMockValue(def, colName, table.name, rng, baseEpoch);
        }

        // Track IDs for foreign key lookups.
        // A column is treated as a PK if any of:
        //   - it's literally named 'id' (most common)
        //   - the table declares it via primaryKey/isPrimaryKey
        //   - the column is uuid-strategy and isn't an FK reference (typical for scanned packs
        //     where the table-level PK isn't a separately-tracked field but the first uuid col is)
        const tablePK = (table as any).primaryKey;
        const isPK =
          colName === 'id' ||
          (colDef as any)?.isPK === true ||
          (colDef as any)?.isPrimaryKey === true ||
          (typeof tablePK === 'string' && tablePK === colName) ||
          (Array.isArray(tablePK) && tablePK.includes(colName));
        if (isPK && row[colName] != null) {
          ids.push(row[colName]);
        }
      }

      // CASCADE COLUMNS — Decision 5 (reopened Decision 2)
      // Copies parent column values into child rows at the
      // 2→3 boundary. Zero rng() draws — determinism-neutral.
      // Gated on table.cascade_columns declaration in pack JSON.
      // Parent key assumption: parent table PK must be named 'id'.
      // To generalize: key on foreignKey.references.column instead.
      // Packs that don't declare cascade_columns are unaffected.
      // Fallback: missing parent row or missing parent column leaves
      // the child column untouched — never overwritten with undefined.
      if (cascade && cascadeParentMap) {
        const parent = cascadeParentMap.get(row[cascade.via]);
        if (parent) {
          for (const col of cascade.columns) {
            if (parent[col] !== undefined) row[col] = parent[col];
          }
        }
      }

      // Third pass: dependent columns — dependent_enum / dependent_email, then temporal ordering
      for (const [colName, colDef] of Object.entries(table.columns)) {
        const def = colDef as any;
        if (row[colName] !== undefined) continue; // already generated or nullified

        // EU row-dependent strategies (Blockers 1–8). All sibling columns already
        // hold values by Pass 3, so we resolve country_source (and city_source /
        // gender_source / postal_source) here. Gated on options.country_source — no
        // existing pack sets it, so this branch is inert until Phase 5 wires
        // eu-banking. Unimplemented strategies return undefined and fall back to the
        // current generateMockValue behavior.
        //
        // COLUMN ORDERING REQUIREMENT (geographic chain): Pass 3 iterates columns
        // in JSON key order and mutates `row` in place, so a strategy can only read
        // a sibling that appears EARLIER in the table's column list. Packs MUST
        // declare: country_code → city → postal_code → address (and phone anywhere
        // after country_code). postal_code reads city; address reads city + postal.
        // Out-of-order declaration yields empty upstream values, not an error.
        if (def?.options?.country_source !== undefined) {
          if (activeLifecycleNulls.includes(colName)) { row[colName] = null; continue; }
          const country = row[def.options.country_source];
          const value = generateRowDependentValue(
            def.strategy, def.options, row, country, colName, table.name, rng, baseEpoch,
          );
          row[colName] = value !== undefined
            ? value
            : generateMockValue(def, colName, table.name, rng, baseEpoch);
          continue;
        }

        // dependent_enum — value drawn from a map keyed on a sibling column's value
        if (def?.strategy === 'dependent_enum') {
          if (activeLifecycleNulls.includes(colName)) { row[colName] = null; continue; }
          const parentValue = row[def.options?.dependsOn];
          const map = (def.options?.map || {}) as Record<string, any[]>;
          const pool = map[parentValue] ?? map['default'] ?? Object.values(map)[0] ?? ['unknown'];
          const wmap = def.options?.weights;
          const weights = wmap && wmap[parentValue] ? wmap[parentValue] : null;
          row[colName] = (weights && weights.length === pool.length)
            ? weightedRandom(pool, weights, rng)
            : pool[Math.floor(rng() * pool.length)];
          continue;
        }

        // dependent_email — derived from a sibling name column (no name-prefix contradiction)
        if (def?.strategy === 'dependent_email') {
          if (activeLifecycleNulls.includes(colName)) { row[colName] = null; continue; }
          const nameValue = row[def.options?.derivesFrom] ?? '';
          const parts = nameValue.toString().toLowerCase().split(' ');
          const prefix = (parts[0] ?? 'user').replace(/[^a-z]/g, '') || 'user';
          const num = Math.floor(rng() * 9000) + 1000;
          const domains = def.options?.domains ?? ['gmail.com', 'yahoo.com', 'hotmail.com', 'proton.me', 'outlook.com'];
          const domain = domains[Math.floor(rng() * domains.length)];
          row[colName] = `${prefix}${num}@${domain}`;
          continue;
        }

        if (def?.options?.dependsOn && def?.options?.dependencyRule === 'after') {
          if (activeLifecycleNulls.includes(colName)) {
            row[colName] = null;
            continue;
          }
          const depValue = row[def.options.dependsOn];
          if (depValue) {
            const depTime = new Date(depValue).getTime();
            const offsetDays = (def?.options?.offsetMin || 1);
            const maxDays = (def?.options?.offsetMax || 30);
            const offset = (offsetDays + Math.floor(rng() * (maxDays - offsetDays))) * 24 * 60 * 60 * 1000;
            row[colName] = new Date(depTime + offset).toISOString();
          } else {
            row[colName] = def?.nullable ? null : generateMockValue(def, colName, table.name, rng, baseEpoch);
          }
        }
      }

      tableData.push(row);
    }

    generatedIds[table.name] = ids;
    allData[table.name] = tableData;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  const actualTotal = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);

  return { allData, actualTotal, elapsed };
}

// Weighted pick over a pool of { weight } items, using the shared seeded rng.
// Consumes exactly one rng() draw so determinism is stable per selection.
function selectWeighted<T extends { weight: number }>(
  pool: T[],
  rng: () => number,
): T {
  const total = pool.reduce((s, i) => s + i.weight, 0);
  let threshold = rng() * total;
  for (const item of pool) {
    threshold -= item.weight;
    if (threshold <= 0) return item;
  }
  return pool[pool.length - 1];
}

// Strips diacritics and non-letters for email local parts (é→e, ü→u; ł dropped).
function stripDiacritics(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

// Normalizes assorted gender spellings to 'M' | 'F'; undefined if unrecognized.
function normalizeGender(v: any): 'M' | 'F' | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === 'm' || s === 'male') return 'M';
  if (s === 'f' || s === 'female') return 'F';
  return undefined;
}

// Standard-normal sample via Box-Muller. DETERMINISM: consumes EXACTLY 2 rng()
// draws per call, so callers advance the stream by a fixed, predictable amount.
function boxMuller(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  const safe_u1 = u1 < 1e-10 ? 1e-10 : u1; // guard log(0)
  return Math.sqrt(-2 * Math.log(safe_u1)) * Math.cos(2 * Math.PI * u2);
}

// Lognormal sample from the target distribution's mean/stddev (method of moments
// for the underlying normal). DETERMINISM: consumes EXACTLY 2 rng() draws (via
// one boxMuller call).
function sampleLognormal(mean: number, stddev: number, rng: () => number): number {
  const cv2 = (stddev / mean) ** 2;
  const mu = Math.log(mean) - 0.5 * Math.log(1 + cv2);
  const sigma = Math.sqrt(Math.log(1 + cv2));
  return Math.exp(mu + sigma * boxMuller(rng));
}

// Gamma sample via sum of `shape` exponentials (integer shape, method of moments).
// DETERMINISM: consumes EXACTLY `shape` rng() draws, where shape is fixed by the
// (mean, stddev) pair — so the draw count is constant per metric/country.
function sampleGamma(mean: number, stddev: number, rng: () => number): number {
  const shape = Math.max(1, Math.round((mean / stddev) ** 2));
  const scale = (stddev ** 2) / mean;
  let value = 0;
  for (let i = 0; i < shape; i++) {
    const u = rng();
    const safe_u = u < 1e-10 ? 1e-10 : u;
    value += -scale * Math.log(safe_u);
  }
  return value;
}

// Pass-3 dispatcher for EU row-dependent strategies (Decision 1).
// Phase 1: scaffold only. Returns undefined for every strategy so the caller
// falls back to existing generateMockValue behavior. Country-specific DATA is
// imported from src/data/* starting in Phase 3; no country literals live here.
// Handlers added in Phase 4: currency, name_first, name_last, iban, vat,
// city_eu, postal_code, address_eu, phone_eu, calibrated.
function generateRowDependentValue(
  strategy: string,
  options: any,
  row: Record<string, any>,
  country: any,
  colName: string | undefined,
  tableName: string | undefined,
  rng: () => number,
  baseEpoch?: number,
): any {
  switch (strategy) {
    // ── 4a: currency (Blocker 5) ──
    // Domestic currency for row's country; EUR fallback for unknown countries.
    // Optional transaction_type_source drives SEPA/cross-border behavior.
    case 'currency': {
      const entry = COUNTRY_CURRENCY[country];
      const domestic = entry ? entry.code : 'EUR';
      const ttSource = options?.transaction_type_source;
      if (ttSource !== undefined) {
        const tt = row[ttSource];
        if (tt === 'domestic') return domestic;
        if (tt === 'sepa') return 'EUR';                    // SEPA is EUR-only
        if (tt === 'cross_border') return rng() < 0.7 ? domestic : 'EUR';
      }
      return domestic;
    }
    // ── 4b: name_first (Blockers 2 + 4) ──
    // Country + optional gender dual-key. Gender filters the pool when
    // recognized; otherwise the full (both-gender) pool is used. Unknown country
    // falls back to a unisex pool so it never throws.
    case 'name_first': {
      const pool = EU_NAME_POOLS[country];
      if (!pool) {
        const fallback = ['Alex', 'Sam', 'Chris'].map((name) => ({ name, weight: 1 }));
        return selectWeighted(fallback, rng).name;
      }
      const g = options?.gender_source !== undefined
        ? normalizeGender(row[options.gender_source])
        : undefined;
      let candidates = pool.firstNames;
      if (g === 'M' || g === 'F') {
        const filtered = pool.firstNames.filter((n) => n.gender === g);
        if (filtered.length > 0) candidates = filtered;
      }
      return selectWeighted(candidates, rng).name;
    }
    // ── 4b: name_last (Blocker 2) ──
    // Country-keyed surname, weighted. Unknown country falls back to a generic pool.
    case 'name_last': {
      const pool = EU_NAME_POOLS[country];
      if (!pool || !pool.lastNames || pool.lastNames.length === 0) {
        const fallback = ['Smith', 'Jones', 'Brown'].map((name) => ({ name, weight: 1 }));
        return selectWeighted(fallback, rng).name;
      }
      return selectWeighted(pool.lastNames, rng).name;
    }
    // ── 4d: iban (Blocker 1) ──
    // Structurally valid IBAN (ISO 13616 + MOD-97). Bank code (may contain
    // letters) from config; numeric account suffix fills to exact length; check
    // digits computed via iban-utils. Self-validates and throws loudly on any
    // miss (this guard relocates to the test suite in Phase 6).
    case 'iban': {
      const config = EU_IBAN_CONFIGS[country];
      if (!config) return 'UNKNOWN_IBAN_' + country;

      const bankCode = config.bankCodes[Math.floor(rng() * config.bankCodes.length)];
      const accountLength = config.length - 4 - bankCode.length;
      let account = '';
      for (let i = 0; i < accountLength; i++) account += Math.floor(rng() * 10);

      const bban = bankCode + account;
      const checkDigits = computeIBANCheckDigits(country, bban);
      const iban = country + checkDigits + bban;

      if (!validateIBAN(iban)) {
        throw new Error(`Generated invalid IBAN: ${iban} country=${country} bban=${bban}`);
      }
      return iban;
    }
    // ── 4e: vat (Blocker 6) ──
    // Country-specific VAT number. Empty string for unknown countries — not all
    // entities have a VAT number (nullable by design).
    case 'vat': {
      const gen = VAT_STRATEGY_GENERATORS[country];
      return gen ? gen(rng) : '';
    }
    // ── 4f: city_eu (Blocker 3) ──
    // Population-weighted city for the row's country. Returns the name only; the
    // city entry is re-resolved by name in postal_code/address_eu (see note: we
    // do NOT stash a hidden key on `row`, because output columns are derived from
    // row keys and any extra key would leak into every generated table).
    case 'city_eu': {
      const geo = EU_GEOGRAPHY[country];
      if (!geo || geo.cities.length === 0) return 'Unknown City';
      const weighted = geo.cities.map((c) => ({ ...c, weight: c.population }));
      return selectWeighted(weighted, rng).name;
    }
    // ── 4g: postal_code (Blocker 3) ──
    // City-coherent postal code. Resolves the city entry by name (unique per
    // country) to get its postal prefix, then appends country-formatted digits.
    case 'postal_code': {
      const geo = EU_GEOGRAPHY[country];
      const cityName = options?.city_source !== undefined ? row[options.city_source] : undefined;
      const cityEntry = geo && cityName != null
        ? geo.cities.find((c) => c.name === cityName)
        : undefined;
      const prefix = cityEntry ? cityEntry.postalPrefix : '';
      const d = (n: number): string => {
        let s = '';
        for (let i = 0; i < n; i++) s += Math.floor(rng() * 10);
        return s;
      };
      switch (country) {
        case 'DE': case 'FR': case 'ES': case 'IT': case 'IE':
          return (prefix || d(2)) + d(3);                     // 5 chars (IE alpha prefix used as-is)
        case 'AT':
          return (prefix ? prefix.slice(0, 1) : d(1)) + d(3); // 4 chars
        case 'NL':
          return (prefix || d(2)) + d(2);                     // 4 chars
        case 'BE':
          return (prefix ? prefix.slice(0, 1) : d(1)) + d(3); // 4 chars
        case 'PL':
          return (prefix || d(2)) + '-' + d(3);               // XX-XXX
        case 'SE':
          return (prefix || d(2)) + d(1) + ' ' + d(2);        // XXX XX
        default:
          return (prefix || d(2)) + d(3);
      }
    }
    // ── 4h: address_eu (Blocker 3) ──
    // Country-formatted street address using the row's already-generated city and
    // postal code. Placeholders replaced globally (a format may repeat a token).
    case 'address_eu': {
      const geo = EU_GEOGRAPHY[country];
      const cityName = options?.city_source !== undefined ? row[options.city_source] : '';
      const postal = options?.postal_source !== undefined ? row[options.postal_source] : '';
      const streets = geo && geo.streetNames.length ? geo.streetNames : ['Main Street'];
      const street = streets[Math.floor(rng() * streets.length)];
      const number = Math.floor(rng() * 200) + 1;
      const fmt = geo?.addressFormat || '{number} {street}, {postal} {city}';
      return fmt
        .split('{street}').join(street)
        .split('{number}').join(String(number))
        .split('{postal}').join(String(postal ?? ''))
        .split('{city}').join(String(cityName ?? ''));
    }
    // ── Blocker 9: phone_eu (structural E.164) ──
    // Dial code + real mobile prefix + subscriber digits, so the national number
    // matches the country's actual mobile structure. Fallback: +00 + 9 digits.
    case 'phone_eu': {
      const pat = EU_PHONE_PATTERNS[country];
      if (!pat) {
        let sub = '';
        for (let i = 0; i < 9; i++) sub += Math.floor(rng() * 10);
        return '+00' + sub;
      }
      const mobilePrefix = pat.mobilePrefixes[Math.floor(rng() * pat.mobilePrefixes.length)];
      let digits = '';
      for (let i = 0; i < pat.subscriberLength; i++) digits += Math.floor(rng() * 10);
      return pat.countryCode + mobilePrefix + digits;
    }
    // ── Blocker 10: bic (ISO 9362, country-coherent) ──
    // bankCode(4) + countryCode(2) + locationCode(2) = 8-char BIC; optional XXX
    // branch suffix for the primary office. Fallback: 'XXXXXXXX'.
    case 'bic': {
      const banks = EU_BIC_BANKS[country];
      if (!banks || banks.length === 0) return 'XXXXXXXX';
      const b = banks[Math.floor(rng() * banks.length)];
      const base = b.bankCode + b.countryCode + b.locationCode;
      return options?.include_branch === true ? base + 'XXX' : base;
    }
    // ── Blocker 11: email_eu (name + country coherent) ──
    // first.last@{country-domain}, diacritics normalized. Fallback when country
    // unknown or name sources missing. Existing dependent_email is untouched.
    case 'email_eu': {
      const domains = EU_EMAIL_DOMAINS[country];
      const first = stripDiacritics(options?.first_name_source ? row[options.first_name_source] : '');
      const last = stripDiacritics(options?.last_name_source ? row[options.last_name_source] : '');
      if (!domains || !first || !last) {
        return 'user' + Math.floor(rng() * 10000) + '@example.com';
      }
      const domain = domains[Math.floor(rng() * domains.length)];
      return `${first}.${last}@${domain}`;
    }
    // ── 4j: calibrated (Blocker 8) ──
    // Country-calibrated numeric value from EU_FINANCIAL_DISTRIBUTIONS[metric].
    // Never throws — unknown metric/country falls back to a generic lognormal.
    case 'calibrated': {
      const metric: string | undefined = options?.metric;
      const dist: DistributionParams =
        (metric ? EU_FINANCIAL_DISTRIBUTIONS[metric]?.[country] : undefined)
        ?? { mean: 1000, stddev: 500, min: 1, max: 100000, distribution: 'lognormal' };

      let raw: number;
      if (dist.distribution === 'lognormal') {
        raw = sampleLognormal(dist.mean, dist.stddev, rng);
      } else if (dist.distribution === 'gamma') {
        raw = sampleGamma(dist.mean, dist.stddev, rng);
      } else {
        raw = dist.mean + dist.stddev * boxMuller(rng); // normal
      }

      const clamped = Math.max(dist.min, Math.min(dist.max, raw));
      return Math.round(clamped * 100) / 100;
    }
    // ── Blocker 7: business_date (timezone-aware, business-day, deterministic) ──
    // ISO 8601 with explicit country offset (+01:00/+02:00; IE +00:00/+01:00),
    // weekends + public holidays skipped, business hours 08:00–18:00. Pure UTC
    // arithmetic (see eu-timezones.ts) → host-tz independent.
    case 'business_date': {
      const c = EU_TIMEZONES[country] ? country : 'DE'; // EU default
      // Force UTC parse when the range string has no tz designator (else a bare
      // datetime parses as host-local time, breaking determinism).
      const toUtc = (s: string) => new Date(/([zZ]|[+-]\d\d:?\d\d)$/.test(s) ? s : s + 'Z');
      const minDate = toUtc(options?.min ?? '2019-01-01T00:00:00');
      const maxDate = toUtc(options?.max ?? '2024-12-31T23:59:59');
      return generateBusinessDate(c, minDate, maxDate, rng);
    }
    // Phase 4 handlers inserted here, one sub-phase at a time.
    default:
      return undefined; // unimplemented → caller uses generateMockValue fallback
  }
}

export function getLifecycleMap(columns: Record<string, any>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [colName, colDef] of Object.entries(columns)) {
    const def = colDef as any;
    if (def?.options?.lifecycleRules) {
      for (const rule of def.options.lifecycleRules) {
        if (rule.nullFields) {
          map.set(`${colName}:${rule.value}`, rule.nullFields);
        }
      }
    }
  }
  return map;
}
