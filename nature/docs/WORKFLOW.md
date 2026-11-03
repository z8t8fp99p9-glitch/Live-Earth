# Nature Live Feed workflow

**Active workflow path:** `.github/workflows/nature-publisher.yml`  
**Schedule:** every hour at minute 15 UTC  
**Manual run:** GitHub Actions → Nature Live Feed Publisher → Run workflow.

## Shared collection and publication

Nature does not have a Nature-specific Collector. Its scheduled workflow runs the same shared pipeline used by every content View:

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → post-Editorial Global Checker → Newsroom Database Writer → Nature Publisher`.

The Manager assigns Nature's registered sources and isolated destination. The Global Collector returns transient candidates; it does not write a database or make rights decisions. The shared Writer initializes the Nature database when needed and persists only individually Checker-released editorial rows. The Nature Publisher is a read-only presentation adapter.

- Database: `.publisher-data/nature/nature.sqlite3` (separate from every other View).
- Retention: Manager-profile driven, currently 32 days; no count cap.
- Collection cadence: hourly; 32-day configured lookback.
- Public output: `nature/published/live-feed.json` and approved Newsroom image assets.
- Browser refresh: every five minutes while the view is open.
- Online-only: requests use `cache: no-store`; the view clears displayed content when closed and does not persist feed data in localStorage, sessionStorage or IndexedDB.

The workflow retains the existing `.publisher-data/nature/` cache path and `nature-db-v1-...` key family. It commits only Nature's validated public output, never the source database. It has no magazine mode, PDF output, catalogue or issue archive. Failed publication validation preserves the last-good feed.

The ZIP Extractor blocks `.github/`. The complete copy-ready workflow is mirrored at `nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml`; replace `.github/workflows/nature-publisher.yml` with that file after applying the main ZIP.
