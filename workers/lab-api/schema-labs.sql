-- labs table — created directly in the live D1 (realitydb-labs), not via a
-- migration file. This DDL is reconstructed verbatim from the live database
-- (SELECT sql FROM sqlite_master WHERE name='labs') so the repo tracks the
-- authoritative schema.
--
-- seed column added 2026-07-10 via:
--   ALTER TABLE labs ADD COLUMN seed INTEGER
CREATE TABLE IF NOT EXISTS labs (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  name              TEXT NOT NULL,
  template          TEXT NOT NULL,
  rows              INTEGER NOT NULL,
  neon_branch_id    TEXT NOT NULL,
  neon_endpoint_id  TEXT NOT NULL,
  connection_string TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TEXT NOT NULL,
  expires_at        TEXT NOT NULL,
  deleted_at        TEXT,
  seed              INTEGER
);
