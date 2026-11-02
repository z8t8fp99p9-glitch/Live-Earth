# Alien World Live Feed workflow

**Active workflow:** `.github/workflows/alien-world-publisher.yml`  
**Schedule:** every hour at minute 45 UTC  
**Manual run:** GitHub Actions → Alien World Live Feed Publisher → Run workflow.

Alien World has one publishing responsibility: refresh the independent NASA-source database and publish the rolling Live Feed. There are no `magazine`, `all`, weekly magazine or archive modes.

## Pipeline ownership

1. `alien-world/collector/collector.py` fetches only approved official NASA sources, screens images attached to the original NASA story and writes to `.publisher-data/alien-world/`.
2. The Collector cache remains `.publisher-data/alien-world/` with the existing `alien-world-db-v1-...` cache-key family. The database is SQLite, independent of Nature, and is not committed to the repository.
3. `alien-world/publisher/publisher.py` runs the deterministic regression suite, opens the Alien World database read-only/query-only and invokes the shared Universal Editorial Engine in `live` mode.
4. The Publisher accepts only a valid `live-feed.json` payload and writes only `alien-world/published/live-feed.json`. It rejects magazine-shaped output and preserves the last-good feed when validation or generation fails.
5. The browser view reads the completed feed. It does not collect sources, open the database or generate publications.

## Feed and retention policy

- Database retention: 32 days; no database record-count ceiling.
- Collector refresh target: one hour.
- Visible publication window: the complete rolling 32 days.
- Maximum visible stories: unlimited; every eligible item in the retained window is considered.
- Browser refresh: every five minutes while the view is open.
- Online-only: feed requests use `cache: no-store`; offline state does not present an old feed as current; closing the view clears its displayed feed. No browser localStorage, sessionStorage or IndexedDB copy is used.

## Workflow permissions and outputs

The active workflow checks out `main`, restores the existing view-specific cache, installs `editorial-engine/requirements.txt`, runs the Collector and then the Publisher. It commits only `alien-world/published/live-feed.json` when the output changes, then requests a GitHub Pages rebuild. It does not commit the source database.

GitHub's ZIP Extractor blocks `.github/`. If the workflow itself needs a future change, replace `.github/workflows/alien-world-publisher.yml` manually using the complete copy-ready file at `alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml`.

## Current verification note — 1 November 2026

The observed scheduled run `41320821525` completed the Collector step but the Publisher's contract-test gate failed on two test expectations. This package moves the explanatory README out of `alien-world/published/`, which resolves the extra-output path mismatch once uploaded. The RSS parser test still expects `publishedAt` although the current parser returns the original source date in `published`; correct that test, run the full suite, and require a successful later workflow before marking automated publication verified. The Publisher correctly preserved the last-good feed.
