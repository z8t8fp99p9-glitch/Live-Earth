# Phase 3 — Runtime and Asset Dependency Audit

**Audit checkpoint:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected baseline:** `47bb304bb7218151a15bd08b807897dfba5923a3`

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
| `Weather/Art/service-worker-extension.js` and `Weather/Art/live-art-online.js` | Service-worker import and inert compatibility stub; preserve for older cached-shell compatibility. |
| `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` | Standalone developer tool; embeds the actual app through an iframe. |
| `Editorial-Engine/` utilities | Retained Editorial Engine core, browser helper and text-intelligence utilities. Do not confuse these engine utilities with the retired test suite. |
| `.github/workflows/zip-extract-auto-upload.yml` | Protected ZIP extractor workflow; preserve unchanged. |

## Asset inventory

The repository tree was checked for image, vector, font, video, JSON and data-manifest assets.

- **Home and primary view assets:** Earth, Moon, Sun, Location and Stacks Orb images; Home Moon surface texture; Moon and Sun portrait/landscape sky backgrounds and Moon responsive SVG.
- **Earth runtime assets:** Three.js module dependencies and Earth surface texture are staged through `sw.js` runtime dependency handling; Earth Engine graphics modules are separately staged in the app shell.
- **Sun runtime assets:** shared Sun surface texture and sky backgrounds are used by the Sun controller; the Sun Orb image and equirectangular sphere texture are distinct assets.
- **Retired camera discovery assets:** the former six Live Cams category images have been removed; they are not dependencies of Traffic or the current startup shell.
- **Stacks artwork:** the feature wallpaper is retained as a separate Stacks asset.
- **Weather artwork archive:** catalogues, JSON drawing data, production plans, master/reference images, previews and mask studies are archival. They are not active dependencies of the current Canvas Weather renderer.
- **Data metadata:** `Data/dataset-manifest.json` remains a data contract, not disposable artwork.

## Exact duplicate image blobs

Git tree blob SHA values identify two exact duplicate pairs:

1. `Weather/Art/References/clear-maple-pavilion-002-90pct-master-scale-proof.png` and `Weather/Art/References/clear-maple-pavilion-002-90pct-preview.png` — both 1,321,910 bytes and the same Git blob SHA.
2. `Weather/Art/References/clear-maple-pavilion-master-003.jpg` and `Weather/Art/References/clear-weather-master-001.jpg` — both 483,948 bytes and the same Git blob SHA.

These are exact byte duplicates, not visual guesses. They remain preserved:
- The master-003 image is referenced by the archived schema-v3 artwork record.
- The clear-weather master filename is represented in the archive's historical checksum manifest.
- The two 90% image filenames preserve separate production-study labels even though their bytes are identical.

## Dormant, but deliberately preserved

`Global/universal-pdf-viewer.js` is not loaded by the inspected Home startup sequence, service-worker app shell, update manager or feature registration path. It has not been deleted. Its possible standalone/manual use has not been ruled out.

The Editorial Engine's former approved-record input contract is dormant because its upstream source and publishing services were removed. The retained utility and lazy-loaded workspace remain preserved.

## Test-suite retirement

By explicit user direction, every file in the repository's `Tests/` directory is being removed. This includes the Weather-only runner, JavaScript source/contract tests and the two Python Editorial Engine test modules. The application engines, feature modules, Editorial Engine utility code, service worker, ZIP extractor and runtime controllers are not part of this deletion.

After extraction there will be no checked-in automated regression tests. Do not report test-suite success or imply automated coverage. Continue to report syntax checks, source inspection, deployment checks and installed-device acceptance separately.

## Phase 3 audit result

- Runtime dependency graph reviewed.
- App-shell and optional runtime asset groups inventoried.
- Exact duplicate image blobs identified and documented; all are preserved.
- No identical source-code blobs were found in the inspected Git tree.
- No runtime, rendering, navigation, cache or data behaviour is changed by this cleanup package.
- The only application-adjacent change is removal of the test directory and documentation updates describing that explicit decision.

## Remaining work

- Finish any remaining service-worker optional-cache lifecycle review.
- Confirm whether the dormant PDF viewer is intended to remain as a standalone utility; preserve it until that product decision is made.
- Continue with source-level and syntax verification without claiming an automated regression suite.
- Complete installed-iPhone acceptance: Portrait/Landscape, repeated open/close, view switching, Location ON/OFF and stale-fix behaviour, offline/reconnection, update activation and render lifecycle.

## Evidence boundary

This checkpoint records remote source inspection and Git tree asset identity analysis. It does not claim that a full repository test suite was executed locally, that GitHub Actions run repository tests, or that the app has passed iPhone acceptance testing.


---

## 20 November 2026 — v154 source audit and v155 feature-view separation candidate

