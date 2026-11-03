# LIVE // EARTH — Global-Only Newsroom Integration

**Supersedes:** the earlier 3 November integration note that required View-specific Collectors.  
**Architecture:** one Manager, one Global Collector, one shared Newsroom pipeline.  
**Data isolation:** each View keeps its own Manager destination, cache and public feed.

## Active pipeline

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → post-Editorial Global Checker → shared Newsroom Database Writer → matching View Publisher`.

There is no Nature Collector or Alien World Collector. The scheduled workflows must not invoke either removed path. The Manager creates a View-scoped job and directs the same Global Collector to the registered assignments. Collection output is transient; Global Collector does not write SQLite or grant rights. Global Checker remains the sole rights/provenance authority.

The shared Newsroom Database Writer initializes the database selected by the Manager profile and enforces `view_id` ownership. It persists only individually approved editorial stories after the final Checker gate. The database path must remain beneath `.publisher-data/<viewId>/`; this is per-View data isolation, not per-View implementation. The Writer applies the Manager profile's retention days without affecting another View. Existing databases are migrated additively and are never reset, dropped or silently adopted when ownership metadata is missing.

View Publishers are presentation adapters only. They read their own `newsroom_approved_stories` rows in read-only mode, generate the configured feed, and never fetch sources or read unapproved legacy Collector rows. Legacy database tables are not a production collection path.

## Scheduled workflows

- Nature: `.github/workflows/nature-publisher.yml`, hourly at minute 15 UTC.
- Alien World: `.github/workflows/alien-world-publisher.yml`, hourly at minute 45 UTC.
- Both restore their existing separate `.publisher-data/<viewId>/` cache paths, run `editorial-engine/newsroom_orchestrator.py --view <viewId> --repository-root .`, and invoke only the matching Publisher adapter.
- ZIP Extractor refuses `.github/`; copy-ready complete workflow files are mirrored in the corresponding `nature/publisher/` and `alien-world/publisher/` directories.

## Protected guarantees

- 32-day retention and no story-count cap remain profile-driven.
- Hourly collection and separate databases/caches remain.
- No source material is shared between Views; each Manager job contains one View.
- No workflow resets/deletes/replaces an existing database.
- No app UI, Home, Moon, Sun, Orb, service-worker, IndexedDB, offline or local recovery files are changed.

## Local validation

The current repair is tested with the View publisher tests, shared Writer tests (including future-View bootstrap and View-scoped retention), Global Collector tests, orchestrator tests, and Global Checker publisher-dispatch tests. GitHub Actions, scheduled feeds and iPhone behavior remain pending the owner's upload and workflow replacement.
