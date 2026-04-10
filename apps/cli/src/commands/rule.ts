import { normalizeTables } from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function ruleListCommand(options: {
  pack: string;
  json?: boolean;
  table?: string;
}): Promise<void> {
  const packPath = path.resolve(options.pack);

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables } = normalizeTables(pack);

  if (tables.length === 0) {
    console.error(`\n\u274C No tables found in pack file.`);
    process.exit(1);
  }

  // Collect all rules
  interface LifecycleRule {
    table: string;
    column: string;
    triggerValue: string;
    nullFields: string[];
  }

  interface TemporalRule {
    table: string;
    column: string;
    dependsOn: string;
    rule: string;
  }

  interface EnumDist {
    table: string;
    column: string;
    values: string[];
    weights: number[];
  }

  const lifecycleRules: LifecycleRule[] = [];
  const temporalRules: TemporalRule[] = [];
  const enumDists: EnumDist[] = [];

  for (const table of tables) {
    if (options.table && table.name !== options.table) continue;

    const cols = Array.isArray(table.columns)
      ? table.columns
      : Object.entries(table.columns || {}).map(([n, d]) => ({ name: n, ...(d as any) }));

    for (const col of cols) {
      // Lifecycle rules
      if (col.options?.lifecycleRules && col.options.lifecycleRules.length > 0) {
        for (const rule of col.options.lifecycleRules) {
          lifecycleRules.push({
            table: table.name,
            column: col.name,
            triggerValue: rule.value,
            nullFields: rule.nullFields || [],
          });
        }
      }

      // Temporal dependencies
      if (col.options?.dependsOn) {
        temporalRules.push({
          table: table.name,
          column: col.name,
          dependsOn: col.options.dependsOn,
          rule: col.options.dependencyRule || 'after',
        });
      }

      // Weighted enums
      if (col.strategy === 'enum' && col.options?.values?.length > 0 && col.options?.weights?.length > 0) {
        enumDists.push({
          table: table.name,
          column: col.name,
          values: col.options.values,
          weights: col.options.weights,
        });
      }
    }
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      pack: options.pack,
      tables: tables.length,
      lifecycleRules,
      temporalRules,
      enumDistributions: enumDists,
      summary: {
        lifecycleRuleCount: lifecycleRules.length,
        temporalRuleCount: temporalRules.length,
        weightedEnumCount: enumDists.length,
      },
    }, null, 2));
    return;
  }

  // Human output
  console.log(`\n\u{1F4DC} RealityDB Rule Inspector`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Tables: ${tables.length}${options.table ? ` (filtered: ${options.table})` : ''}`);
  console.log(`${'\u2500'.repeat(40)}`);

  // Lifecycle rules
  if (lifecycleRules.length > 0) {
    console.log(`\n   \u{1F504} Lifecycle Rules (${lifecycleRules.length})`);
    console.log(`   ${'─'.repeat(36)}`);

    const byTable: Record<string, LifecycleRule[]> = {};
    for (const r of lifecycleRules) {
      if (!byTable[r.table]) byTable[r.table] = [];
      byTable[r.table].push(r);
    }

    for (const [tableName, rules] of Object.entries(byTable)) {
      console.log(`\n   \u{1F4CB} ${tableName}`);
      for (const r of rules) {
        console.log(`      When ${r.column} = "${r.triggerValue}":`);
        for (const nf of r.nullFields) {
          console.log(`         \u2192 ${nf} = NULL`);
        }
      }
    }
  } else {
    console.log(`\n   \u{1F504} Lifecycle Rules: none`);
    console.log(`      Add lifecycle rules to enforce state-machine logic.`);
    console.log(`      Example: cancelled orders \u2192 shipped_at = NULL`);
  }

  // Temporal rules
  if (temporalRules.length > 0) {
    console.log(`\n   \u23F0 Temporal Rules (${temporalRules.length})`);
    console.log(`   ${'─'.repeat(36)}`);

    for (const r of temporalRules) {
      console.log(`      ${r.table}.${r.column} \u2192 ${r.rule} ${r.dependsOn}`);
    }
  } else {
    console.log(`\n   \u23F0 Temporal Rules: none`);
    console.log(`      Add temporal dependencies for chronological ordering.`);
    console.log(`      Example: shipped_at depends on created_at (after)`);
  }

  // Weighted enums
  if (enumDists.length > 0) {
    console.log(`\n   \u{1F3AF} Weighted Enums (${enumDists.length})`);
    console.log(`   ${'─'.repeat(36)}`);

    for (const e of enumDists) {
      console.log(`\n      ${e.table}.${e.column}:`);
      const total = e.weights.reduce((a: number, b: number) => a + b, 0);
      const maxWeight = Math.max(...e.weights);

      for (let i = 0; i < e.values.length; i++) {
        const pct = total > 0 ? (e.weights[i] / total * 100).toFixed(0) : '?';
        const barLen = maxWeight > 0 ? Math.max(1, Math.round(e.weights[i] / maxWeight * 20)) : 1;
        const bar = '\u2588'.repeat(barLen);
        console.log(`         ${String(e.values[i]).padEnd(25)} ${String(pct).padStart(3)}%  ${bar}`);
      }
    }
  } else {
    console.log(`\n   \u{1F3AF} Weighted Enums: none`);
    console.log(`      Add weights to enum columns for realistic distributions.`);
  }

  // Summary
  console.log(`\n${'\u2500'.repeat(40)}`);
  console.log(`   Summary:`);
  console.log(`      \u{1F504} Lifecycle rules: ${lifecycleRules.length}`);
  console.log(`      \u23F0 Temporal rules:  ${temporalRules.length}`);
  console.log(`      \u{1F3AF} Weighted enums:  ${enumDists.length}`);

  if (lifecycleRules.length === 0 && temporalRules.length === 0) {
    console.log(`\n   \u{1F4A1} Tip: Lifecycle rules are the key differentiator.`);
    console.log(`      They ensure cancelled orders never have shipped_at.`);
    console.log(`      Edit your pack JSON or use: realitydb rule add (coming soon)`);
  }
  console.log(``);
}
