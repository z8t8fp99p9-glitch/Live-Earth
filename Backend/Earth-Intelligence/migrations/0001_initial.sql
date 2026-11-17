CREATE TABLE IF NOT EXISTS sources (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL, source_url TEXT NOT NULL,
 attribution TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observations_raw (
 id TEXT PRIMARY KEY, world_id TEXT NOT NULL CHECK(world_id IN ('atmosphere','oceans','land','water-ice','earth-activity','energy-humanity')),
 source_id TEXT NOT NULL REFERENCES sources(id), source_record_id TEXT NOT NULL, signal_id TEXT NOT NULL,
 observed_at TEXT NOT NULL, ingested_at TEXT NOT NULL, latitude REAL, longitude REAL, region_code TEXT,
 value REAL NOT NULL, unit TEXT NOT NULL, quality_flag TEXT NOT NULL DEFAULT 'accepted', payload_json TEXT,
 UNIQUE(source_id,source_record_id)
);
CREATE INDEX IF NOT EXISTS idx_observations_world_time ON observations_raw(world_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_world_signal_time ON observations_raw(world_id,signal_id,observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_expiry ON observations_raw(observed_at);
CREATE TABLE IF NOT EXISTS ingestion_runs (
 id TEXT PRIMARY KEY, source_id TEXT, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL,
 records_received INTEGER NOT NULL DEFAULT 0, records_inserted INTEGER NOT NULL DEFAULT 0, error_summary TEXT
);
