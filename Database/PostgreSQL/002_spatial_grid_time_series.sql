-- LIVE // EARTH — reusable spatial-grid and daily-grid storage
-- PostgreSQL 16+
-- Migration 002: store static grid geometry once; store dated numerical
-- snapshots/deltas against the permanent grid identity.
--
-- This migration does not provision a database, download NOAA files, or
-- activate any collector. It is additive and leaves existing tables intact.

BEGIN;

CREATE TABLE IF NOT EXISTS spatial_grids (
    grid_id TEXT PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES datasets(dataset_id),
    grid_name TEXT NOT NULL,
    grid_version TEXT NOT NULL,
    grid_type TEXT NOT NULL CHECK (grid_type IN (
        'regular_lat_lon', 'curvilinear', 'projected', 'irregular'
    )),
    coordinate_reference TEXT NOT NULL DEFAULT 'EPSG:4326',
    longitude_cells INTEGER CHECK (longitude_cells IS NULL OR longitude_cells > 0),
    latitude_cells INTEGER CHECK (latitude_cells IS NULL OR latitude_cells > 0),
    longitude_spacing_degrees DOUBLE PRECISION,
    latitude_spacing_degrees DOUBLE PRECISION,
    longitude_origin_degrees DOUBLE PRECISION,
    latitude_origin_degrees DOUBLE PRECISION,
    longitude_wrap TEXT CHECK (longitude_wrap IS NULL OR longitude_wrap IN (
        '-180_180', '0_360', 'not_applicable'
    )),
    coordinate_order TEXT NOT NULL DEFAULT 'latitude_major_longitude_minor',
    cell_count BIGINT NOT NULL CHECK (cell_count > 0),
    no_data_encoding TEXT,
    grid_definition JSONB NOT NULL DEFAULT '{}'::JSONB,
    definition_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, grid_version, definition_sha256),
    CHECK (
        (grid_type <> 'regular_lat_lon')
        OR (longitude_cells IS NOT NULL AND latitude_cells IS NOT NULL
            AND longitude_spacing_degrees IS NOT NULL
            AND latitude_spacing_degrees IS NOT NULL
            AND longitude_origin_degrees IS NOT NULL
            AND latitude_origin_degrees IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_grids_dataset
    ON spatial_grids (dataset_id, grid_id);

-- One row represents one variable for one observation date and one grid.
-- Values are stored as a packed, documented binary payload, not one SQL row
-- per grid cell. The payload may contain a full snapshot or a delta.
CREATE TABLE IF NOT EXISTS daily_grid_records (
    grid_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id BIGINT NOT NULL REFERENCES datasets(dataset_id),
    grid_id TEXT NOT NULL REFERENCES spatial_grids(grid_id),
    observation_date DATE NOT NULL,
    signal_id BIGINT NOT NULL REFERENCES signals(signal_id),
    unit TEXT NOT NULL,
    record_kind TEXT NOT NULL DEFAULT 'snapshot' CHECK (record_kind IN (
        'snapshot', 'delta'
    )),
    base_grid_record_id BIGINT REFERENCES daily_grid_records(grid_record_id),
    payload_format TEXT NOT NULL,
    compression TEXT NOT NULL CHECK (compression IN (
        'none', 'gzip', 'zstd', 'lz4'
    )),
    payload BYTEA NOT NULL,
    payload_sha256 CHAR(64) NOT NULL,
    uncompressed_size_bytes BIGINT NOT NULL CHECK (uncompressed_size_bytes >= 0),
    cell_count BIGINT NOT NULL CHECK (cell_count > 0),
    valid_cell_count BIGINT CHECK (
        valid_cell_count IS NULL OR
        (valid_cell_count >= 0 AND valid_cell_count <= cell_count)
    ),
    minimum_value DOUBLE PRECISION,
    maximum_value DOUBLE PRECISION,
    mean_value DOUBLE PRECISION,
    quality_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
    source_file_id BIGINT REFERENCES dataset_files(dataset_file_id),
    source_published_at TIMESTAMPTZ,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    supersedes_record_id BIGINT REFERENCES daily_grid_records(grid_record_id),
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, grid_id, observation_date, signal_id, revision),
    CHECK (
        (record_kind = 'snapshot' AND base_grid_record_id IS NULL)
        OR
        (record_kind = 'delta' AND base_grid_record_id IS NOT NULL)
    ),
    CHECK (minimum_value IS NULL OR maximum_value IS NULL OR minimum_value <= maximum_value)
);

CREATE INDEX IF NOT EXISTS idx_daily_grid_records_lookup
    ON daily_grid_records (dataset_id, grid_id, signal_id, observation_date DESC)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_daily_grid_records_date
    ON daily_grid_records (observation_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_grid_records_base
    ON daily_grid_records (base_grid_record_id)
    WHERE base_grid_record_id IS NOT NULL;

COMMIT;

-- Operational guidance:
-- 1. Register a grid once (e.g. GRID_OISST_025_V1) with its immutable
--    geometry definition and checksum.
-- 2. Store each day's variable payload against that grid_id.
-- 3. Prefer full snapshots initially. Enable deltas only after the source's
--    cell ordering, missing-value rules and revision behaviour are verified.
-- 4. Keep periodic full snapshots as recovery checkpoints if deltas are used.
-- 5. On source correction, insert a new revision and mark the prior record
--    is_current=FALSE; never silently overwrite the historical import.
-- 6. The payload format must document numeric type, byte order, cell order,
--    no-data representation and any scale/offset.
-- 7. This is generic grid storage for the six numerical worlds. The existing
--    Earthquakes Orb and its data path are intentionally not referenced here.
