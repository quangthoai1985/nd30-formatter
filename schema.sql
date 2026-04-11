-- ND30 Formatter — D1 Schema
-- Apply: npx wrangler d1 execute nd30-jobs --file=schema.sql
-- Local:  npx wrangler d1 execute nd30-jobs --local --file=schema.sql

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT    PRIMARY KEY,
  file_name   TEXT    NOT NULL,
  file_type   TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'done',
  char_count  INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);
