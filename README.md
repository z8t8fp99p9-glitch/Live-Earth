# LIVE // EARTH — Current Project Guide

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Guide updated:** 1 November 2026  
**Source inspected:** `caffc644ba7a111e3e0f95ec227c7366d500d7f9`

## Current project status

- Nature and Alien World now publish independent, online-only Live Feeds. Each view has its own Collector, SQLite database, Publisher profile and published feed.
- Both feeds use a rolling **48-hour** publication window and show up to **10 stories**.
- Both source databases retain up to **32 days** of records. The existing view-specific GitHub Actions cache paths and cache-key families are preserved; the databases are not committed to the repository and were not reset.
- The scheduled workflows are hourly and staggered: Nature at minute **15 UTC** and Alien World at minute **45 UTC**. Both support manual dispatch.
- While open, each browser view refreshes its online feed every five minutes. It uses `cache: no-store`, presents no current feed while offline, and clears its displayed feed when the view closes. Feed data is not stored in browser localStorage, sessionStorage or IndexedDB.
- Alien World is now **Live Feeds only**. It does not publish a magazine, catalogue, issue archive or PDF. The separate Magazine Feature Orb remains a distinct view and is not part of the Alien World feed pipeline.
- The shared Universal Editorial System is installed under `editorial-engine/`. It has a browser companion and a Python production Engine. Each view retains independent data ownership and its own Publisher.
- The Global PDF Reader remains shared and view-independent. Its v4.0.0 design and saved-PDF data are protected.
- The owner has confirmed that the current app views are working well on the iPhone. Moon View was verified in Portrait and Landscape on 28 October 2026 and remains locked.
- The current service-worker build remains `v109-alien-view-reset`; `sw.js` and `update-manager.js` must continue to use matching build identifiers.

**Automation verification note:** GitHub's last observed Alien World scheduled run (`41320821525`, source commit `97b6c3e995`) completed collection but the Publisher's contract-test gate failed, so it preserved the last-good feed and did not publish a replacement. The two test issues from that run are documented in [`LIVE-EARTH-LIVE-FEEDS-ADDENDUM-2026-11-01.md`](./LIVE-EARTH-LIVE-FEEDS-ADDENDUM-2026-11-01.md). This documentation package also moves the explanatory output README out of `alien-world/published/`; the parser-date assertion remains an open test correction. The hourly schedule is present on `main`; do not describe the current end-to-end publisher cycle as verified until the remaining test is corrected and a later run succeeds.

For the complete current feed architecture, ownership, operating rules and verification record, see [`LIVE-EARTH-LIVE-FEEDS-ADDENDUM-2026-11-01.md`](./LIVE-EARTH-LIVE-FEEDS-ADDENDUM-2026-11-01.md). The 31 October Views Separation addendum and earlier continuity records remain historical audit evidence. The 1 November cleanup record remains an immutable record of Cleanup 01.

## Working rules

1. Inspect the actual current `main` branch before preparing any code package.
2. The owner uses the iPhone and does not edit source code manually. Supply complete, ready-to-upload ZIP packages and simple instructions.
3. The owner manually uploads and commits to GitHub. Never write, commit, push or deploy on the owner's behalf.
4. Make the smallest coherent, reversible change. Do not introduce features or redesign approved architecture without a clear request.
5. Distinguish static checks, mock/browser tests, deployed behaviour, workflow runs and actual iPhone testing. Never claim a test was performed when it was not.
6. Include one clear GitHub commit title with every code or repository package.
7. Preserve working features, history, recovery material and local user data.

## Protected app behaviour

