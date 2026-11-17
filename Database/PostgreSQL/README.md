# LIVE // EARTH — Database foundation

## Scope of this phase

This is **database preparation only**. It does not install or select a hosting provider, create a live database, connect data sources, run collectors, or change the app's existing views.

- Engine: portable PostgreSQL 16+
- One database shared by all six numerical worlds
- Designed for an initial planning volume of approximately five million observation rows per year
- Observation and derived-event retention target: 365 days
- Source files are tracked by URL, checksum, format and import status; large original files are not stored as database blobs
- No API, Cloudflare, D1, Worker, GitHub archive, browser database or scheduled collector is included

## Files

- `001_initial_schema.sql` creates the catalogue, sources, datasets, downloadable-file register, signal catalogue, numerical observations, ingestion audit, derived events, evidence links and quality checks.
- Indexes cover the expected world/time, signal/time, dataset/time and retention queries. A BRIN time index is included for efficient time-range scans as the observation table grows.

## When a database host is selected

1. Create one empty PostgreSQL 16+ database.
2. Apply `001_initial_schema.sql` once using `psql` or the provider's SQL console.
3. Confirm all six rows exist in `worlds`.
4. Confirm the schema and indexes are present.
5. Only after the database is verified should we design source acquisition and ingestion.

Example schema application:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f Database/PostgreSQL/001_initial_schema.sql
```

Do not commit a real connection string, password, certificate or database credential to the public repository.

## Data model

- **worlds** — the six permanent numerical-world identities.
- **sources** — approved or candidate scientific providers and their permitted file-access method.
- **datasets** — individual published datasets and their units/resolution.
- **dataset_files** — downloadable file metadata, SHA-256 and import state.
- **signals** — canonical measurements within each world.
- **observations** — one normalised numerical measurement per row, with source provenance, timestamps, unit, optional location, uncertainty and quality state.
- **ingestion_runs** — audit trail for future file imports.
- **detected_events / event_evidence** — future derived intelligence, linked back to supporting observations.
- **data_quality_checks** — validation history.

## Important boundaries

Five million rows is a planning target, not a measured forecast. Actual storage depends on metadata size, indexes, update patterns and source granularity. Start with one PostgreSQL database and measure real growth before considering partitioning or splitting.

No data collector should be built until the database host, source permissions, file formats and ingestion cadence are agreed.
