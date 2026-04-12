import type { Env, Lab } from './types';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS labs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 5000,
  table_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'creating',
  branch_id TEXT NOT NULL,
  connection_string TEXT NOT NULL DEFAULT '',
  read_only_connection TEXT DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  error_message TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_labs_status ON labs(status);
CREATE INDEX IF NOT EXISTS idx_labs_expires ON labs(expires_at);
`;

export async function initDB(db: D1Database): Promise<void> {
  await db.exec(SCHEMA_SQL);
}

export async function createLab(db: D1Database, lab: Omit<Lab, 'created_at'>): Promise<void> {
  await db.prepare(`
    INSERT INTO labs (id, name, template, rows, table_count, status, branch_id, connection_string, tier, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    lab.id, lab.name, lab.template, lab.rows, lab.table_count,
    lab.status, lab.branch_id, lab.connection_string, lab.tier, lab.expires_at,
  ).run();
}

export async function getLab(db: D1Database, id: string): Promise<Lab | null> {
  const result = await db.prepare('SELECT * FROM labs WHERE id = ?').bind(id).first<Lab>();
  return result || null;
}

export async function listLabs(db: D1Database): Promise<Lab[]> {
  const result = await db.prepare(
    "SELECT * FROM labs WHERE status != 'expired' ORDER BY created_at DESC LIMIT 50"
  ).all<Lab>();
  return result.results;
}

export async function updateLab(db: D1Database, id: string, updates: Partial<Lab>): Promise<void> {
  const fields = Object.entries(updates)
    .filter(([_, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  const values = Object.entries(updates)
    .filter(([_, v]) => v !== undefined)
    .map(([_, v]) => v);

  if (fields.length === 0) return;

  await db.prepare(`UPDATE labs SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteLab(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM labs WHERE id = ?').bind(id).run();
}

export async function getExpiredLabs(db: D1Database): Promise<Lab[]> {
  const result = await db.prepare(
    "SELECT * FROM labs WHERE expires_at < datetime('now') AND status != 'expired'"
  ).all<Lab>();
  return result.results;
}
