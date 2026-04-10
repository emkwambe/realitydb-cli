import type { NormalizedTable, GenerationResult } from './types';
import { generateMockValue } from './generators';

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

function samplePoisson(lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  } else {
    const u = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
}

function sampleCardinality(config: any): number {
  if (!config || !config.strategy) return 1;
  let count: number;
  switch (config.strategy) {
    case 'fixed':
      count = config.mean || 1;
      break;
    case 'poisson':
      count = samplePoisson(config.mean || 1);
      break;
    case 'uniform':
      count = Math.floor(Math.random() * ((config.max || 3) - (config.min || 1) + 1)) + (config.min || 1);
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
  for (const rel of rels) {
    const target = rel.targetTable || rel.child;
    if (target && rel.cardinality) {
      map[target] = rel.cardinality;
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
  
  // If no cardinality configs, fall back to original fixed distribution
  if (!hasAnyCardinality) {
    return distributeRows(ordered, totalRows);
  }
  
  const rowsPerTable: Record<string, number> = {};
  
  // Step 1: Determine root table rows
  const rootTables = ordered.filter(t => t.foreignKeys.length === 0);
  const rootCount = rootTables.length || 1;
  
  // Allocate ~30% of total rows to roots, rest driven by cardinality
  const rootBudget = Math.ceil(totalRows * 0.3);
  const rootRowsEach = Math.max(1, Math.ceil(rootBudget / rootCount));
  
  for (const t of rootTables) {
    rowsPerTable[t.name] = rootRowsEach;
  }
  
  // Step 2: For each child table, compute rows based on cardinality
  const childTables = ordered.filter(t => t.foreignKeys.length > 0);
  for (const t of childTables) {
    const config = cardMap[t.name];
    if (config) {
      // Find the primary parent table
      const parentName = t.foreignKeys[0]?.references?.table;
      const parentRows = rowsPerTable[parentName] || rootRowsEach;
      
      // Sample total child rows using mean * parentRows
      const mean = config.mean || 1;
      const estimatedChildRows = Math.round(parentRows * mean);
      rowsPerTable[t.name] = Math.max(1, estimatedChildRows);
    } else {
      // No cardinality config — use half of primary parent
      const parentName = t.foreignKeys[0]?.references?.table;
      const parentRows = rowsPerTable[parentName] || rootRowsEach;
      rowsPerTable[t.name] = Math.max(1, Math.round(parentRows * 0.5));
    }
  }
  
  // Step 3: Scale to hit approximate total
  const totalPlanned = Object.values(rowsPerTable).reduce((a, b) => a + b, 0);
  if (totalPlanned > 0) {
    const scale = totalRows / totalPlanned;
    for (const name of Object.keys(rowsPerTable)) {
      rowsPerTable[name] = Math.max(1, Math.round(rowsPerTable[name] * scale));
    }
  }
  
  return rowsPerTable;
}

export function generateData(
  ordered: NormalizedTable[],
  rowsPerTable: Record<string, number>,
  pack: any,
): GenerationResult {
  const startTime = Date.now();
  const generatedIds: Record<string, any[]> = {};
  const allData: Record<string, any[]> = {};

  for (const table of ordered) {
    const tableRows = rowsPerTable[table.name];
    const tableData: any[] = [];
    const ids: any[] = [];

    for (let i = 0; i < tableRows; i++) {
      const row: Record<string, any> = {};
      const activeLifecycleNulls: string[] = [];

      // First pass: generate enum values to determine lifecycle nulls
      for (const [colName, colDef] of Object.entries(table.columns)) {
        const def = colDef as any;
        if (def?.strategy === 'enum' && def?.options?.lifecycleRules) {
          const enumValue = generateMockValue(def, colName);
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
            row[colName] = refIds[Math.floor(Math.random() * refIds.length)];
          } else {
            row[colName] = generateMockValue(def, colName);
          }
        } else if (def?.options?.dependsOn && def?.options?.dependencyRule === 'after') {
          // Dependent timestamp: generate a time after the dependency
          const depValue = row[def.options.dependsOn];
          if (depValue) {
            const depTime = new Date(depValue).getTime();
            const offset = Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
            row[colName] = new Date(depTime + offset).toISOString();
          } else {
            row[colName] = null;
          }
        } else {
          row[colName] = generateMockValue(def, colName);
        }

        // Track IDs for foreign key lookups
        if (colName === 'id') {
          ids.push(row[colName]);
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
