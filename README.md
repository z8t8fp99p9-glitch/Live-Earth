# LIVE // EARTH — Section 13 View-ID Database Bridge

This is an additive integration package for the existing `Live-Earth` repository.

## What it does
- Reads the authoritative `viewId` from the hashed Manager ID Card.
- Resolves the database only through the existing Manager profile registry.
- Accepts only Section 13 posts marked `APPROVE_FOR_DATABASE`.
- Cross-checks post identity, Section 9 image lineage, Section 12 READY output, image hash and staging path.
- Writes approved rows to the existing `newsroom_approved_stories` table using the existing writer's additive schema and upsert protections.
- Copies approved image bytes only into the matching View's private `.publisher-data/<viewId>/newsroom-assets/` cache.
- Does not open the other View database, reset a database, publish a feed, or write public assets.

## Run
From repository root:
```bash
python newsroom-database-writer/section13_database_bridge.py \
  --checker-report path/to/completed-sections-1-to-13-report.json \
  --repository-root . \
  --output section13-database-write-report.json
```

## Important
This bridge is additive. Do not alter the production workflows until the integration tests are run against real Nature and Alien World report fixtures. A blocked report exits non-zero and must not be treated as a successful write.