- **Home:** preserve the existing Earth and Moon composition, sizes, positions, camera framing, zoom, textures, lighting and five primary Orbs: Earth, Sun, Moon, Location and Stacks. Do not add a sixth Home Orb.
- **Moon View:** locked and user-verified. Do not modify its scenery, Moon appearance, lunar information, arcs, scrollers, Rise/Set placement, timers, responsive layout or privacy behaviour.
- **Sun View:** preserve the existing approved view and renderer unless a specific change is requested.
- **Location:** OFF by default. No automatic geolocation request at Home or during startup. A feature may use a recent location only after the owner turns Location ON and chooses the feature.
- **Stacks:** preserve the existing three-Orb feature dock and shared feature lifecycle. Stacks remains an independent utility, not a replacement for the active primary view.
- **Offline/startup:** preserve staged update behaviour, verified app-shell startup, recovery, retry handling and existing caches. Live online-only content must not be presented as current offline.
- **Local data:** do not reset, migrate destructively or delete IndexedDB, Cache Storage, saved PDFs, local recovery data or user preferences as a routine fix.
- No login or unexpected paid cloud service.

## Current runtime architecture

### Home and primary-view navigation

| File | Responsibility |
|---|---|
| `index.html` | Home scene, five primary Orb buttons, startup markup and ordered controller bootstrap |
| `ios-standalone-root-flow.js` | iOS installed-web-app root/viewport handling |
| `orb-controls-v4.js` | Primary Orb interaction, Location OFF privacy gate and Location lifecycle |
| `earth-mode-navigation.js` | Earth Explorer controls, Basic/HD quality selection, zoom and Scanner controls |
| `view-manager.js` | Single authority for primary view state: Home, Earth Explorer, Moon and Sun |
| `view-module-registry.js` | Shared view-module lifecycle and Stacks feature-Orb/library system |
| `sw.js` | Verified offline app shell, runtime dependency cache, staged worker update and recovery routing |
| `update-manager.js` | Startup readiness gate, online freshness check and bounded update retry behaviour |

### View controllers

| File | Responsibility |
|---|---|
| `sky-view-controller.js` | Shared full-screen sky stage and background/lifecycle for Sun and Moon |
| `moon-view-controller.js` | Moon-specific renderer and Moon View behaviour; locked |
| `moon-lunar-interface.js` | Moon-only lunar Arc/time-scroller overlay and its lifecycle; locked with Moon View |
| `sun-view-renderer.js` | Sun-specific procedural renderer, registered through the shared view-module system |
| `stacks-feature-views.js` | Clouds, Weather, Elevation, Earthquakes and Traffic feature views using the existing shared Earth/layer interface; no second Earth |
| `alien-world/view/alien-world-view-controller.js` | Alien World Live Feeds feature view and lifecycle |
| `nature/view/nature-view-controller.js` | Nature Live Feeds feature view and lifecycle |
| `location.html` / `earth-orb-globe.js` | Separate Location globe screen and its renderer |
| `location-scanner.js` | Location Scanner interactions for the existing Earth Explorer flow |

The primary-view manager and the view-module registry have distinct responsibilities. Some controllers retain compatibility/fallback event handling for load-order or older-cache resilience. Do not remove those handlers merely because they appear duplicative; trace the exact startup and iPhone paths first.

### Universal Editorial System

The Universal Editorial System is shared infrastructure for the whole app, not an Alien World-only subsystem:

| File | Environment | Responsibility |
|---|---|---|
| `editorial-engine/universal-editorial-engine.js` | Browser | Shared output-contract validation and safe helpers exposed as `window.LiveEarthUniversalEditorialEngine` |
| `editorial-engine/universal_editorial_engine.py` | Python production | Shared view-independent feed and optional PDF generation through `run_engine(...)` |
| `editorial-engine/requirements.txt` | Python workflow | Pinned runtime dependencies |
| `editorial-engine/README.md` | Documentation | Architecture, responsibilities and integration contract |

The JavaScript and Python files are complementary layers of one system, not duplicate Engines. Neither layer collects external sources, owns a view database, or contains a view-specific feed list.

**Ownership rules:** each content-producing view owns an independent logical database and Publisher. Its Collector, when needed, is the only component allowed to fetch that view's external sources and write to its database. The Publisher reads only its own database in read-only mode, then supplies the profile, command and bounded output destination to the shared Python Engine. The Engine does not fetch the internet, open databases, own schedules or write view records. All views reuse the one browser companion and the one Global PDF Reader.

### Nature Live Feeds

