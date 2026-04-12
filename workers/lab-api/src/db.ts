import type { Lab } from './types';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS labs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  rows INTEGER NOT NULL,
  neon_branch_id TEXT NOT NULL,
  neon_endpoint_id TEXT NOT NULL,
  connection_string TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_labs_user ON labs(user_id);
CREATE INDEX IF NOT EXISTS idx_labs_status ON labs(status);
CREATE INDEX IF NOT EXISTS idx_labs_expires ON labs(expires_at);

CREATE TABLE IF NOT EXISTS saved_queries (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  sql TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lab_id) REFERENCES labs(id)
);

CREATE INDEX IF NOT EXISTS idx_saved_queries_lab ON saved_queries(lab_id);
`;

export async function initDB(db: D1Database): Promise<void> {
  await db.exec(SCHEMA_SQL);
}

export async function insertLab(db: D1Database, lab: Lab): Promise<void> {
  await db.prepare(`
    INSERT INTO labs (id, user_id, name, template, rows, neon_branch_id, neon_endpoint_id, connection_string, status, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    lab.id, lab.user_id, lab.name, lab.template, lab.rows,
    lab.neon_branch_id, lab.neon_endpoint_id, lab.connection_string,
    lab.status, lab.expires_at,
  ).run();
}

export async function getLab(db: D1Database, id: string): Promise<Lab | null> {
  const result = await db.prepare('SELECT * FROM labs WHERE id = ?').bind(id).first<Lab>();
  return result || null;
}

export async function listLabsByUser(db: D1Database, userId: string): Promise<Lab[]> {
  const result = await db.prepare(
    "SELECT * FROM labs WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 50"
  ).bind(userId).all<Lab>();
  return result.results;
}

export async function listAllLabs(db: D1Database): Promise<Lab[]> {
  const result = await db.prepare(
    "SELECT * FROM labs WHERE status = 'active' ORDER BY created_at DESC LIMIT 100"
  ).all<Lab>();
  return result.results;
}

export async function updateLabStatus(db: D1Database, id: string, status: string): Promise<void> {
  await db.prepare('UPDATE labs SET status = ? WHERE id = ?').bind(status, id).run();
}

export async function updateLabExpiry(db: D1Database, id: string, expiresAt: string): Promise<void> {
  await db.prepare('UPDATE labs SET expires_at = ? WHERE id = ?').bind(expiresAt, id).run();
}

export async function softDeleteLab(db: D1Database, id: string): Promise<void> {
  await db.prepare(
    "UPDATE labs SET status = 'expired', deleted_at = datetime('now') WHERE id = ?"
  ).bind(id).run();
}

// ---------------------------------------------------------------------------
// Saved Queries
// ---------------------------------------------------------------------------

export interface SavedQuery {
  id: string;
  lab_id: string;
  title: string;
  sql: string;
  created_at: string;
}

export async function getSavedQueries(db: D1Database, labId: string): Promise<SavedQuery[]> {
  const result = await db.prepare(
    'SELECT * FROM saved_queries WHERE lab_id = ? ORDER BY created_at ASC'
  ).bind(labId).all<SavedQuery>();
  return result.results;
}
