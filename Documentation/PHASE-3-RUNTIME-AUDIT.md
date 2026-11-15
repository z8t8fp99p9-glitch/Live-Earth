# Phase 3 — Runtime and Asset Dependency Audit

**Audit checkpoint:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected baseline:** `c49e1c67f5e987270db4310ed9c60941c136dcc0`

## Purpose

Trace the runtime and asset dependency graph before removing old prototypes, duplicate assets or dormant code. A missing reference in `index.html` alone is not proof that a file is disposable.

## Runtime dependency graph

1. `index.html` registers `sw.js` and, for a controlled startup, loads the primary Orb controller, Earth controller, Location service, primary view manager, shared view registry, Stacks runtime, sky host, Moon controller/interface, update manager and then the Data recovery module.
2. `sw.js` stages the application shell and shared Earth/Three.js runtime dependencies. It also owns startup recovery and optional caching.
3. `Global/update-manager.js` lazily loads the procedural Sun controller and `Editorial-Engine/engine-feature-views.js`.
4. `Global/view-module-registry.js` owns feature registration, activation/deactivation and the shared dock. `Stacks/stacks-feature-views.js` provides the common feature runtime.
5. Weather, Clouds, Traffic and Earthquakes remain separate feature modules; the service worker stages their scripts.
6. Earth, Moon and Sun retain separate view controllers/renderers and shared components they explicitly import.

## Confirmed dependencies — preserve

| File or group | Evidence / role |
|---|---|
| `EarthEngine/Graphics/earth-engine-3d-graphics-core.js` | Imported by `earth-engine-3d-graphics-engine.js`. |
| `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` | Staged by `sw.js`; part of the shared Earth/Three.js rendering path. |
| `Global/astronomy.js` | Imported by Moon and Sun controllers. |
| `Home/moon-orbit.js` and `Home/moon-surface-lroc-1536.jpg` | Home Moon orbit loads the surface texture. |
| `Earth/location.html` and `Earth/earth-orb-globe.js` | Separate location page loads the module; module imports the canonical Earth Engine; service worker stages both. |
| `Global/view-manager.js` | Sole primary-view transition authority. |
| `Global/view-module-registry.js` and `Stacks/stacks-feature-views.js` | Shared secondary-view registry, lifecycle and feature runtime. |
| `Global/update-manager.js` and `Editorial-Engine/engine-feature-views.js` | Lazy-load path for the Editorial Engine workspace. |
| `Weather/Art/service-worker-extension.js` and `Weather/Art/live-art-online.js` | Service-worker import and inert compatibility stub; legacy-hook regression test remains. |
| `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` | Standalone developer tool; embeds the actual app through an iframe. |
| Editorial Engine JS/Python utilities and tests | Retained utility boundary documented in `Editorial-Engine/README.md`; the former upstream collection/publishing pipeline is not active. |

## Asset inventory

The repository tree was checked for image, vector, font, video, JSON and data-manifest assets.

- **Home and primary view assets:** Earth, Moon, Sun, Location and Stacks Orb images; Home Moon surface texture; Moon and Sun portrait/landscape sky backgrounds and Moon responsive SVG.
- **Earth runtime assets:** Three.js module dependencies and Earth surface texture are staged through `sw.js` runtime dependency handling; Earth Engine graphics modules are separately staged in the app shell.
- **Sun runtime assets:** shared Sun surface texture and sky backgrounds are used by the Sun controller; the Sun Orb image and equirectangular sphere texture are distinct assets.
- **Traffic discovery assets:** six category images are referenced by the Live Cams discovery view.
- **Stacks artwork:** the feature wallpaper is retained as a separate Stacks asset.
- **Weather artwork archive:** catalogues, JSON drawing data, production plans, master/reference images, previews and mask studies are archival. They are not active dependencies of the current Canvas Weather renderer.
- **Data metadata:** `Data/dataset-manifest.json` remains a data contract, not disposable artwork.

## Exact duplicate image blobs

Git tree blob SHA values identify two exact duplicate pairs:

1. `Weather/Art/References/clear-maple-pavilion-002-90pct-master-scale-proof.png` and `Weather/Art/References/clear-maple-pavilion-002-90pct-preview.png` — both 1,321,910 bytes and the same Git blob SHA.
2. `Weather/Art/References/clear-maple-pavilion-master-003.jpg` and `Weather/Art/References/clear-weather-master-001.jpg` — both 483,948 bytes and the same Git blob SHA.

These are exact byte duplicates, not visual guesses. They are **not deleted** in this audit:
- The master-003 image is referenced by the archived schema-v3 artwork record.
- The clear-weather master filename is represented in the archive's historical checksum manifest.
- The two 90% image filenames preserve separate production-study labels even though their bytes are identical.

Preserve these until an explicit archive-curation decision can update all relevant records and history together.

## Dormant, but deliberately preserved

`Global/universal-pdf-viewer.js` is not loaded by the inspected Home startup sequence, service-worker app shell, update manager or feature registration path. It has not been deleted. Its possible standalone/manual use has not been ruled out.

The Editorial Engine's former approved-record input contract is dormant because its upstream source and publishing services were removed. The retained utility and lazy-loaded workspace remain preserved.

## Compatibility caution

`sw.js` still imports `Weather/Art/service-worker-extension.js`. The companion `live-art-online.js` is intentionally inert, and the Weather legacy-hook test checks this boundary. Do not remove these files or their import until old cached clients and the regression test are deliberately retired together.

## Phase 3 audit result

- Runtime dependency graph reviewed.
- App-shell and optional runtime asset groups inventoried.
- Exact duplicate image blobs identified and documented.
- No identical source-code blobs were found in the Git tree.
- No additional code or asset deletion is justified by current evidence.
- No runtime, rendering, navigation, cache or data behaviour was changed in this audit checkpoint.

## Remaining Phase 3 work

- Final cross-check of service-worker optional caching and asset lifecycle rules against all current views.
- Review non-identical near-duplicate assets only where their visual/content role can be compared without altering source artwork.
- Confirm whether the dormant PDF viewer is intended to remain as a standalone utility; preserve it until that product decision is made.
- Finish with regression/syntax checks and a final source-baseline/deployment checkpoint.

## Evidence boundary

This checkpoint records remote source inspection and Git tree blob identity analysis. It does not claim that the full repository test suite was executed locally, that GitHub Actions run the repository test suite, or that the app has passed iPhone acceptance testing.
