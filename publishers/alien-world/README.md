# Alien World Publisher

The Publisher is the instruction and routing layer for the Alien World view. It does not browse the web, collect feeds, scrape article pages, search for images or write source records.

## One simple publication flow

1. **Collector** — `data-collection/alien-world/collector.py` fetches the approved NASA source feeds and original source-post images, then writes the view-scoped SQLite database and media assets.
2. **Database** — `.publisher-data/alien-world/` contains Alien World's collected information and provenance. The existing GitHub Actions workflow restores/saves this Collector-owned store through its cache.
3. **Publisher** — `publishers/alien-world/publisher.py` opens the database read-only and tells the Universal Editorial Engine what publication mode and editorial instructions to use.
4. **Universal Editorial Engine** — `editorial-engine/universal_editorial_engine.py` uses the supplied records and Publisher brief to produce the finished live feed and/or a self-contained magazine PDF.
5. **Publisher routing** — the Publisher places only completed Engine outputs in `published/alien-world/` for the Alien World Main Page to display.

The Publisher runs deterministic contract tests before publication. A failed test prevents a new publication; the last-known-good outputs are retained.

## Important boundaries

- Network/source access belongs to the Collector.
- Source database writes belong to the Collector.
- The Publisher reads the database with SQLite read-only mode and `PRAGMA query_only=ON`.
- The Universal Editorial Engine does not fetch sources or open the database itself; the Publisher supplies the already-open read-only connection.
- The Alien World Main Page reads finished outputs only. It does not collect news or build PDFs.
- The global PDF Viewer is shared by every view. It saves only PDFs the reader explicitly opens, not story feeds or article images.

## Limitations disclosed by the first Engine release

The current no-AI Engine applies its supported layout and section instructions. It does not claim to rewrite source copy into an arbitrary voice or independently corroborate every factual claim. It keeps original source links and the publication receipt discloses unsupported directions. These are documented limitations, not hidden quality claims.
