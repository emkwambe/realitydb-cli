export interface RawTableInfo {
  table_name: string;
  table_schema: string;
  table_type: string;
}

export interface RawColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  ordinal_position: number;
}

export interface RawForeignKeyInfo {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
}

export interface RawPrimaryKeyInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
}
