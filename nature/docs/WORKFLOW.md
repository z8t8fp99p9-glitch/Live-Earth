# Nature Live Feed workflow

**Active workflow path:** `.github/workflows/nature-publisher.yml`  
**Schedule:** every hour at minute 15 UTC  
**Manual run:** GitHub Actions → Nature Live Feed Publisher → Run workflow.

The workflow runs the Nature Collector followed by the Live-Feed-only Nature Publisher hourly. The Collector gathers approved RSS/Atom reporting, re-screens approved Wikimedia Commons photo records and writes only to `.publisher-data/nature/`. The Publisher opens the Nature SQLite database read-only and invokes the shared Universal Editorial Engine in `live` mode.

- Database: `.publisher-data/nature/nature.sqlite3`.
- Database retention: 32 days.
- Maximum accepted source age: 32 days.
- Visible feed: complete rolling 32-day window, with no story-count cap; all eligible items exposed by the configured feeds are considered.
- Public output: `nature/published/live-feed.json` plus validated contextual image assets and rights metadata.
- Browser refresh: every five minutes while the view is open.
- Online-only: requests use `cache: no-store`; the view clears its displayed content when closed and does not persist feed data in localStorage, sessionStorage or IndexedDB.

The GitHub Actions cache path and existing `nature-db-v1-...` key family are preserved. The workflow commits only Nature's validated public output, never the source database. There is no monthly trigger, magazine mode, PDF output, catalogue or issue archive. Failed publication validation leaves the previous last-good feed in place. Saved PDFs in the Global PDF Reader are separate and are not modified by this workflow.

GitHub's ZIP Extractor blocks `.github/`. If the workflow itself needs a future change, replace `.github/workflows/nature-publisher.yml` manually using `nature/publisher/NATURE_PUBLISHER_WORKFLOW_UPDATE.yml`.
