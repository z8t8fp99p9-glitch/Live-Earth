-- LIVE // EARTH — central numerical-data database foundation
-- PostgreSQL 16+
-- One database shared by all six numerical worlds.
-- No collectors, API, scheduler, application views, or cloud-provider bindings
-- are included in this phase.

BEGIN;

CREATE TABLE IF NOT EXISTS worlds (
    world_id TEXT PRIMARY KEY CHECK (world_id IN (
        'atmosphere', 'oceans', 'land', 'water-ice',
        'earth-activity', 'energy-humanity'
    )),
    display_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO worlds (world_id, display_name, description) VALUES
('atmosphere', 'Atmosphere', 'Numerical observations of the atmosphere.'),
('oceans', 'Oceans', 'Numerical observations of ocean systems.'),
('land', 'Land', 'Numerical observations of land and terrestrial systems.'),
('water-ice', 'Water & Ice', 'Numerical observations of freshwater and cryosphere systems.'),
('earth-activity', 'Earth Activity', 'Numerical observations of geophysical and environmental activity.'),
('energy-humanity', 'Energy & Humanity', 'Numerical observations of energy systems and human activity.')
ON CONFLICT (world_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sources (
    source_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,
    provider_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    access_method TEXT NOT NULL CHECK (access_method IN (
        'bulk-download', 'ftp', 'sftp', 'website-download', 'manual-import'
    )),
    licence TEXT,
    attribution TEXT,
    terms_url TEXT,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN (
        'candidate', 'approved', 'active', 'paused', 'retired'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
    dataset_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    world_id TEXT NOT NULL REFERENCES worlds(world_id),
    source_id BIGINT NOT NULL REFERENCES sources(source_id),
    dataset_key TEXT NOT NULL UNIQUE,
    dataset_name TEXT NOT NULL,
    description TEXT,
    native_format TEXT NOT NULL,
    native_temporal_resolution TEXT,
    native_spatial_resolution TEXT,
    units_description TEXT,
    licence TEXT,
    attribution TEXT,
    approved_for_ingestion BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_world
    ON datasets (world_id, approved_for_ingestion);

CREATE TABLE IF NOT EXISTS dataset_files (
    dataset_file_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES datasets(dataset_id),
    source_file_name TEXT NOT NULL,
    source_file_url TEXT NOT NULL,
    file_format TEXT NOT NULL,
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    checksum_sha256 CHAR(64),
    published_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    import_status TEXT NOT NULL DEFAULT 'discovered' CHECK (import_status IN (
        'discovered', 'downloaded', 'validated', 'imported', 'rejected', 'failed'
    )),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, source_file_url, checksum_sha256)
);

CREATE INDEX IF NOT EXISTS idx_dataset_files_status
    ON dataset_files (import_status, downloaded_at DESC);

CREATE TABLE IF NOT EXISTS signals (
    signal_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    world_id TEXT NOT NULL REFERENCES worlds(world_id),
    signal_key TEXT NOT NULL,
    signal_name TEXT NOT NULL,
    description TEXT,
    canonical_unit TEXT NOT NULL,
    value_kind TEXT NOT NULL DEFAULT 'continuous' CHECK (value_kind IN (
        'continuous', 'count', 'categorical'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (world_id, signal_key)
);

CREATE TABLE IF NOT EXISTS observations (
    observation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    world_id TEXT NOT NULL REFERENCES worlds(world_id),
    dataset_id BIGINT NOT NULL REFERENCES datasets(dataset_id),
    signal_id BIGINT NOT NULL REFERENCES signals(signal_id),
    source_record_key TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    numeric_value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    uncertainty_value DOUBLE PRECISION,
    latitude DOUBLE PRECISION CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    region_code TEXT,
    quality_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (quality_status IN (
        'unreviewed', 'accepted', 'flagged', 'rejected'
    )),
    quality_notes TEXT,
    source_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    source_file_id BIGINT REFERENCES dataset_files(dataset_file_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, source_record_key, signal_id)
);

-- Primary query paths: world/time, signal/time, dataset/time and retention.
CREATE INDEX IF NOT EXISTS idx_observations_world_time
    ON observations (world_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_signal_time
    ON observations (signal_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_dataset_time
    ON observations (dataset_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_observations_region_time
    ON observations (region_code, observed_at DESC)
    WHERE region_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_observations_retention
    ON observations (observed_at);

CREATE INDEX IF NOT EXISTS idx_observations_time_brin
    ON observations USING BRIN (observed_at);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    ingestion_run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id BIGINT REFERENCES datasets(dataset_id),
    dataset_file_id BIGINT REFERENCES dataset_files(dataset_file_id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
        'running', 'succeeded', 'partial', 'failed'
    )),
    records_seen BIGINT NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
    records_inserted BIGINT NOT NULL DEFAULT 0 CHECK (records_inserted >= 0),
    records_skipped BIGINT NOT NULL DEFAULT 0 CHECK (records_skipped >= 0),
    error_summary TEXT,
    run_metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started
    ON ingestion_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS detected_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    world_id TEXT NOT NULL REFERENCES worlds(world_id),
    event_key TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN (
        'candidate', 'verified', 'active', 'evolved', 'resolved', 'rejected'
    )),
    confidence NUMERIC(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    uncertainty_notes TEXT,
    region_code TEXT,
    latitude DOUBLE PRECISION CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detected_events_world_time
    ON detected_events (world_id, started_at DESC);

CREATE TABLE IF NOT EXISTS event_evidence (
    event_id BIGINT NOT NULL REFERENCES detected_events(event_id) ON DELETE CASCADE,
    observation_id BIGINT NOT NULL REFERENCES observations(observation_id) ON DELETE CASCADE,
    evidence_role TEXT NOT NULL DEFAULT 'supporting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, observation_id)
);

CREATE TABLE IF NOT EXISTS data_quality_checks (
    quality_check_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id BIGINT REFERENCES datasets(dataset_id),
    observation_id BIGINT REFERENCES observations(observation_id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_key TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('passed', 'warning', 'failed')),
    details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_dataset_time
    ON data_quality_checks (dataset_id, checked_at DESC);

COMMIT;

-- Retention policy (run from a scheduled database maintenance job):
-- DELETE FROM observations WHERE observed_at < NOW() - INTERVAL '365 days';
-- DELETE FROM detected_events
--   WHERE COALESCE(ended_at, started_at) < NOW() - INTERVAL '365 days';
-- Keep source/dataset catalogues and ingestion audit history unless a separate
-- operational retention policy is approved.
