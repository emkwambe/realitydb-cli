import * as fs from 'fs';
import * as path from 'path';

export async function weightTuneCommand(options: {
  pack: string;
  table?: string;
  column?: string;
  values?: string;
  preview?: boolean;
  preset?: string;
}): Promise<void> {
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const tables = pack.tables || [];

  // Find the target column
  let targetTable: any = null;
  let targetCol: any = null;
  let targetColKey: string = '';

  if (options.table && options.column) {
    targetTable = tables.find((t: any) => t.name === options.table);
    if (!targetTable) {
      console.error(`\n\u274C Table "${options.table}" not found.`);
      console.error(`   Available: ${tables.map((t: any) => t.name).join(', ')}`);
      process.exit(1);
    }

    const cols = Array.isArray(targetTable.columns)
      ? targetTable.columns
      : Object.entries(targetTable.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));

    targetCol = cols.find((c: any) => c.name === options.column);
    if (!targetCol) {
      console.error(`\n\u274C Column "${options.column}" not found in table "${options.table}".`);
      console.error(`   Available: ${cols.map((c: any) => c.name).join(', ')}`);
      process.exit(1);
    }

    if (targetCol.strategy !== 'enum') {
      console.error(`\n\u274C Column "${options.column}" is not an enum (strategy: ${targetCol.strategy}).`);
      process.exit(1);
    }
  }

  // List mode — show all tunable enums
  if (!options.table || !options.column) {
    console.log(`\n\u{1F3AF} Tunable Enum Columns`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   Pack: ${options.pack}\n`);

    let count = 0;
    for (const table of tables) {
      const cols = Array.isArray(table.columns)
        ? table.columns
        : Object.entries(table.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));

      for (const col of cols) {
        if (col.strategy === 'enum' && col.options?.values?.length > 0) {
          const vals = col.options.values;
          const weights = col.options.weights || [];
          const display = vals.map((v: string, i: number) => `${v}:${weights[i] || '?'}`).join(', ');
          console.log(`   ${table.name}.${col.name}`);
          console.log(`      ${display}\n`);
          count++;
        }
      }
    }
    console.log(`   ${count} tunable columns found.`);
    console.log(`\n   Usage: realitydb weight:tune --pack ${options.pack} --table <table> --column <column> --values "val1:50,val2:30,val3:20"`);
    console.log(``);
    return;
  }

  // Apply preset
  if (options.preset) {
    const currentValues = targetCol.options?.values || [];
    let newWeights: number[] = [];

    switch (options.preset) {
      case 'uniform':
        newWeights = currentValues.map(() => Math.round(100 / currentValues.length));
        break;
      case 'pareto':
        // 80/20 rule — first value gets 80%, rest split 20%
        newWeights = currentValues.map((_: any, i: number) => i === 0 ? 80 : Math.round(20 / (currentValues.length - 1)));
        break;
      case 'exponential':
        // Exponential decay
        const total = currentValues.reduce((_: number, __: any, i: number) => _ + Math.pow(0.5, i), 0);
        newWeights = currentValues.map((_: any, i: number) => Math.round((Math.pow(0.5, i) / total) * 100));
        break;
      case 'normal':
        // Bell curve centered on middle value
        const mid = (currentValues.length - 1) / 2;
        const sigma = currentValues.length / 4;
        const rawWeights = currentValues.map((_: any, i: number) => Math.exp(-0.5 * Math.pow((i - mid) / sigma, 2)));
        const sum = rawWeights.reduce((a: number, b: number) => a + b, 0);
        newWeights = rawWeights.map((w: number) => Math.round((w / sum) * 100));
        break;
      default:
        console.error(`\n\u274C Unknown preset: ${options.preset}`);
        console.error(`   Available: uniform, pareto, exponential, normal`);
        process.exit(1);
    }

    targetCol.options.weights = newWeights;
    console.log(`\n\u{1F3AF} Applied "${options.preset}" preset to ${options.table}.${options.column}`);
  }

  // Apply explicit values
  if (options.values) {
    const pairs = options.values.split(',').map(p => p.trim());
    const newValues: string[] = [];
    const newWeights: number[] = [];

    for (const pair of pairs) {
      const [val, weight] = pair.split(':');
      if (!val || !weight) {
        console.error(`\n\u274C Invalid format: "${pair}". Expected "value:weight" (e.g., "active:85")`);
        process.exit(1);
      }
      newValues.push(val.trim());
      newWeights.push(parseInt(weight.trim()));
    }

    const weightSum = newWeights.reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 100) > 5) {
      console.log(`   \u26A0\uFE0F  Weights sum to ${weightSum}%, not 100%. Normalizing...`);
      const scale = 100 / weightSum;
      for (let i = 0; i < newWeights.length; i++) {
        newWeights[i] = Math.round(newWeights[i] * scale);
      }
    }

    targetCol.options = targetCol.options || {};
    targetCol.options.values = newValues;
    targetCol.options.weights = newWeights;
  }

  // Preview or save
  const values = targetCol.options?.values || [];
  const weights = targetCol.options?.weights || [];
  const maxWeight = Math.max(...weights);

  console.log(`\n\u{1F3AF} ${options.table}.${options.column}`);
  console.log(`${'\u2500'.repeat(40)}`);

  for (let i = 0; i < values.length; i++) {
    const pct = weights[i] || 0;
    const barLen = maxWeight > 0 ? Math.max(1, Math.round(pct / maxWeight * 20)) : 1;
    const bar = '\u2588'.repeat(barLen);
    console.log(`   ${String(values[i]).padEnd(25)} ${String(pct).padStart(3)}%  ${bar}`);
  }

  if (options.preview) {
    console.log(`\n   Preview only \u2014 no changes saved.`);
    console.log(`   Remove --preview to apply changes.\n`);
    return;
  }

  // Save changes back to pack
  // Need to update the column in the pack structure
  if (Array.isArray(targetTable.columns)) {
    const idx = targetTable.columns.findIndex((c: any) => c.name === options.column);
    if (idx > -1) targetTable.columns[idx] = targetCol;
  } else {
    targetTable.columns[options.column] = targetCol;
  }

  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf-8');

  console.log(`\n   \u2705 Saved to ${options.pack}`);
  console.log(`   Verify: realitydb rule:list --pack ${options.pack} --table ${options.table}\n`);
}

export async function ruleAddCommand(options: {
  pack: string;
  table: string;
  column: string;
  trigger: string;
  nullify: string;
  temporal?: boolean;
  dependsOn?: string;
}): Promise<void> {
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const tables = pack.tables || [];

  const targetTable = tables.find((t: any) => t.name === options.table);
  if (!targetTable) {
    console.error(`\n\u274C Table "${options.table}" not found.`);
    process.exit(1);
  }

  const cols = Array.isArray(targetTable.columns)
    ? targetTable.columns
    : Object.entries(targetTable.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));

  // TEMPORAL RULE
  if (options.temporal && options.dependsOn) {
    const targetCol = cols.find((c: any) => c.name === options.column);
    if (!targetCol) {
      console.error(`\n\u274C Column "${options.column}" not found in "${options.table}".`);
      process.exit(1);
    }

    targetCol.options = targetCol.options || {};
    targetCol.options.dependsOn = options.dependsOn;
    targetCol.options.dependencyRule = 'after';

    // Update in pack
    if (Array.isArray(targetTable.columns)) {
      const idx = targetTable.columns.findIndex((c: any) => c.name === options.column);
      if (idx > -1) targetTable.columns[idx] = targetCol;
    } else {
      targetTable.columns[options.column] = targetCol;
    }

    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf-8');

    console.log(`\n\u23F0 Temporal rule added`);
    console.log(`${'\u2500'.repeat(40)}`);
    console.log(`   ${options.table}.${options.column} \u2192 after ${options.dependsOn}`);
    console.log(`   \u2705 Saved to ${options.pack}\n`);
    return;
  }

  // LIFECYCLE RULE
  const targetCol = cols.find((c: any) => c.name === options.column);
  if (!targetCol) {
    console.error(`\n\u274C Column "${options.column}" not found in "${options.table}".`);
    process.exit(1);
  }

  if (targetCol.strategy !== 'enum') {
    console.error(`\n\u274C Column "${options.column}" must be an enum for lifecycle rules (current: ${targetCol.strategy}).`);
    process.exit(1);
  }

  const nullFields = options.nullify.split(',').map(f => f.trim());

  // Validate null fields exist
  for (const nf of nullFields) {
    const exists = cols.some((c: any) => c.name === nf);
    if (!exists) {
      console.error(`\n\u274C Nullify target "${nf}" not found in "${options.table}".`);
      console.error(`   Available: ${cols.map((c: any) => c.name).join(', ')}`);
      process.exit(1);
    }
  }

  // Add lifecycle rule
  targetCol.options = targetCol.options || {};
  targetCol.options.lifecycleRules = targetCol.options.lifecycleRules || [];

  // Check for duplicate
  const existing = targetCol.options.lifecycleRules.find((r: any) => r.value === options.trigger);
  if (existing) {
    // Merge null fields
    const merged = new Set([...existing.nullFields, ...nullFields]);
    existing.nullFields = [...merged];
    console.log(`\n\u{1F504} Updated existing rule for "${options.trigger}"`);
  } else {
    targetCol.options.lifecycleRules.push({
      value: options.trigger,
      nullFields,
    });
    console.log(`\n\u{1F504} Lifecycle rule added`);
  }

  // Update in pack
  if (Array.isArray(targetTable.columns)) {
    const idx = targetTable.columns.findIndex((c: any) => c.name === options.column);
    if (idx > -1) targetTable.columns[idx] = targetCol;
  } else {
    targetTable.columns[options.column] = targetCol;
  }

  fs.writeFileSync(packPath, JSON.stringify(pack, null, 2), 'utf-8');

  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Table: ${options.table}`);
  console.log(`   When ${options.column} = "${options.trigger}":`);
  for (const nf of nullFields) {
    console.log(`      \u2192 ${nf} = NULL`);
  }
  console.log(`   \u2705 Saved to ${options.pack}`);
  console.log(`   Verify: realitydb rule:list --pack ${options.pack}\n`);
}
