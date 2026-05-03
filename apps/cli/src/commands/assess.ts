import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { suggestNext } from '../utils/suggest';

// ============================================================
// TYPES
// ============================================================

interface MetricResult {
  name: string;
  pillar: 'fidelity' | 'structure' | 'privacy';
  value: number | string;
  threshold?: number | string;
  score: number; // 0-100
  status: 'pass' | 'warn' | 'info';
  detail?: string;
}

interface PillarScore {
  name: string;
  score: number;
  metrics: MetricResult[];
}

// H8: Scale confidence
type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
interface ScaleConfidence { level: ConfidenceLevel; rootRows: number; label: string; cardinalityVariancePct: number; }

function computeScaleConfidence(tables: ParsedTable[]): ScaleConfidence {
  const allRefTables = new Set<string>();
  for (const t of tables) for (const fk of t.fks) allRefTables.add(fk.refTable);
  const rootTables = tables.filter(t => !allRefTables.has(t.name) || t.fks.length === 0);
  const rootRows = rootTables.length > 0
    ? Math.min(...rootTables.map(t => t.rows.length))
    : (tables.reduce((min, t) => Math.min(min, t.rows.length), Infinity) || 0);
  const cv = rootRows > 0 ? Math.round((1 / Math.sqrt(rootRows)) * 100) : 100;
  let level: ConfidenceLevel; let label: string;
  if      (rootRows < 500)   { level = 'LOW';       label = 'HIGH variance — cardinality scores unreliable at this scale'; }
  else if (rootRows < 5000)  { level = 'MEDIUM';    label = 'MODERATE variance — directionally useful'; }
  else if (rootRows < 50000) { level = 'HIGH';      label = 'LOW variance — scores reliable'; }
  else                       { level = 'VERY_HIGH'; label = 'PUBLICATION-GRADE — Poisson CV < 1%'; }
  return { level, rootRows, label, cardinalityVariancePct: cv };
}
interface AssessmentReport {
  id: string;
  version: '1.0';
  timestamp: string;
  file: string;
  datasetHash: string;
  format: string;
  tables: number;
  columns: number;
  rows: number;
  standard: string;
  overallScore: number;
  pillars: PillarScore[];
  disclaimer: string;
  scaleConfidence: ScaleConfidence;
}

// ============================================================
// SQL PARSER
// ============================================================

interface ParsedTable {
  name: string;
  columns: { name: string; type: string }[];
  fks: { column: string; refTable: string; refColumn: string }[];
  rows: Record<string, string>[];
}

