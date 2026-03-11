import type { DatabaseSchema, TableSchema, ColumnSchema, ForeignKeySchema } from './types.js';

/**
 * Parses CREATE TABLE statements from a SQL string into a DatabaseSchema.
 * Supports standard PostgreSQL DDL syntax. No database connection required.
 */
export function parseSQLSchema(sql: string): DatabaseSchema {
  const tables: TableSchema[] = [];
  const foreignKeys: ForeignKeySchema[] = [];

  // Match CREATE TABLE statements (case-insensitive, multiline)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([\s\S]*?)\);/gi;

  let match: RegExpExecArray | null;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const schemaName = match[1] ?? 'public';
    const tableName = match[2];
    const body = match[3];

    const { columns, primaryKey, tableForeignKeys } = parseTableBody(tableName, body);

    tables.push({
      name: tableName,
      schema: schemaName,
      columns,
      primaryKey,
      estimatedRowCount: 0,
    });

    foreignKeys.push(...tableForeignKeys);
  }

  // Also parse standalone ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY
  const alterFkRegex = /ALTER\s+TABLE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+(?:CONSTRAINT\s+"?\w+"?\s+)?FOREIGN\s+KEY\s*\("?(\w+)"?\)\s*REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\("?(\w+)"?\)/gi;
  while ((match = alterFkRegex.exec(sql)) !== null) {
    foreignKeys.push({
      constraintName: `fk_${match[2]}_${match[3]}`,
      sourceTable: match[2],
      sourceColumn: match[3],
      targetTable: match[5],
      targetColumn: match[6],
    });
  }

  return {
    tables,
    foreignKeys,
    tableCount: tables.length,
    foreignKeyCount: foreignKeys.length,
  };
}

interface ParsedTableBody {
  columns: ColumnSchema[];
  primaryKey: TableSchema['primaryKey'];
  tableForeignKeys: ForeignKeySchema[];
}

function parseTableBody(tableName: string, body: string): ParsedTableBody {
  const columns: ColumnSchema[] = [];
  const tableForeignKeys: ForeignKeySchema[] = [];
  let primaryKey: TableSchema['primaryKey'] = null;

  // Split by commas, but respect parentheses (for CHECK constraints, etc.)
  const parts = splitTableBody(body);
  let ordinal = 1;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Table-level PRIMARY KEY
    const pkMatch = trimmed.match(/^PRIMARY\s+KEY\s*\("?(\w+)"?\)/i);
    if (pkMatch) {
      primaryKey = { columnName: pkMatch[1], constraintName: `pk_${tableName}` };
      // Mark the column as PK
      const col = columns.find((c) => c.name === pkMatch[1]);
      if (col) col.isPrimaryKey = true;
      continue;
    }

    // Table-level FOREIGN KEY
    const fkMatch = trimmed.match(
      /^(?:CONSTRAINT\s+"?\w+"?\s+)?FOREIGN\s+KEY\s*\("?(\w+)"?\)\s*REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\("?(\w+)"?\)/i,
    );
    if (fkMatch) {
      tableForeignKeys.push({
        constraintName: `fk_${tableName}_${fkMatch[1]}`,
        sourceTable: tableName,
        sourceColumn: fkMatch[1],
        targetTable: fkMatch[3],
        targetColumn: fkMatch[4],
      });
      continue;
    }

    // Table-level UNIQUE or CHECK constraints — skip
    if (/^(?:UNIQUE|CHECK|CONSTRAINT)\s/i.test(trimmed)) {
      continue;
    }

    // Column definition
    const column = parseColumnDef(trimmed, tableName, ordinal);
    if (column) {
      columns.push(column.col);
      if (column.fk) tableForeignKeys.push(column.fk);
      if (column.col.isPrimaryKey) {
        primaryKey = { columnName: column.col.name, constraintName: `pk_${tableName}` };
      }
      ordinal++;
    }
  }

  return { columns, primaryKey, tableForeignKeys };
}

