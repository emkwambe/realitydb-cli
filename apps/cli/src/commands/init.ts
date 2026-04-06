import { loadLicense } from '../auth/license';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function askChoice(rl: readline.Interface, question: string, choices: string[]): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    choices.forEach((c, i) => console.log(`   ${i + 1}. ${c}`));
    rl.question(`\n   Choice (1-${choices.length}): `, (answer) => {
      const idx = parseInt(answer.trim()) - 1;
      resolve(idx >= 0 && idx < choices.length ? idx : 0);
    });
  });
}

const DOMAIN_PRESETS: Record<string, { tables: any[]; description: string }> = {
  'saas': {
    description: 'SaaS platform with users, plans, subscriptions, and billing',
    tables: [
      { name: 'organizations', cols: ['id:uuid:pk', 'name:company_name', 'slug:random_string', 'created_at:timestamp'] },
      { name: 'users', cols: ['id:uuid:pk', 'org_id:fk:organizations', 'email:email', 'name:full_name', 'role:enum:admin,member,viewer:10,70,20', 'created_at:timestamp'] },
      { name: 'plans', cols: ['id:uuid:pk', 'name:enum:free,starter,pro,enterprise:30,35,25,10', 'price_cents:integer:0:9900', 'created_at:timestamp'] },
      { name: 'subscriptions', cols: ['id:uuid:pk', 'org_id:fk:organizations', 'plan_id:fk:plans', 'status:enum:active,cancelled,past_due,trialing:65,15,10,10', 'created_at:timestamp'] },
      { name: 'invoices', cols: ['id:uuid:pk', 'subscription_id:fk:subscriptions', 'amount_cents:integer:0:9900', 'status:enum:paid,pending,failed,void:75,10,10,5', 'created_at:timestamp'] },
      { name: 'sessions', cols: ['id:uuid:pk', 'user_id:fk:users', 'ip_address:text', 'created_at:timestamp'] },
    ],
  },
  'ecommerce': {
    description: 'Online store with customers, products, orders, and payments',
    tables: [
      { name: 'customers', cols: ['id:uuid:pk', 'email:email', 'name:full_name', 'city:enum:New York,LA,Chicago,Houston,Phoenix', 'created_at:timestamp'] },
      { name: 'products', cols: ['id:uuid:pk', 'name:company_name', 'sku:random_string', 'price:float:5:500', 'category:enum:electronics,clothing,home,sports,books:25,25,20,15,15', 'created_at:timestamp'] },
      { name: 'orders', cols: ['id:uuid:pk', 'customer_id:fk:customers', 'status:enum:delivered,shipped,processing,cancelled:60,20,15,5', 'total:float:10:2000', 'created_at:timestamp'] },
      { name: 'order_items', cols: ['id:uuid:pk', 'order_id:fk:orders', 'product_id:fk:products', 'quantity:integer:1:10', 'price:float:5:500', 'created_at:timestamp'] },
      { name: 'payments', cols: ['id:uuid:pk', 'order_id:fk:orders', 'amount:float:10:2000', 'method:enum:credit_card,debit_card,paypal,bank_transfer:45,25,20,10', 'status:enum:captured,pending,failed,refunded:80,8,7,5', 'created_at:timestamp'] },
      { name: 'reviews', cols: ['id:uuid:pk', 'product_id:fk:products', 'customer_id:fk:customers', 'rating:integer:1:5', 'created_at:timestamp'] },
    ],
  },
  'healthcare': {
    description: 'Healthcare system with patients, providers, encounters, and billing',
    tables: [
      { name: 'facilities', cols: ['id:uuid:pk', 'name:company_name', 'type:enum:hospital,clinic,lab,pharmacy:30,40,15,15', 'created_at:timestamp'] },
      { name: 'providers', cols: ['id:uuid:pk', 'facility_id:fk:facilities', 'name:full_name', 'specialty:enum:general,cardiology,orthopedics,pediatrics,dermatology:30,20,15,20,15', 'created_at:timestamp'] },
      { name: 'patients', cols: ['id:uuid:pk', 'name:full_name', 'email:email', 'dob:timestamp', 'created_at:timestamp'] },
      { name: 'encounters', cols: ['id:uuid:pk', 'patient_id:fk:patients', 'provider_id:fk:providers', 'facility_id:fk:facilities', 'type:enum:office_visit,emergency,telehealth,lab:40,15,25,20', 'status:enum:completed,in_progress,scheduled,cancelled:55,15,20,10', 'created_at:timestamp'] },
      { name: 'diagnoses', cols: ['id:uuid:pk', 'encounter_id:fk:encounters', 'code:random_string', 'description:text', 'created_at:timestamp'] },
      { name: 'billing', cols: ['id:uuid:pk', 'encounter_id:fk:encounters', 'amount:float:50:5000', 'status:enum:paid,pending,denied,appealed:60,20,12,8', 'created_at:timestamp'] },
    ],
  },
  'education': {
    description: 'School system with students, courses, grades, and attendance',
    tables: [
      { name: 'departments', cols: ['id:uuid:pk', 'name:enum:Math,Science,English,History,Art,CS:20,20,20,15,10,15', 'created_at:timestamp'] },
      { name: 'teachers', cols: ['id:uuid:pk', 'department_id:fk:departments', 'name:full_name', 'email:email', 'created_at:timestamp'] },
      { name: 'courses', cols: ['id:uuid:pk', 'department_id:fk:departments', 'teacher_id:fk:teachers', 'name:text', 'level:enum:100,200,300,400:35,30,20,15', 'created_at:timestamp'] },
      { name: 'students', cols: ['id:uuid:pk', 'name:full_name', 'email:email', 'grade_level:integer:9:12', 'created_at:timestamp'] },
      { name: 'enrollments', cols: ['id:uuid:pk', 'student_id:fk:students', 'course_id:fk:courses', 'status:enum:active,dropped,completed:70,10,20', 'created_at:timestamp'] },
      { name: 'grades', cols: ['id:uuid:pk', 'enrollment_id:fk:enrollments', 'score:float:0:100', 'type:enum:exam,quiz,homework,project:25,25,30,20', 'created_at:timestamp'] },
    ],
  },
};