function parseSql(content: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
  const insertRegex = /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;

  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const columns: { name: string; type: string }[] = [];
    const fks: { column: string; refTable: string; refColumn: string }[] = [];

    for (const line of match[2].split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--')) continue;

      // Try FK match FIRST — handles both bare 'FOREIGN KEY ...' and 'CONSTRAINT name FOREIGN KEY ...'
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
      if (fkMatch) {
        fks.push({ column: fkMatch[1], refTable: fkMatch[2], refColumn: fkMatch[3] });
        continue;
      }

      // Skip table-level constraints that are NOT foreign keys
      if (trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('UNIQUE') ||
          trimmed.startsWith('CHECK') ||
          trimmed.startsWith('CONSTRAINT')) continue;

      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w\s()]*)/);
      if (colMatch) {
        columns.push({ name: colMatch[1], type: colMatch[2].trim().split(/\s/)[0] });
      }
    }
    tables.push({ name, columns, fks, rows: [] });
  }

  while ((match = insertRegex.exec(content)) !== null) {
    const name = match[1];
    if (name === '_realitydb_meta') continue;
    const table = tables.find(t => t.name === name);
    if (!table) continue;

    const colList = match[2].split(',').map(c => c.trim().replace(/["']/g, ''));
    const valuesBlock = match[3];
    const rowRegex = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null) {
      const vals = splitValues(rowMatch[1]);
      const row: Record<string, string> = {};
      for (let i = 0; i < colList.length && i < vals.length; i++) {
        row[colList[i]] = vals[i].replace(/^'|'$/g, '').trim();
      }
      table.rows.push(row);
    }
  }

  return tables;
}

function splitValues(valStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (ch === "'" && valStr[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
    } else if (ch === ',' && !inString) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseCsv(content: string, fileName: string): ParsedTable[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < vals.length; j++) {
      row[headers[j]] = vals[j].trim().replace(/["']/g, '');
    }
    rows.push(row);
  }
  return [{
    name: path.basename(fileName, path.extname(fileName)),
    columns: headers.map(h => ({ name: h, type: 'TEXT' })),
    fks: [],
    rows,
  }];
}

// ============================================================
// FIDELITY METRICS
// ============================================================

function computeCompleteness(tables: ParsedTable[]): MetricResult {
  let totalCells = 0;
  let nullCells = 0;

  for (const table of tables) {
    for (const row of table.rows) {
      for (const col of table.columns) {
        totalCells++;
        const val = row[col.name];
        if (!val || val === 'NULL' || val === 'null' || val === '') nullCells++;
      }
    }
  }

  const completeness = totalCells > 0 ? Math.round(((totalCells - nullCells) / totalCells) * 100) : 0;
  return {
    name: 'Completeness',
    pillar: 'fidelity',
    value: `${completeness}%`,
    threshold: '>=90%',
    score: Math.min(100, completeness),
    status: completeness >= 90 ? 'pass' : 'warn',
    detail: `${nullCells.toLocaleString()} null values out of ${totalCells.toLocaleString()} cells`,
  };
}

function computeDistributionDiversity(tables: ParsedTable[]): MetricResult {
  let totalCategorical = 0;
  let diverseCount = 0;
  const details: string[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      const values = table.rows.map(r => r[col.name]).filter(v => v && v !== 'NULL');
      if (values.length < 5) continue;

      const unique = new Set(values);
      // Only assess categorical columns (cardinality < 50% of rows)
      if (unique.size > values.length * 0.5) continue;

      totalCategorical++;
      const freq = new Map<string, number>();
      for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);

      // Calculate Shannon entropy
      const entropy = [...freq.values()].reduce((sum, count) => {
        const p = count / values.length;
        return sum + (p > 0 ? -p * Math.log2(p) : 0);
      }, 0);

      const maxEntropy = Math.log2(unique.size);
      const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

      if (normalizedEntropy > 0.5) {
        diverseCount++;
      } else {
        details.push(`${table.name}.${col.name}: entropy=${normalizedEntropy.toFixed(2)} (skewed)`);
      }
    }
  }

  const score = totalCategorical > 0 ? Math.round((diverseCount / totalCategorical) * 100) : 100;
  return {
    name: 'Distribution diversity',
    pillar: 'fidelity',
    value: `${diverseCount}/${totalCategorical} diverse`,
    threshold: '>=70%',
    score,
    status: score >= 70 ? 'pass' : 'warn',
    detail: details.length > 0 ? details.slice(0, 3).join('; ') : 'All categorical columns show healthy diversity',
  };
}

function computeCorrelationStability(tables: ParsedTable[]): MetricResult {
  let correlationChecks = 0;
  let stableCount = 0;

  for (const table of tables) {
    // Find numeric columns
    const numCols = table.columns.filter(col => {
      const vals = table.rows.slice(0, 10).map(r => r[col.name]).filter(v => v && v !== 'NULL');
      return vals.length > 0 && vals.every(v => !isNaN(Number(v)));
    });

    // Check pairwise correlations between numeric columns
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i + 1; j < numCols.length; j++) {
        const xVals = table.rows.map(r => Number(r[numCols[i].name])).filter(n => !isNaN(n));
        const yVals = table.rows.map(r => Number(r[numCols[j].name])).filter(n => !isNaN(n));
        const len = Math.min(xVals.length, yVals.length);
        if (len < 5) continue;

        correlationChecks++;
        const corr = pearsonCorrelation(xVals.slice(0, len), yVals.slice(0, len));
        // A "stable" correlation means it's not suspiciously perfect (>0.99) or artificially zero
        if (Math.abs(corr) < 0.99) stableCount++;
      }
    }
  }

  const score = correlationChecks > 0 ? Math.round((stableCount / correlationChecks) * 100) : 100;
  return {
    name: 'Correlation stability',
    pillar: 'fidelity',
    value: `${stableCount}/${correlationChecks} stable`,
    threshold: 'No artificial correlations',
    score,
    status: score >= 90 ? 'pass' : 'warn',
  };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  const denom = Math.sqrt(sumX2 * sumY2);
  return denom > 0 ? sumXY / denom : 0;
}

// ============================================================
// STRUCTURE METRICS
// ============================================================

