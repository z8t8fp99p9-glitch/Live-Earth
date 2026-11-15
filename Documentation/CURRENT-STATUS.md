# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Inspected source baseline:** `31d02cbf28359f4fae0cda7e9a11d3f9339ae3ac`  
**Baseline commit:** `Retire Unreferenced Earth Basic Map Prototype`

## Release state

- The Phase 3 Earth Basic Map cleanup is on `main`.
- ZIP extractor run `43670940091` succeeded.
- GitHub Pages run `43670953725` succeeded for the inspected source baseline.
- This confirms repository processing and Pages deployment, not installed-iPhone acceptance.
- The Weather rewrite is `Weather/weather-view.js`; the current view is a full-screen, responsive 2D Canvas atmosphere.
- The service worker and update manager currently report `v132-residents-removed`.

## Current application

- Home retains the approved Earth globe and five Home Orbs.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared module registration, feature lifecycle, Stacks catalogue and the feature dock.
- Earth View uses the shared Earth Engine; Moon and Sun remain independent views.
- Location remains OFF unless explicitly enabled.
- Stacks uses the shared feature runtime and three-Orb dock.
- Weather, Clouds, Traffic/Live Cams and Earthquakes remain separate Stacks features.
- The Universal Editorial Engine is retained as a utility; the former collection and publishing pipeline is not active.

## Weather audit

- The old Live Art Home injection has been retired. The no-op compatibility files remain referenced by the service worker and older cached-shell compatibility path.
- The disconnected Living Topography prototype and its obsolete tests have been removed after a repository reference check.
- Superseded Weather layout and renderer tests have been replaced by a focused suite. Run it from the repository root with `node Tests/run-weather-tests.cjs`.
- GitHub Actions still do not run the repository test suite automatically.
- Installed-iPhone checks remain outstanding: Portrait/Landscape, repeated open/close, switching between Stacks views, Location ON/OFF, stale fix, offline and reconnection.

## Phase 3 runtime dependency audit

- `Earth/basic-map.html` and `Earth/basic-map.js` were unreferenced by the app shell, active controllers, tests and project documentation. They were retired in the first Phase 3 package.
- `Earth/location.html` and `Earth/earth-orb-globe.js` are deliberately retained: the service worker stages them, the HTML loads the module, and the Earth Engine separation test checks canonical Engine usage.
- The startup graph was traced through the Home shell, controlled-startup script loader, service-worker app shell, update manager, view registry and key view controllers.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` imports `earth-engine-3d-graphics-core.js`; both are required and retained.
- `Home/moon-orbit.js` loads `Home/moon-surface-lroc-1536.jpg`; `Moon/moon-view-controller.js` and `Sun/sun-view-controller.js` use `Global/astronomy.js`. These dependencies are retained.
- `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` is a standalone developer tool that embeds the actual app in an iframe. It is not an app-shell page, but it is not an orphan.
- `Global/universal-pdf-viewer.js` is not loaded by the current Home startup sequence, service-worker app shell, update manager or the inspected feature-view registration path. It remains **dormant and preserved**, not deleted; its future standalone utility role has not been ruled out.
- `Weather/Art/service-worker-extension.js` remains imported by `sw.js`; its paired Live Art file is an inert compatibility stub. Do not remove this pair without separately checking old cached clients and the legacy-hook test.
- Editorial Engine browser and Python utilities remain retained. The feature workspace is lazy-loaded by `Global/update-manager.js`; the old upstream collection/publishing contract remains dormant.
- No additional code or asset deletion is justified by this audit checkpoint. Phase 3 remains open for the remaining asset inventory, duplicate-code review and final dependency cross-check.

## Evidence rule

Record source inspection, local test execution, ZIP validation, Actions, Pages deployment and user device confirmation separately. Never infer iPhone acceptance from a green Pages build.
