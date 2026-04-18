import * as fs from 'fs';
import * as path from 'path';
import { suggestNext } from '../utils/suggest';

interface PiiMatch {
  table: string;
  column: string;
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
  sampleCount: number;
  method: 'name' | 'regex' | 'both';
}

interface ScanResult {
  file: string;
  format: 'sql' | 'csv' | 'unknown';
  tablesScanned: number;
  columnsScanned: number;
  piiFound: PiiMatch[];
  scanTime: number;
  tier: 'free' | 'full';
}

// ============================================================
// PII PATTERNS — Free tier: 10 patterns, Full: 50+
// ============================================================

interface PiiPattern {
  name: string;
  namePatterns: RegExp[];
  valueRegex?: RegExp;
  confidence: 'high' | 'medium' | 'low';
  tier: 'free' | 'full';
}

const PII_PATTERNS: PiiPattern[] = [
  // === FREE TIER (10 patterns) ===
  {
    name: 'SSN',
    namePatterns: [/\bssn\b/i, /\bsocial.?security/i, /\btax.?id\b/i, /\btin\b/i],
    valueRegex: /\b\d{3}-\d{2}-\d{4}\b/,
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'Email',
    namePatterns: [/\bemail\b/i, /\be.?mail/i],
    valueRegex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'Phone',
    namePatterns: [/\bphone\b/i, /\bmobile\b/i, /\bcell\b/i, /\bfax\b/i, /\btelephone\b/i],
    valueRegex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'Credit Card',
    namePatterns: [/\bcredit.?card\b/i, /\bcard.?num/i, /\bcc.?num/i, /\bpan\b/i],
    valueRegex: /\b(?:4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|6(?:011|5\d{2})\d{12})\b/,
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'Date of Birth',
    namePatterns: [/\bdob\b/i, /\bdate.?of.?birth/i, /\bbirth.?date/i, /\bbirthday\b/i],
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'Full Name',
    namePatterns: [/\bfull.?name\b/i, /\bfirst.?name\b/i, /\blast.?name\b/i, /\bsurname\b/i, /\bgiven.?name\b/i, /\bfamily.?name\b/i],
    confidence: 'medium',
    tier: 'free',
  },
  {
    name: 'Address',
    namePatterns: [/\baddress\b/i, /\bstreet\b/i, /\baddr\b/i, /\bstreet.?line/i],
    confidence: 'medium',
    tier: 'free',
  },
  {
    name: 'IP Address',
    namePatterns: [/\bip.?addr/i, /\bip.?address/i, /\bclient.?ip/i, /\bsource.?ip/i, /\bremote.?addr/i],
    valueRegex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,
    confidence: 'high',
    tier: 'free',
  },
  {
    name: 'ZIP/Postal Code',
    namePatterns: [/\bzip\b/i, /\bzip.?code\b/i, /\bpostal\b/i, /\bpostal.?code\b/i],
    valueRegex: /\b\d{5}(?:-\d{4})?\b/,
    confidence: 'medium',
    tier: 'free',
  },
  {
    name: 'Gender/Sex',
    namePatterns: [/\bgender\b/i, /\bsex\b/i],
    confidence: 'medium',
    tier: 'free',
  },

  // === FULL TIER (40+ additional patterns) ===
  {
    name: 'Passport Number',
    namePatterns: [/\bpassport\b/i, /\bpassport.?num/i, /\bpassport.?no/i],
    valueRegex: /\b[A-Z]{1,2}\d{6,9}\b/,
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Driver License',
    namePatterns: [/\bdriver.?lic/i, /\bdl.?num/i, /\blicense.?num/i, /\blicence/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Bank Account',
    namePatterns: [/\baccount.?num/i, /\bbank.?account/i, /\biban\b/i, /\brouting.?num/i, /\baba\b/i],
    valueRegex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]{0,16})\b/,
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'CVV/CVC',
    namePatterns: [/\bcvv\b/i, /\bcvc\b/i, /\bcvv2\b/i, /\bsecurity.?code\b/i, /\bcard.?verif/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Medical Record Number',
    namePatterns: [/\bmrn\b/i, /\bmedical.?record/i, /\bpatient.?id/i, /\bpatient.?num/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Health Insurance ID',
    namePatterns: [/\binsurance.?id/i, /\bpolicy.?num/i, /\bmember.?id/i, /\bhealth.?plan/i, /\bnhi\b/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Diagnosis/ICD Code',
    namePatterns: [/\bicd\b/i, /\bdiagnos/i, /\bicd.?10/i, /\bicd.?9/i, /\bcpt.?code/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Medication',
    namePatterns: [/\bmedication\b/i, /\bprescription\b/i, /\bdrug\b/i, /\brx\b/i, /\bndc\b/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Race/Ethnicity',
    namePatterns: [/\brace\b/i, /\bethnicity\b/i, /\bethnic/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Religion',
    namePatterns: [/\breligion\b/i, /\bfaith\b/i, /\breligious/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Sexual Orientation',
    namePatterns: [/\bsexual.?orient/i, /\borientation\b/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Disability',
    namePatterns: [/\bdisability\b/i, /\bhandicap/i, /\bada.?status/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Biometric Data',
    namePatterns: [/\bbiometric/i, /\bfingerprint/i, /\bretina/i, /\bface.?id/i, /\bvoice.?print/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Geolocation',
    namePatterns: [/\blatitude\b/i, /\blongitude\b/i, /\blat\b/i, /\blng\b/i, /\blon\b/i, /\bgeo.?loc/i, /\bcoordinat/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Vehicle ID (VIN)',
    namePatterns: [/\bvin\b/i, /\bvehicle.?id/i, /\bvehicle.?num/i],
    valueRegex: /\b[A-HJ-NPR-Z0-9]{17}\b/,
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'License Plate',
    namePatterns: [/\blicense.?plate/i, /\bplate.?num/i, /\breg.?num/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'National ID',
    namePatterns: [/\bnational.?id/i, /\bcitizen.?id/i, /\bnin\b/i, /\bpersonal.?id/i, /\bid.?number\b/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Salary/Income',
    namePatterns: [/\bsalary\b/i, /\bincome\b/i, /\bwage\b/i, /\bcompensation\b/i, /\bpay.?rate/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Credit Score',
    namePatterns: [/\bcredit.?score/i, /\bfico\b/i, /\bcredit.?rating/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Username/Login',
    namePatterns: [/\busername\b/i, /\blogin\b/i, /\buser.?id\b/i, /\buser.?name\b/i, /\bscreen.?name/i],
    confidence: 'low',
    tier: 'full',
  },
  {
    name: 'Password/Secret',
    namePatterns: [/\bpassword\b/i, /\bpasswd\b/i, /\bsecret\b/i, /\bapi.?key/i, /\btoken\b/i, /\bpin\b/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'MAC Address',
    namePatterns: [/\bmac.?addr/i, /\bhw.?addr/i, /\bhardware.?addr/i],
    valueRegex: /\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/,
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'IMEI',
    namePatterns: [/\bimei\b/i, /\bdevice.?id\b/i, /\bserial.?num/i],
    valueRegex: /\b\d{15}\b/,
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Cookie/Session ID',
    namePatterns: [/\bcookie\b/i, /\bsession.?id/i, /\bsession.?token/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Employer',
    namePatterns: [/\bemployer\b/i, /\bcompany\b/i, /\borganization\b/i, /\bwork.?place/i],
    confidence: 'low',
    tier: 'full',
  },
  {
    name: 'Marital Status',
    namePatterns: [/\bmarital/i, /\bmarriage/i, /\bspouse/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Emergency Contact',
    namePatterns: [/\bemergency.?contact/i, /\bnext.?of.?kin/i, /\bbeneficiary/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Mother Maiden Name',
    namePatterns: [/\bmaiden/i, /\bmother.?name/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Photo/Image',
    namePatterns: [/\bphoto\b/i, /\bavatar\b/i, /\bprofile.?pic/i, /\bimage.?url/i, /\bheadshot/i],
    confidence: 'low',
    tier: 'full',
  },
  {
    name: 'Age',
    namePatterns: [/\bage\b/i, /\bage.?group/i, /\bage.?range/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Tax ID (EIN)',
    namePatterns: [/\bein\b/i, /\btax.?id\b/i, /\btaxpayer/i, /\bfein\b/i],
    valueRegex: /\b\d{2}-\d{7}\b/,
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Signature',
    namePatterns: [/\bsignature\b/i, /\bsigned.?by/i, /\bdigital.?sig/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Criminal Record',
    namePatterns: [/\bcriminal/i, /\bconviction/i, /\barrest/i, /\bfelony\b/i, /\bmisdemeanor/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Union Membership',
    namePatterns: [/\bunion.?member/i, /\btrade.?union/i, /\blabor.?union/i],
    confidence: 'medium',
    tier: 'full',
  },
  {
    name: 'Political Affiliation',
    namePatterns: [/\bpolitical/i, /\bparty.?affil/i, /\bvoter.?reg/i],
    confidence: 'high',
    tier: 'full',
  },
  {
    name: 'Genetic Data',
    namePatterns: [/\bgenetic/i, /\bdna\b/i, /\bgenome/i, /\bgenotyp/i],
    confidence: 'high',
    tier: 'full',
  },
];

// ============================================================
// SQL PARSER — Extract table/column names and sample values
// ============================================================

interface ParsedColumn {
  table: string;
  column: string;
  sampleValues: string[];
}

function parseSqlFile(content: string): ParsedColumn[] {
  const columns: ParsedColumn[] = [];
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\(([\s\S]*?)\);/gi;
  const insertRegex = /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;

  // Parse CREATE TABLE for column names
  const tableColumns = new Map<string, string[]>();
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const colDefs = match[2];
    const colNames: string[] = [];

    for (const line of colDefs.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('PRIMARY') ||
          trimmed.startsWith('FOREIGN') || trimmed.startsWith('UNIQUE') ||
          trimmed.startsWith('CHECK') || trimmed.startsWith('CONSTRAINT')) continue;

      const colMatch = trimmed.match(/^["']?(\w+)["']?\s+/);
      if (colMatch) {
        colNames.push(colMatch[1]);
      }
    }
    tableColumns.set(tableName, colNames);
  }

  // Parse INSERT INTO for sample values
  const columnValues = new Map<string, string[]>();

  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    const colList = match[2].split(',').map(c => c.trim().replace(/["']/g, ''));
    const valuesBlock = match[3];

    // Parse value rows
    const rowRegex = /\(([^)]+)\)/g;
    let rowMatch;
    let rowCount = 0;

    while ((rowMatch = rowRegex.exec(valuesBlock)) !== null && rowCount < 10) {
      const vals = splitSqlValues(rowMatch[1]);
      for (let i = 0; i < colList.length && i < vals.length; i++) {
        const key = `${tableName}.${colList[i]}`;
        if (!columnValues.has(key)) columnValues.set(key, []);
        const arr = columnValues.get(key)!;
        if (arr.length < 10) arr.push(vals[i].replace(/^'|'$/g, ''));
      }
      rowCount++;
    }
  }

  // Merge column names from CREATE TABLE + sample values from INSERT
  for (const [tableName, colNames] of tableColumns) {
    for (const colName of colNames) {
      const key = `${tableName}.${colName}`;
      columns.push({
        table: tableName,
        column: colName,
        sampleValues: columnValues.get(key) || [],
      });
    }
  }

  // Also add columns found in INSERT but not CREATE TABLE
  for (const [key, values] of columnValues) {
    const [table, column] = key.split('.');
    if (!columns.find(c => c.table === table && c.column === column)) {
      columns.push({ table, column, sampleValues: values });
    }
  }

  return columns;
}

function splitSqlValues(valStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let depth = 0;

  for (let i = 0; i < valStr.length; i++) {
    const ch = valStr[i];
    if (ch === "'" && valStr[i - 1] !== '\\') {
      inString = !inString;
      current += ch;
    } else if (ch === '(' && !inString) {
      depth++;
      current += ch;
    } else if (ch === ')' && !inString) {
      depth--;
      current += ch;
    } else if (ch === ',' && !inString && depth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseCsvFile(content: string, fileName: string): ParsedColumn[] {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/["']/g, ''));
  const tableName = path.basename(fileName, path.extname(fileName));
  const columns: ParsedColumn[] = [];

  for (let col = 0; col < headers.length; col++) {
    const samples: string[] = [];
    for (let row = 1; row < Math.min(lines.length, 11); row++) {
      const vals = lines[row].split(',');
      if (vals[col]) samples.push(vals[col].trim().replace(/["']/g, ''));
    }
    columns.push({ table: tableName, column: headers[col], sampleValues: samples });
  }

  return columns;
}

// ============================================================
// SCANNER
// ============================================================

function scanColumns(columns: ParsedColumn[], tier: 'free' | 'full'): PiiMatch[] {
  const patterns = PII_PATTERNS.filter(p => tier === 'full' || p.tier === 'free');
  const matches: PiiMatch[] = [];

  for (const col of columns) {
    for (const pattern of patterns) {
      let nameMatch = false;
      let valueMatch = false;

      // Check column name against patterns
      for (const nameRegex of pattern.namePatterns) {
        if (nameRegex.test(col.column)) {
          nameMatch = true;
          break;
        }
      }

      // Check sample values against regex (if available)
      let valueMatchCount = 0;
      if (pattern.valueRegex && col.sampleValues.length > 0) {
        for (const val of col.sampleValues) {
          if (pattern.valueRegex.test(val)) valueMatchCount++;
        }
        if (valueMatchCount >= Math.min(2, col.sampleValues.length * 0.3)) {
          valueMatch = true;
        }
      }

      if (nameMatch || valueMatch) {
        matches.push({
          table: col.table,
          column: col.column,
          pattern: pattern.name,
          confidence: pattern.confidence,
          sampleCount: valueMatchCount,
          method: nameMatch && valueMatch ? 'both' : nameMatch ? 'name' : 'regex',
        });
      }
    }
  }

  return matches;
}

// ============================================================
// HIPAA 18 IDENTIFIER CHECK
// ============================================================

const HIPAA_18_IDENTIFIERS = [
  'Name', 'Address', 'Date of Birth', 'Phone', 'Fax', 'Email',
  'SSN', 'Medical Record Number', 'Health Insurance ID',
  'Bank Account', 'Credit Card', 'Driver License', 'Vehicle ID (VIN)',
  'License Plate', 'Photo/Image', 'Biometric Data', 'IP Address',
  'National ID',
];

function checkHipaa18(matches: PiiMatch[]): { found: string[]; missing: string[]; coverage: number } {
  const foundTypes = new Set(matches.map(m => m.pattern));
  const found: string[] = [];
  const missing: string[] = [];

  // Map our pattern names to HIPAA identifiers
  const nameMapping: Record<string, string> = {
    'Full Name': 'Name',
    'SSN': 'SSN',
    'Email': 'Email',
    'Phone': 'Phone',
    'Address': 'Address',
    'Date of Birth': 'Date of Birth',
    'Credit Card': 'Credit Card',
    'IP Address': 'IP Address',
    'Bank Account': 'Bank Account',
    'Driver License': 'Driver License',
    'Medical Record Number': 'Medical Record Number',
    'Health Insurance ID': 'Health Insurance ID',
    'Vehicle ID (VIN)': 'Vehicle ID (VIN)',
    'License Plate': 'License Plate',
    'Photo/Image': 'Photo/Image',
    'Biometric Data': 'Biometric Data',
    'National ID': 'National ID',
  };

  for (const hipaaId of HIPAA_18_IDENTIFIERS) {
    const patternName = Object.entries(nameMapping).find(([, v]) => v === hipaaId)?.[0];
    if (patternName && foundTypes.has(patternName)) {
      found.push(hipaaId);
    } else {
      missing.push(hipaaId);
    }
  }

  return { found, missing, coverage: Math.round((found.length / 18) * 100) };
}

// ============================================================
// COMMAND
// ============================================================

export async function piiScanCommand(file: string, options: {
  format?: string;
  json?: boolean;
  hipaa?: boolean;
  tier?: string;
}): Promise<void> {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   \u274C File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  const content = fs.readFileSync(filePath, 'utf-8');

  // Detect format
  let format: 'sql' | 'csv' | 'unknown' = 'unknown';
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.sql' || content.includes('CREATE TABLE') || content.includes('INSERT INTO')) {
    format = 'sql';
  } else if (ext === '.csv' || ext === '.tsv') {
    format = 'csv';
  }

  if (format === 'unknown') {
    console.error(`\n   \u274C Unsupported file format. Supported: .sql, .csv`);
    process.exit(1);
  }

  // Determine tier
  const tier: 'free' | 'full' = (options.tier === 'full') ? 'full' : 'free';
  const patternCount = PII_PATTERNS.filter(p => tier === 'full' || p.tier === 'free').length;

  console.log(`\n\u{1F50D} RealityDB PII Scanner`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Format: ${format.toUpperCase()}`);
  console.log(`   Tier: ${tier} (${patternCount} patterns)`);
  console.log(`${'─'.repeat(50)}\n`);

  // Parse file
  const columns = format === 'sql' ? parseSqlFile(content) : parseCsvFile(content, filePath);

  // Scan
  const matches = scanColumns(columns, tier);
  const scanTime = Date.now() - startTime;

  // Get unique tables
  const tables = new Set(columns.map(c => c.table));

  if (options.json) {
    const result: ScanResult = {
      file: filePath,
      format,
      tablesScanned: tables.size,
      columnsScanned: columns.length,
      piiFound: matches,
      scanTime,
      tier,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(matches.length > 0 ? 1 : 0);
  }

  // Print results
  console.log(`   Scanned: ${tables.size} table(s), ${columns.length} column(s)\n`);

  if (matches.length === 0) {
    console.log(`   \u2705 No PII patterns detected.\n`);
  } else {
    // Group by table
    const byTable = new Map<string, PiiMatch[]>();
    for (const m of matches) {
      if (!byTable.has(m.table)) byTable.set(m.table, []);
      byTable.get(m.table)!.push(m);
    }

    const highCount = matches.filter(m => m.confidence === 'high').length;
    const medCount = matches.filter(m => m.confidence === 'medium').length;
    const lowCount = matches.filter(m => m.confidence === 'low').length;

    console.log(`   \u26A0\uFE0F  Found ${matches.length} PII column(s): ${highCount} high, ${medCount} medium, ${lowCount} low confidence\n`);

    for (const [table, tableMatches] of byTable) {
      console.log(`   \u{1F4CB} ${table}`);
      for (const m of tableMatches) {
        const icon = m.confidence === 'high' ? '\u{1F534}' : m.confidence === 'medium' ? '\u{1F7E1}' : '\u26AA';
        const method = m.method === 'both' ? 'name+value' : m.method === 'name' ? 'name match' : 'value match';
        console.log(`      ${icon} ${m.column} \u2192 ${m.pattern} (${m.confidence}, ${method})`);
      }
      console.log();
    }
  }

  // HIPAA 18 check
  if (options.hipaa) {
    if (tier !== 'full') {
      console.log(`   \u26A0\uFE0F  HIPAA check requires --tier full (Professional tier)\n`);
    } else {
      const hipaa = checkHipaa18(matches);
      console.log(`${'─'.repeat(50)}`);
      console.log(`   HIPAA Safe Harbor — 18 Identifier Check`);
      console.log(`${'─'.repeat(50)}`);
      console.log(`   Coverage: ${hipaa.found.length}/18 identifiers detected (${hipaa.coverage}%)\n`);

      if (hipaa.found.length > 0) {
        console.log(`   Detected identifiers:`);
        for (const id of hipaa.found) {
          console.log(`      \u{1F534} ${id}`);
        }
        console.log();
      }

      if (hipaa.missing.length > 0 && hipaa.missing.length < 18) {
        console.log(`   Not detected (may still be present in unrecognized form):`);
        for (const id of hipaa.missing) {
          console.log(`      \u2705 ${id}`);
        }
        console.log();
      }

      console.log(`   Note: This checks for the presence of HIPAA Safe Harbor identifiers.`);
      console.log(`   It does NOT constitute a HIPAA compliance determination.\n`);
    }
  }

  // Summary
  console.log(`${'─'.repeat(50)}`);
  console.log(`   Scan complete in ${scanTime}ms`);
  if (matches.length > 0) {
    console.log(`   \u{1F6E1}\uFE0F  Consider: realitydb run --pack <template> to generate PII-free synthetic data`);
  }
  if (tier === 'free') {
    console.log(`   \u{1F513} Upgrade to Professional for full scan (${PII_PATTERNS.length} patterns + HIPAA check)`);
  }
  console.log();

  process.exit(matches.length > 0 ? 1 : 0);
}