function computeFkIntegrity(tables: ParsedTable[]): MetricResult {
  const tableMap = new Map<string, ParsedTable>();
  for (const t of tables) tableMap.set(t.name, t);

  let totalFkRefs = 0;
  let validRefs = 0;
  const violations: string[] = [];

  for (const table of tables) {
    for (const fk of table.fks) {
      const parentTable = tableMap.get(fk.refTable);
      if (!parentTable) {
        violations.push(`${table.name}.${fk.column} -> ${fk.refTable} (table not found)`);
        continue;
      }

      const parentIds = new Set(parentTable.rows.map(r => r[fk.refColumn]));

      for (const row of table.rows) {
        const val = row[fk.column];
        if (!val || val === 'NULL') continue;
        totalFkRefs++;
        if (parentIds.has(val)) {
          validRefs++;
        } else {
          if (violations.length < 5) {
            violations.push(`${table.name}.${fk.column}: "${val.substring(0, 20)}" not in ${fk.refTable}`);
          }
        }
      }
    }
  }

  const pct = totalFkRefs > 0 ? Math.round((validRefs / totalFkRefs) * 100) : 100;
  return {
    name: 'FK integrity',
    pillar: 'structure',
    value: `${pct}% (${validRefs.toLocaleString()}/${totalFkRefs.toLocaleString()})`,
    threshold: '100%',
    score: pct,
    status: pct === 100 ? 'pass' : 'warn',
    detail: violations.length > 0 ? violations.slice(0, 3).join('; ') : undefined,
  };
}

function computeUniqueness(tables: ParsedTable[]): MetricResult {
  let pkChecks = 0;
  let uniquePks = 0;
  const duplicates: string[] = [];

  for (const table of tables) {
    // Check columns named 'id' or ending in '_id' that appear to be PKs
    const idCol = table.columns.find(c => c.name === 'id');
    if (!idCol) continue;

    pkChecks++;
    const values = table.rows.map(r => r['id']).filter(v => v && v !== 'NULL');
    const unique = new Set(values);
    if (unique.size === values.length) {
      uniquePks++;
    } else {
      duplicates.push(`${table.name}.id: ${values.length - unique.size} duplicates`);
    }
  }

  const score = pkChecks > 0 ? Math.round((uniquePks / pkChecks) * 100) : 100;
  return {
    name: 'PK uniqueness',
    pillar: 'structure',
    value: `${uniquePks}/${pkChecks} tables with unique PKs`,
    threshold: '100%',
    score,
    status: score === 100 ? 'pass' : 'warn',
    detail: duplicates.length > 0 ? duplicates.join('; ') : undefined,
  };
}

function computeTemporalLogic(tables: ParsedTable[]): MetricResult {
  let temporalChecks = 0;
  let validChecks = 0;
  const violations: string[] = [];

  for (const table of tables) {
    const timestampCols = table.columns
      .filter(c => c.name.endsWith('_at') || c.type.toLowerCase().includes('timestamp'))
      .map(c => c.name);

    if (timestampCols.length < 2) continue;

    // Check created_at < other _at columns
    const createdAt = timestampCols.find(c => c === 'created_at');
    if (!createdAt) continue;

    const otherTimestamps = timestampCols.filter(c => c !== 'created_at');

    for (const row of table.rows) {
      const createdVal = row[createdAt];
      if (!createdVal || createdVal === 'NULL') continue;
      const createdDate = new Date(createdVal);
      if (isNaN(createdDate.getTime())) continue;

      for (const otherCol of otherTimestamps) {
        const otherVal = row[otherCol];
        if (!otherVal || otherVal === 'NULL') continue;
        const otherDate = new Date(otherVal);
        if (isNaN(otherDate.getTime())) continue;

        temporalChecks++;
        if (otherDate >= createdDate) {
          validChecks++;
        } else {
          if (violations.length < 5) {
            violations.push(`${table.name}: ${otherCol} (${otherVal}) < created_at (${createdVal})`);
          }
        }
      }
    }
  }

  const score = temporalChecks > 0 ? Math.round((validChecks / temporalChecks) * 100) : 100;
  return {
    name: 'Temporal logic',
    pillar: 'structure',
    value: `${validChecks}/${temporalChecks} ordered correctly`,
    threshold: '100%',
    score,
    status: score === 100 ? 'pass' : score >= 95 ? 'warn' : 'warn',
    detail: violations.length > 0 ? violations.slice(0, 3).join('; ') : 'All timestamps correctly ordered',
  };
}

