# Phase 3 — Runtime Dependency Audit

**Audit checkpoint:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected baseline:** `31d02cbf28359f4fae0cda7e9a11d3f9339ae3ac`

## Purpose

Trace the real runtime and standalone-tool dependency graph before removing old prototypes, duplicate assets or dormant code. This audit is deliberately conservative: a missing reference in `index.html` alone is not proof that a file is disposable.

## Startup and lifecycle graph reviewed

1. `index.html` registers `sw.js` and, for a controlled startup, loads the primary Orb controller, Earth controller, Location service, primary view manager, shared view registry, Stacks runtime, sky host, Moon controller/interface, update manager and then the Data recovery module.
2. `sw.js` stages the application shell and the shared Earth/Three.js runtime dependencies. It also owns startup recovery and optional caching.
3. `Global/update-manager.js` lazily loads the procedural Sun controller and `Editorial-Engine/engine-feature-views.js`.
4. `Global/view-module-registry.js` owns feature registration, activation/deactivation and the shared dock. `Stacks/stacks-feature-views.js` provides the common feature runtime.
5. Weather, Clouds, Traffic and Earthquakes remain separate feature modules; the service worker stages their scripts.
6. Earth, Moon and Sun retain their separate view controllers/renderers and the shared components they explicitly import.

## Confirmed dependencies — preserve

| File or group | Evidence / role |
|---|---|
| `EarthEngine/Graphics/earth-engine-3d-graphics-core.js` | Imported by `earth-engine-3d-graphics-engine.js`. |
| `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` | Staged by `sw.js`; used by the shared Earth/Three.js rendering path. |
| `Global/astronomy.js` | Imported by Moon and Sun controllers. |
| `Home/moon-orbit.js` and `Home/moon-surface-lroc-1536.jpg` | Home Moon orbit loads the surface texture. |
| `Earth/location.html` and `Earth/earth-orb-globe.js` | Separate location page loads the module; module imports the canonical Earth Engine; service worker stages both. |
| `Global/view-manager.js` | Sole primary-view transition authority. |
| `Global/view-module-registry.js` and `Stacks/stacks-feature-views.js` | Shared secondary-view registry, lifecycle and feature runtime. |
| `Global/update-manager.js` and `Editorial-Engine/engine-feature-views.js` | Lazy-load path for the Editorial Engine workspace. |
| `Weather/Art/service-worker-extension.js` and `Weather/Art/live-art-online.js` | Service-worker import and inert compatibility stub; legacy-hook regression test remains. |
| `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` | Standalone developer tool; embeds the actual app through an iframe. |
| Editorial Engine JS/Python utilities and tests | Retained utility boundary documented in `Editorial-Engine/README.md`; the former upstream collection/publishing pipeline is not active. |

## Previously retired in Phase 3

`Earth/basic-map.html` and `Earth/basic-map.js` were checked against the app shell, active controllers, tests and project documentation. No active or standalone entry point was found, so the disconnected prototype was retired in the first Phase 3 package.

Do not confuse those files with `Earth/location.html` and `Earth/earth-orb-globe.js`, which are a separate retained path.

## Dormant, but deliberately preserved

`Global/universal-pdf-viewer.js` is not loaded by the inspected Home startup sequence, service-worker app shell, update manager or feature registration path. It has not been deleted. Its possible standalone/manual use has not been ruled out, and a future decision should consider whether a supported user-facing entry point is intended.

The Editorial Engine's former approved-record input contract is also dormant because its upstream source and publishing services were removed. The retained utility and lazy-loaded workspace remain preserved.

## Compatibility caution

`sw.js` still imports `Weather/Art/service-worker-extension.js`. The companion `live-art-online.js` is intentionally inert, and the Weather legacy-hook test checks this boundary. Do not remove these files or their import until old cached clients and the regression test are deliberately retired together.

## Remaining Phase 3 work

- Complete the remaining asset inventory, including images, textures, reference artwork and optional-cache resources.
- Review duplicate code/assets only where equivalence can be demonstrated; do not infer duplication from similar filenames.
- Cross-check every remaining candidate against runtime imports, service-worker staging, lazy loaders, tests, docs and standalone tools.
- Remove only files with a complete, documented no-reference case.
- Finish with syntax/contract checks and a source-baseline/deployment checkpoint.

## Evidence boundary

This checkpoint records remote source inspection and dependency tracing. It does not claim that the full repository test suite was executed locally, that GitHub Actions run those tests, or that the app has passed iPhone acceptance testing.
