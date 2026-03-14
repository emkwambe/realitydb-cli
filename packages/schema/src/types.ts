export interface DatabaseSchema {
  tables: TableSchema[];
  foreignKeys: ForeignKeySchema[];
  tableCount: number;
  foreignKeyCount: number;
}

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnSchema[];
  primaryKey: PrimaryKeySchema | null;
  estimatedRowCount: number;
}

export interface ColumnSchema {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue: string | null;
  maxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  isPrimaryKey: boolean;
  isUnique: boolean;
  ordinalPosition: number;
}

export interface PrimaryKeySchema {
  columnName: string;
  constraintName: string;
}

export interface ForeignKeySchema {
  constraintName: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
}