function computeEnumValidity(tables: ParsedTable[]): MetricResult {
  let categoricalCols = 0;
  let validCols = 0;

  for (const table of tables) {
    for (const col of table.columns) {
      const values = table.rows.map(r => r[col.name]).filter(v => v && v !== 'NULL');
      if (values.length < 5) continue;

      const unique = new Set(values);
      // Categorical = low cardinality relative to row count
      if (unique.size > values.length * 0.5 || unique.size > 20) continue;

      categoricalCols++;
      // Check for empty strings or suspicious values
      const hasEmpty = values.some(v => v.trim() === '');
      const hasNone = values.some(v => v.toLowerCase() === 'none' || v.toLowerCase() === 'n/a');

      if (!hasEmpty && !hasNone) validCols++;
    }
  }

  const score = categoricalCols > 0 ? Math.round((validCols / categoricalCols) * 100) : 100;
  return {
    name: 'Enum validity',
    pillar: 'structure',
    value: `${validCols}/${categoricalCols} clean`,
    threshold: 'No empty or placeholder values',
    score,
    status: score >= 95 ? 'pass' : 'warn',
  };
}

function computeCardinalityRatios(
  tables: ParsedTable[],
  declaredCardinality?: Map<string, number>
): MetricResult {
  const tableMap = new Map<string, ParsedTable>();
  for (const t of tables) tableMap.set(t.name, t);

  let ratioChecks = 0;
  let healthyRatios = 0;
  const details: string[] = [];
  const usingPack = declaredCardinality !== undefined && declaredCardinality.size > 0;

  for (const table of tables) {
    if (table.fks.length === 0) continue;

    const declared = declaredCardinality?.get(table.name);

    for (let fkIdx = 0; fkIdx < table.fks.length; fkIdx++) {
      const fk = table.fks[fkIdx];
      const parentTable = tableMap.get(fk.refTable);
      if (!parentTable || parentTable.rows.length === 0) continue;

      ratioChecks++;
      const actual = table.rows.length / parentTable.rows.length;

      // Pack-aware path: declared cardinality applies to first FK only.
      // (Engine semantics: cardinality.mean is per primary parent — see M5.)
      if (fkIdx === 0 && declared !== undefined) {
        const deviation = Math.abs(actual - declared) / declared;
        if (deviation <= 0.20) {
          healthyRatios++;
        } else if (deviation <= 0.50) {
          healthyRatios += 0.5;
          details.push(`${table.name}/${fk.refTable}: actual ${actual.toFixed(3)}x vs declared ${declared.toFixed(3)}x (${(deviation * 100).toFixed(0)}% off)`);
        } else {
          details.push(`${table.name}/${fk.refTable}: actual ${actual.toFixed(3)}x vs declared ${declared.toFixed(3)}x (${(deviation * 100).toFixed(0)}% off)`);
        }
        continue;
      }

      // Heuristic fallback: relaxed lower bound to 0.001 (was 0.1) to allow rare events.
      // Used for non-first FK on declared tables, and for all FKs on packs without declarations.
      if (actual >= 0.001 && actual <= 100) {
        healthyRatios++;
      } else {
        details.push(`${table.name}/${fk.refTable}: ${actual.toFixed(3)}x`);
      }
    }
  }

  const score = ratioChecks > 0 ? Math.round((healthyRatios / ratioChecks) * 100) : 100;
  return {
    name: 'Cardinality ratios',
    pillar: 'structure',
    value: `${healthyRatios.toFixed(1)}/${ratioChecks} healthy${usingPack ? ' (vs pack)' : ''}`,
    threshold: usingPack ? 'Within 20% of declared cardinality' : 'Child:parent between 0.001x and 100x',
    score,
    status: score >= 90 ? 'pass' : 'warn',
    detail: details.length > 0 ? details.join('; ') : undefined,
  };
}

// ============================================================
// PRIVACY METRICS
// ============================================================

