import * as fs from 'fs';
import * as path from 'path';

export async function packListCommand(): Promise<void> {
  console.log(`\n\u{1F4E6} RealityDB Packs`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Search current directory for pack files
  const cwd = process.cwd();
  const files = fs.readdirSync(cwd).filter(f =>
    f.endsWith('.json') && (
      f.includes('realitydb') || f.includes('template') || f.includes('pack') || f.includes('schema')
    )
  );

  if (files.length === 0) {
    console.log(`   No RealityDB packs found in ${cwd}`);
    console.log(`\n   Create one with: realitydb init`);
    console.log(`   Or scan a database: realitydb scan -c <url> -o my-pack.json\n`);
    return;
  }

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(cwd, file), 'utf-8'));
      const tables = content.tables || (content.tables ? Object.keys(content.tables) : []);
      const tableCount = Array.isArray(tables) ? tables.length : Object.keys(tables).length;
      const rels = content.relationships?.length || 0;
      const name = content.name || content.templateName || 'unnamed';
      const version = content.version || '?';

      console.log(`   \u{1F4E6} ${file}`);
      console.log(`      Name: ${name} | v${version} | ${tableCount} tables | ${rels} relationships`);
    } catch {
      console.log(`   \u{1F4E6} ${file} (invalid JSON)`);
    }
  }

  console.log(``);
}

export async function packInfoCommand(options: { pack: string }): Promise<void> {
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  let pack: any;
  try {
    pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  } catch {
    console.error(`\n\u274C Invalid JSON in ${packPath}`);
    process.exit(1);
  }

  const tables = Array.isArray(pack.tables) ? pack.tables : Object.entries(pack.tables || {}).map(([name, def]) => ({ name, ...(def as any) }));
  const rels = pack.relationships || [];

  console.log(`\n\u{1F4E6} Pack Info: ${options.pack}`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Name: ${pack.name || pack.templateName || 'unnamed'}`);
  console.log(`   Version: ${pack.version || '?'}`);
  if (pack.description) console.log(`   Description: ${pack.description}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Relationships: ${rels.length}`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Table details
  for (const table of tables) {
    const name = table.name || table.id;
    const cols = Array.isArray(table.columns) ? table.columns : Object.entries(table.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));
    const pkCols = cols.filter((c: any) => c.isPK);
    const fkCols = cols.filter((c: any) => c.isFK || c.foreignKey || c.fkTarget);
    const enumCols = cols.filter((c: any) => c.strategy === 'enum');

    console.log(`\n   \u{1F4CB} ${name} (${cols.length} columns)`);
    if (pkCols.length > 0) console.log(`      PK: ${pkCols.map((c: any) => c.name).join(', ')}`);
    if (fkCols.length > 0) console.log(`      FK: ${fkCols.map((c: any) => c.name).join(', ')}`);
    if (enumCols.length > 0) {
      for (const ec of enumCols) {
        const vals = ec.options?.values?.join(', ') || '?';
        console.log(`      Enum: ${ec.name} → [${vals}]`);
      }
    }
  }

  // Validation
  console.log(`\n${'\u2500'.repeat(40)}`);
  const issues: string[] = [];

  for (const table of tables) {
    const cols = Array.isArray(table.columns) ? table.columns : Object.entries(table.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));
    const hasPK = cols.some((c: any) => c.isPK);
    if (!hasPK) issues.push(`${table.name}: missing primary key`);

    for (const col of cols) {
      if (!col.strategy && !col.isPK && !col.isFK && !col.foreignKey && !col.fkTarget) {
        issues.push(`${table.name}.${col.name}: no strategy defined`);
      }
    }
  }

  if (issues.length === 0) {
    console.log(`   \u2705 Pack is valid — ready for generation`);
  } else {
    console.log(`   \u26A0\uFE0F  ${issues.length} issues found:`);
    for (const issue of issues.slice(0, 10)) {
      console.log(`      \u{1F534} ${issue}`);
    }
    if (issues.length > 10) console.log(`      ... and ${issues.length - 10} more`);
  }

  console.log(`\n   Commands:`);
  console.log(`   \u2022 Generate: realitydb run --pack ${options.pack} --rows 5000`);
  console.log(`   \u2022 Seed DB:  realitydb seed --pack ${options.pack} --rows 5000 -c <url>`);
  console.log(``);
}

export async function packValidateCommand(options: { pack: string }): Promise<void> {
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  let pack: any;
  try {
    pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  } catch (e: any) {
    console.error(`\n\u274C Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  const tables = Array.isArray(pack.tables) ? pack.tables : Object.entries(pack.tables || {}).map(([name, def]) => ({ name, ...(def as any) }));
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check tables exist
  if (tables.length === 0) {
    errors.push('No tables found in pack');
  }

  const tableNames = new Set<string>();
  for (const table of tables) {
    const name = table.name || table.id;
    if (!name) { errors.push('Table missing name'); continue; }
    if (tableNames.has(name)) errors.push(`Duplicate table: ${name}`);
    tableNames.add(name);

    const cols = Array.isArray(table.columns) ? table.columns : Object.entries(table.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));

    if (cols.length === 0) errors.push(`${name}: no columns`);

    const hasPK = cols.some((c: any) => c.isPK || c.strategy === 'uuid');
    if (!hasPK) warnings.push(`${name}: no primary key detected`);

    for (const col of cols) {
      const colName = col.name || col.id;
      if (!colName) errors.push(`${name}: column missing name`);

      // Validate FK targets
      if (col.fkTarget) {
        const targetTable = tables.find((t: any) => t.id === col.fkTarget.tableId);
        if (!targetTable) errors.push(`${name}.${colName}: FK target table ${col.fkTarget.tableId} not found`);
      }
      if (col.foreignKey) {
        if (!tableNames.has(col.foreignKey.table) && !tables.some((t: any) => t.name === col.foreignKey.table)) {
          errors.push(`${name}.${colName}: FK target ${col.foreignKey.table} not found`);
        }
      }

      // Validate enum options
      if (col.strategy === 'enum' && (!col.options?.values || col.options.values.length === 0)) {
        errors.push(`${name}.${colName}: enum strategy requires values`);
      }

      if (!col.strategy && !col.isPK && !col.isFK && !col.foreignKey && !col.fkTarget) {
        warnings.push(`${name}.${colName}: no strategy — will default to text`);
      }
    }
  }

  console.log(`\n\u{1F50D} Pack Validation: ${options.pack}`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`${'\u2500'.repeat(40)}`);

  if (errors.length > 0) {
    console.log(`\n   \u274C Errors:`);
    for (const e of errors) console.log(`      \u{1F534} ${e}`);
  }

  if (warnings.length > 0) {
    console.log(`\n   \u26A0\uFE0F  Warnings:`);
    for (const w of warnings.slice(0, 15)) console.log(`      \u{1F7E1} ${w}`);
    if (warnings.length > 15) console.log(`      ... and ${warnings.length - 15} more`);
  }

  if (errors.length === 0) {
    console.log(`\n   \u2705 Pack is valid!`);
  } else {
    console.log(`\n   \u274C Pack has ${errors.length} errors — fix before generating.`);
  }

  console.log(`   \u23F1\uFE0F  Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);
  if (errors.length > 0) process.exit(1);
}
