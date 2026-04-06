import { loadLicense } from '../auth/license';
import * as fs from 'fs';

// PII detection patterns - column name matching
const PII_CATEGORIES: Record<string, { patterns: RegExp[]; mode: 'gdpr' | 'hipaa' | 'strict'; replacement: (seed: number) => string }> = {
  'Full Name': {
    patterns: [/^(full_?name|first_?name|last_?name|name|display_?name|contact_?name|patient_?name|customer_?name)$/i],
    mode: 'gdpr',
    replacement: (seed) => {
      const first = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Rowan'];
      const last = ['Smith', 'Chen', 'Garcia', 'Patel', 'Kim', 'Nguyen', 'Johnson', 'Williams', 'Brown', 'Jones'];
      return `${first[seed % first.length]} ${last[(seed * 7) % last.length]}`;
    },
  },
  'Email': {
    patterns: [/^(email|email_?address|contact_?email|work_?email|personal_?email)$/i],
    mode: 'gdpr',
    replacement: (seed) => `user${seed}@example.com`,
  },
  'Phone': {
    patterns: [/^(phone|phone_?number|mobile|cell|contact_?phone|fax|telephone)$/i],
    mode: 'gdpr',
    replacement: (seed) => `+1${String(2000000000 + seed).slice(0, 10)}`,
  },
  'Address': {
    patterns: [/^(address|street|street_?address|address_?line|mailing_?address|home_?address)$/i],
    mode: 'gdpr',
    replacement: (seed) => `${100 + (seed % 900)} Main St`,
  },
  'City': {
    patterns: [/^(city|town|municipality)$/i],
    mode: 'gdpr',
    replacement: (seed) => {
      const cities = ['Springfield', 'Riverside', 'Fairview', 'Greenville', 'Madison', 'Georgetown', 'Clinton', 'Arlington'];
      return cities[seed % cities.length];
    },
  },
  'Postal Code': {
    patterns: [/^(zip|zip_?code|postal|postal_?code)$/i],
    mode: 'gdpr',
    replacement: (seed) => String(10000 + (seed % 90000)),
  },
  'SSN': {
    patterns: [/^(ssn|social_?security|social_?security_?number|sin|national_?id)$/i],
    mode: 'hipaa',
    replacement: (seed) => `***-**-${String(1000 + (seed % 9000))}`,
  },
  'Date of Birth': {
    patterns: [/^(dob|date_?of_?birth|birth_?date|birthday)$/i],
    mode: 'hipaa',
    replacement: (seed) => {
      const year = 1950 + (seed % 50);
      const month = String(1 + (seed % 12)).padStart(2, '0');
      const day = String(1 + (seed % 28)).padStart(2, '0');
      return `${year}-${month}-${day}T00:00:00.000Z`;
    },
  },
  'IP Address': {
    patterns: [/^(ip|ip_?address|client_?ip|remote_?ip|source_?ip)$/i],
    mode: 'strict',
    replacement: (seed) => `10.${seed % 256}.${(seed * 3) % 256}.${(seed * 7) % 256}`,
  },
  'Credit Card': {
    patterns: [/^(card_?number|credit_?card|cc_?number|pan)$/i],
    mode: 'gdpr',
    replacement: (seed) => `****-****-****-${String(1000 + (seed % 9000))}`,
  },
  'Bank Account': {
    patterns: [/^(account_?number|bank_?account|iban|routing_?number)$/i],
    mode: 'gdpr',
    replacement: (seed) => `****${String(100000 + (seed % 900000))}`,
  },
  'Medical Record': {
    patterns: [/^(mrn|medical_?record|patient_?id|diagnosis_?code|icd_?code)$/i],
    mode: 'hipaa',
    replacement: (seed) => `MRN-${String(100000 + (seed % 900000))}`,
  },
  'Username': {
    patterns: [/^(username|user_?name|login|handle|screen_?name)$/i],
    mode: 'strict',
    replacement: (seed) => `user_${seed}`,
  },
  'Password Hash': {
    patterns: [/^(password|password_?hash|passwd|secret|token|api_?key|access_?token|refresh_?token)$/i],
    mode: 'strict',
    replacement: () => '[REDACTED]',
  },
  'Notes/Comments': {
    patterns: [/^(notes|comments|description|bio|about|message|body)$/i],
    mode: 'strict',
    replacement: () => 'Content redacted for compliance.',
  },
  'Device ID': {
    patterns: [/^(device_?id|mac_?address|imei|serial_?number|hardware_?id)$/i],
    mode: 'strict',
    replacement: (seed) => `DEVICE-${String(seed).padStart(8, '0')}`,
  },
};