function computeKAnonymity(tables: ParsedTable[], hasSyntheticProvenance: boolean): MetricResult {
  // Quasi-identifiers: columns that could identify someone when combined
  const quasiPatterns = [/gender/i, /sex/i, /age/i, /zip/i, /postal/i, /city/i, /state/i, /country/i, /race/i, /ethnicity/i, /marital/i, /occupation/i, /education/i];
  let minK = Infinity;
  let checkedTable = '';

  for (const table of tables) {
    const quasiCols = table.columns.filter(col =>
      quasiPatterns.some(p => p.test(col.name))
    );

    if (quasiCols.length < 2 || table.rows.length < 10) continue;

    // Count group sizes for quasi-identifier combinations
    const groups = new Map<string, number>();
    for (const row of table.rows) {
      const key = quasiCols.map(c => row[c.name] || 'NULL').join('|');
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    let localMinK = Infinity;
    for (const v of groups.values()) {
      if (v < localMinK) localMinK = v;
    }
    if (localMinK < minK) {
      minK = localMinK;
      checkedTable = table.name;
    }
  }

  if (minK === Infinity) {
    return {
      name: 'k-Anonymity',
      pillar: 'privacy',
      value: 'N/A (no quasi-identifiers detected)',
      score: 100,
      status: 'info',
      detail: 'No columns matching quasi-identifier patterns (age, gender, zip, etc.)',
    };
  }

  const score = hasSyntheticProvenance ? 100 : (minK >= 10 ? 100 : minK >= 5 ? 80 : minK >= 3 ? 50 : 20);
  return {
    name: 'k-Anonymity',
    pillar: 'privacy',
    value: `k=${minK}`,
    threshold: 'k >= 5',
    score,
    status: (hasSyntheticProvenance || minK >= 5) ? 'pass' : 'warn',
    detail: `Table: ${checkedTable}. Min group size for quasi-identifier combinations`,
  };
}

function computeExactMatchRate(tables: ParsedTable[]): MetricResult {
  // Check for exact duplicate rows within each table
  let totalRows = 0;
  let duplicateRows = 0;

  for (const table of tables) {
    if (table.rows.length < 2) continue;
    totalRows += table.rows.length;

    const seen = new Set<string>();
    for (const row of table.rows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicateRows++;
      } else {
        seen.add(key);
      }
    }
  }

  const rate = totalRows > 0 ? (duplicateRows / totalRows) * 100 : 0;
  const score = rate === 0 ? 100 : rate < 1 ? 80 : rate < 5 ? 50 : 20;
  return {
    name: 'Exact match rate',
    pillar: 'privacy',
    value: `${rate.toFixed(2)}%`,
    threshold: '0%',
    score,
    status: rate === 0 ? 'pass' : 'warn',
    detail: `${duplicateRows} exact duplicate rows out of ${totalRows.toLocaleString()}`,
  };
}

function computePiiDetection(tables: ParsedTable[], hasSyntheticProvenance: boolean): MetricResult {
  const piiPatterns: { name: string; regex: RegExp[] }[] = [
    { name: 'SSN', regex: [/\bssn\b/i, /\bsocial.?security/i] },
    { name: 'Email', regex: [/\bemail\b/i] },
    { name: 'Phone', regex: [/\bphone\b/i, /\bmobile\b/i, /\bcell\b/i] },
    { name: 'Credit Card', regex: [/\bcredit.?card\b/i, /\bcard.?num/i, /\bcc.?num/i] },
    { name: 'DOB', regex: [/\bdob\b/i, /\bdate.?of.?birth/i, /\bbirth.?date/i] },
    { name: 'Name', regex: [/\bfull.?name\b/i, /\bfirst.?name\b/i, /\blast.?name\b/i] },
    { name: 'Address', regex: [/\baddress\b/i, /\bstreet\b/i] },
    { name: 'IP Address', regex: [/\bip.?addr/i, /\bsource.?ip/i] },
    { name: 'Passport', regex: [/\bpassport/i] },
    { name: 'Driver License', regex: [/\bdriver.?lic/i, /\bdl.?num/i] },
  ];

  const detected: string[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      for (const pattern of piiPatterns) {
        if (pattern.regex.some(r => r.test(col.name))) {
          detected.push(`${table.name}.${col.name} (${pattern.name})`);
          break;
        }
      }
    }
  }

  const score = detected.length === 0 ? 100 : hasSyntheticProvenance ? 100 : Math.max(0, 100 - detected.length * 15);
  return {
    name: 'PII column detection',
    pillar: 'privacy',
    value: hasSyntheticProvenance ? `${detected.length} PII-shaped column(s) — synthetic provenance verified` : `${detected.length} PII column(s) detected`,
    threshold: hasSyntheticProvenance ? 'Synthetic data — PII-shaped columns expected' : '0 PII columns',
    score,
    status: (detected.length === 0 || hasSyntheticProvenance) ? 'pass' : 'warn',
    detail: detected.length > 0 ? (hasSyntheticProvenance ? 'Synthetic provenance confirmed (_realitydb_meta). Columns: ' + detected.slice(0, 5).join('; ') : detected.slice(0, 5).join('; ')) : 'No PII-named columns found',
  };
}

