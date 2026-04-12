import { normalizeTables, topologicalSort, buildCardinalityMap } from '@realitydb/engine';
import * as fs from 'fs';
import * as path from 'path';

export async function validateCommand(options: {
  pack: string;
  level?: string;
}): Promise<void> {
  const packPath = path.resolve(options.pack);
  const strict = options.level === 'strict';

  if (!fs.existsSync(packPath)) {
    console.error(`\n\u274C Pack file not found: ${packPath}`);
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  const { tables } = normalizeTables(pack);

  console.log(`\n\u2705 RealityDB Pack Validator`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`   Pack: ${options.pack}`);
  console.log(`   Level: ${strict ? 'strict' : 'standard'}`);
  console.log(`   Tables: ${tables.length}`);
  console.log(`${'\u2500'.repeat(40)}\n`);

  let passed = 0;
  let warnings = 0;
  let errors = 0;

  // Check 1: Schema integrity — all tables have PK
  const noPK = tables.filter(t => {
    const cols = Object.values(t.columns);
    return !cols.some((c: any) => c.isPK);
  });
  if (noPK.length === 0) {
    console.log(`   \u2705 Schema integrity: All tables have primary keys`);
    passed++;
  } else {
    console.log(`   \u274C Schema integrity: ${noPK.length} table(s) missing primary key`);
    noPK.forEach(t => console.log(`      \u{1F534} ${t.name}`));
    errors++;
  }

  // Check 2: FK references valid
  const tableNames = new Set(tables.map(t => t.name));
  let fkErrors = 0;
  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (!tableNames.has(fk.references.table)) {
        console.log(`   \u274C FK error: ${table.name} references non-existent table "${fk.references.table}"`);
        fkErrors++;
      }
    }
  }
  if (fkErrors === 0) {
    console.log(`   \u2705 FK references: All foreign keys point to valid tables`);
    passed++;
  } else {
    errors++;
  }

  // Check 3: Topological sort (no circular deps)
  try {
    topologicalSort(tables);
    console.log(`   \u2705 Dependency order: No circular dependencies`);
    passed++;
  } catch {
    console.log(`   \u274C Dependency order: Circular dependency detected`);
    errors++;
  }

  // Check 4: Enum weight completeness
  let enumWarnings = 0;
  for (const table of tables) {
    const cols = Object.entries(table.columns);
    for (const [colName, colDef] of cols) {
      const def = colDef as any;
      if (def.strategy === 'enum' && def.options?.values?.length > 0) {
        const weights = def.options.weights || [];
        if (weights.length !== def.options.values.length) {
          console.log(`   \u26A0\uFE0F  Weight mismatch: ${table.name}.${colName} has ${def.options.values.length} values but ${weights.length} weights`);
          enumWarnings++;
        } else {
          const sum = weights.reduce((a: number, b: number) => a + b, 0);
          if (Math.abs(sum - 100) > 10) {
            console.log(`   \u26A0\uFE0F  Weight sum: ${table.name}.${colName} weights sum to ${sum}% (expected ~100%)`);
            enumWarnings++;
          }
        }
      }
    }
  }
  if (enumWarnings === 0) {
    console.log(`   \u2705 Enum weights: All enum columns have valid weight distributions`);
    passed++;
  } else {
    warnings += enumWarnings;
  }

  // Check 5: Lifecycle rule consistency
  let ruleErrors = 0;
  for (const table of tables) {
    const cols = Object.entries(table.columns);
    const colNames = new Set(cols.map(([n]) => n));
    for (const [colName, colDef] of cols) {
      const def = colDef as any;
      if (def.options?.lifecycleRules) {
        for (const rule of def.options.lifecycleRules) {
          for (const nf of (rule.nullFields || [])) {
            if (!colNames.has(nf)) {
              console.log(`   \u274C Rule error: ${table.name}.${colName} lifecycle rule nullifies "${nf}" which doesn't exist`);
              ruleErrors++;
            }
          }
        }
      }
    }
  }
  if (ruleErrors === 0) {
    console.log(`   \u2705 Lifecycle rules: All null targets reference valid columns`);
    passed++;
  } else {
    errors += ruleErrors;
  }

  // Check 6: PII columns (strict only)
  if (strict) {
    let piiCount = 0;
    for (const table of tables) {
      const cols = Object.entries(table.columns);
      for (const [colName, colDef] of cols) {
        const def = colDef as any;
        if (def.pii) {
          console.log(`   \u26A0\uFE0F  Unmasked PII: ${table.name}.${colName} \u2192 ${def.pii.category} (confidence: ${def.pii.confidence})`);
          piiCount++;
        }
      }
    }
    if (piiCount === 0) {
      console.log(`   \u2705 PII scan: No unmasked PII columns detected`);
      passed++;
    } else {
      console.log(`   \u26A0\uFE0F  ${piiCount} PII columns detected. Use --mask-pii flag during generation.`);
      warnings += piiCount;
    }
  }

  // Check 7: Cardinality feasibility
  const cardMap = buildCardinalityMap(pack);
  const cardCount = Object.keys(cardMap).length;
  if (cardCount > 0) {
    console.log(`   \u2705 Cardinality: ${cardCount} variable distributions configured`);
    passed++;
  } else {
    console.log(`   \u2139\uFE0F  Cardinality: Fixed ratios (no variable distributions). Consider scanning with --estimate-cardinality.`);
  }

  // Summary
  console.log(`\n${'\u2500'.repeat(40)}`);
  if (errors === 0) {
    console.log(`   \u2705 Validation PASSED \u2014 ${passed} checks passed, ${warnings} warning(s)`);
  } else {
    console.log(`   \u274C Validation FAILED \u2014 ${errors} error(s), ${warnings} warning(s)`);
  }
  console.log(``);
}
