# LIVE // EARTH — Numerical database foundation

## Current decision

Keep the six numerical-world Stacks Orbs. Remove the experimental data-collection and backend implementations. Prepare one provider-neutral PostgreSQL database schema first.

No Cloudflare Worker, D1 database, GitHub archive, public snapshot pipeline, API, collector, scheduler or numerical-world data UI is active in this phase.

## Six retained worlds

1. Atmosphere
2. Oceans
3. Land
4. Water & Ice
5. Earth Activity
6. Energy & Humanity

The six Orbs remain registered in the existing shared Stacks feature registry. Tapping one displays a simple database-preparation status. Existing Home Orbs and all existing app views remain untouched.

## Database plan

- One PostgreSQL 16+ database shared by all six worlds.
- Initial planning volume: approximately five million numerical observation rows per year.
- Target retention: 365 days for observations and derived events.
- Source-file metadata and checksums are stored; original large files are not stored as database blobs.
- Every observation is traceable to its dataset, source record, timestamp, unit, quality state and optional location/uncertainty.
- Derived events link back to supporting observations.

The schema is at `Database/PostgreSQL/001_initial_schema.sql`.

## Phase boundary

This package prepares the schema only. It does not choose a hosting provider or create a live database. After a PostgreSQL host is selected, apply the schema and verify it. Only then design the approved file-based source acquisition and ingestion process.

## Preservation

The existing primary five Home Orbs, shared Stacks registry, original five Stacks features, Earth/Moon/Sun views, Weather, Location, Traffic and Earthquakes are outside this change and must remain untouched.