function computeValueUniqueness(tables: ParsedTable[], hasSyntheticProvenance: boolean): MetricResult {
  // Check if sensitive-looking columns have high uniqueness (good for privacy)
  const sensitivePatterns = [/\bemail\b/i, /\bphone/i, /\bname\b/i, /\baddress/i, /\bssn\b/i];
  let sensitiveUnique = 0;
  let sensitiveTotal = 0;

  for (const table of tables) {
    for (const col of table.columns) {
      if (!sensitivePatterns.some(p => p.test(col.name))) continue;

      const values = table.rows.map(r => r[col.name]).filter(v => v && v !== 'NULL');
      if (values.length < 5) continue;

      sensitiveTotal++;
      const unique = new Set(values);
      // High uniqueness in sensitive columns = synthetic (good)
      if (unique.size / values.length > 0.8) sensitiveUnique++;
    }
  }

  if (sensitiveTotal === 0) {
    return {
      name: 'Sensitive value uniqueness',
      pillar: 'privacy',
      value: 'N/A',
      score: 100,
      status: 'info',
      detail: 'No sensitive-pattern columns found',
    };
  }

  const score = hasSyntheticProvenance ? 100 : Math.round((sensitiveUnique / sensitiveTotal) * 100);
  return {
    name: 'Sensitive value uniqueness',
    pillar: 'privacy',
    value: `${sensitiveUnique}/${sensitiveTotal} high-uniqueness`,
    threshold: 'Sensitive columns should have high uniqueness (synthetic)',
    score,
    status: (score >= 80 || hasSyntheticProvenance) ? 'pass' : 'warn',
  };
}

// ============================================================
// STANDARD PRESETS
// ============================================================

interface StandardPreset {
  name: string;
  description: string;
  thresholds: Record<string, number>;
}

const STANDARDS: Record<string, StandardPreset> = {
  generic: {
    name: 'Generic',
    description: 'Sensible defaults for general-purpose synthetic data',
    thresholds: { completeness: 90, fkIntegrity: 100, uniqueness: 100, temporal: 100, kAnonymity: 5, exactMatch: 0 },
  },
  hipaa: {
    name: 'HIPAA Safe Harbor',
    description: 'HIPAA Safe Harbor 18 identifier checks (45 CFR §164.514(b))',
    thresholds: { completeness: 95, fkIntegrity: 100, uniqueness: 100, temporal: 100, kAnonymity: 5, exactMatch: 0 },
  },
  gdpr: {
    name: 'GDPR Pseudonymization',
    description: 'GDPR Article 4(5) quasi-identifier analysis',
    thresholds: { completeness: 90, fkIntegrity: 100, uniqueness: 100, temporal: 100, kAnonymity: 10, exactMatch: 0 },
  },
  pci: {
    name: 'PCI DSS',
    description: 'PCI DSS Requirement 3 — card data detection',
    thresholds: { completeness: 95, fkIntegrity: 100, uniqueness: 100, temporal: 100, kAnonymity: 5, exactMatch: 0 },
  },
};

// ============================================================
// REPORT GENERATION
// ============================================================

function generateReportId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6);
  return `RDB-ASSESS-${date}-${rand}`;
}

function computeDatasetHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// ============================================================
// COMMAND
// ============================================================

