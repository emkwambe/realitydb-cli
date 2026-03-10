import type { DatabaseSchema, TableSchema, ColumnSchema, ForeignKeySchema } from './types.js';

/**
 * Generates CREATE TABLE DDL statements from a DatabaseSchema.
 * Tables are ordered by dependency (parents first).
 * Output is valid, runnable SQL.
 */
export function generateCreateTableDDL(schema: DatabaseSchema): string {
  const orderedNames = orderByDependency(schema.tables, schema.foreignKeys);

  const tableMap = new Map<string, TableSchema>();
  for (const table of schema.tables) {
    tableMap.set(table.name, table);
  }

  const fksBySource = new Map<string, ForeignKeySchema[]>();
  for (const fk of schema.foreignKeys) {
    const existing = fksBySource.get(fk.sourceTable) ?? [];
    existing.push(fk);
    fksBySource.set(fk.sourceTable, existing);
  }

  const statements: string[] = [];

  for (const tableName of orderedNames) {
    const table = tableMap.get(tableName);
    if (!table) continue;

    const columnDefs = table.columns
      .sort((a, b) => a.ordinalPosition - b.ordinalPosition)
      .map((col) => formatColumnDef(col));

    if (table.primaryKey) {
      columnDefs.push(`  PRIMARY KEY ("${table.primaryKey.columnName}")`);
    }

    const tableFks = fksBySource.get(tableName) ?? [];
    for (const fk of tableFks) {
      columnDefs.push(
        `  FOREIGN KEY ("${fk.sourceColumn}") REFERENCES "${fk.targetTable}" ("${fk.targetColumn}")`,
      );
    }

    statements.push(
      `CREATE TABLE "${tableName}" (\n${columnDefs.join(',\n')}\n);`,
    );
  }

  return statements.join('\n\n') + '\n';
}

function formatColumnDef(col: ColumnSchema): string {
  let typeName = col.dataType.toUpperCase();

  if (col.maxLength && (typeName === 'CHARACTER VARYING' || typeName === 'VARCHAR')) {
    typeName = `VARCHAR(${col.maxLength})`;
  }

  let def = `  "${col.name}" ${typeName}`;

  if (!col.isNullable) {
    def += ' NOT NULL';
  }

  if (col.hasDefault && col.defaultValue !== null) {
    def += ` DEFAULT ${col.defaultValue}`;
  }

  return def;
}

/**
 * Simple topological sort for dependency ordering.
 * Parents (tables referenced by FKs) come first.
 */
function orderByDependency(
  tables: TableSchema[],
  foreignKeys: ForeignKeySchema[],
): string[] {
  const tableNames = new Set(tables.map((t) => t.name));
  const deps = new Map<string, Set<string>>();

  for (const name of tableNames) {
    deps.set(name, new Set());
  }

  for (const fk of foreignKeys) {
    if (fk.sourceTable !== fk.targetTable && tableNames.has(fk.targetTable)) {
      deps.get(fk.sourceTable)!.add(fk.targetTable);
    }
  }

  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // cycle — skip
    visiting.add(name);
    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }
    visiting.delete(name);
    visited.add(name);
    result.push(name);
  }

  for (const name of tableNames) {
    visit(name);
  }

  return result;
}