function parseColDef(colStr: string, allTableNames: string[]): any {
  const parts = colStr.split(':');
  const name = parts[0];
  const type = parts[1];

  if (type === 'pk') {
    return { name, type: 'uuid', isPK: true, strategy: 'uuid' };
  }

  if (type === 'fk') {
    const targetTable = parts[2];
    return { name, type: 'uuid', isFK: true, _fkTarget: targetTable, strategy: 'uuid' };
  }

  if (type === 'enum') {
    const values = parts[2].split(',');
    const weights = parts[3] ? parts[3].split(',').map(Number) : undefined;
    return { name, type: 'string', strategy: 'enum', options: weights ? { values, weights } : { values } };
  }

  if (type === 'integer') {
    const min = parts[2] ? parseInt(parts[2]) : 1;
    const max = parts[3] ? parseInt(parts[3]) : 1000;
    return { name, type: 'number', strategy: 'integer', options: { min, max } };
  }

  if (type === 'float') {
    const min = parts[2] ? parseFloat(parts[2]) : 1;
    const max = parts[3] ? parseFloat(parts[3]) : 999.99;
    return { name, type: 'number', strategy: 'float', options: { min, max } };
  }

  const strategyMap: Record<string, string> = {
    uuid: 'uuid', email: 'email', full_name: 'full_name', company_name: 'company_name',
    phone: 'phone', timestamp: 'timestamp', boolean: 'boolean', text: 'text',
    random_string: 'random_string', address: 'address',
  };

  return { name, type: type === 'timestamp' ? 'timestamp' : 'string', strategy: strategyMap[type] || 'text' };
}

function buildPack(domain: string, preset: typeof DOMAIN_PRESETS[string]): any {
  const tableIdMap = new Map<string, string>();
  const tables: any[] = [];
  const relationships: any[] = [];
  let relIdx = 0;

  // First pass: assign IDs
  preset.tables.forEach((t, i) => {
    tableIdMap.set(t.name, `tbl-${String(i + 1).padStart(2, '0')}`);
  });

  // Second pass: build tables
  preset.tables.forEach((t, tableIdx) => {
    const tableId = tableIdMap.get(t.name)!;
    const columns: any[] = [];

    t.cols.forEach((colStr: string, colIdx: number) => {
      const parsed = parseColDef(colStr, preset.tables.map(x => x.name));
      const colId = `${tableId}-c${colIdx + 1}`;
      const col: any = { id: colId, name: parsed.name, type: parsed.type };

      if (parsed.isPK) { col.isPK = true; col.strategy = 'uuid'; }
      if (parsed.strategy && !parsed.isPK) col.strategy = parsed.strategy;
      if (parsed.options) col.options = parsed.options;

      if (parsed.isFK && parsed._fkTarget) {
        col.isFK = true;
        const targetTableId = tableIdMap.get(parsed._fkTarget);
        if (targetTableId) {
          col.fkTarget = { tableId: targetTableId, columnId: `${targetTableId}-c1` };
          relIdx++;
          relationships.push({
            id: `rel-${String(relIdx).padStart(2, '0')}`,
            sourceTableId: targetTableId,
            sourceColumnId: `${targetTableId}-c1`,
            targetTableId: tableId,
            targetColumnId: colId,
            type: 'one-to-many',
          });
        }
      }

      columns.push(col);
    });

    tables.push({
      id: tableId,
      name: t.name,
      columns,
      position: { x: (tableIdx % 4) * 350, y: Math.floor(tableIdx / 4) * 250 },
    });
  });

  return {
    version: '4.3.0',
    name: domain,
    description: preset.description,
    tables,
    relationships,
  };
}

