# Alien World Live Publisher

**Canonical files**
- `alien-world/publisher/publisher.py`
- `alien-world/publisher/profile.json`
- `alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml` (copy-ready workflow replacement)

Alien World now has one publication responsibility: publish its rolling Live Feed. The Publisher does not create magazine PDFs, catalogues, issue records, archives, or publication-history metadata.

## Live publication flow

1. `collector/collector.py` retrieves approved NASA source records and screened original-post imagery, then writes only to `.publisher-data/alien-world/`.
2. `publisher.py` opens the Collector database in read-only/query-only mode and issues a `live` command to the shared Universal Editorial Engine.
3. The shared Engine returns a validated Live Feed. It does not fetch external sources or own the database.
4. The Publisher atomically replaces only `alien-world/published/live-feed.json`.
5. The browser client reads that JSON file and displays the current rolling feed.

## Ownership and safety boundaries

- Collector owns all external-source access and source-database writes.
- Publisher has no source-network code and no database write access.
- Publisher accepts `--mode live` only and rejects magazine-shaped output.
- The public publication directory contains only `live-feed.json` for Alien World.
- A failed collection/publication preserves the previous good `live-feed.json`.
- The GitHub Actions cache path `.publisher-data/alien-world/` and its cache key remain unchanged. No database reset is part of this update.
- The Universal Editorial Engine and Global PDF Reader remain shared services for other views. This change does not remove or clear shared PDF Reader storage.

## Workflow installation

GitHub's ZIP Extractor intentionally blocks `.github/`. After applying `LIVE_EARTH_MAIN_UPLOAD.zip`, replace the active file `.github/workflows/alien-world-publisher.yml` with the contents of this staged file. The workflow runs collection and Live Feed publication every three hours, and can also be run manually. It has no magazine schedule or publication-mode selector.
