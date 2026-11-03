# LIVE // EARTH — Current Project Guide

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Guide updated:** 3 November 2026  
**Latest main inspected:** `62e62d0d50045e04628b0dd6a93394c13a26d076` (3 November 2026)

## Current project status

- Nature and Alien World publish independent, online-only Live Feeds through one shared Global Collection Manager and one Global Collector. Each View retains its own Manager profile, isolated SQLite database/cache, Publisher adapter and published feed.
- Both feeds now use the complete rolling **32-day** publication window, with **no story-count cap**. All eligible items present in the configured approved source feeds are considered; a feed provider's own history depth still determines which items it exposes.
- Both isolated Newsroom databases retain **32 days** of Checker-released stories, with no configured record-count ceiling. The existing view-specific GitHub Actions cache paths and cache-key families are preserved; the databases are not committed to the repository and are not reset.
- The scheduled workflows are hourly and staggered: Nature at minute **15 UTC** and Alien World at minute **45 UTC**. Both support manual dispatch.
- While open, each browser view refreshes its online feed every five minutes. It uses `cache: no-store`, presents no current feed while offline, and clears its displayed feed when the view closes. Feed data is not stored in browser localStorage, sessionStorage or IndexedDB.
- Alien World is now **Live Feeds only**. It does not publish a magazine, catalogue, issue archive or PDF. The separate Magazine Feature Orb remains a distinct view and is not part of the Alien World feed pipeline.
- The shared Global Newsroom and Universal Editorial System are installed under `global_collection_manager/`, `global_collector/`, `global-checker/`, `image-engine/`, `editorial-engine/` and `newsroom-database-writer/`. Each View retains isolated data and a presentation-only Publisher adapter.
- The shared publication order is Global Collection Manager → Global Collector → Global Checker → Global Image Engine → Universal Editorial Engine → post-Editorial Global Checker → shared Newsroom Database Writer → matching View Publisher → Live Feed. The Image Engine's original artwork cannot override a source's refusal of persistent storage or summary reuse.
- The Global PDF Reader remains shared and view-independent. Its v4.0.0 design and saved-PDF data are protected.
- The owner has confirmed that the current app views are working well on the iPhone. Moon View was verified in Portrait and Landscape on 28 October 2026 and remains locked.
- The current service-worker build remains `v109-alien-view-reset`; `sw.js` and `update-manager.js` must continue to use matching build identifiers.

**Global-only integration verification:** the current repair removes both per-View Collector implementations and the legacy per-View collection/image-ingestion routes. Local regression coverage for Manager, Global Collector, Global Checker, shared Writer, Editorial Engine, Nature and Alien World passes. GitHub Actions end-to-end runs and iPhone verification remain pending the ZIP upload and manual replacement of the two blocked `.github/workflows/` files.

For the new uncapped 32-day publication design and test record, see [`LIVE-EARTH-32-DAY-UNCAPPED-PUBLISHING-ADDENDUM-2026-11-02.md`](./LIVE-EARTH-32-DAY-UNCAPPED-PUBLISHING-ADDENDUM-2026-11-02.md). Earlier addenda remain historical audit evidence. The 31 October Views Separation addendum and earlier continuity records remain historical audit evidence. The 1 November cleanup record remains an immutable record of Cleanup 01.

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

**Ownership rules:** every View uses the same Manager, Global Collector, Checker, Image Engine, Editorial Engine and Newsroom Database Writer. The Manager assigns a View-scoped job; the Global Collector returns transient candidates; the Writer initializes and writes only Checker-released rows to the destination registered in that View profile. Database paths, caches and publication outputs remain separate. View Publishers are read-only presentation adapters and never collect sources. New Views are added through Manager configuration and applicable Checker policy, not new Collector code.

### Nature Live Feeds

- Shared collection: `global_collector/`; Manager profile: `global_collection_manager/config/view-collection-profiles.json`.
- Database: `.publisher-data/nature/nature.sqlite3`.
- Publisher/profile: `nature/publisher/` (read-only output adapter).
- Public output: `nature/published/live-feed.json` and verified contextual image assets/rights metadata.
- Workflow: `.github/workflows/nature-publisher.yml`, hourly at minute 15 UTC, plus manual dispatch.
- Manager assignments select the registered RSS/Atom feeds. Global Checker independently assesses text and image provenance/permissions; the shared Image Engine handles image work.

### Alien World Live Feeds

- Shared collection: `global_collector/`; official NASA source assignments are registered in the Manager and checked downstream.
- Database: `.publisher-data/alien-world/alien-world.sqlite3`.
- Publisher/profile: `alien-world/publisher/` (read-only output adapter).
- Public output: `alien-world/published/live-feed.json` only.
- Workflow: `.github/workflows/alien-world-publisher.yml`, hourly at minute 45 UTC, plus manual dispatch.
- Publisher reads only its own Checker-approved Newsroom rows and rejects magazine-shaped output. The browser view reads only the completed feed; it does not collect sources or generate publications.

### Global PDF Reader

`universal-pdf-viewer.js` is a shared, view-independent reader. Its public API remains `window.LiveEarthUniversalPDFViewer.open(options)`, `close()`, `isOpen()` and `listSaved()`. It opens the actual PDF supplied by the calling view, renders one page at a time, supports navigation/zoom/pan, downloads the original PDF, and closes back to its caller.

Preserve the existing PDF.js engine version/cache and IndexedDB database `live-earth-pdf-library` (version 1, store `issues`) and all saved publications. Do not reset them to troubleshoot a reader problem.

### Local data and recovery

- `data-store.js` owns the current local data-store helpers; `data-recovery.js` owns local backup/recovery support.
- `recovery/` contains deliberate rollback and dated baseline records. It is not disposable clutter.
- Preserve the separate Nature and Alien World Newsroom database cache families; neither database belongs in the public repository.
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
