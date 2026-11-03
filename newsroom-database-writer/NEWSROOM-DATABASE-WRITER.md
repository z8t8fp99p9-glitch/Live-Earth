# LIVE // EARTH — Shared Newsroom Database Writer

**Input:** the exact Global Checker image-review hand-off, Universal Editorial package and post-Editorial Checker verification.
**Destination:** the isolated SQLite path in the active Global Collection Manager View profile.
**Table:** `newsroom_approved_stories`.

## Responsibilities

The shared Writer initializes the generic Newsroom schema for a new Manager-registered View and performs additive compatibility updates for an existing, correctly owned database. It never resets, drops or replaces a database. A pre-existing database without matching `publisher_meta.view_id` ownership is refused, not silently adopted.

Only `approvedStoryIds` with individual final Checker `PASS` decisions are persisted. `HOLD` stories are never written. Each Manager profile supplies its own destination path under `.publisher-data/<viewId>/`, its destination database ID and retention period. The Writer validates that boundary and does not open another View's database.

Image Engine-approved JPEGs remain private under that View's cache until the matching Publisher attaches them. The Writer never publishes assets or writes a public feed.

## Isolation and retention

- Nature: `.publisher-data/nature/nature.sqlite3`.
- Alien World: `.publisher-data/alien-world/alien-world.sqlite3`.
- Every additional View gets its own Manager-registered directory and SQLite path; no View name is added to Writer code.
- Retention is driven by `retentionDays` in the Manager profile (32 days for the current Views). Cleanup is restricted to the current `view_id`; other View records are not affected.
- There is no numerical story-count cap.
- Raw source records, raw article text, HTML and evidence excerpts are not persisted.

## Python entry point

```python
from newsroom_database_writer import ensure_view_database, write_verified_editorial_stories

# The orchestrator calls ensure_view_database(root, view_id, manager_job)
# before Global Collector intake. The Writer later receives the in-memory
# Checker/Editorial/final-Checker hand-offs.
```

The scheduled path is `Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → final Global Checker → shared Newsroom Database Writer → configured View Publisher`.
