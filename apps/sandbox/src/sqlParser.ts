/**
 * Lightweight SQL parser for pedagogical use.
 * Extracts tables, columns, join paths, and clause structure from SELECT queries.
 * Not a full SQL parser — handles common patterns for the sandbox teaching tool.
 */

export interface ParsedQuery {
  tables: TableRef[];
  columns: ColumnRef[];
  joinPaths: JoinPath[];
  clauses: SQLClause[];
}

export interface TableRef {
  name: string;
  alias?: string;
}

export interface ColumnRef {
  table?: string;  // table name or alias
  column: string;
}

export interface JoinPath {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface SQLClause {
  type: 'FROM' | 'JOIN' | 'WHERE' | 'GROUP BY' | 'HAVING' | 'SELECT' | 'ORDER BY' | 'LIMIT';
  raw: string;        // the clause text
  description: string; // human-readable explanation
}

/**
 * Resolves an alias or table name to the actual table name.
 */
function resolveAlias(nameOrAlias: string, tables: TableRef[]): string {
  const lower = nameOrAlias.toLowerCase();
  for (const t of tables) {
    if (t.alias?.toLowerCase() === lower) return t.name;
    if (t.name.toLowerCase() === lower) return t.name;
  }
  return nameOrAlias;
}

/**
 * Parses a SELECT query into structured components.
 */
export function parseSQL(sql: string): ParsedQuery {
  const tables: TableRef[] = [];
  const columns: ColumnRef[] = [];
  const joinPaths: JoinPath[] = [];
  const clauses: SQLClause[] = [];

  // Normalize whitespace
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // Extract FROM tables
  const fromMatch = normalized.match(/\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/i);
  if (fromMatch) {
    const name = fromMatch[1];
    const alias = fromMatch[2] && !isKeyword(fromMatch[2]) ? fromMatch[2] : undefined;
    tables.push({ name, alias });
  }

  // Extract JOIN tables and paths
  const joinRe = /\b((?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
  let joinMatch;
  while ((joinMatch = joinRe.exec(normalized)) !== null) {
    const name = joinMatch[2];
    const alias = joinMatch[3] && !isKeyword(joinMatch[3]) ? joinMatch[3] : undefined;
    tables.push({ name, alias });

    const left = parseColRef(joinMatch[4]);
    const right = parseColRef(joinMatch[5]);
    if (left && right) {
      joinPaths.push({
        fromTable: resolveAlias(left.table || '', [...tables]),
        fromColumn: left.column,
        toTable: resolveAlias(right.table || '', [...tables]),
        toColumn: right.column,
      });
    }
  }

  // Extract SELECT columns
  const selectMatch = normalized.match(/^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM\b/i);
  if (selectMatch) {
    const colsStr = selectMatch[2];
    if (colsStr.trim() !== '*') {
      const colParts = splitTopLevel(colsStr);
      for (const part of colParts) {
        const cleaned = part.trim().replace(/\s+AS\s+\w+$/i, '');
        // Skip aggregates and expressions for now, extract inner column refs
        const refs = extractColumnRefs(cleaned);
        columns.push(...refs);
      }
    } else {
      // SELECT * — all columns from all tables
      columns.push({ column: '*' });
    }
  }

  // Extract column refs from WHERE clause
  const whereMatch = normalized.match(/\bWHERE\s+(.+?)(?:\bGROUP\b|\bHAVING\b|\bORDER\b|\bLIMIT\b|$)/i);
  if (whereMatch) {
    const refs = extractColumnRefs(whereMatch[1]);
    columns.push(...refs);
  }

  // Extract GROUP BY columns
  const groupMatch = normalized.match(/\bGROUP\s+BY\s+(.+?)(?:\bHAVING\b|\bORDER\b|\bLIMIT\b|$)/i);
  if (groupMatch) {
    const refs = extractColumnRefs(groupMatch[1]);
    columns.push(...refs);
  }

  // Extract ORDER BY columns
  const orderMatch = normalized.match(/\bORDER\s+BY\s+(.+?)(?:\bLIMIT\b|$)/i);
  if (orderMatch) {
    const refs = extractColumnRefs(orderMatch[1]);
    columns.push(...refs);
  }

  // Resolve aliases to table names in column refs
  for (const col of columns) {
    if (col.table) {
      col.table = resolveAlias(col.table, tables);
    }
  }

  // Build clauses for transformation viewer
  buildClauses(normalized, clauses);

  return { tables, columns, joinPaths, clauses };
}

function isKeyword(word: string): boolean {
  const keywords = new Set([
    'where', 'join', 'inner', 'left', 'right', 'outer', 'cross', 'full',
    'on', 'group', 'order', 'having', 'limit', 'offset', 'union', 'except',
    'intersect', 'and', 'or', 'not', 'in', 'between', 'like', 'is', 'null',
    'select', 'from', 'as', 'set', 'values', 'into', 'distinct',
  ]);
  return keywords.has(word.toLowerCase());
}

function parseColRef(ref: string): ColumnRef | null {
  const parts = ref.split('.');
  if (parts.length === 2) {
    return { table: parts[0], column: parts[1] };
  }
  if (parts.length === 1) {
    return { column: parts[0] };
  }
  return null;
}

function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function extractColumnRefs(expr: string): ColumnRef[] {
  const refs: ColumnRef[] = [];
  // Match table.column or standalone column patterns
  const re = /\b(\w+)\.(\w+)\b/g;
  let m;
  while ((m = re.exec(expr)) !== null) {
    // Skip function names
    if (!isKeyword(m[1]) && !isKeyword(m[2])) {
      refs.push({ table: m[1], column: m[2] });
    }
  }
  // Also match standalone column names (not inside functions, not numbers, not keywords)
  const standalone = /\b([a-zA-Z_]\w*)\b/g;
  while ((m = standalone.exec(expr)) !== null) {
    const word = m[1];
    if (!isKeyword(word) && !/^\d+$/.test(word) && !isAggFunction(word)) {
      // Check it's not already captured as table.column
      const alreadyCaptured = refs.some(r => r.table === word || (r.column === word && !r.table));
      if (!alreadyCaptured) {
        refs.push({ column: word });
      }
    }
  }
  return refs;
}

function isAggFunction(word: string): boolean {
  const aggs = new Set(['count', 'sum', 'avg', 'min', 'max', 'array_agg', 'string_agg', 'coalesce', 'round', 'cast', 'extract', 'date_trunc', 'lower', 'upper', 'trim', 'length', 'substring', 'concat', 'now', 'current_date', 'current_timestamp', 'abs', 'ceil', 'floor']);
  return aggs.has(word.toLowerCase());
}

function buildClauses(sql: string, clauses: SQLClause[]): void {
  // Identify clause boundaries using regex
  // Order matters: we parse top-down through the SQL structure

  const fromMatch = sql.match(/\bFROM\s+(\w+(?:\s+(?:AS\s+)?\w+)?)/i);
  if (fromMatch) {
    clauses.push({
      type: 'FROM',
      raw: fromMatch[0],
      description: `Load rows from ${fromMatch[1].split(/\s+/)[0]}`,
    });
  }

  // JOINs
  const joinRe = /\b((?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+[^)]+?(?=\s+(?:LEFT|RIGHT|INNER|OUTER|CROSS|FULL|WHERE|GROUP|HAVING|ORDER|LIMIT|JOIN)\b|$)/gi;
  let jm;
  while ((jm = joinRe.exec(sql)) !== null) {
    const joinType = (jm[1] || 'INNER').trim().toUpperCase();
    clauses.push({
      type: 'JOIN',
      raw: jm[0].trim(),
      description: `${joinType} JOIN with ${jm[2]} — combine matching rows`,
    });
  }

  const whereMatch = sql.match(/\bWHERE\s+(.+?)(?=\s+GROUP\b|\s+HAVING\b|\s+ORDER\b|\s+LIMIT\b|$)/i);
  if (whereMatch) {
    clauses.push({
      type: 'WHERE',
      raw: `WHERE ${whereMatch[1].trim()}`,
      description: `Filter rows where ${summarizeCondition(whereMatch[1].trim())}`,
    });
  }

  const groupMatch = sql.match(/\bGROUP\s+BY\s+(.+?)(?=\s+HAVING\b|\s+ORDER\b|\s+LIMIT\b|$)/i);
  if (groupMatch) {
    clauses.push({
      type: 'GROUP BY',
      raw: `GROUP BY ${groupMatch[1].trim()}`,
      description: `Group rows by ${groupMatch[1].trim()}`,
    });
  }

  const havingMatch = sql.match(/\bHAVING\s+(.+?)(?=\s+ORDER\b|\s+LIMIT\b|$)/i);
  if (havingMatch) {
    clauses.push({
      type: 'HAVING',
      raw: `HAVING ${havingMatch[1].trim()}`,
      description: `Filter groups where ${summarizeCondition(havingMatch[1].trim())}`,
    });
  }

  const selectMatch = sql.match(/^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM\b/i);
  if (selectMatch) {
    const cols = selectMatch[2].trim();
    clauses.push({
      type: 'SELECT',
      raw: `SELECT ${selectMatch[1] || ''}${cols}`,
      description: cols === '*' ? 'Select all columns' : `Project ${splitTopLevel(cols).length} column(s)`,
    });
  }

  const orderMatch = sql.match(/\bORDER\s+BY\s+(.+?)(?=\s+LIMIT\b|$)/i);
  if (orderMatch) {
    clauses.push({
      type: 'ORDER BY',
      raw: `ORDER BY ${orderMatch[1].trim()}`,
      description: `Sort by ${orderMatch[1].trim()}`,
    });
  }

  const limitMatch = sql.match(/\bLIMIT\s+(\d+)/i);
  if (limitMatch) {
    clauses.push({
      type: 'LIMIT',
      raw: `LIMIT ${limitMatch[1]}`,
      description: `Return first ${limitMatch[1]} row(s)`,
    });
  }
}

function summarizeCondition(cond: string): string {
  // Truncate long conditions
  if (cond.length > 60) return cond.slice(0, 57) + '...';
  return cond;
}

/**
 * Build partial queries for the transformation viewer.
 * Each step adds one clause and returns a query that can be executed
 * to show the intermediate result at that stage.
 */
export function buildStepQueries(sql: string): { label: string; description: string; sql: string; clauseType: string }[] {
  const steps: { label: string; description: string; sql: string; clauseType: string }[] = [];
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // Extract parts
  const fromMatch = normalized.match(/\bFROM\s+(.+?)(?=\s+WHERE\b|\s+GROUP\b|\s+HAVING\b|\s+ORDER\b|\s+LIMIT\b|;?\s*$)/i);
  const whereMatch = normalized.match(/\bWHERE\s+(.+?)(?=\s+GROUP\b|\s+HAVING\b|\s+ORDER\b|\s+LIMIT\b|;?\s*$)/i);
  const groupMatch = normalized.match(/\bGROUP\s+BY\s+(.+?)(?=\s+HAVING\b|\s+ORDER\b|\s+LIMIT\b|;?\s*$)/i);
  const havingMatch = normalized.match(/\bHAVING\s+(.+?)(?=\s+ORDER\b|\s+LIMIT\b|;?\s*$)/i);
  const selectMatch = normalized.match(/^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM\b/i);
  const orderMatch = normalized.match(/\bORDER\s+BY\s+(.+?)(?=\s+LIMIT\b|;?\s*$)/i);
  const limitMatch = normalized.match(/\bLIMIT\s+(\d+)/i);

  if (!fromMatch) return steps;

  const fromClause = fromMatch[1].trim();
  // Extract the base table name for display
  const baseTable = fromClause.split(/\s+/)[0];

  // Step 1: FROM — show raw table data
  steps.push({
    label: 'FROM',
    description: `Load all rows from ${baseTable}`,
    sql: `SELECT * FROM ${fromClause} LIMIT 10`,
    clauseType: 'FROM',
  });

  // Step 2: WHERE — show filtered data
  if (whereMatch) {
    steps.push({
      label: 'WHERE',
      description: `Filter: ${summarizeCondition(whereMatch[1].trim())}`,
      sql: `SELECT * FROM ${fromClause} WHERE ${whereMatch[1].trim()} LIMIT 10`,
      clauseType: 'WHERE',
    });
  }

  // Step 3: GROUP BY
  if (groupMatch) {
    const selectCols = selectMatch ? `${selectMatch[1] || ''}${selectMatch[2].trim()}` : '*';
    let q = `SELECT ${selectCols} FROM ${fromClause}`;
    if (whereMatch) q += ` WHERE ${whereMatch[1].trim()}`;
    q += ` GROUP BY ${groupMatch[1].trim()}`;
    steps.push({
      label: 'GROUP BY',
      description: `Group by ${groupMatch[1].trim()}`,
      sql: q,
      clauseType: 'GROUP BY',
    });
  }

  // Step 4: HAVING
  if (havingMatch && groupMatch) {
    const selectCols = selectMatch ? `${selectMatch[1] || ''}${selectMatch[2].trim()}` : '*';
    let q = `SELECT ${selectCols} FROM ${fromClause}`;
    if (whereMatch) q += ` WHERE ${whereMatch[1].trim()}`;
    q += ` GROUP BY ${groupMatch[1].trim()}`;
    q += ` HAVING ${havingMatch[1].trim()}`;
    steps.push({
      label: 'HAVING',
      description: `Filter groups: ${summarizeCondition(havingMatch[1].trim())}`,
      sql: q,
      clauseType: 'HAVING',
    });
  }

  // Step 5: SELECT (projection) — show with correct columns
  if (selectMatch && selectMatch[2].trim() !== '*') {
    const selectCols = `${selectMatch[1] || ''}${selectMatch[2].trim()}`;
    let q = `SELECT ${selectCols} FROM ${fromClause}`;
    if (whereMatch) q += ` WHERE ${whereMatch[1].trim()}`;
    if (groupMatch) q += ` GROUP BY ${groupMatch[1].trim()}`;
    if (havingMatch) q += ` HAVING ${havingMatch[1].trim()}`;
    q += ' LIMIT 10';
    steps.push({
      label: 'SELECT',
      description: `Project columns: ${selectCols.length > 40 ? selectCols.slice(0, 37) + '...' : selectCols}`,
      sql: q,
      clauseType: 'SELECT',
    });
  }

  // Step 6: ORDER BY
  if (orderMatch) {
    const selectCols = selectMatch ? `${selectMatch[1] || ''}${selectMatch[2].trim()}` : '*';
    let q = `SELECT ${selectCols} FROM ${fromClause}`;
    if (whereMatch) q += ` WHERE ${whereMatch[1].trim()}`;
    if (groupMatch) q += ` GROUP BY ${groupMatch[1].trim()}`;
    if (havingMatch) q += ` HAVING ${havingMatch[1].trim()}`;
    q += ` ORDER BY ${orderMatch[1].trim()}`;
    q += ' LIMIT 10';
    steps.push({
      label: 'ORDER BY',
      description: `Sort by ${orderMatch[1].trim()}`,
      sql: q,
      clauseType: 'ORDER BY',
    });
  }

  // Step 7: LIMIT (only if explicit in original query)
  if (limitMatch) {
    steps.push({
      label: 'LIMIT',
      description: `Return first ${limitMatch[1]} row(s)`,
      sql: normalized.replace(/;?\s*$/, ''),
      clauseType: 'LIMIT',
    });
  }

  return steps;
}