- Collector: `nature/collector/collector.py`.
- Database: `.publisher-data/nature/nature.sqlite3`.
- Publisher/profile: `nature/publisher/`.
- Public output: `nature/published/live-feed.json` and verified contextual image assets/rights metadata.
- Workflow: `.github/workflows/nature-publisher.yml`, hourly at minute 15 UTC, plus manual dispatch.
- Source data is screened RSS/Atom reporting; optional documentary photos are individually re-screened against approved Wikimedia Commons file-page metadata and allowed licences.

### Alien World Live Feeds

- Collector: `alien-world/collector/collector.py`; official NASA source domains only.
- Database: `.publisher-data/alien-world/alien-world.sqlite3`.
- Publisher/profile: `alien-world/publisher/`.
- Public output: `alien-world/published/live-feed.json` only.
- Workflow: `.github/workflows/alien-world-publisher.yml`, hourly at minute 45 UTC, plus manual dispatch.
- Publisher runs its deterministic contract tests before publication, opens its source database read-only and rejects magazine-shaped output. The browser view reads only the completed feed; it does not collect sources or generate publications.

### Global PDF Reader

`universal-pdf-viewer.js` is a shared, view-independent reader. Its public API remains `window.LiveEarthUniversalPDFViewer.open(options)`, `close()`, `isOpen()` and `listSaved()`. It opens the actual PDF supplied by the calling view, renders one page at a time, supports navigation/zoom/pan, downloads the original PDF, and closes back to its caller.

Preserve the existing PDF.js engine version/cache and IndexedDB database `live-earth-pdf-library` (version 1, store `issues`) and all saved publications. Do not reset them to troubleshoot a reader problem.

### Local data and recovery

- `data-store.js` owns the current local data-store helpers; `data-recovery.js` owns local backup/recovery support.
- `recovery/` contains deliberate rollback and dated baseline records. It is not disposable clutter.
- Preserve Nature and Alien World database cache families; neither source database belongs in the public repository.
- Preserve saved PDFs, browser recovery data and user preferences.

## Repository automation and upload workflow

- `.github/workflows/zip-extract-auto-upload.yml` is the existing root-ZIP importer. Upload `LIVE_EARTH_MAIN_UPLOAD.zip` to the repository root on `main`; it validates `UPLOAD_MANIFEST.json` and SHA-256 values, applies only listed writes/deletions, then removes the temporary ZIP after successful application.
- The importer deliberately rejects changes under `.github/`. Workflow changes must be handled separately and explicitly. The current Nature and Alien World hourly workflow files are already present on `main`.
- The owner checks GitHub Actions and Pages, then tests on the iPhone. Do not claim deployment until there is evidence or the owner confirms the live behaviour.

## Current cleanup decisions

- Cleanup 01 removed `README-FIRST.txt`, `PIPELINE_WORKFLOW_INSTALL.md`, `SW-VERSION-PATCH.md` and `UPDATE-MANAGER-PATCH.md`; all four were obsolete or completed instructions. The upload ZIP was removed by the existing workflow after application.
- Keep `LIVE-EARTH-LAYOUT-EDITOR.html` as a development/preview utility unless the owner explicitly retires it.
- Keep `basic-map.html` and `basic-map.js` until the intended Basic Map/Location route is resolved.
- Keep `recovery/`, current Home Orb artwork and Moon/Sun backgrounds.
- Keep regression suites beside their owning views: `alien-world/tests/`, `nature/tests/` and `magazine/tests/`. The temporary root `/tests` sandbox has been retired.
- Tracked Python `__pycache__` and `.pyc` files are generated artifacts and must not be committed.
- Treat dated source snapshots as historical recovery records. Do not delete them merely because a newer live implementation exists.

## Next development phase — Views Separation

Continue the read-only architecture audit. Map each view's activation, deactivation, DOM ownership, data ownership, shared-service dependencies and return path before changing code. Keep the existing global primary-view manager and shared feature-module registry as the baseline. Any first code change must target one confirmed boundary issue only, include a regression check, and leave Home composition, all five primary Orbs, Sun View, locked Moon View, Location privacy, offline startup, local data and the existing Publisher/Engine boundaries untouched.