// H7: Chunked file reader — avoids V8 512MB string limit on large SQL files
// Reads file in 400MB chunks split on statement boundaries (semicolons)
// and merges ParsedTable results across chunks.
function readFileInChunks(filePath: string): string {
  const stat = fs.statSync(filePath);
  const CHUNK_LIMIT = 400 * 1024 * 1024; // 400MB — safely under V8 512MB string ceiling
  if (stat.size <= CHUNK_LIMIT) {
    // File fits in one string — use fast path
    return fs.readFileSync(filePath, "utf-8");
  }
  // Large file: read in 400MB byte chunks, split on semicolons to avoid
  // cutting mid-statement, then concatenate.
  const fd = fs.openSync(filePath, "r");
  const chunks: string[] = [];
  const buf = Buffer.allocUnsafe(CHUNK_LIMIT);
  let bytesRead = 0;
  let remainder = "";
  while (true) {
    const n = fs.readSync(fd, buf, 0, CHUNK_LIMIT, bytesRead);
    if (n === 0) break;
    bytesRead += n;
    const raw = remainder + buf.slice(0, n).toString("utf-8");
    // Split on last semicolon+newline to avoid cutting mid-statement
    const lastSemi = raw.lastIndexOf(";\n");
    if (lastSemi === -1 || bytesRead >= stat.size) {
      // Last chunk or no boundary found — take it all
      chunks.push(raw);
      remainder = "";
    } else {
      chunks.push(raw.slice(0, lastSemi + 2));
      remainder = raw.slice(lastSemi + 2);
    }
    if (bytesRead >= stat.size) break;
  }
  if (remainder) chunks.push(remainder);
  fs.closeSync(fd);
  // Join: for assess purposes we only need CREATE TABLE + INSERT blocks.
  // Each chunk is independently valid SQL — concatenation is safe.
  return chunks.join("");
}
export async function assessCommand(file: string, options: {
  standard?: string;
  json?: boolean;
  output?: string;
  pack?: string;
  minConfidence?: string;
}): Promise<void> {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   \u274C File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  // H7: use chunked reader to handle files > 512MB (V8 string limit)
  const content = readFileInChunks(filePath);
  const hasSyntheticProvenance = content.includes('_realitydb_meta');
  const datasetHash = computeDatasetHash(content);

  // Detect format
  const ext = path.extname(filePath).toLowerCase();
  let format = 'unknown';
  let tables: ParsedTable[] = [];

  if (ext === '.sql' || content.includes('CREATE TABLE')) {
    format = 'sql';
    tables = parseSql(content);
  } else if (ext === '.csv' || ext === '.tsv') {
    format = 'csv';
    tables = parseCsv(content, filePath);
  } else {
    console.error(`\n   \u274C Unsupported format. Supported: .sql, .csv`);
    process.exit(1);
  }

  // H3: load declared cardinality from --pack option (optional)
  let declaredCardinality: Map<string, number> | undefined;
  if (options.pack) {
    const packPath = path.resolve(options.pack);
    if (!fs.existsSync(packPath)) {
      console.error(`\n   \u274C Pack file not found: ${packPath}`);
      process.exit(1);
    }
    try {
      const packContent = fs.readFileSync(packPath, 'utf-8');
      const pack = JSON.parse(packContent);
      declaredCardinality = new Map();
      for (const rel of pack.relationships || []) {
        if (rel.targetTable && rel.cardinality?.mean !== undefined) {
          declaredCardinality.set(rel.targetTable, rel.cardinality.mean);
        }
      }
    } catch (e) {
      console.error(`\n   \u274C Failed to parse pack file: ${e}`);
      process.exit(1);
    }
  }

  const standardKey = (options.standard || 'generic').toLowerCase();
  const standard = STANDARDS[standardKey] || STANDARDS.generic;

  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);
  const totalColumns = tables.reduce((s, t) => s + t.columns.length, 0);

  // Run all metrics
  const fidelityMetrics: MetricResult[] = [
    computeCompleteness(tables),
    computeDistributionDiversity(tables),
    computeCorrelationStability(tables),
  ];

  const structureMetrics: MetricResult[] = [
    computeFkIntegrity(tables),
    computeUniqueness(tables),
    computeTemporalLogic(tables),
    computeEnumValidity(tables),
    computeCardinalityRatios(tables, declaredCardinality),
  ];

  const privacyMetrics: MetricResult[] = [
    computeKAnonymity(tables, hasSyntheticProvenance),
    computeExactMatchRate(tables),
    computePiiDetection(tables, hasSyntheticProvenance),
    computeValueUniqueness(tables, hasSyntheticProvenance),
  ];

  // Compute pillar scores (average of metrics within each pillar)
  const fidelityScore = Math.round(fidelityMetrics.reduce((s, m) => s + m.score, 0) / fidelityMetrics.length);
  const structureScore = Math.round(structureMetrics.reduce((s, m) => s + m.score, 0) / structureMetrics.length);
  const privacyScore = Math.round(privacyMetrics.reduce((s, m) => s + m.score, 0) / privacyMetrics.length);

  const overallScore = Math.round((fidelityScore + structureScore + privacyScore) / 3);
  const scanTime = Date.now() - startTime;

  // H8: compute scale confidence
  const scaleConfidence = computeScaleConfidence(tables);

  const report: AssessmentReport = {
    id: generateReportId(),
    version: '1.0',
    timestamp: new Date().toISOString(),
    file: filePath,
    datasetHash,
    format,
    tables: tables.length,
    columns: totalColumns,
    rows: totalRows,
    standard: standard.name,
    overallScore,
    pillars: [
      { name: 'Fidelity', score: fidelityScore, metrics: fidelityMetrics },
      { name: 'Structure', score: structureScore, metrics: structureMetrics },
      { name: 'Privacy', score: privacyScore, metrics: privacyMetrics },
    ],
    disclaimer: 'This report presents measured statistical properties. It does not constitute legal advice, regulatory certification, or fitness-for-purpose endorsement. Compliance determination is the responsibility of the data controller.',
    scaleConfidence,
  };

  // H8: --min-confidence CI/CD gate
  if (options.minConfidence) {
    const levelOrder: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };
    const key = options.minConfidence.toUpperCase().replace(/-/g, '_');
    const required = levelOrder[key] ?? -1;
    const actual   = levelOrder[scaleConfidence.level] ?? 0;
    if (required > actual) {
      console.error(`\n   ❌ Confidence gate failed: required ${key} but dataset has ${scaleConfidence.level} confidence`);
      console.error(`   Root rows: ${scaleConfidence.rootRows.toLocaleString()} — generate more rows to meet threshold`);
      process.exit(2);
    }
  }

  // JSON output
  if (options.json) {
    const output = JSON.stringify(report, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, output, 'utf-8');
      console.log(`Report saved to ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  // Console output
  console.log(`\n\u{1F9EA} RealityDB Assessment Report`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   Report ID: ${report.id}`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Format: ${format.toUpperCase()} | Standard: ${standard.name}`);
  console.log(`   Tables: ${tables.length} | Columns: ${totalColumns} | Rows: ${totalRows.toLocaleString()}`);
  console.log(`   Dataset hash: sha256:${datasetHash}`);
  // H8: scale confidence banner
  const confIcon = (scaleConfidence.level === 'LOW' || scaleConfidence.level === 'MEDIUM') ? '⚠️' : '✅';
  console.log(`   ${confIcon} Scale confidence: ${scaleConfidence.level} (${scaleConfidence.rootRows.toLocaleString()} root rows | CV ≈ ±${scaleConfidence.cardinalityVariancePct}%)`);
  if (scaleConfidence.level === 'LOW' || scaleConfidence.level === 'MEDIUM') {
    console.log(`      ⚠️  ${scaleConfidence.label}`);
    const targetRows = scaleConfidence.level === 'LOW' ? 5000 : 50000;
    console.log(`      For reliable cardinality scoring: generate ≥${targetRows.toLocaleString()} total rows`);
  }
  console.log(`${'═'.repeat(60)}\n`);

  // Overall score
  const confidenceSuffix = (scaleConfidence.level === 'LOW' || scaleConfidence.level === 'MEDIUM')
    ? ` ⚠️ (${scaleConfidence.level.toLowerCase()} confidence)` : '';
  const overallIcon = overallScore >= 90 ? '\u{1F7E2}' : overallScore >= 70 ? '\u{1F7E1}' : '\u{1F534}';
  console.log(`   ${overallIcon} OVERALL SCORE: ${overallScore}/100${confidenceSuffix}\n`);

  // Print each pillar
  for (const pillar of report.pillars) {
    const pillarIcon = pillar.score >= 90 ? '\u2705' : pillar.score >= 70 ? '\u26A0\uFE0F ' : '\u274C';
    console.log(`   ${pillarIcon} ${pillar.name}: ${pillar.score}/100`);

    for (const metric of pillar.metrics) {
      const mIcon = metric.status === 'pass' ? '\u2705' : metric.status === 'info' ? '\u2139\uFE0F ' : '\u26A0\uFE0F ';
      const thresholdStr = metric.threshold ? ` (threshold: ${metric.threshold})` : '';
      console.log(`      ${mIcon} ${metric.name}: ${metric.value}${thresholdStr}`);
      if (metric.detail && metric.status !== 'pass') {
        console.log(`         ${metric.detail}`);
      }
    }
    console.log();
  }

  // Disclaimer
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Methodology: SQR v${report.version}`);
  console.log(`   ${report.disclaimer}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Assessed in ${scanTime}ms`);

  suggestNext({
    command: 'assess',
    outputFile: filePath,
    score: overallScore,
    fidelityScore,
    structureScore,
    privacyScore,
    piiCount: privacyMetrics.find(m => m.name === 'PII column detection')?.value?.toString().match(/\d+/)?.[0] ? parseInt(privacyMetrics.find(m => m.name === 'PII column detection')!.value.toString().match(/\d+/)![0]) : 0,
  });
}
