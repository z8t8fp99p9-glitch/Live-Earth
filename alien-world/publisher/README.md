# Alien World Publisher

**Canonical files**
- `alien-world/publisher/publisher.py`
- `alien-world/publisher/profile.json`

The Publisher is the read-only instruction and routing layer. It does not browse the web, collect news, scrape articles, download images or write source records.

## Publication flow

1. `collector/collector.py` retrieves approved NASA source records and screened original-post imagery, then writes to `.publisher-data/alien-world/`.
2. `publisher.py` opens that database with read-only/query-only SQLite access and creates a bounded publication command.
3. The shared `editorial-engine/` receives the already-open read-only connection and the Alien World profile/brief. It does not access external sources.
4. The Publisher routes validated completed output into `alien-world/published/`.
5. The browser client consumes those published files; it never opens the database or creates a PDF.

## Non-negotiable boundaries

- Collector owns all external-source access and database writes.
- Publisher has no source-network code and no database write access.
- Shared Engine and Global PDF Reader remain single shared services.
- A failed run preserves the last-good feed/catalogue/PDF files.
- The GitHub Actions database cache remains `.publisher-data/alien-world/` and is not reset during this folder reorganisation.

GitHub requires the active workflow at `.github/workflows/alien-world-publisher.yml`. The ZIP importer rejects `.github/`, so the complete replacement is provided as `ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml` and must be copied to that exact active path after the main ZIP is applied.
