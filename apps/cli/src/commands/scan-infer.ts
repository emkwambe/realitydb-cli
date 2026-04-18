import * as fs from 'fs';
import * as path from 'path';
import { suggestNext } from '../utils/suggest';

// ============================================================
// TYPES
// ============================================================

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

interface SchemaFK {
  column: string;
  refTable: string;
  refColumn: string;
}

interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreignKeys: SchemaFK[];
}

interface InferredColumn {
  name: string;
  type: string;
  strategy: string;
  nullable: boolean;
  nullPercentage: number;
  isPrimaryKey: boolean;
  foreignKey?: { table: string; column: string };
  enumValues?: string[];
  enumWeights?: number[];
  dependsOn?: string;
  tier: 1 | 2 | 3;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

interface LifecycleRule {
  statusColumn: string;
  timestampColumn: string;
  activeValue: string;
  nullWhenActive: boolean;
  confidence: 'high' | 'medium';
}

interface TemporalPair {
  baseColumn: string;
  dependentColumn: string;
  minOffsetDays: number;
  maxOffsetDays: number;
  confidence: 'high' | 'medium';
}

interface InferredTable {
  name: string;
  columns: InferredColumn[];
  lifecycleRules: LifecycleRule[];
  temporalPairs: TemporalPair[];
  isRoot: boolean;
  generationOrder: number;
  rowRatio: number; // multiplier relative to base row count
}

interface ReviewItem {
  tier: 2 | 3;
  table: string;
  column?: string;
  inference: string;
  confidence: 'high' | 'medium' | 'low';
  action: string;
}

// ============================================================
// DDL PARSER
// ============================================================

function parseDDL(content: string): SchemaTable[] {
  const tables: SchemaTable[] = [];
  // Match CREATE TABLE blocks — handle both single-line and multi-line
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([\s\S]*?)\);/gi;

  let match;
  while ((match = createRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];
    const columns: SchemaColumn[] = [];
    const foreignKeys: SchemaFK[] = [];

    // Track inline PRIMARY KEY
    let pkColumns: string[] = [];

    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '').trim();
      if (!line || line.startsWith('--')) continue;

