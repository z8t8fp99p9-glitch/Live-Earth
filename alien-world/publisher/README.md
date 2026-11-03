# Alien World Live Feed Publisher

Alien World is Live-Feed-only. Its Publisher is a presentation-only adapter that reads only Checker-approved `newsroom_approved_stories` rows from `.publisher-data/alien-world/alien-world.sqlite3` in read-only/query-only mode. It does not collect sources, fetch NASA, write the database, or make rights decisions.

The Global Collection Manager owns source assignments and schedules. The one Global Collector returns transient candidates. Global Checker owns source, rights and provenance decisions. The shared Writer persists only final Checker-released stories. Alien World publishes only `alien-world/published/live-feed.json` and approved Newsroom assets; it does not publish PDFs, catalogs, issues or archives.

The existing separate cache path and `alien-world-db-v1-...` key family are preserved. The copy-ready hourly workflow (minute 45 UTC) is `ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml`. The GitHub ZIP Extractor blocks `.github/`, so copy this complete template into `.github/workflows/alien-world-publisher.yml` after applying the main ZIP.