function parseColumnDef(
  def: string,
  tableName: string,
  ordinal: number,
): { col: ColumnSchema; fk?: ForeignKeySchema } | null {
  // Match: column_name data_type [constraints...]
  const colMatch = def.match(/^"?(\w+)"?\s+(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?)(.*)/i);
  if (!colMatch) return null;

  const name = colMatch[1];
  const rawType = colMatch[2].trim();
  const constraints = colMatch[3] ?? '';

  // Normalize type
  const { dataType, udtName, maxLength } = normalizeDataType(rawType);

  const isNullable = !/NOT\s+NULL/i.test(constraints);
  const isPrimaryKey = /PRIMARY\s+KEY/i.test(constraints);
  const isUnique = /UNIQUE/i.test(constraints) || isPrimaryKey;
  const defaultMatch = constraints.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT|NULL|PRIMARY|UNIQUE|REFERENCES|CHECK|CONSTRAINT)|$)/i);
  const hasDefault = !!defaultMatch || /SERIAL|GENERATED/i.test(rawType + constraints);
  const defaultValue = defaultMatch ? defaultMatch[1].trim() : null;

  // Inline REFERENCES
  let fk: ForeignKeySchema | undefined;
  const refMatch = constraints.match(/REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\("?(\w+)"?\)/i);
  if (refMatch) {
    fk = {
      constraintName: `fk_${tableName}_${name}`,
      sourceTable: tableName,
      sourceColumn: name,
      targetTable: refMatch[2],
      targetColumn: refMatch[3],
    };
  }

  return {
    col: {
      name,
      dataType,
      udtName,
      isNullable,
      hasDefault,
      defaultValue,
      maxLength,
      isPrimaryKey,
      isUnique,
      ordinalPosition: ordinal,
    },
    fk,
  };
}

function normalizeDataType(raw: string): { dataType: string; udtName: string; maxLength: number | null } {
  const lower = raw.toLowerCase().trim();

  // Extract length from varchar(N), char(N), etc.
  const lengthMatch = lower.match(/(?:varchar|character varying|char|character)\s*\((\d+)\)/);
  const maxLength = lengthMatch ? parseInt(lengthMatch[1], 10) : null;

  // Map common SQL types to PostgreSQL internal types
  const typeMap: Record<string, { dataType: string; udtName: string }> = {
    serial: { dataType: 'integer', udtName: 'int4' },
    bigserial: { dataType: 'bigint', udtName: 'int8' },
    smallserial: { dataType: 'smallint', udtName: 'int2' },
    integer: { dataType: 'integer', udtName: 'int4' },
    int: { dataType: 'integer', udtName: 'int4' },
    bigint: { dataType: 'bigint', udtName: 'int8' },
    smallint: { dataType: 'smallint', udtName: 'int2' },
    real: { dataType: 'real', udtName: 'float4' },
    float: { dataType: 'double precision', udtName: 'float8' },
    'double precision': { dataType: 'double precision', udtName: 'float8' },
    numeric: { dataType: 'numeric', udtName: 'numeric' },
    decimal: { dataType: 'numeric', udtName: 'numeric' },
    boolean: { dataType: 'boolean', udtName: 'bool' },
    bool: { dataType: 'boolean', udtName: 'bool' },
    text: { dataType: 'text', udtName: 'text' },
    uuid: { dataType: 'uuid', udtName: 'uuid' },
    json: { dataType: 'json', udtName: 'json' },
    jsonb: { dataType: 'jsonb', udtName: 'jsonb' },
    date: { dataType: 'date', udtName: 'date' },
    timestamp: { dataType: 'timestamp without time zone', udtName: 'timestamp' },
    'timestamp with time zone': { dataType: 'timestamp with time zone', udtName: 'timestamptz' },
    timestamptz: { dataType: 'timestamp with time zone', udtName: 'timestamptz' },
  };

  // Strip length specifier for lookup
  const baseLower = lower.replace(/\s*\([^)]*\)/, '').trim();
  const mapped = typeMap[baseLower];
  if (mapped) {
    return { ...mapped, maxLength };
  }

  // varchar/character varying
  if (baseLower.startsWith('varchar') || baseLower.startsWith('character varying')) {
    return { dataType: 'character varying', udtName: 'varchar', maxLength };
  }
  if (baseLower.startsWith('char') || baseLower.startsWith('character')) {
    return { dataType: 'character', udtName: 'bpchar', maxLength };
  }

  // Fallback
  return { dataType: lower, udtName: lower, maxLength };
}

/**
 * Splits table body by top-level commas, respecting parentheses nesting.
 */
function splitTableBody(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of body) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}
