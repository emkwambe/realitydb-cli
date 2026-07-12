-- experiments and all experiment_* tables — created directly in the live
-- D1 (realitydb-labs), not via a migration file. This DDL is reconstructed
-- verbatim from the live database (SELECT sql FROM sqlite_master WHERE
-- type='table' AND name LIKE 'experiment%') so the repo tracks the
-- authoritative schema, same precedent as schema-labs.sql.
--
-- Dumped 2026-07-12.

CREATE TABLE experiments (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  lab_id            TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  slug              TEXT UNIQUE,
  title             TEXT NOT NULL,
  question          TEXT,
  findings          TEXT,
  authors           TEXT,
  tags              TEXT,                        -- comma-separated, NOT JSON
  license           TEXT DEFAULT 'CC-BY-4.0',
  template          TEXT,
  template_version  TEXT,
  seed              INTEGER,
  lab_version       TEXT,
  engine_version    TEXT,
  environment       TEXT,                         -- JSON string
  forked_from_id    TEXT,
  view_count        INTEGER DEFAULT 0,
  fork_count        INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT,
  published_at      TEXT,
  rows              INTEGER,
  visibility        TEXT NOT NULL DEFAULT 'private', -- private|workspace|specific_people|unlisted|public
  workspace_id      TEXT,
  key_findings      TEXT,                            -- added 2026-07-12 for landing page depth (Sub-Sprint 2B)
  limitations       TEXT,                             -- added 2026-07-12 for landing page depth (Sub-Sprint 2B)
  future_work       TEXT                              -- added 2026-07-12 for landing page depth (Sub-Sprint 2B)
);
CREATE INDEX idx_experiments_status ON experiments(status, published_at);
CREATE INDEX idx_experiments_workspace ON experiments(workspace_id);

CREATE TABLE experiment_evidence (
  id            TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  type          TEXT NOT NULL,        -- sql_query|result_table|chart|markdown (open-ended, not CHECK-enforced)
  position      INTEGER NOT NULL DEFAULT 0,
  title         TEXT,
  data          TEXT NOT NULL,        -- JSON, shape varies per type
  created_at    TEXT NOT NULL,
  description   TEXT,                 -- added 2026-07-12 for Knowledge Discovery (Sub-Sprint 2A)
  tags          TEXT                  -- comma-separated; added 2026-07-12 for Knowledge Discovery (Sub-Sprint 2A)
);
CREATE INDEX idx_evidence_experiment ON experiment_evidence(experiment_id, position);

CREATE TABLE experiment_references (
  id                    TEXT PRIMARY KEY,
  source_experiment_id  TEXT,
  target_experiment_id  TEXT NOT NULL,
  note                  TEXT,
  created_by            TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  CHECK (source_experiment_id IS NULL OR source_experiment_id != target_experiment_id)
);
CREATE INDEX idx_references_target ON experiment_references(target_experiment_id);
CREATE UNIQUE INDEX idx_references_source_target ON experiment_references(source_experiment_id, target_experiment_id) WHERE source_experiment_id IS NOT NULL; -- added 2026-07-12, duplicate-citation backstop (Sub-Sprint 2B correction)

CREATE TABLE experiment_reproductions (
  id                TEXT PRIMARY KEY,
  experiment_id     TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  matched           INTEGER NOT NULL,
  notes             TEXT,
  new_experiment_id TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX idx_reproductions_experiment ON experiment_reproductions(experiment_id);

CREATE TABLE experiment_reviews (
  id                TEXT PRIMARY KEY,
  experiment_id     TEXT NOT NULL,
  evidence_id       TEXT,
  reviewer_user_id  TEXT NOT NULL,
  review_type       TEXT NOT NULL,     -- suggestion|question|concern|endorsement
  content           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open', -- open|addressed|dismissed
  created_at        TEXT NOT NULL,
  resolved_at       TEXT,
  resolved_by       TEXT
);
CREATE INDEX idx_reviews_experiment ON experiment_reviews(experiment_id);

CREATE TABLE experiment_validations (
  id                  TEXT PRIMARY KEY,
  experiment_id       TEXT NOT NULL,
  validator_user_id   TEXT NOT NULL,
  verdict             TEXT NOT NULL,   -- confirms|disputes
  note                TEXT,
  created_at          TEXT NOT NULL,
  superseded_at       TEXT
);
CREATE UNIQUE INDEX idx_validations_current ON experiment_validations(experiment_id, validator_user_id) WHERE superseded_at IS NULL;

CREATE TABLE experiment_bookmarks (
  experiment_id TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  PRIMARY KEY (experiment_id, user_id)
);

CREATE TABLE experiment_access_grants (
  id            TEXT PRIMARY KEY,
  experiment_id TEXT NOT NULL,
  user_id       TEXT,
  invite_email  TEXT,
  permission    TEXT NOT NULL DEFAULT 'viewer', -- viewer|reviewer|editor
  invited_by    TEXT NOT NULL,
  invited_at    TEXT NOT NULL,
  accepted_at   TEXT,
  CHECK ((user_id IS NOT NULL AND invite_email IS NULL) OR (user_id IS NULL AND invite_email IS NOT NULL))
);
CREATE INDEX idx_access_grants_experiment ON experiment_access_grants(experiment_id);
CREATE INDEX idx_access_grants_user ON experiment_access_grants(user_id);
CREATE UNIQUE INDEX idx_access_grants_unique_user ON experiment_access_grants(experiment_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_access_grants_unique_email ON experiment_access_grants(experiment_id, invite_email) WHERE invite_email IS NOT NULL;

CREATE TABLE experiment_events (
  id              TEXT PRIMARY KEY,
  experiment_id   TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  actor_user_id   TEXT,
  metadata        TEXT,
  created_at      TEXT NOT NULL
);
CREATE INDEX idx_events_experiment ON experiment_events(experiment_id, created_at);

-- Full-text search (Sub-Sprint 2C, Discovery Engine) — added 2026-07-12.
-- Standalone FTS5 tables (not SQLite's external-content mode, which
-- requires binding to an INTEGER rowid; experiments.id/experiment_evidence.id
-- are TEXT primary keys). `id` is carried as an UNINDEXED column and joined
-- back to the source table at query time. Kept in sync via AFTER
-- INSERT/UPDATE/DELETE triggers on experiments / experiment_evidence — see
-- experiments_fts_ai/au/ad and evidence_fts_ai/au/ad. Populated once via a
-- one-time backfill INSERT at creation time; the triggers keep it current
-- from then on.
CREATE VIRTUAL TABLE experiments_fts USING fts5(
  id UNINDEXED,
  title,
  question,
  findings,
  key_findings,
  limitations,
  future_work,
  tags,
  authors
);

CREATE VIRTUAL TABLE evidence_fts USING fts5(
  id UNINDEXED,
  title,
  description,
  tags,
  sql_text
);
-- sql_text is populated from json_extract(data,'$.sql') for sql_query rows
-- only (NULL for chart/result_table/markdown), so SQL evidence is
-- full-text searchable by its actual query text, not just title/description.
