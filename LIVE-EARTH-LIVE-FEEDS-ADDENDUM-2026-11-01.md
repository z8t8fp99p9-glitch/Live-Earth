# LIVE // EARTH — Live Feeds architecture and progress addendum

**Historical architecture record — superseded on 3 November 2026.** The Collector ownership, database-writer and story-window details below describe the earlier per-View implementation only. The active architecture is documented in `NEWSROOM-PIPELINE-INTEGRATION-2026-11-03.md`: one Global Collection Manager, one Global Collector, one shared Checker/editorial/Writer pipeline, and separate Manager-selected View databases. This record is retained for history and is not an instruction to restore either removed View Collector.

**Date:** 1 November 2026 (Asia/Kolkata)  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Verified source HEAD:** `caffc644ba7a111e3e0f95ec227c7366d500d7f9`  
**Latest source commit:** `Standardize Live Feeds to 32-Day Retention and Hourly Top-10 Updates`

This is the current source-of-truth addendum for the Nature and Alien World Live Feeds. It extends the 31 October Views Separation audit and supersedes older draft statements about three-hour schedules or Alien World magazine/catalogue outputs. It does not erase historical engineering records.

## 1. Final product decisions

Both Nature and Alien World are independent, online-only Live Feed views. They do not share a physical source database, do not retain browser copies of current feed data, and do not show cached stories as current while offline.

| Contract | Nature | Alien World |
|---|---|---|
| Own database | `.publisher-data/nature/nature.sqlite3` | `.publisher-data/alien-world/alien-world.sqlite3` |
| Database owner | Nature Collector | Alien World Collector |
| Database retention | 32 days | 32 days |
| Additional record ceiling | — | 2,000 records |
| Collection schedule | Hourly, minute 15 UTC | Hourly, minute 45 UTC |
| Manual workflow | Supported | Supported |
| Visible story window | Rolling 48 hours | Rolling 48 hours |
| Maximum visible stories | 10 | 10 |
| Browser refresh while open | Every 5 minutes | Every 5 minutes |
| Public feed | `nature/published/live-feed.json` | `alien-world/published/live-feed.json` |
| Browser persistence | None | None |

The workflows are staggered by 30 minutes to avoid beginning both publisher jobs on the same minute. The existing GitHub Actions cache locations and key families are preserved. The SQLite databases are cache-owned runtime data and must not be committed to the public repository or reset as part of an unrelated update.

## 2. Nature ownership and behaviour

- `nature/collector/collector.py` is the only Nature component with approved source-network and database-write access. It retrieves configured RSS/Atom reporting and re-screens contextual photographs against original Wikimedia Commons file-page metadata, creator, licence and approved-host rules.
- `nature/publisher/publisher.py` opens `.publisher-data/nature/nature.sqlite3` read-only/query-only and calls the shared Python Universal Editorial Engine in `live` mode.
- `nature/publisher/profile.json` sets a rolling 48-hour publication window, maximum 10 stories, maximum source age of 32 days and database retention of 32 days.
- `nature/published/` receives the validated live feed plus current, rights-verified image assets/rights metadata. A story remains eligible as text if no exact verified photograph is available.
- `.github/workflows/nature-publisher.yml` is already installed on `main` with cron `15 * * * *` and supports `workflow_dispatch`.
- `nature/view/nature-view-controller.js` refreshes only while active and online. The browser client uses `cache: no-store`; deactivation clears the rendered feed. No localStorage, sessionStorage or IndexedDB feed persistence is used.

## 3. Alien World ownership and behaviour

- `alien-world/collector/collector.py` is the only Alien World component with source-network and database-write access. It is restricted to official NASA host-family sources and screens images found in the originating NASA feed/article. It does not publish.
- `.publisher-data/alien-world/alien-world.sqlite3` is the independent Alien World source database. `alien-world/publisher/profile.json` sets 32-day database retention, a 2,000-record ceiling and a one-hour collection target.
- `alien-world/publisher/publisher.py` runs the deterministic contract suite, reads the source database read-only/query-only, invokes the shared Engine in `live` mode and accepts only a Live Feed response. It cannot collect sources or write the source database.
- The public output contract is exactly `alien-world/published/live-feed.json`. No Alien World catalogue, magazine PDF, issue record, latest-publication pointer or archive is generated.
- The rolling feed window is 48 hours, with a maximum of 10 stories.
- `.github/workflows/alien-world-publisher.yml` is already installed on `main` with cron `45 * * * *` and supports `workflow_dispatch`.
- `alien-world/view/alien-world-view-controller.js` and `alien-world/view/alien-world-publisher-client.js` are presentation/read-only clients. They load the completed feed, use `cache: no-store`, refresh every five minutes while open, and clear displayed content on deactivation. No localStorage, sessionStorage or IndexedDB feed persistence is used.

