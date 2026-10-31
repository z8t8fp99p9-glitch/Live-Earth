# Alien World Publisher

The Publisher is the instruction and routing layer for the Alien World view. It does not browse the web, collect feeds, scrape article pages, search for images or write source records.

## Publication flow

1. **Collector** — `data-collection/alien-world/collector.py` fetches the approved NASA source feeds, automatically discovers the original images attached to each story, screens the assets and writes source records/media to the Alien World database.
2. **Database** — `.publisher-data/alien-world/` contains Alien World's collected information and image provenance. The existing GitHub Actions workflow restores/saves this Collector-owned store through its cache.
3. **Publisher** — `publishers/alien-world/publisher.py` opens the database read-only and tells the shared Universal Editorial Engine the publication mode and editorial instructions.
4. **Universal Editorial Engine** — `editorial-engine/universal_editorial_engine.py` uses the supplied records and Publisher brief to produce the finished live feed and photo-led magazine PDF.
5. **Publisher routing** — the Publisher places only completed Engine outputs in `published/alien-world/` for the Alien World Main Page to display.

The Publisher remains unchanged in this update. Its database access stays read-only; its network access and database write access remain disabled.

## Important boundaries

- Source access and database writes belong only to the Collector.
- The Universal Editorial Engine does not fetch sources or open the database itself; the Publisher supplies the already-open read-only connection.
- The Alien World Main Page reads finished outputs only. It does not collect news or build PDFs.
- The global PDF Viewer is shared by every view and keeps its existing local IndexedDB saving behavior.
