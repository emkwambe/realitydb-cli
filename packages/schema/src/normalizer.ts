import type {
  DatabaseSchema,
  TableSchema,
  ColumnSchema,
  PrimaryKeySchema,
  ForeignKeySchema,
} from './types.js';
import type { RawTableInfo, RawColumnInfo, RawForeignKeyInfo, RawPrimaryKeyInfo } from './introspection/rawTypes.js';

export interface RawIntrospectionData {
  tables: RawTableInfo[];
  columns: RawColumnInfo[];
  foreignKeys: RawForeignKeyInfo[];
  primaryKeys: RawPrimaryKeyInfo[];
}

export function normalizeSchema(raw: RawIntrospectionData): DatabaseSchema {
  const primaryKeyMap = new Map<string, RawPrimaryKeyInfo>();
  for (const pk of raw.primaryKeys) {
    primaryKeyMap.set(pk.table_name, pk);
  }

  const columnsByTable = new Map<string, RawColumnInfo[]>();
  for (const col of raw.columns) {
    const existing = columnsByTable.get(col.table_name) ?? [];
    existing.push(col);
    columnsByTable.set(col.table_name, existing);
  }

  const foreignKeys: ForeignKeySchema[] = raw.foreignKeys.map((fk) => ({
    constraintName: fk.constraint_name,
    sourceTable: fk.source_table,
    sourceColumn: fk.source_column,
    targetTable: fk.target_table,
    targetColumn: fk.target_column,
  }));

  const tables: TableSchema[] = [];

  for (const rawTable of raw.tables) {
    const rawCols = columnsByTable.get(rawTable.table_name);

    if (!rawCols || rawCols.length === 0) {
      console.warn(
        `[databox] Table "${rawTable.table_name}" has no columns — excluding from schema`,
      );
      continue;
    }

    const pk = primaryKeyMap.get(rawTable.table_name) ?? null;

    const primaryKey: PrimaryKeySchema | null = pk
      ? { columnName: pk.column_name, constraintName: pk.constraint_name }
      : null;

    const columns: ColumnSchema[] = rawCols.map((col) => ({
      name: col.column_name,
      dataType: col.data_type,
      udtName: col.udt_name,
      isNullable: col.is_nullable === 'YES',
      hasDefault: col.column_default !== null,
      defaultValue: col.column_default,
      maxLength: col.character_maximum_length,
      isPrimaryKey: pk !== null && pk.column_name === col.column_name,
      isUnique: false,
      ordinalPosition: col.ordinal_position,
    }));

    tables.push({
      name: rawTable.table_name,
      schema: rawTable.table_schema,
      columns,
      primaryKey,
      estimatedRowCount: 0,
    });
  }

  return {
    tables,
    foreignKeys,
    tableCount: tables.length,
    foreignKeyCount: foreignKeys.length,
  };
}
