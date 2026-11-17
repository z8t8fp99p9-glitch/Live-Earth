PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  source_url TEXT NOT NULL,
  licence TEXT,
  attribution TEXT,
  access_method TEXT NOT NULL DEFAULT 'api',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','paused','retired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations_raw (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL CHECK (world_id IN ('atmosphere','oceans','land','water-ice','earth-activity','energy-humanity')),
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_record_id TEXT,
  signal_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  region_code TEXT,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  uncertainty REAL,
  quality_flag TEXT NOT NULL DEFAULT 'unreviewed' CHECK (quality_flag IN ('unreviewed','accepted','rejected')),
  payload_json TEXT,
  UNIQUE(source_id, source_record_id)
);
CREATE INDEX IF NOT EXISTS idx_raw_world_signal_time ON observations_raw(world_id, signal_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_ingested ON observations_raw(ingested_at);

CREATE TABLE IF NOT EXISTS observations_normalised (
  id TEXT PRIMARY KEY,
  raw_observation_id TEXT NOT NULL UNIQUE REFERENCES observations_raw(id) ON DELETE CASCADE,
  world_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  region_code TEXT,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  normalisation_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_norm_series_time ON observations_normalised(world_id, signal_id, region_code, observed_at DESC);

CREATE TABLE IF NOT EXISTS detected_patterns (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  signal_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  region_code TEXT,
  window_start TEXT NOT NULL,
  window_end TEXT NOT NULL,
  magnitude REAL NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_json TEXT NOT NULL,
  detected_at TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','accepted','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_patterns_world_time ON detected_patterns(world_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS verified_events (
  id TEXT PRIMARY KEY,
  pattern_id TEXT REFERENCES detected_patterns(id),
  world_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  region_label TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  verification_status TEXT NOT NULL CHECK (verification_status IN ('verified','retracted')),
  source_ids_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_world_start ON verified_events(world_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS event_history (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES verified_events(id) ON DELETE CASCADE,
  recorded_at TEXT NOT NULL,
  state TEXT NOT NULL,
  magnitude REAL,
  confidence REAL,
  evidence_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_history_event_time ON event_history(event_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS published_snapshots (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL UNIQUE CHECK (world_id IN ('atmosphere','oceans','land','water-ice','earth-activity','energy-humanity')),
  version INTEGER NOT NULL,
  published_at TEXT NOT NULL,
  valid_until TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','withdrawn'))
);
CREATE INDEX IF NOT EXISTS idx_snapshots_published ON published_snapshots(status, published_at DESC);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')),
  records_received INTEGER NOT NULL DEFAULT 0,
  records_accepted INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);