      // Table-level PRIMARY KEY
      const pkMatch = line.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkColumns = pkMatch[1].split(',').map(c => c.trim().replace(/["'`]/g, ''));
        continue;
      }

      // FOREIGN KEY
      const fkMatch = line.match(/FOREIGN\s+KEY\s*\(["'`]?(\w+)["'`]?\)\s*REFERENCES\s+["'`]?(\w+)["'`]?\s*\(["'`]?(\w+)["'`]?\)/i);
      if (fkMatch) {
        foreignKeys.push({ column: fkMatch[1], refTable: fkMatch[2], refColumn: fkMatch[3] });
        continue;
      }

      // Skip constraints
      if (/^(UNIQUE|CHECK|CONSTRAINT|INDEX)/i.test(line)) continue;

      // Column definition
      const colMatch = line.match(/^["'`]?(\w+)["'`]?\s+(\w[\w\s(),.]*)/i);
      if (colMatch) {
        const colName = colMatch[1];
        const rest = colMatch[2];
        const type = rest.split(/\s/)[0].toUpperCase();
        const nullable = !rest.toUpperCase().includes('NOT NULL');
        const isPK = rest.toUpperCase().includes('PRIMARY KEY');
        const defaultMatch = rest.match(/DEFAULT\s+(.+?)(?:\s|$)/i);

        // Detect inline REFERENCES (e.g., "user_id UUID NOT NULL REFERENCES users(id)")
        const inlineRefMatch = rest.match(/REFERENCES\s+(?:["'`]?)(\w+(?:\.\w+)?)(?:["'`]?)\s*\(["'`]?(\w+)["'`]?\)/i);
        if (inlineRefMatch) {
          const refTableRaw = inlineRefMatch[1];
          const refColumn = inlineRefMatch[2];
          // Handle schema-qualified names like auth.users -> skip external schemas
          const refTable = refTableRaw.includes('.') ? refTableRaw.split('.').pop() : refTableRaw;
          foreignKeys.push({ column: colName, refTable: refTable, refColumn: refColumn });
        }

        columns.push({
          name: colName,
          type,
          nullable,
          isPrimaryKey: isPK,
          defaultValue: defaultMatch ? defaultMatch[1] : undefined,
        });
      }
    }

    // Apply table-level PK
    for (const pkCol of pkColumns) {
      const col = columns.find(c => c.name === pkCol);
      if (col) col.isPrimaryKey = true;
    }

    // Auto-detect PK if none declared: column named 'id' is likely PK
    if (!columns.some(c => c.isPrimaryKey)) {
      const idCol = columns.find(c => c.name === 'id');
      if (idCol) idCol.isPrimaryKey = true;
    }

    tables.push({ name: tableName, columns, foreignKeys });
  }

  // Parse ALTER TABLE ... ADD COLUMN ... REFERENCES
  const alterRegex = /ALTER\s+TABLE\s+(?:public\.)?["'`]?(\w+)["'`]?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s+(\w[\w()]*)[^;]*REFERENCES\s+(?:["'`]?)(\w+(?:\.\w+)?)(?:["'`]?)\s*\(["'`]?(\w+)["'`]?\)/gi;
  let alterMatch;
  while ((alterMatch = alterRegex.exec(content)) !== null) {
    const tableName = alterMatch[1];
    const colName = alterMatch[2];
    const colType = alterMatch[3].toUpperCase();
    const refTableRaw = alterMatch[4];
    const refColumn = alterMatch[5];
    const refTable = refTableRaw.includes('.') ? refTableRaw.split('.').pop() : refTableRaw;

    const table = tables.find(t => t.name === tableName);
    if (table) {
      // Add column if not already present
      if (!table.columns.find(c => c.name === colName)) {
        table.columns.push({ name: colName, type: colType, nullable: true, isPrimaryKey: false });
      }
      // Add FK if not already present
      if (!table.foreignKeys.find(fk => fk.column === colName)) {
        table.foreignKeys.push({ column: colName, refTable, refColumn });
      }
    }
  }

  return tables;
}

// ============================================================
// STRATEGY INFERENCE ENGINE
// ============================================================

interface StrategyRule {
  namePatterns: RegExp[];
  typePatterns?: RegExp[];
  strategy: string;
  confidence: 'high' | 'medium' | 'low';
  enumValues?: string[];
  enumWeights?: number[];
}

const STRATEGY_RULES: StrategyRule[] = [
  // === IDs ===
  { namePatterns: [/^id$/i], typePatterns: [/UUID/i], strategy: 'uuid', confidence: 'high' },
  { namePatterns: [/^id$/i], typePatterns: [/INT|SERIAL|BIGINT/i], strategy: 'autoIncrement', confidence: 'high' },
  { namePatterns: [/_id$/i], strategy: 'uuid', confidence: 'high' }, // FK references handled separately

  // === Names ===
  { namePatterns: [/^first.?name$/i], strategy: 'firstName', confidence: 'high' },
  { namePatterns: [/^last.?name$/i, /^surname$/i, /^family.?name$/i], strategy: 'lastName', confidence: 'high' },
  { namePatterns: [/^full.?name$/i, /^display.?name$/i, /^name$/i], strategy: 'fullName', confidence: 'medium' },
  { namePatterns: [/^username$/i, /^user.?name$/i, /^login$/i, /^screen.?name$/i], strategy: 'username', confidence: 'high' },

  // === Contact ===
  { namePatterns: [/^email$/i, /^e.?mail$/i, /^email.?addr/i], strategy: 'email', confidence: 'high' },
  { namePatterns: [/^phone$/i, /^phone.?num/i, /^mobile$/i, /^cell$/i, /^telephone$/i], strategy: 'phone', confidence: 'high' },

  // === Location ===
  { namePatterns: [/^address$/i, /^street$/i, /^street.?addr/i, /^addr.?line/i], strategy: 'streetAddress', confidence: 'high' },
  { namePatterns: [/^city$/i], strategy: 'city', confidence: 'high' },
  { namePatterns: [/^state$/i, /^province$/i], strategy: 'state', confidence: 'high' },
  { namePatterns: [/^country$/i], strategy: 'country', confidence: 'high' },
  { namePatterns: [/^zip$/i, /^zip.?code$/i, /^postal$/i, /^postal.?code$/i], strategy: 'zipCode', confidence: 'high' },
  { namePatterns: [/^latitude$/i, /^lat$/i], strategy: 'latitude', confidence: 'high' },
  { namePatterns: [/^longitude$/i, /^lng$/i, /^lon$/i], strategy: 'longitude', confidence: 'high' },

  // === Dates/Times ===
  { namePatterns: [/^created.?at$/i, /^created.?on$/i, /^created.?date$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^updated.?at$/i, /^modified.?at$/i, /^last.?modified$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^deleted.?at$/i, /^archived.?at$/i, /^removed.?at$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^closed.?at$/i, /^cancelled.?at$/i, /^resolved.?at$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^completed.?at$/i, /^finished.?at$/i, /^ended.?at$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^settled.?at$/i, /^processed.?at$/i, /^approved.?at$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^start.?date$/i, /^begin.?date$/i, /^effective.?from$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/^end.?date$/i, /^expire/i, /^expir/i, /^effective.?to$/i], strategy: 'future_date', confidence: 'medium' },
  { namePatterns: [/^dob$/i, /^date.?of.?birth$/i, /^birth.?date$/i, /^birthday$/i], strategy: 'past_date', confidence: 'high' },
  { namePatterns: [/_at$/i], typePatterns: [/TIMESTAMP|DATETIME|DATE/i], strategy: 'past_date', confidence: 'medium' },

  // === Money ===
  { namePatterns: [/^amount$/i, /^total$/i, /^price$/i, /^cost$/i, /^fee$/i], strategy: 'decimal', confidence: 'high' },
  { namePatterns: [/^balance$/i, /^credit$/i, /^debit$/i], strategy: 'decimal', confidence: 'high' },
  { namePatterns: [/^salary$/i, /^income$/i, /^wage$/i, /^compensation$/i], strategy: 'decimal', confidence: 'high' },
  { namePatterns: [/^principal/i, /^interest.?rate$/i, /^rate$/i], strategy: 'decimal', confidence: 'high' },
  { namePatterns: [/^credit.?limit$/i], strategy: 'decimal', confidence: 'high' },

  // === Scores/Counts ===
  { namePatterns: [/^score$/i, /^rating$/i, /^rank$/i], strategy: 'integer', confidence: 'medium' },
  { namePatterns: [/^count$/i, /^quantity$/i, /^qty$/i, /^num$/i], strategy: 'integer', confidence: 'high' },
  { namePatterns: [/^age$/i], strategy: 'integer', confidence: 'high' },

  // === Booleans ===
  { namePatterns: [/^is_/i, /^has_/i, /^can_/i, /^should_/i, /^was_/i], strategy: 'boolean', confidence: 'high' },
  { namePatterns: [/^active$/i, /^enabled$/i, /^verified$/i, /^visible$/i], strategy: 'boolean', confidence: 'medium' },

  // === Text ===
  { namePatterns: [/^description$/i, /^desc$/i, /^notes?$/i, /^comment$/i, /^body$/i], strategy: 'sentence', confidence: 'medium' },
  { namePatterns: [/^title$/i, /^subject$/i, /^headline$/i], strategy: 'sentence', confidence: 'medium' },
  { namePatterns: [/^url$/i, /^website$/i, /^link$/i, /^href$/i], strategy: 'url', confidence: 'high' },
  { namePatterns: [/^image$/i, /^avatar$/i, /^photo$/i, /^picture$/i, /^thumbnail$/i], strategy: 'url', confidence: 'medium' },

  // === Common enums (with suggested values) ===
  { namePatterns: [/^status$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['active', 'inactive', 'suspended'], enumWeights: [70, 20, 10] },
  { namePatterns: [/^priority$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['low', 'medium', 'high', 'critical'], enumWeights: [30, 40, 20, 10] },
  { namePatterns: [/^severity$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['low', 'medium', 'high', 'critical'], enumWeights: [40, 30, 20, 10] },
  { namePatterns: [/^gender$/i, /^sex$/i], strategy: 'enum', confidence: 'high',
    enumValues: ['male', 'female', 'non_binary', 'prefer_not_to_say'], enumWeights: [45, 45, 5, 5] },
  { namePatterns: [/^role$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['admin', 'user', 'editor', 'viewer'], enumWeights: [5, 70, 15, 10] },
  { namePatterns: [/^category$/i, /^type$/i], strategy: 'enum', confidence: 'low',
    enumValues: ['type_a', 'type_b', 'type_c'], enumWeights: [40, 35, 25] },
  { namePatterns: [/^tier$/i, /^level$/i, /^grade$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['basic', 'standard', 'premium'], enumWeights: [50, 35, 15] },
  { namePatterns: [/^channel$/i, /^source$/i], strategy: 'enum', confidence: 'low',
    enumValues: ['web', 'mobile', 'api', 'other'], enumWeights: [40, 35, 15, 10] },
  { namePatterns: [/^region$/i, /^zone$/i, /^area$/i], strategy: 'enum', confidence: 'low',
    enumValues: ['north', 'south', 'east', 'west'], enumWeights: [25, 25, 25, 25] },
  { namePatterns: [/^currency$/i], strategy: 'enum', confidence: 'high',
    enumValues: ['USD', 'EUR', 'GBP', 'JPY'], enumWeights: [50, 25, 15, 10] },
  { namePatterns: [/^payment.?method$/i], strategy: 'enum', confidence: 'medium',
    enumValues: ['credit_card', 'debit_card', 'bank_transfer', 'paypal'], enumWeights: [40, 25, 20, 15] },
];

function inferStrategy(col: SchemaColumn, tableName: string): { strategy: string; confidence: 'high' | 'medium' | 'low'; enumValues?: string[]; enumWeights?: number[]; notes: string[] } {
  const notes: string[] = [];

  // PK handling
  if (col.isPrimaryKey) {
    if (/UUID/i.test(col.type)) return { strategy: 'uuid', confidence: 'high', notes: ['Primary key (UUID)'] };
    if (/INT|SERIAL|BIGINT/i.test(col.type)) return { strategy: 'autoIncrement', confidence: 'high', notes: ['Primary key (auto-increment)'] };
    return { strategy: 'uuid', confidence: 'medium', notes: ['Primary key (defaulted to UUID)'] };
  }

  // Match against strategy rules
  for (const rule of STRATEGY_RULES) {
    const nameMatch = rule.namePatterns.some(p => p.test(col.name));
    const typeMatch = !rule.typePatterns || rule.typePatterns.some(p => p.test(col.type));

    if (nameMatch && typeMatch) {
      if (rule.enumValues) {
        notes.push(`Inferred enum from column name "${col.name}"`);
      }
      return {
        strategy: rule.strategy,
        confidence: rule.confidence,
        enumValues: rule.enumValues,
        enumWeights: rule.enumWeights,
        notes,
      };
    }
  }

  // Type-based fallbacks
  if (/BOOLEAN/i.test(col.type)) return { strategy: 'boolean', confidence: 'medium', notes: ['Inferred from BOOLEAN type'] };
  if (/TIMESTAMP|DATETIME/i.test(col.type)) return { strategy: 'past_date', confidence: 'medium', notes: ['Inferred from TIMESTAMP type'] };
  if (/DATE/i.test(col.type)) return { strategy: 'past_date', confidence: 'medium', notes: ['Inferred from DATE type'] };
  if (/NUMERIC|DECIMAL|FLOAT|DOUBLE|REAL|MONEY/i.test(col.type)) return { strategy: 'decimal', confidence: 'medium', notes: ['Inferred from numeric type'] };
  if (/INT|INTEGER|BIGINT|SMALLINT/i.test(col.type)) return { strategy: 'integer', confidence: 'medium', notes: ['Inferred from integer type'] };
  if (/TEXT|VARCHAR|CHAR|STRING/i.test(col.type)) {
    // Check if column name suggests an enum (short varchar)
    const maxLen = col.type.match(/\((\d+)\)/);
    if (maxLen && parseInt(maxLen[1]) <= 50) {
      notes.push(`Short VARCHAR(${maxLen[1]}) — could be enum. Review values.`);
      return { strategy: 'word', confidence: 'low', notes };
    }
    return { strategy: 'sentence', confidence: 'low', notes: ['Generic text — review strategy'] };
  }
  if (/JSON|JSONB/i.test(col.type)) return { strategy: 'json', confidence: 'low', notes: ['JSON column — will generate empty object'] };

  notes.push(`Unknown type "${col.type}" — defaulted to word`);
  return { strategy: 'word', confidence: 'low', notes };
}

// ============================================================
// LIFECYCLE DETECTION
// ============================================================

function detectLifecycleRules(table: SchemaTable): LifecycleRule[] {
  const rules: LifecycleRule[] = [];
  const statusCol = table.columns.find(c => /^status$/i.test(c.name));
  if (!statusCol) return rules;

  // Look for nullable _at columns that pair with status
  const lifecyclePairs = [
    { pattern: /^closed.?at$/i, activeValue: 'active' },
    { pattern: /^cancelled.?at$/i, activeValue: 'active' },
    { pattern: /^deleted.?at$/i, activeValue: 'active' },
    { pattern: /^archived.?at$/i, activeValue: 'active' },
    { pattern: /^resolved.?at$/i, activeValue: 'open' },
    { pattern: /^completed.?at$/i, activeValue: 'pending' },
    { pattern: /^defaulted.?at$/i, activeValue: 'current' },
    { pattern: /^suspended.?at$/i, activeValue: 'active' },
    { pattern: /^deactivated.?at$/i, activeValue: 'active' },
    { pattern: /^terminated.?at$/i, activeValue: 'active' },
  ];

  for (const pair of lifecyclePairs) {
    const tsCol = table.columns.find(c => pair.pattern.test(c.name) && c.nullable);
    if (tsCol) {
      rules.push({
        statusColumn: statusCol.name,
        timestampColumn: tsCol.name,
        activeValue: pair.activeValue,
        nullWhenActive: true,
        confidence: 'high',
      });
    }
  }

  return rules;
}

// ============================================================
// TEMPORAL PAIR DETECTION
// ============================================================

function detectTemporalPairs(table: SchemaTable): TemporalPair[] {
  const pairs: TemporalPair[] = [];
  const createdAt = table.columns.find(c => /^created.?at$/i.test(c.name));
  if (!createdAt) return pairs;

  // Other timestamp columns that should be after created_at
  const afterPatterns = [
    { pattern: /^updated.?at$/i, minDays: 0, maxDays: 30 },
    { pattern: /^modified.?at$/i, minDays: 0, maxDays: 30 },
    { pattern: /^settled.?at$/i, minDays: 1, maxDays: 30 },
    { pattern: /^processed.?at$/i, minDays: 0, maxDays: 7 },
    { pattern: /^approved.?at$/i, minDays: 0, maxDays: 14 },
    { pattern: /^completed.?at$/i, minDays: 1, maxDays: 60 },
    { pattern: /^resolved.?at$/i, minDays: 1, maxDays: 90 },
    { pattern: /^closed.?at$/i, minDays: 1, maxDays: 180 },
    { pattern: /^cancelled.?at$/i, minDays: 0, maxDays: 30 },
    { pattern: /^deleted.?at$/i, minDays: 1, maxDays: 365 },
    { pattern: /^shipped.?at$/i, minDays: 1, maxDays: 7 },
    { pattern: /^delivered.?at$/i, minDays: 2, maxDays: 14 },
    { pattern: /^paid.?at$/i, minDays: 0, maxDays: 30 },
    { pattern: /^expired.?at$/i, minDays: 30, maxDays: 365 },
    { pattern: /^verified.?at$/i, minDays: 0, maxDays: 7 },
  ];

  for (const ap of afterPatterns) {
    const depCol = table.columns.find(c => ap.pattern.test(c.name));
    if (depCol) {
      pairs.push({
        baseColumn: createdAt.name,
        dependentColumn: depCol.name,
        minOffsetDays: ap.minDays,
        maxOffsetDays: ap.maxDays,
        confidence: 'high',
      });
    }
  }

  // Also check start_date → end_date patterns
  const startDate = table.columns.find(c => /^start.?date$/i.test(c.name) || /^effective.?from$/i.test(c.name));
  const endDate = table.columns.find(c => /^end.?date$/i.test(c.name) || /^effective.?to$/i.test(c.name));
  if (startDate && endDate) {
    pairs.push({
      baseColumn: startDate.name,
      dependentColumn: endDate.name,
      minOffsetDays: 7,
      maxOffsetDays: 365,
      confidence: 'high',
    });
  }

  return pairs;
}

// ============================================================
// TOPOLOGICAL SORT
// ============================================================

function topologicalSort(tables: SchemaTable[]): string[] {
  const graph = new Map<string, Set<string>>();
  const allNames = new Set(tables.map(t => t.name));

  for (const t of tables) {
    graph.set(t.name, new Set());
    for (const fk of t.foreignKeys) {
      if (allNames.has(fk.refTable) && fk.refTable !== t.name) {
        graph.get(t.name)!.add(fk.refTable);
      }
    }
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // cycle — skip
    visiting.add(name);
    for (const dep of graph.get(name) || []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const name of allNames) visit(name);
  return sorted;
}

// ============================================================
// PACK JSON BUILDER
// ============================================================

function buildPackJson(inferredTables: InferredTable[]): object {
  const tables: any[] = [];

  for (const t of inferredTables) {
    const columns: any[] = [];

    for (const col of t.columns) {
      const colDef: any = {
        name: col.name,
        strategy: col.strategy,
      };

      if (col.foreignKey) {
        colDef.foreignKey = { table: col.foreignKey.table, column: col.foreignKey.column };
      }

      if (col.enumValues && col.enumValues.length > 0) {
        colDef.values = col.enumValues;
        if (col.enumWeights) colDef.weights = col.enumWeights;
      }

      if (col.nullable && col.nullPercentage > 0) {
        colDef.nullPercentage = col.nullPercentage;
      }

      if (col.dependsOn) {
        colDef.dependsOn = col.dependsOn;
      }

      columns.push(colDef);
    }

    const tableDef: any = {
      name: t.name,
      rowMultiplier: t.rowRatio,
      columns,
    };

    // Add lifecycle rules
    if (t.lifecycleRules.length > 0) {
      tableDef.lifecycleRules = t.lifecycleRules.map(lr => ({
        statusColumn: lr.statusColumn,
        timestampColumn: lr.timestampColumn,
        rules: [
          { when: lr.activeValue, then: { [lr.timestampColumn]: null } },
        ],
      }));
    }

    // Add temporal pairs as column dependencies
    if (t.temporalPairs.length > 0) {
      tableDef.temporalRules = t.temporalPairs.map(tp => ({
        column: tp.dependentColumn,
        after: tp.baseColumn,
        minOffsetDays: tp.minOffsetDays,
        maxOffsetDays: tp.maxOffsetDays,
      }));
    }

    tables.push(tableDef);
  }

  return {
    $schema: 'realitydb-pack-v1',
    name: 'inferred-pack',
    version: '1.0.0',
    generatedBy: 'realitydb scan --infer',
    generatedAt: new Date().toISOString(),
    tables,
  };
}

// ============================================================
// REVIEW MANIFEST BUILDER
// ============================================================

function buildReviewManifest(inferredTables: InferredTable[], reviewItems: ReviewItem[]): string {
  const lines: string[] = [];
  lines.push('# RealityDB Scan — Review Manifest');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Tables: ${inferredTables.length}`);
  lines.push(`> Total columns: ${inferredTables.reduce((s, t) => s + t.columns.length, 0)}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  const tier1 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 1).length, 0);
  const tier2 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 2).length, 0);
  const tier3 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 3).length, 0);

  lines.push(`- **Tier 1** (auto-applied, high confidence): ${tier1} columns`);
  lines.push(`- **Tier 2** (heuristic, flagged for review): ${tier2} columns`);
  lines.push(`- **Tier 3** (needs developer input): ${tier3} columns`);
  lines.push('');

  const lifecycleCount = inferredTables.reduce((s, t) => s + t.lifecycleRules.length, 0);
  const temporalCount = inferredTables.reduce((s, t) => s + t.temporalPairs.length, 0);
  lines.push(`- **Lifecycle rules detected**: ${lifecycleCount}`);
  lines.push(`- **Temporal pairs detected**: ${temporalCount}`);
  lines.push('');

  // Review items
  if (reviewItems.length > 0) {
    lines.push('## Items to Review');
    lines.push('');

    const tier2Items = reviewItems.filter(r => r.tier === 2);
    const tier3Items = reviewItems.filter(r => r.tier === 3);

    if (tier2Items.length > 0) {
      lines.push('### Tier 2 — Heuristic Inferences (applied, verify correctness)');
      lines.push('');
      for (const item of tier2Items) {
        lines.push(`- **${item.table}${item.column ? '.' + item.column : ''}**: ${item.inference}`);
        lines.push(`  - Action: ${item.action}`);
      }
      lines.push('');
    }

    if (tier3Items.length > 0) {
      lines.push('### Tier 3 — Needs Developer Input');
      lines.push('');
      for (const item of tier3Items) {
        lines.push(`- **${item.table}${item.column ? '.' + item.column : ''}**: ${item.inference}`);
        lines.push(`  - Action: ${item.action}`);
      }
      lines.push('');
    }
  }

  // Per-table details
  lines.push('## Table Details');
  lines.push('');
  for (const t of inferredTables) {
    lines.push(`### ${t.name} ${t.isRoot ? '(root)' : `(refs: ${t.columns.filter(c => c.foreignKey).map(c => c.foreignKey!.table).join(', ')})`}`);
    lines.push(`- Generation order: ${t.generationOrder}`);
    lines.push(`- Row ratio: ${t.rowRatio}x`);
    if (t.lifecycleRules.length > 0) {
      lines.push(`- Lifecycle: ${t.lifecycleRules.map(lr => `${lr.statusColumn} → ${lr.timestampColumn} (null when ${lr.activeValue})`).join(', ')}`);
    }
    if (t.temporalPairs.length > 0) {
      lines.push(`- Temporal: ${t.temporalPairs.map(tp => `${tp.dependentColumn} after ${tp.baseColumn} (+${tp.minOffsetDays}-${tp.maxOffsetDays}d)`).join(', ')}`);
    }
    lines.push('');

    lines.push('| Column | Strategy | Confidence | FK | Nullable | Notes |');
    lines.push('|--------|----------|------------|-----|----------|-------|');
    for (const col of t.columns) {
      const fk = col.foreignKey ? `→ ${col.foreignKey.table}.${col.foreignKey.column}` : '';
      const notes = col.notes.length > 0 ? col.notes.join('; ') : '';
      const nullStr = col.nullable ? `${col.nullPercentage}%` : 'NOT NULL';
      lines.push(`| ${col.name} | ${col.strategy} | ${col.confidence} | ${fk} | ${nullStr} | ${notes} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================
// MAIN INFERENCE PIPELINE
// ============================================================

function runInference(schemaTables: SchemaTable[]): { inferredTables: InferredTable[]; reviewItems: ReviewItem[] } {
  const reviewItems: ReviewItem[] = [];

  // Step 1: Topological sort
  const sortOrder = topologicalSort(schemaTables);
  const orderMap = new Map<string, number>();
  sortOrder.forEach((name, i) => orderMap.set(name, i));

  // Step 2: Identify root vs child tables
  const tableNames = new Set(schemaTables.map(t => t.name));
  const childTables = new Set<string>();
  for (const t of schemaTables) {
    if (t.foreignKeys.some(fk => tableNames.has(fk.refTable) && fk.refTable !== t.name)) {
      childTables.add(t.name);
    }
  }

  // Step 3: Infer each table
  const inferredTables: InferredTable[] = [];

  for (const table of schemaTables) {
    const isRoot = !childTables.has(table.name);
    const lifecycleRules = detectLifecycleRules(table);
    const temporalPairs = detectTemporalPairs(table);

    // Determine row ratio based on table position
    const parentCount = table.foreignKeys.filter(fk => tableNames.has(fk.refTable) && fk.refTable !== table.name).length;
    let rowRatio = 1;
    if (isRoot) {
      rowRatio = 1; // Root tables get 1x base count
    } else if (parentCount === 1) {
      rowRatio = 0.5; // Simple child: half the rows per parent
    } else {
      rowRatio = 0.5; // Multi-FK child: same default
    }

    // Infer columns
    const inferredColumns: InferredColumn[] = [];
    const lifecycleTimestamps = new Set(lifecycleRules.map(lr => lr.timestampColumn));

    for (const col of table.columns) {
      // Check if this column is a FK reference
      const fk = table.foreignKeys.find(f => f.column === col.name);

      if (fk && tableNames.has(fk.refTable)) {
        // FK column — strategy is reference
        inferredColumns.push({
          name: col.name,
          type: col.type,
          strategy: 'uuid', // will be resolved by FK reference
          nullable: col.nullable,
          nullPercentage: col.nullable ? 10 : 0,
          isPrimaryKey: col.isPrimaryKey,
          foreignKey: { table: fk.refTable, column: fk.refColumn },
          tier: 1,
          confidence: 'high',
          notes: [`FK → ${fk.refTable}.${fk.refColumn}`],
        });
        continue;
      }

      // Regular column inference
      const inferred = inferStrategy(col, table.name);
      let nullPct = 0;
      if (col.nullable) {
        if (lifecycleTimestamps.has(col.name)) {
          // Lifecycle columns have high null rate (most records are in "active" state)
          nullPct = 70;
        } else {
          nullPct = 15; // Default nullable percentage
        }
      }

      const tier: 1 | 2 | 3 = inferred.confidence === 'high' ? 1 : inferred.confidence === 'medium' ? 2 : 3;

      inferredColumns.push({
        name: col.name,
        type: col.type,
        strategy: inferred.strategy,
        nullable: col.nullable,
        nullPercentage: nullPct,
        isPrimaryKey: col.isPrimaryKey,
        enumValues: inferred.enumValues,
        enumWeights: inferred.enumWeights,
        tier,
        confidence: inferred.confidence,
        notes: inferred.notes,
      });

      // Add review items for Tier 2 and 3
      if (tier === 2) {
        reviewItems.push({
          tier: 2,
          table: table.name,
          column: col.name,
          inference: `Strategy "${inferred.strategy}" inferred from column name/type`,
          confidence: inferred.confidence,
          action: inferred.enumValues
            ? `Review enum values: [${inferred.enumValues.join(', ')}]. Adjust to match your domain.`
            : 'Verify strategy is correct for your domain.',
        });
      } else if (tier === 3) {
        reviewItems.push({
          tier: 3,
          table: table.name,
          column: col.name,
          inference: `Low confidence: "${inferred.strategy}" — ${inferred.notes.join('; ')}`,
          confidence: 'low',
          action: 'Set the correct strategy and/or enum values in the pack JSON.',
        });
      }
    }

    // Add review items for lifecycle rules
    for (const lr of lifecycleRules) {
      reviewItems.push({
        tier: 2,
        table: table.name,
        inference: `Lifecycle: ${lr.statusColumn} controls ${lr.timestampColumn} (null when "${lr.activeValue}")`,
        confidence: lr.confidence,
        action: `Verify "${lr.activeValue}" is the correct active status value.`,
      });
    }

    // Add review items for temporal pairs
    for (const tp of temporalPairs) {
      reviewItems.push({
        tier: 2,
        table: table.name,
        inference: `Temporal: ${tp.dependentColumn} after ${tp.baseColumn} (+${tp.minOffsetDays}-${tp.maxOffsetDays} days)`,
        confidence: tp.confidence,
        action: 'Verify offset range matches your domain.',
      });
    }

    inferredTables.push({
      name: table.name,
      columns: inferredColumns,
      lifecycleRules,
      temporalPairs,
      isRoot,
      generationOrder: orderMap.get(table.name) || 0,
      rowRatio,
    });
  }

  // Sort by generation order
  inferredTables.sort((a, b) => a.generationOrder - b.generationOrder);

  return { inferredTables, reviewItems };
}

// ============================================================
// COMMAND
// ============================================================

export async function scanInferCommand(file: string, options: {
  output?: string;
  review?: string;
  json?: boolean;
}): Promise<void> {
  const filePath = path.resolve(file);

  if (!fs.existsSync(filePath)) {
    console.error(`\n   \u274C File not found: ${filePath}`);
    process.exit(1);
  }

  const startTime = Date.now();
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse DDL
  const schemaTables = parseDDL(content);

  if (schemaTables.length === 0) {
    console.error(`\n   \u274C No CREATE TABLE statements found in ${path.basename(filePath)}`);
    console.error(`   Supported: SQL DDL files with CREATE TABLE statements\n`);
    process.exit(1);
  }

  console.log(`\n\u{1F50D} RealityDB Schema Scanner`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`   File: ${path.basename(filePath)}`);
  console.log(`   Tables detected: ${schemaTables.length}`);
  console.log(`   Total columns: ${schemaTables.reduce((s, t) => s + t.columns.length, 0)}`);
  console.log(`   Foreign keys: ${schemaTables.reduce((s, t) => s + t.foreignKeys.length, 0)}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Run inference
  const { inferredTables, reviewItems } = runInference(schemaTables);

  const elapsed = Date.now() - startTime;

  // Stats
  const tier1 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 1).length, 0);
  const tier2 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 2).length, 0);
  const tier3 = inferredTables.reduce((s, t) => s + t.columns.filter(c => c.tier === 3).length, 0);
  const lifecycleCount = inferredTables.reduce((s, t) => s + t.lifecycleRules.length, 0);
  const temporalCount = inferredTables.reduce((s, t) => s + t.temporalPairs.length, 0);

  // Console output
  console.log(`   \u2705 Tier 1 (auto-applied):     ${tier1} columns`);
  console.log(`   \u26A0\uFE0F  Tier 2 (heuristic):        ${tier2} columns — review recommended`);
  if (tier3 > 0) console.log(`   \u{1F534} Tier 3 (needs input):     ${tier3} columns — action required`);
  console.log();

  if (lifecycleCount > 0) {
    console.log(`   \u{1F504} Lifecycle rules detected: ${lifecycleCount}`);
    for (const t of inferredTables) {
      for (const lr of t.lifecycleRules) {
        console.log(`      ${t.name}: ${lr.statusColumn} \u2192 ${lr.timestampColumn} (null when "${lr.activeValue}")`);
      }
    }
    console.log();
  }

  if (temporalCount > 0) {
    console.log(`   \u23F1\uFE0F  Temporal pairs detected: ${temporalCount}`);
    for (const t of inferredTables) {
      for (const tp of t.temporalPairs) {
        console.log(`      ${t.name}: ${tp.dependentColumn} after ${tp.baseColumn} (+${tp.minOffsetDays}-${tp.maxOffsetDays}d)`);
      }
    }
    console.log();
  }

  // Generation order
  console.log(`   \u{1F4CA} Generation order:`);
  for (const t of inferredTables) {
    const icon = t.isRoot ? '\u{1F333}' : '\u{1F517}';
    const refs = t.columns.filter(c => c.foreignKey).map(c => c.foreignKey!.table);
    const refStr = refs.length > 0 ? ` (refs: ${refs.join(', ')})` : '';
    console.log(`      ${t.generationOrder + 1}. ${icon} ${t.name} [${t.rowRatio}x]${refStr}`);
  }
  console.log();

  // Build pack JSON
  const packJson = buildPackJson(inferredTables);
  const packPath = options.output || filePath.replace(/\.\w+$/, '.realitydb-pack.json');
  fs.writeFileSync(packPath, JSON.stringify(packJson, null, 2), 'utf-8');

  // Build review manifest
  const reviewManifest = buildReviewManifest(inferredTables, reviewItems);
  const reviewPath = options.review || filePath.replace(/\.\w+$/, '.REVIEW.md');
  fs.writeFileSync(reviewPath, reviewManifest, 'utf-8');

  console.log(`${'─'.repeat(60)}`);
  console.log(`   \u{1F4E6} Pack JSON: ${packPath}`);
  console.log(`   \u{1F4CB} Review manifest: ${reviewPath}`);
  console.log(`   Scanned in ${elapsed}ms\n`);
  console.log(`   Next steps:`);
  console.log(`   1. Review ${path.basename(reviewPath)} for Tier 2/3 items`);
  console.log(`   2. Edit ${path.basename(packPath)} to adjust enum values and strategies`);
  console.log(`   3. Test: realitydb run --pack ${path.basename(packPath)} --rows 100 --format sql`);
  console.log(`   4. Validate: realitydb doctor --pack ${path.basename(packPath)}`);
  suggestNext({
    command: 'scan:infer',
    packFile: packPath,
    reviewFile: reviewPath,
    tier2Count: tier2,
    tier3Count: tier3,
    tableCount: inferredTables.length,
    fkCount: schemaTables.reduce((s, t) => s + t.foreignKeys.length, 0),
    lifecycleCount,
    temporalCount,
  });
}
