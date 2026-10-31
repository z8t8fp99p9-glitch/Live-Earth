# Alien World Publisher

The Publisher is a view-specific production manager. It does not browse the web, fetch feeds, scrape pages, search for images, or write to the source database.

## Runtime boundaries

1. **Data Collection** — `data-collection/alien-world/collector.py` is the only Alien World pipeline component with external-source access. It collects the configured source records, performs the approved media screening/enrichment, and writes the view-scoped SQLite database and media assets.
2. **Database** — `.publisher-data/alien-world/` is the Collector-owned source-of-truth store. GitHub Actions restores and saves it through the existing workflow cache.
3. **Universal Editorial Engine** — `editorial-engine/universal_editorial_engine.py` receives a read-only SQLite handle, the view profile and a Publisher command. It does not access the network or write to the source database. It selects eligible records and builds the feed/PDF artifacts.
4. **Publisher** — `publishers/alien-world/publisher.py` opens the database read-only, sends the command to the Engine, and routes the Engine's completed artifacts to `published/alien-world/` for the view to display.
5. **Alien World Main Page** — the existing client reads those publication outputs only. It does not collect or edit source material.

The workflow must run the Collector step before the Publisher step, in the same job and with the same restored database cache. A collection failure stops that run; the Publisher does not silently collect data itself.

## Data and provenance

Each stored story retains its title, full feed-provided summary/content excerpt, original URL, source name and feed URL, publication timestamp, retrieval timestamp, and stable record identity. Image assets retain their source URL, caption, credit and screening notes. The existing source allowlist, database bounds, schedule, view identity, output format and publication retention settings are preserved.

Image screening is not a legal rights guarantee. NASA media guidance and asset-specific restrictions still apply. The Engine must label the provenance and limitations of source material rather than claim independent verification it has not performed.
