import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;
let currentTemplate: string | null = null;

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
  error?: string;
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string; isPrimaryKey: boolean }[];
  rowCount: number;
}

export async function initSandbox(templateId: string, sql: string): Promise<void> {
  if (currentTemplate === templateId && db) return;
  await resetSandbox();
  db = new PGlite();
  await db.waitReady;
  await db.exec(sql);
  currentTemplate = templateId;
}

export async function runQuery(sql: string): Promise<QueryResult> {
  if (!db) throw new Error('Database not initialized');
  const start = performance.now();
  try {
    const result = await db.exec(sql);
    const duration = Math.round(performance.now() - start);
    const last = result[result.length - 1];
    if (!last || !last.fields) {
      return { columns: [], rows: [], rowCount: 0, duration };
    }
    const columns = last.fields.map((f: { name: string }) => f.name);
    const rows = (last.rows || []) as Record<string, unknown>[];
    return { columns, rows, rowCount: rows.length, duration };
  } catch (e: unknown) {
    const duration = Math.round(performance.now() - start);
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      duration,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function getSchemaInfo(): Promise<TableInfo[]> {
  if (!db) return [];
  const tablesResult = await db.exec(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  const tables: TableInfo[] = [];
  for (const row of (tablesResult[0]?.rows || []) as Record<string, unknown>[]) {
    const tableName = row.table_name as string;
    const colsResult = await db.exec(`
      SELECT c.column_name, c.data_type, c.udt_name,
        CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_pk
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
      WHERE c.table_schema = 'public' AND c.table_name = '${tableName}'
      ORDER BY c.ordinal_position
    `);
    const countResult = await db.exec(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
    const rowCount = Number((countResult[0]?.rows?.[0] as Record<string, unknown>)?.cnt || 0);
    const columns = ((colsResult[0]?.rows || []) as Record<string, unknown>[]).map((col) => ({
      name: col.column_name as string,
      type: (col.udt_name as string || col.data_type as string).toUpperCase(),
      isPrimaryKey: col.is_pk === true || col.is_pk === 't',
    }));
    tables.push({ name: tableName, columns, rowCount });
  }
  return tables;
}

export async function resetSandbox(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
  currentTemplate = null;
}
