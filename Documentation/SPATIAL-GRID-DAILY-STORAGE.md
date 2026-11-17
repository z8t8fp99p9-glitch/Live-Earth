# LIVE // EARTH — reusable grid storage (migration 002)

## Purpose

Implements the storage pattern discussed for global gridded datasets:

- Register the static grid once under a permanent ID (example: `GRID_OISST_025_V1`).
- Store daily numerical payloads by date, variable and grid ID.
- Keep the grid geometry and coordinate ordering out of every daily record.
- Support full snapshots first, with optional delta records later.
- Preserve checksums, source-file links, quality summaries and corrected revisions.

## Why packed daily payloads?

A 0.25-degree global latitude/longitude grid has 1,440 × 720 = 1,036,800 cell positions. Storing each daily cell as a separate relational row would create over one million rows per variable per day. The new table stores the values as a compact binary payload with explicit format and compression metadata. The app/data adapter can decode the requested day and map cell indices back through the one registered grid definition.

This preserves the native grid dimensions; it does not downsample or invent measurements.

## Tables

- `spatial_grids`: immutable grid identity, dimensions, spacing, origin, coordinate reference, ordering and definition checksum.
- `daily_grid_records`: one dated payload per dataset/grid/signal/revision, with snapshot or delta semantics.

## Safe rollout

1. Apply `001_initial_schema.sql` to a new PostgreSQL database if not already applied.
2. Apply `002_spatial_grid_time_series.sql`.
3. Register and validate a grid definition.
4. Import one official daily file as a full snapshot first.
5. Verify cell count, missing-value handling, coordinate order, checksum and decoded spot checks.
6. Only then consider delta storage. Keep periodic full checkpoints.
7. When the source revises a day, add a new revision and preserve the prior record.

## Current status / limitations

This is an additive schema migration only. It does not create a database host, add credentials, download NOAA OISST, start a collector, or connect any Orb. No real measurements are included. The existing six world controllers and the independent Earthquakes Orb are not modified.
