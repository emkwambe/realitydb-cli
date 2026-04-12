-- Snapshots: persist lab state beyond TTL
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  seed INTEGER,
  rows INTEGER NOT NULL,
  tables_count INTEGER NOT NULL,
  schema_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lab_id) REFERENCES labs(id)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_lab ON snapshots(lab_id);

-- Published labs: public gallery entries
CREATE TABLE IF NOT EXISTS published_labs (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  description TEXT,
  tags TEXT,
  license TEXT DEFAULT 'CC-BY-4.0',
  template TEXT NOT NULL,
  seed INTEGER,
  rows INTEGER NOT NULL,
  tables_count INTEGER NOT NULL,
  neon_branch_id TEXT,
  connection_string_ro TEXT,
  notebook_r2_key TEXT,
  data_r2_key TEXT,
  fork_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  published_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_published_slug ON published_labs(slug);
CREATE INDEX IF NOT EXISTS idx_published_tags ON published_labs(tags);
CREATE INDEX IF NOT EXISTS idx_published_template ON published_labs(template);
CREATE INDEX IF NOT EXISTS idx_published_status ON published_labs(status);

-- Forks: track who forked what
CREATE TABLE IF NOT EXISTS forks (
  id TEXT PRIMARY KEY,
  published_lab_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (published_lab_id) REFERENCES published_labs(id),
  FOREIGN KEY (lab_id) REFERENCES labs(id)
);

CREATE INDEX IF NOT EXISTS idx_forks_published ON forks(published_lab_id);

-- Saved queries: queries saved during a lab session
CREATE TABLE IF NOT EXISTS saved_queries (
  id TEXT PRIMARY KEY,
  lab_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sql_text TEXT NOT NULL,
  result_preview TEXT,
  execution_time_ms INTEGER,
  row_count INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lab_id) REFERENCES labs(id)
);

CREATE INDEX IF NOT EXISTS idx_queries_lab ON saved_queries(lab_id);