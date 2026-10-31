# LIVE // EARTH — Current Project Guide

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Live site:** https://z8t8fp99p9-glitch.github.io/Live-Earth/  
**Guide updated:** 31 October 2026

## Current project status

- The current service-worker build is `v109-alien-view-reset`; `sw.js` and `update-manager.js` use the matching build identifier.
- The Global PDF Reader source is v4.0.0. The owner has confirmed that the reader and magazine opening are working well on the iPhone. Its real-device acceptance is therefore owner-confirmed for the tested current use; do not reopen the design unless an observed regression requires it.
- Alien World is connected to its Collector → database → Publisher → Universal Editorial Engine → published output pipeline. The browser view reads completed outputs; it does not collect news.
- Moon View was user-verified in Portrait and Landscape on 28 October 2026 and remains locked.
- Cleanup 01 was applied successfully on 31 October 2026. The four obsolete setup/patch notes and temporary upload ZIP were removed. No application code was changed by that cleanup.

For the detailed dated source audit and current Views Separation notes, see [`LIVE-EARTH-CONTINUITY-ADDENDUM-VIEWS-SEPARATION-2026-10-31.md`](./LIVE-EARTH-CONTINUITY-ADDENDUM-VIEWS-SEPARATION-2026-10-31.md). The older [`LIVE-EARTH-CONTINUITY.md`](./LIVE-EARTH-CONTINUITY.md) remains the historical engineering register; its earlier V96/V97/V109 entries are retained as history, not current deployment instructions.

## Working rules

1. Inspect the actual current `main` branch before preparing any code package.
2. The owner uses the iPhone and does not edit source code manually. Supply complete, ready-to-upload ZIP packages and simple instructions.
3. The owner manually uploads and commits to GitHub. Never write, commit, push or deploy on the owner's behalf.
4. Make the smallest coherent, reversible change. Do not introduce features or redesign approved architecture without a clear request.
5. Distinguish static checks, mock/browser tests, deployed behaviour and actual iPhone testing. Never claim a test was performed when it was not.
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

### Home and primary view navigation

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
| `alien-world-view-controller.js` | Alien World Main Page and view lifecycle; consumes shared publishing services |
| `location.html` / `earth-orb-globe.js` | Separate Location globe screen and its renderer |
| `location-scanner.js` | Location Scanner interactions for the existing Earth Explorer flow |

The primary-view manager and the view-module registry have distinct responsibilities. Some controllers retain compatibility/fallback event handling for load-order or older-cache resilience. Do not remove those handlers merely because they appear duplicative; trace the exact startup and iPhone paths first.

### Alien World publishing architecture

Alien World is an online-only cinematic astronomy and space-discovery magazine/browser, not a game.

1. `data-collection/alien-world/collector.py` is the only Alien World component that fetches external sources and writes source records/media into the Alien World database.
2. `publishers/alien-world/publisher.py` reads that database in read-only mode and supplies Publisher instructions to the shared Engine. Publisher network access and database write access remain disabled.
3. `editorial-engine/universal_editorial_engine.py` is the shared, view-independent production engine. It receives the selected database records and Publisher instructions; it does not collect news or independently browse sources.
4. `published/alien-world/` contains completed feed, catalogue and magazine outputs.
5. `alien-world-publisher-client.js` reads completed outputs and opens the actual PDF with the shared reader. It does not collect news, open the source database or generate magazines.
6. `alien-world-view-controller.js` owns the Alien World view interface, not collection, database writes, magazine composition or global PDF reader implementation.

The workflow `.github/workflows/alien-world-publisher.yml` runs the collection and publication pipeline. It supports manual publication modes and its configured scheduled runs. Keep the Publisher read-only and the Collector as the only component with external-source collection/database-write responsibility.

Each future content-producing view must own its own logical database and Publisher. Publishers reuse the same Universal Editorial Engine and global PDF Reader; they do not create additional independent magazine engines or readers.

### Global PDF Reader

`universal-pdf-viewer.js` is a shared, view-independent reader. Its public API remains:

- `window.LiveEarthUniversalPDFViewer.open(options)`
- `close()`
- `isOpen()`
- `listSaved()`

It opens the actual PDF supplied by the calling view, renders one page at a time, supports navigation/zoom/pan, downloads the original PDF, and closes back to its caller. It does not own feeds, issue catalogues, Publisher listings or magazine generation.

Preserve the existing PDF.js engine version/cache and IndexedDB database `live-earth-pdf-library` (version 1, store `issues`) and all saved publications. Do not reset them to troubleshoot a reader problem.

### Local data and recovery

- `data-store.js` owns the current local data-store helpers.
- `data-recovery.js` owns local backup/recovery support.
- The `recovery/` directory contains deliberate rollback and dated baseline records. It is not disposable clutter.
- `published/alien-world/` contains current published outputs and magazine PDFs. Do not remove publications as a repository-size shortcut without a separate retention decision.

## Repository automation and upload workflow

- `.github/workflows/zip-extract-auto-upload.yml` is the existing root-ZIP importer. Upload `LIVE_EARTH_MAIN_UPLOAD.zip` to the repository root on `main`; it validates the manifest and SHA-256 values, applies only listed writes/deletions, then removes the temporary ZIP after successful application.
- The importer deliberately rejects changes under `.github/`. Workflow changes must be handled separately and explicitly.
- The owner checks GitHub Actions and Pages, then tests on the iPhone. Do not claim deployment until there is evidence or the owner confirms the live behaviour.

## Current cleanup decisions

- Cleanup 01 removed `README-FIRST.txt`, `PIPELINE_WORKFLOW_INSTALL.md`, `SW-VERSION-PATCH.md` and `UPDATE-MANAGER-PATCH.md`; all four were obsolete or completed instructions. The upload ZIP was removed by the existing workflow after application.
- Keep `LIVE-EARTH-LAYOUT-EDITOR.html` as a development/preview utility unless the owner explicitly retires it.
- Keep `basic-map.html` and `basic-map.js` until the intended Basic Map/Location route is resolved; the project continuity register explicitly leaves this decision open.
- Keep `recovery/`, `tests/`, published magazines, current Home Orb artwork and Moon/Sun backgrounds.
- Treat dated source snapshots as historical recovery records. Do not delete them merely because a newer live implementation exists.

## Next development phase — Views Separation

The current task is a read-only architecture audit. Map each view's activation, deactivation, DOM ownership, data ownership, shared-service dependencies and return path before changing code. Keep the existing global primary-view manager and shared feature-module registry as the baseline. The first code change must target one confirmed boundary issue only, include a regression check, and leave Home composition, all five primary Orbs, Sun View, locked Moon View, Location privacy, offline startup, local data and the Alien World Publisher/Engine architecture untouched.