export async function initCommand(options: {
  domain?: string;
  output?: string;
  quick?: boolean;
}): Promise<void> {
  const license = loadLicense();

  console.log(`\n\u{1F680} RealityDB Init`);
  console.log(`${'\u2500'.repeat(40)}`);
  if (license) {
    console.log(`   User: ${license.email}`);
  }
  console.log(`${'\u2500'.repeat(40)}`);

  // Quick mode: use flags directly
  if (options.quick || options.domain) {
    const domain = options.domain || 'saas';
    const preset = DOMAIN_PRESETS[domain];

    if (!preset) {
      console.error(`\n\u274C Unknown domain: ${domain}`);
      console.error(`   Available: ${Object.keys(DOMAIN_PRESETS).join(', ')}`);
      process.exit(1);
    }

    const pack = buildPack(domain, preset);
    const outputFile = options.output || `realitydb-${domain}-template.json`;
    fs.writeFileSync(outputFile, JSON.stringify(pack, null, 2), 'utf-8');

    console.log(`\n\u2705 Template created!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4C1} Output: ${outputFile}`);
    console.log(`   \u{1F4CA} Tables: ${pack.tables.length}`);
    console.log(`   \u{1F517} Relationships: ${pack.relationships.length}`);
    console.log(`   Format: Studio v4.3.0`);
    console.log(`\n   Next steps:`);
    console.log(`   \u2022 Edit in Studio: import ${outputFile}`);
    console.log(`   \u2022 Generate data:  realitydb run --pack ${outputFile} --rows 5000`);
    console.log(`   \u2022 Seed database:  realitydb seed --pack ${outputFile} --rows 5000 -c <url>`);
    console.log(``);
    return;
  }

  // Interactive mode
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(`\n   Let's create a RealityDB template.\n`);

    const domainIdx = await askChoice(rl, '   What domain are you building?', [
      'SaaS Platform (users, plans, subscriptions, billing)',
      'E-Commerce (customers, products, orders, payments)',
      'Healthcare (patients, providers, encounters, billing)',
      'Education (students, courses, grades, attendance)',
      'Custom (start from scratch)',
    ]);

    const domainKeys = ['saas', 'ecommerce', 'healthcare', 'education', 'custom'];
    const domain = domainKeys[domainIdx];

    if (domain === 'custom') {
      const name = await ask(rl, '\n   Template name: ');
      const outputFile = options.output || `realitydb-${name.replace(/\s+/g, '-').toLowerCase()}-template.json`;

      // Create a minimal starter pack
      const pack = {
        version: '4.3.0',
        name: name.toLowerCase().replace(/\s+/g, '-'),
        description: `Custom template: ${name}`,
        tables: [
          {
            id: 'tbl-01',
            name: 'items',
            columns: [
              { id: 'tbl-01-c1', name: 'id', type: 'uuid', isPK: true, strategy: 'uuid' },
              { id: 'tbl-01-c2', name: 'name', type: 'string', strategy: 'text' },
              { id: 'tbl-01-c3', name: 'created_at', type: 'timestamp', strategy: 'timestamp' },
            ],
            position: { x: 0, y: 0 },
          },
        ],
        relationships: [],
      };

      fs.writeFileSync(outputFile, JSON.stringify(pack, null, 2), 'utf-8');

      console.log(`\n\u2705 Starter template created!`);
      console.log(`   \u{1F4C1} Output: ${outputFile}`);
      console.log(`\n   Edit this file or open it in Studio to add tables and columns.`);
      console.log(``);
      return;
    }

    const preset = DOMAIN_PRESETS[domain];
    const outputFile = options.output || `realitydb-${domain}-template.json`;

    console.log(`\n   Creating ${preset.description}...`);

    const pack = buildPack(domain, preset);
    fs.writeFileSync(outputFile, JSON.stringify(pack, null, 2), 'utf-8');

    console.log(`\n\u2705 Template created!`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   \u{1F4C1} Output: ${outputFile}`);
    console.log(`   \u{1F4CA} Tables: ${pack.tables.length}`);
    console.log(`   \u{1F517} Relationships: ${pack.relationships.length}`);
    console.log(`   Format: Studio v4.3.0`);

    const genNow = await ask(rl, '\n   Generate data now? (y/n): ');
    if (genNow.toLowerCase() === 'y') {
      const rows = await ask(rl, '   How many rows? (default: 5000): ');
      const rowCount = parseInt(rows) || 5000;
      console.log(`\n   Running: realitydb run --pack ${outputFile} --rows ${rowCount}`);
      console.log(`   (Run this command manually)\n`);
    } else {
      console.log(`\n   Next steps:`);
      console.log(`   \u2022 Edit in Studio: import ${outputFile}`);
      console.log(`   \u2022 Generate data:  realitydb run --pack ${outputFile} --rows 5000`);
      console.log(`   \u2022 Seed database:  realitydb seed --pack ${outputFile} --rows 5000 -c <url>`);
      console.log(``);
    }
  } finally {
    rl.close();
  }
}
