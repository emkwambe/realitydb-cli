import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// examine bias — EU AI Act Article 10(f) bias examination
//
// Produces the subgroup / demographic-coverage, distribution-skew,
// and proxy-variable analysis Article 10(f) requires but that
// `examine assess` does not. New subcommand — follows the same
// parser + command-function pattern as examine assess / profile.
// Does NOT modify any existing examine subcommand.
// ============================================================

// ============================================================
// SQL / CSV PARSER (same pattern as assess / profile)
// ============================================================

interface ParsedTable {
  name: string;
  columns: { name: string; type: string }[];
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
    for (const line of match[2].split('\n')) {
      const trimmed = line.trim().replace(/,$/, '');
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('CONSTRAINT') || /^FOREIGN\s+KEY/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+(\w[\w\s()]*)/);
      if (colMatch) columns.push({ name: colMatch[1], type: colMatch[2].trim().split(/\s/)[0] });
    }
    tables.push({ name, columns, rows: [] });
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
    if (ch === "'" && valStr[i - 1] !== '\\') { inString = !inString; current += ch; }
    else if (ch === ',' && !inString) { values.push(current.trim()); current = ''; }
    else current += ch;
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
    for (let j = 0; j < headers.length && j < vals.length; j++) row[headers[j]] = vals[j].trim().replace(/["']/g, '');
    rows.push(row);
  }
  return [{ name: path.basename(fileName, path.extname(fileName)), columns: headers.map(h => ({ name: h, type: 'TEXT' })), rows }];
}

// ============================================================
// PACK CONTEXT (declared enum values enable zero-representation)
// ============================================================

interface PackColInfo { strategy?: string; values?: string[] }

function loadPackColumns(packPath: string): Map<string, Map<string, PackColInfo>> {
  const map = new Map<string, Map<string, PackColInfo>>();
  try {
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
    const tablesNode = pack.tables;
    if (!tablesNode) return map;
    const tableEntries: [string, any][] = Array.isArray(tablesNode)
      ? tablesNode.flatMap((t: any) => Object.entries(t))
      : Object.entries(tablesNode);
    for (const [tableName, tableDef] of tableEntries) {
      const cols = new Map<string, PackColInfo>();
      const columns = (tableDef && (tableDef as any).columns) || {};
      for (const [colName, colDef] of Object.entries(columns)) {
        const cd: any = colDef;
        cols.set(colName.toLowerCase(), { strategy: cd.strategy, values: cd.options?.values });
      }
      map.set(tableName.toLowerCase(), cols);
    }
  } catch {
    // Malformed / unreadable pack — proceed without pack context
  }
  return map;
}

// ============================================================
// HEURISTICS — demographic + proxy classification (token-based
// so 'language' does not falsely match the 'age' substring, and
// 'patient_gender' still matches 'gender')
// ============================================================

function tokens(col: string): string[] {
  return col.toLowerCase().split(/[^a-z]+/).filter(Boolean);
}

function classifyDemographic(col: string): { category: string; highValue: boolean } | null {
  const t = tokens(col);
  const has = (w: string) => t.includes(w);
  if (has('gender') || has('sex')) return { category: 'gender', highValue: true };
  if (has('race') || has('ethnicity')) return { category: 'race/ethnicity', highValue: true };
  if (has('nationality') || has('country') || has('citizenship')) return { category: 'country/nationality', highValue: false };
  if (has('language') || has('lang')) return { category: 'language', highValue: false };
  if (has('age')) return { category: 'age', highValue: false };
  return null;
}

function classifyProxy(col: string): { proxyType: string; concern: string } | null {
  const t = tokens(col);
  const c = col.toLowerCase();
  const has = (w: string) => t.includes(w);
  if (has('zip') || c.includes('postal') || c.includes('postcode')) {
    return { proxyType: 'geographic', concern: 'Geographic proxy for socioeconomic status (zip/postal code)' };
  }
  if (has('income') || has('salary')) {
    return { proxyType: 'socioeconomic', concern: 'Proxy for protected class (income/salary range)' };
  }
  if (has('neighborhood') || has('district')) {
    return { proxyType: 'geographic', concern: 'Geographic proxy (neighborhood/district)' };
  }
  if (has('school') || has('education')) {
    return { proxyType: 'socioeconomic', concern: 'Socioeconomic proxy (school/education level)' };
  }
  return null;
}