**Current inspected baseline:** `af75d0ce789c88044adf9c0652f83e247a2f9f00` (`Restore Stacks Feature Controllers and Service Worker Shell`). The uploaded `Live-Earth-main 16.zip` matches the inspected GitHub `main` blob identities for `sw.js`, `Global/update-manager.js`, `Stacks/stacks-feature-views.js`, `Global/view-module-registry.js`, `index.html` and `STARTUP-ESSENTIALS-POLICY.md`.

The 15 November runtime graph above is historical and is superseded for feature loading by this supplement. v154 has 51 `APP_SHELL` paths plus 3 separately staged runtime dependencies. Its `Stacks/stacks-feature-views.js` appends 11 feature controllers serially during startup and sets its installed/readiness flag only after all 11 load. `Global/update-manager.js` also loads the Editorial Engine workspace at startup. This means the feature catalogue's readiness is coupled to remote view-controller downloads, even though Home, primary Earth, Moon and Sun do not need those controllers to start.

The earlier v153 policy is not a safe rollback target: its catalogue entries used no-op activation callbacks and the shared `Global/view-module-registry.js` did not contain a working feature-script lazy loader. The v154 recovery commit restored the feature scripts to startup after that nonfunctional attempt. v155 instead places a real per-feature loader in the shared Stacks runtime.

### Current v155 resource classification

- Keep 37 `APP_SHELL` entries plus 3 runtime dependencies (40 install-time resources): Home/Prime Earth, primary Earth, Moon/Sun, shared registries, Stacks shared catalogue/lifecycle runtime, core Earth Engine and graphics, vendor/runtime texture, Location, core Data/recovery, service-worker/update manager, iOS support and primary-view assets.
- Move all 12 Stacks feature-view implementations out of startup. Eleven standalone controller scripts leave `APP_SHELL`: Clouds, Weather, Earthquakes, Traffic, Atmosphere, Atmospheric Composition, Oceans, Land, Water & Ice, Earth Activity and Energy & Humanity. The Elevation view implementation is extracted from `Stacks/stacks-feature-views.js` into `Elevation/elevation-view.js` and is also loaded only on Orb selection.
- Move the two feature-only numerical helpers out of `APP_SHELL`: `universal-grid-system.js` and `earth-grid-gpu-skin.js`. They load only when a selected numerical view requests a grid dataset.
- Remove the documentation-only `EarthEngine/Assets/README.md` from `APP_SHELL`; keep the file in the repository.
- Move `Editorial-Engine/engine-feature-views.js` from eager Update Manager loading to the same Stacks Orb-selected path. It was not an `APP_SHELL` entry in v154.
- Keep the Elevation feature and its shared Prime Earth layer contract intact, but move its controller code to `Elevation/elevation-view.js` so it is not bundled into the essential shared Stacks runtime.

### Runtime contract change

The Stacks runtime registers all catalogue placeholders synchronously in the original order, including Elevation and Editorial Engine. All 12 Stacks controllers plus the Editorial Engine workspace (13 optional modules total) register their implementations only after the matching Orb is selected. `__liveEarthStacksFeatureViewsInstalled` now means the shared runtime/catalogue is ready. Selecting an Orb starts one script request; the controller self-registers; the runtime opens it only if the Orb is still active. A late response after close or view-switch is ignored. A failed optional module is reported in that feature only. The Service Worker startup diagnostics no longer classify optional controller/helper errors as required Home-startup failures.

### Cache and offline boundary

The existing `live-earth-optional-v1` cache is retained and used for all non-shell same-origin GET requests. Online feature selection refreshes from the network and saves a verified successful response; later offline selection can use a previously saved copy. First-use offline access to a never-cached feature may be unavailable, but this does not block Home or primary-view startup. Do not clear the optional cache, versioned app-shell recovery data or IndexedDB.

### Local verification and release status

- `node --check` passed for all 16 involved runtime JavaScript files: `sw.js`, `Global/update-manager.js`, `Stacks/stacks-feature-views.js` and all 13 optional feature controllers.
- The expanded mock-runtime smoke check passed for the 13-entry catalogue, zero optional script requests at startup, all 13 optional module paths loading only on selection, single-flight request reuse, switch-away/switch-back token safety, late-response suppression after close, failure/retry and loaded-controller reuse.
- A separate Elevation lifecycle smoke check passed: feature self-registration, connected state, shared Earth-layer attachment, offline open without a network request, listener cleanup and layer disposal.
- The candidate matching build identity is `v155-on-demand-feature-views` in both `sw.js` and `Global/update-manager.js`.
- No browser/WebGL render or installed-iPhone test was performed. The package has not been uploaded or deployed. The repository's checked-in `Tests/` directory was previously retired; no automated suite claim is made.
- Next verification after user upload: extractor commit and exact file scope; v155 identities on `main`; Actions and Pages; Home/offline startup; complete Stacks order; each controller on first online selection and after cached offline reuse; close/switch while loading; retry after failed load; primary-view, Location and orientation protections.
