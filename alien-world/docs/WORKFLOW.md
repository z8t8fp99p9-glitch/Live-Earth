# Alien World Live Feed workflow

**Active workflow path:** `.github/workflows/alien-world-publisher.yml`  
**Schedule:** every hour at minute 45 UTC  
**Manual run:** GitHub Actions → Alien World Live Feed Publisher → Run workflow.

## Shared collection and publication

Alien World does not have an Alien World-specific Collector. It uses the exact same shared pipeline as Nature and every future View:

`Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → post-Editorial Global Checker → Newsroom Database Writer → Alien World Publisher`.

The Manager assigns the registered official NASA sources and Alien World's isolated destination. Global Collector intake is transient and view-scoped by the Manager job. The shared Writer initializes the isolated database and persists only individually Checker-released editorial rows. The Publisher is a read-only presentation adapter; it does not fetch sources or write the database.

## Feed and retention policy

- Database: `.publisher-data/alien-world/alien-world.sqlite3`, separate from Nature.
- Retention: Manager-profile driven, currently 32 days; no record-count ceiling.
- Collection cadence: hourly; 32-day configured lookback.
- Visible publication window: complete rolling 32 days; no story-count cap.
- Public output: `alien-world/published/live-feed.json` and approved Newsroom image assets.
- Browser refresh: every five minutes while open; online-only with `cache: no-store`; no localStorage, sessionStorage or IndexedDB feed copy.

## Workflow permissions and outputs

The workflow restores only `.publisher-data/alien-world/` using the existing `alien-world-db-v1-...` cache-key family, runs the shared Newsroom Orchestrator and the matching Publisher, commits only the validated public feed/assets, then requests a GitHub Pages rebuild when output changes. The Pages rebuild endpoint uses `/repos/{owner}/{repo}/pages/builds`.

The ZIP Extractor blocks `.github/`. The complete copy-ready workflow is mirrored at `alien-world/publisher/ALIEN_WORLD_PUBLISHER_WORKFLOW_UPDATE.yml`; replace `.github/workflows/alien-world-publisher.yml` with that file after applying the main ZIP.