The blank Magazine Feature Orb remains an independent view and is not an Alien World publication mode. Keep Magazine code and ownership separate. The single Global PDF Reader remains shared for documents explicitly opened or saved by other views.

## 4. Browser online-only contract

The five-minute timer is a browser refresh while a view is open; it is not the server collection schedule. The hourly GitHub Actions workflow performs server-side source collection and publication. The browser view only fetches the completed published JSON.

When a view closes, its displayed feed nodes are removed. On offline transition, the view replaces story cards with a connectivity message. Requests use `cache: no-store`, and the clients/controllers do not write the feed to localStorage, sessionStorage or IndexedDB. Do not introduce offline feed persistence or present an old copy as a current live feed.

## 5. Shared Universal Editorial System

The shared browser companion and Python Engine live together under `editorial-engine/`:

- `editorial-engine/universal-editorial-engine.js` exposes `window.LiveEarthUniversalEditorialEngine` for browser-side feed contract validation/safe helpers.
- `editorial-engine/universal_editorial_engine.py` exposes `run_engine(...)` to view Publishers.
- `editorial-engine/requirements.txt` supplies shared production dependencies.

This is one shared system with two execution layers. It is not an Alien World-owned Engine. Collectors, source databases, profiles, workflows and Publishers remain view-specific. The Python Engine receives the Publisher's read-only database connection and configured command; it does not fetch external data or own a database. The Global PDF Reader remains separate and shared.

## 6. Workflow verification and known publisher gate

The GitHub Actions history visible during this audit includes a scheduled Alien World run:

- **Run:** `41320821525`
- **Source commit used:** `97b6c3e995c96b32708d0da5be5dc8135b57d773`
- **Collector:** completed successfully; 43 entries collected, 45 database records present, 5 cached images reused. NASA Science's feed was temporarily unavailable because the response was malformed XML; the other listed sources were processed.
- **Publisher:** skipped publication after its 13-test contract suite reported two failures. The last-good public feed was preserved (`preservedLastGoodLiveFeed: true`).

The failures are test-contract mismatches, not a Collector failure:

1. `test_rss_parser_keeps_source_story_and_publication_date` expects `records[0]["publishedAt"]`, but the current RSS parser returns the original source date string in `records[0]["published"]`. The test must validate the actual parser contract (and parse the date with `COLLECTOR.parse_date`) rather than assert a key the parser does not return. This remains the one open test correction.
2. `test_alien_world_publication_is_live_feed_only` expects the public output directory to contain only `live-feed.json`, but `alien-world/published/README.md` is documentation and is counted as a second file. This package moves that documentation to `alien-world/docs/PUBLISHED-OUTPUT.md` and deletes the README from the public-output folder.

Do not hide or skip the remaining contract test. Correct its expected date field, run the complete 13-test suite, and then require a later scheduled or manually dispatched workflow to complete successfully before marking automated publication verified. The observed failure did not overwrite or delete the last-good feed.

**Status distinction:** the owner has reported the app views working well on the iPhone. That device-level acceptance does not imply that the latest scheduled Alien World Publisher run passed. Nature and Alien World workflow schedules are present on `main`; their end-to-end automated publishing status must be grounded in workflow-run evidence.

## 7. Protected behaviour and no-change list

This feed/documentation phase does not authorize changes to:

- Home composition, Earth/Moon dimensions/framing, camera, textures, lighting or the five primary Orbs;
- the locked Moon View, its mountain-lake scene, lunar arcs, scroller, timers or portrait/landscape behaviour;
- the approved Sun View;
- Location-OFF privacy, Stacks lifecycle, app startup, service worker, staged updates, offline recovery or caches;
- the Global PDF Reader, its PDF.js version/cache, IndexedDB `live-earth-pdf-library` v1 / `issues` store or saved PDFs;
- separate Magazine ownership or feature-view behaviour;
- Nature or Alien World source database cache directories and key families.

Do not reset a database, purge Cache Storage, migrate IndexedDB destructively or delete recovery records as a troubleshooting shortcut.

## 8. Files and documentation updated in this continuity package

- Root `README.md`: current Live Feeds architecture, operating parameters, protection rules and corrected current status.
- `editorial-engine/README.md`: universal ownership contract and current hourly schedules.
- `alien-world/docs/WORKFLOW.md`: replaces obsolete magazine/all modes with the live-only hourly workflow.
- `nature/docs/WORKFLOW.md`: states the hourly minute-15 schedule and current feed contract.
- `ALIEN-WORLD-REBUILD-ADDENDUM-2026-11-01.md`: appends the superseding Live-Feeds-only decision while preserving the original rebuild history.
- `alien-world/docs/PUBLISHED-OUTPUT.md`: documents the one public output outside the public-output directory; the package removes `alien-world/published/README.md` so the public-output folder contains only the feed.

The remaining parser date-key test correction is deliberately recorded as a follow-up and is not silently marked complete by this documentation package.
