import type { NormalizedTable } from './types';

export function normalizeTables(pack: any): { tables: NormalizedTable[]; templateName: string } {
  let tables: NormalizedTable[] = [];
  const templateName = pack.name || 'custom';

  if (pack.tables) {
    if (Array.isArray(pack.tables)) {
      // Check if this is Studio v4.3.0 format (array of { id, name, columns: [...] })
      const isStudioFormat = pack.tables.length > 0 && pack.tables[0].id && Array.isArray(pack.tables[0].columns);

      if (isStudioFormat) {
        // Build lookup maps: tableId -> tableName, columnId -> columnName
        const tableIdToName: Record<string, string> = {};
        const columnIdToName: Record<string, string> = {};
        for (const t of pack.tables) {
          tableIdToName[t.id] = t.name;
          if (Array.isArray(t.columns)) {
            for (const col of t.columns) {
              columnIdToName[col.id] = col.name;
            }
          }
        }

        tables = pack.tables.map((t: any) => {
          const columnsObj: Record<string, any> = {};
          const fks: Array<{ column: string; references: { table: string; column: string } }> = [];

          if (Array.isArray(t.columns)) {
            for (const col of t.columns) {
              const colEntry: any = {};
              if (col.strategy) colEntry.strategy = col.strategy;
              if (col.options) colEntry.options = col.options;
              if (col.isPK) colEntry.isPK = true;

              if (col.isFK && col.fkTarget) {
                const refTableName = tableIdToName[col.fkTarget.tableId];
                const refColName = columnIdToName[col.fkTarget.columnId];
                if (refTableName && refColName) {
                  colEntry.foreignKey = { table: refTableName, column: refColName };
                  colEntry.strategy = colEntry.strategy || 'uuid';
                  fks.push({
                    column: col.name,
                    references: { table: refTableName, column: refColName },
                  });
                }
              }

              columnsObj[col.name] = colEntry;
            }
          }

          return {
            name: t.name,
            columns: columnsObj,
            foreignKeys: fks,
          };
        });
      } else {
        // Format 1: plain array of { name, columns: {...}, ... }
        tables = pack.tables.map((t: any) => ({
          name: t.name || t.table_name || 'unknown',
          columns: t.columns || t.schema || {},
          foreignKeys: extractForeignKeys(t.columns || t.schema || {}),
        }));
      }
    } else if (typeof pack.tables === 'object') {
      // Format 2: tables is an object keyed by table name (Studio export format)
      tables = Object.entries(pack.tables).map(([tableName, tableDef]: [string, any]) => ({
        name: tableName,
        columns: tableDef.columns || tableDef.schema || {},
        foreignKeys: extractForeignKeys(tableDef.columns || tableDef.schema || {}),
      }));
    }
  }

  // Fallback: look for tables nested in schema or config
  if (tables.length === 0) {
    for (const key of ['schema', 'config', 'database']) {
      const nested = pack[key];
      if (nested?.tables) {
        const result = normalizeTables({ ...pack, tables: nested.tables, name: templateName });
        if (result.tables.length > 0) return result;
      }
    }
  }

  return { tables, templateName };
}

export function extractForeignKeys(columns: Record<string, any>): Array<{ column: string; references: { table: string; column: string } }> {
  const fks: Array<{ column: string; references: { table: string; column: string } }> = [];
  for (const [colName, colDef] of Object.entries(columns)) {
    if (colDef && typeof colDef === 'object' && colDef.foreignKey) {
      fks.push({
        column: colName,
        references: {
          table: colDef.foreignKey.table,
          column: colDef.foreignKey.column,
        },
      });
    }
  }
  return fks;
}
