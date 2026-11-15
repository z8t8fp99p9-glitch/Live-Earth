# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Latest inspected baseline:** `abe0caf848e4712d262f19f65e8c66640162c58f`  
**Baseline commit:** `Consolidate Project Documentation and Remove Superseded Notes`

## Release state

- The documentation cleanup is on `main`.
- The ZIP extractor workflow completed successfully during the upload.
- GitHub Pages build/deployment run `43668668743` succeeded for the inspected baseline.
- This confirms repository processing and Pages deployment, not installed-iPhone acceptance.
- The Weather rewrite is `Weather/weather-view.js`; the current view is a full-screen, responsive 2D Canvas atmosphere.
- The service worker and update manager currently report `v132-residents-removed`.

## Current application

- Home retains the approved Earth globe and five Home Orbs.
- Earth View uses the shared Earth Engine; Moon and Sun remain independent views.
- Location remains OFF unless explicitly enabled.
- Stacks uses the shared feature runtime and three-Orb dock.
- Weather uses Open-Meteo current conditions and daily summary only when an approved fresh Location fix is available. Otherwise it shows labelled sample/offline states.
- Clouds, Traffic/Live Cams and Earthquakes remain separate Stacks features.
- The Universal Editorial Engine is retained as a utility; the former collection and publishing pipeline is not active.

## Weather audit

- The old Live Art Home injection has been retired. A no-op compatibility file remains in the service-worker shell for older cached Home HTML.
- The disconnected Living Topography prototype and its obsolete tests have been removed after a repository reference check.
- Superseded Weather layout and renderer tests have been replaced by a focused suite. Run it from the repository root with `node Tests/run-weather-tests.cjs`.
- GitHub Actions still do not run the repository test suite automatically.
- Installed-iPhone checks remain outstanding: Portrait/Landscape, repeated open/close, switching between Stacks views, Location ON/OFF, stale fix, offline and reconnection.

## Phase 3 runtime dependency audit

- `Earth/basic-map.html` and `Earth/basic-map.js` were unreferenced by the app shell, active controllers, tests and project documentation. They are retired as a disconnected standalone prototype.
- `Earth/location.html` and `Earth/earth-orb-globe.js` are deliberately retained: the service worker still stages them, and the Earth Engine separation test checks their canonical Engine usage.
- `Global/universal-pdf-viewer.js` remains outside the app shell and is not loaded by the current startup path. It is recorded as dormant, not deleted.
- The Editorial Engine workspace remains active through `Global/update-manager.js` and is protected.
- This cleanup does not change `APP_SHELL`, `BUILD_ID`, Home, Earth, Moon, Sun, Location, Stacks, IndexedDB or recovery behaviour.

## Evidence rule

Record source inspection, local test execution, ZIP validation, Actions, Pages deployment and user device confirmation separately. Never infer iPhone acceptance from a green Pages build.