// Gini coefficient of a category-count distribution.
// 0 = perfectly uniform (all categories equal); → 1 = fully concentrated.
function giniCoefficient(counts: number[]): number {
  const n = counts.length;
  const total = counts.reduce((a, b) => a + b, 0);
  if (n <= 1 || total === 0) return 0;
  const sorted = [...counts].sort((a, b) => a - b);
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * sorted[i];
  const gini = (2 * cum) / (n * total) - (n + 1) / n;
  return Math.max(0, gini);
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// ============================================================
// TYPES
// ============================================================

interface ValueShare { value: string; count: number; pct: number }

interface DemographicCoverage {
  table: string;
  column: string;
  category: string;
  highValue: boolean;
  totalRows: number;
  distinctValues: number;
  values: ValueShare[];
  declaredValues?: string[];
  zeroRepresentation: string[];
  overRepresented: string[];
  flags: string[];
}

interface DistributionSkew {
  table: string;
  column: string;
  categories: number;
  gini: number;
  flag: 'concentrated' | 'uniform' | 'normal';
  topValues: ValueShare[];
  note: string;
}

interface ProxyVariable {
  table: string;
  column: string;
  proxyType: string;
  concern: string;
  note: string;
}

interface BiasReport {
  reportId: string;
  framework: 'eu-ai-act-article10f';
  generatedAt: string;
  dataset: string;
  demographicCoverage: DemographicCoverage[];
  distributionSkew: DistributionSkew[];
  proxyVariables: ProxyVariable[];
  article10fStatus: 'pass' | 'review_recommended' | 'attention_required';
  summary: string;
  generatedBy: string;
}

// ============================================================
// COMMAND
// ============================================================

export async function examineBiasCommand(file: string, options: {
  pack?: string;
  json?: boolean;
  output?: string;
}): Promise<void> {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   ❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  let tables: ParsedTable[] = [];

  if (ext === '.sql' || content.includes('CREATE TABLE')) {
    tables = parseSql(content);
  } else if (ext === '.csv' || ext === '.tsv') {
    tables = parseCsv(content, filePath);
  } else {
    console.error(`\n   ❌ Unsupported format. Supported: .sql, .csv`);
    process.exit(1);
  }

  const packColumns = options.pack ? loadPackColumns(options.pack) : null;

  const demographicCoverage: DemographicCoverage[] = [];
  const distributionSkew: DistributionSkew[] = [];
  const proxyVariables: ProxyVariable[] = [];

  for (const table of tables) {
    const packTable = packColumns?.get(table.name.toLowerCase()) || null;

    for (const col of table.columns) {
      const packCol = packTable?.get(col.name.toLowerCase());
      const rawValues = table.rows.map(r => r[col.name]).filter(v => v !== undefined && v !== null && v !== 'NULL' && v !== '');

      // Frequency table
      const counts = new Map<string, number>();
      for (const v of rawValues) counts.set(v, (counts.get(v) || 0) + 1);
      const total = rawValues.length;
      const valueShares: ValueShare[] = [...counts.entries()]
        .map(([value, count]) => ({ value, count, pct: total > 0 ? round((count / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      // ---- 1. DEMOGRAPHIC COVERAGE ----
      const demo = classifyDemographic(col.name);
      if (demo && total > 0) {
        const declaredValues = packCol?.values;
        const zeroRepresentation = declaredValues
          ? declaredValues.filter(dv => !counts.has(dv))
          : [];
        const overRepresented = valueShares.filter(v => v.pct > 80).map(v => v.value);
        const flags: string[] = [];
        if (zeroRepresentation.length) flags.push(`zero representation: ${zeroRepresentation.join(', ')}`);
        if (overRepresented.length) flags.push(`over-representation (>80%): ${overRepresented.join(', ')}`);

        demographicCoverage.push({
          table: table.name,
          column: col.name,
          category: demo.category,
          highValue: demo.highValue,
          totalRows: total,
          distinctValues: counts.size,
          values: valueShares,
          ...(declaredValues ? { declaredValues } : {}),
          zeroRepresentation,
          overRepresented,
          flags,
        });
      }

      // ---- 2. DISTRIBUTION SKEW (enum columns) ----
      const isEnum = packCol
        ? packCol.strategy === 'enum'
        : (total >= 5 && counts.size >= 2 && counts.size <= 25 && counts.size <= total * 0.5);
      if (isEnum && total > 0 && counts.size >= 2) {
        const gini = round(giniCoefficient(valueShares.map(v => v.count)), 3);
        let flag: DistributionSkew['flag'] = 'normal';
        let note = 'Distribution within expected range.';
        if (gini > 0.6) { flag = 'concentrated'; note = 'Highly concentrated distribution — possible representation bias; review dominant category.'; }
        else if (gini < 0.1) { flag = 'uniform'; note = 'Suspiciously uniform distribution — possible data gap or synthetic flattening.'; }

        distributionSkew.push({
          table: table.name,
          column: col.name,
          categories: counts.size,
          gini,
          flag,
          topValues: valueShares.slice(0, 5),
          note,
        });
      }

      // ---- 3. PROXY VARIABLE DETECTION ----
      const proxy = classifyProxy(col.name);
      if (proxy) {
        proxyVariables.push({
          table: table.name,
          column: col.name,
          proxyType: proxy.proxyType,
          concern: proxy.concern,
          note: 'Flagged for human review only — not an assertion of bias.',
        });
      }
    }
  }

  // ---- 4. ARTICLE 10(f) STATUS ----
  const highValueZeroRep = demographicCoverage.some(d => d.highValue && d.zeroRepresentation.length > 0);
  const anyZeroRep = demographicCoverage.some(d => d.zeroRepresentation.length > 0);
  const anyOverRep = demographicCoverage.some(d => d.overRepresented.length > 0);
  const anyProxy = proxyVariables.length > 0;
  const skewOutOfRange = distributionSkew.some(s => s.flag !== 'normal');

  let article10fStatus: BiasReport['article10fStatus'];
  if (highValueZeroRep) article10fStatus = 'attention_required';
  else if (anyProxy || anyZeroRep || anyOverRep || skewOutOfRange) article10fStatus = 'review_recommended';
  else article10fStatus = 'pass';

  const concentrated = distributionSkew.filter(s => s.flag === 'concentrated').length;
  const uniform = distributionSkew.filter(s => s.flag === 'uniform').length;
  const summary =
    `EU AI Act Article 10(f) bias examination of ${path.basename(filePath)}: ` +
    `${demographicCoverage.length} demographic column(s) analysed, ` +
    `${distributionSkew.length} enum distribution(s) scored (${concentrated} concentrated, ${uniform} uniform), ` +
    `${proxyVariables.length} proxy variable(s) flagged for review. ` +
    (article10fStatus === 'attention_required'
      ? 'ATTENTION REQUIRED — a high-value demographic group has zero representation; investigate before using this dataset for AI training.'
      : article10fStatus === 'review_recommended'
        ? 'REVIEW RECOMMENDED — proxy variables, representation gaps, or distribution skew detected; human review advised under Article 10(f).'
        : 'PASS — no representation gaps, high-risk proxies, or out-of-range skew detected.') +
    ' This is an automated screening, not a legal determination of non-discrimination.';

  const reportId = `BIAS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 10)}`;

  const report: BiasReport = {
    reportId,
    framework: 'eu-ai-act-article10f',
    generatedAt: new Date().toISOString(),
    dataset: path.basename(filePath),
    demographicCoverage,
    distributionSkew,
    proxyVariables,
    article10fStatus,
    summary,
    generatedBy: 'RealityDB CLI v2.40',
  };

  // JSON output
  if (options.json) {
    const jsonStr = JSON.stringify(report, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, jsonStr, 'utf-8');
      console.log(`\n   ✅ Bias report saved: ${options.output}\n`);
    } else {
      console.log(jsonStr);
    }
    return;
  }

  // Console summary
  const statusIcon = article10fStatus === 'pass' ? '\u{1F7E2}' : article10fStatus === 'review_recommended' ? '\u{1F7E1}' : '\u{1F534}';
  console.log(`\n\u{1F50D} RealityDB Bias Examination — EU AI Act Article 10(f)`);
  console.log(`${'═'.repeat(52)}`);
  console.log(`   Report ID: ${reportId}`);
  console.log(`   Dataset: ${path.basename(filePath)}`);
  console.log(`   ${statusIcon} Article 10(f) status: ${article10fStatus.toUpperCase()}`);
  console.log(`${'═'.repeat(52)}\n`);

  console.log(`   Demographic coverage (${demographicCoverage.length}):`);
  for (const d of demographicCoverage) {
    const icon = d.flags.length ? '⚠️ ' : '✅';
    console.log(`      ${icon} ${d.table}.${d.column} [${d.category}] — ${d.distinctValues} values` + (d.flags.length ? ` — ${d.flags.join('; ')}` : ''));
  }

  console.log(`\n   Distribution skew (${distributionSkew.length} enum columns):`);
  for (const s of distributionSkew.filter(x => x.flag !== 'normal')) {
    console.log(`      ⚠️  ${s.table}.${s.column} — Gini ${s.gini} (${s.flag})`);
  }
  if (distributionSkew.every(x => x.flag === 'normal')) {
    console.log(`      ✅ All enum distributions within range (Gini 0.1–0.6)`);
  }

  console.log(`\n   Proxy variables (${proxyVariables.length}):`);
  if (proxyVariables.length === 0) {
    console.log(`      ✅ None detected`);
  } else {
    for (const p of proxyVariables) {
      console.log(`      ⚠️  ${p.table}.${p.column} — ${p.concern} (review only)`);
    }
  }

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n   \u{1F4C4} Report saved: ${options.output}`);
  }
  console.log('');
}