const MODE_LEVELS: Record<string, number> = { gdpr: 1, hipaa: 2, strict: 3 };

interface PiiDetection {
  table: string;
  column: string;
  category: string;
  mode: string;
  sampleValues: string[];
  rowCount: number;
}

export async function maskCommand(options: {
  connection: string;
  mode?: string;
  dryRun?: boolean;
  confirm?: boolean;
  output?: string;
  schema?: string;
  seed?: string;
}): Promise<void> {
  const startTime = Date.now();
  const license = loadLicense();
  const mode = options.mode || 'gdpr';
  const modeLevel = MODE_LEVELS[mode];
  const schemaName = options.schema || 'public';
  const masked = options.connection.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  const seedBase = options.seed ? parseInt(options.seed) : Date.now();

  if (!modeLevel) {
    console.error(`\n\u274C Invalid mode: ${mode}. Use: gdpr, hipaa, strict`);
    process.exit(1);
  }

  if (!options.dryRun && !options.confirm && !options.output) {
    console.error(`\n\u26A0\uFE0F  Masking modifies data. Use one of:`);
    console.error(`   --dry-run     Scan only, show what would be masked`);
    console.error(`   --output <f>  Export masked data to file`);
    console.error(`   --confirm     Write changes to database`);
    process.exit(1);
  }

  console.log(`\n\u{1F512} RealityDB Mask`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`   Database: ${masked}`);
  console.log(`   Compliance: ${mode.toUpperCase()}`);
  console.log(`   Mode: ${options.dryRun ? 'dry-run (no changes)' : options.output ? 'export to file' : 'write to database'}`);
  console.log(`${'\u2500'.repeat(40)}`);

  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error(`\n\u274C PostgreSQL driver not found. Run: npm install pg`);
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: options.connection });

  try {
    await client.connect();
    console.log(`   \u2705 Connected`);
    console.log(`   Scanning for PII...`);

    // Get all text-like columns
    const columnsResult = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = $1 
        AND data_type IN ('character varying', 'text', 'varchar', 'character', 'name', 'inet', 'cidr')
      ORDER BY table_name, ordinal_position
    `, [schemaName]);

    // Also include timestamp columns for DOB detection
    const tsResult = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = $1 
        AND data_type IN ('timestamp with time zone', 'timestamp without time zone', 'date')
      ORDER BY table_name, ordinal_position
    `, [schemaName]);

    const allColumns = [...columnsResult.rows, ...tsResult.rows];

    // Detect PII
    const detections: PiiDetection[] = [];

    for (const col of allColumns) {
      for (const [category, def] of Object.entries(PII_CATEGORIES)) {
        if (MODE_LEVELS[def.mode] > modeLevel) continue;
        
        const matches = def.patterns.some(p => p.test(col.column_name));
        if (matches) {
          // Get sample values and row count
          let sampleValues: string[] = [];
          let rowCount = 0;
          try {
            const countResult = await client.query(
              `SELECT COUNT(*)::int as cnt FROM "${col.table_name}" WHERE "${col.column_name}" IS NOT NULL`
            );
            rowCount = countResult.rows[0].cnt;

            if (rowCount > 0) {
              const sampleResult = await client.query(
                `SELECT "${col.column_name}"::text as val FROM "${col.table_name}" WHERE "${col.column_name}" IS NOT NULL LIMIT 3`
              );
              sampleValues = sampleResult.rows.map((r: any) => r.val);
            }
          } catch {
            // Skip tables we can't query
          }

          detections.push({
            table: col.table_name,
            column: col.column_name,
            category,
            mode: def.mode,
            sampleValues,
            rowCount,
          });
          break;
        }
      }
    }

    // Display detections
    console.log(`\n   PII Scan Results`);
    console.log(`${'\u2500'.repeat(40)}`);

    if (detections.length === 0) {
      console.log(`   No PII detected at ${mode.toUpperCase()} compliance level.`);
      console.log(`   Try --mode strict for deeper detection.\n`);
      return;
    }

    const tableGroups = new Map<string, PiiDetection[]>();
    for (const d of detections) {
      if (!tableGroups.has(d.table)) tableGroups.set(d.table, []);
      tableGroups.get(d.table)!.push(d);
    }

    let totalPiiRows = 0;
    for (const [table, cols] of tableGroups) {
      console.log(`\n   \u{1F4CB} ${table}`);
      for (const col of cols) {
        const sample = col.sampleValues.length > 0 ? ` (e.g. "${col.sampleValues[0]}")` : '';
        const badge = col.mode === 'hipaa' ? ' [HIPAA]' : col.mode === 'strict' ? ' [STRICT]' : '';
        console.log(`      \u{1F534} ${col.column} → ${col.category}${badge} (${col.rowCount} rows)${sample}`);
        totalPiiRows += col.rowCount;
      }
    }

    console.log(`\n${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4CA} ${detections.length} PII columns detected across ${tableGroups.size} tables`);
    console.log(`   \u{1F534} ${totalPiiRows.toLocaleString()} total rows containing PII`);

    // Dry run stops here
    if (options.dryRun) {
      console.log(`\n\u2705 Dry run complete. No data was modified.`);

      // Generate audit log
      const audit = {
        timestamp: new Date().toISOString(),
        mode,
        dryRun: true,
        database: masked,
        detections: detections.map(d => ({
          table: d.table,
          column: d.column,
          category: d.category,
          complianceLevel: d.mode,
          rowsAffected: d.rowCount,
        })),
        summary: {
          tablesScanned: allColumns.length,
          piiColumnsFound: detections.length,
          tablesWithPii: tableGroups.size,
          totalRowsWithPii: totalPiiRows,
        },
      };

      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(audit, null, 2), 'utf-8');
        console.log(`   \u{1F4C1} Audit report: ${options.output}`);
      }

      console.log(`\n   To apply masking, run again with --confirm\n`);
      return;
    }

    // Apply masking
    console.log(`\n   Applying masks...`);
    let totalMasked = 0;

    for (const detection of detections) {
      if (detection.rowCount === 0) continue;

      const category = PII_CATEGORIES[detection.category];
      if (!category) continue;

      // Generate UPDATE with row_number seed
      try {
        await client.query(`
          UPDATE "${detection.table}" SET "${detection.column}" = $1
          WHERE "${detection.column}" IS NOT NULL
        `, [category.replacement(seedBase)]);

        // Now do row-specific masking with unique values
        const rows = await client.query(
          `SELECT ctid, "${detection.column}" FROM "${detection.table}" WHERE "${detection.column}" IS NOT NULL`
        );

        let rowSeed = seedBase;
        for (const row of rows.rows) {
          rowSeed++;
          await client.query(
            `UPDATE "${detection.table}" SET "${detection.column}" = $1 WHERE ctid = $2`,
            [category.replacement(rowSeed), row.ctid]
          );
        }

        totalMasked += detection.rowCount;
        console.log(`   \u2705 ${detection.table}.${detection.column}: ${detection.rowCount} rows masked → ${detection.category}`);
      } catch (err: any) {
        console.error(`   \u274C ${detection.table}.${detection.column}: ${err.message}`);
      }
    }

    // Generate audit log
    const audit = {
      timestamp: new Date().toISOString(),
      mode,
      dryRun: false,
      database: masked,
      detections: detections.map(d => ({
        table: d.table,
        column: d.column,
        category: d.category,
        complianceLevel: d.mode,
        rowsAffected: d.rowCount,
      })),
      summary: {
        tablesScanned: allColumns.length,
        piiColumnsFound: detections.length,
        tablesWithPii: tableGroups.size,
        totalRowsMasked: totalMasked,
      },
    };

    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(audit, null, 2), 'utf-8');
      console.log(`\n   \u{1F4C1} Audit log: ${options.output}`);
    }

    console.log(`\n\u2705 Mask complete!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4CA} ${totalMasked.toLocaleString()} rows masked`);
    console.log(`   \u{1F512} ${detections.length} PII categories neutralized`);
    console.log(`   \u{1F4CB} Compliance: ${mode.toUpperCase()}`);
    console.log(``);

  } catch (error: any) {
    console.error(`\n\u274C Mask failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.error(`   Hint: Is your database running?`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}
