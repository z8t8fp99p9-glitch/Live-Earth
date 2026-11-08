# LIVE // EARTH — Startup Cache & Regression Baseline

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected HEAD:** `cb0bcd4ab1edecdebd8813e997cc7b56e56b6e40`  
**HEAD title:** `Add automated JavaScript and Python regression checks`

## 1. Decision confirmed by the owner

Keep the existing launch contract:

- **Online:** request fresh versions of all essential app-shell/runtime resources before Home is released.
- **Offline:** use the saved verified app shell from the last available cache state.
- **Readiness:** keep Home behind the startup gate until required resources and core systems pass checks.
- **No redesign approved:** do not split or defer essential resources merely to shorten the progress screen. The owner reviewed the 47-resource count and confirmed the current online-fresh / offline-saved-cache approach is acceptable.

This note records the accepted direction; it does not authorize a startup or cache refactor.

## 2. What the 47 resources count

The startup gate derives its expected paths from `APP_SHELL` plus `RUNTIME_DEPENDENCIES` in `sw.js`:

- **44 first-party app-shell paths**
- **3 runtime dependencies**
- **47 unique required paths total**

These are application files and runtime assets, not 47 datasets, feeds, articles or user-data downloads.

### 44 app-shell paths

```text
./
./index.html
./ios-standalone-root-flow.js
./Global/orb-controls-v4.js
./EarthEngine/Core/earth-engine.js
./EarthEngine/Core/earth-viewpoint-bridge.js
./EarthEngine/Graphics/earth-engine-3d-graphics-engine.js
./EarthEngine/Graphics/earth-engine-3d-graphics-core.js
./EarthEngine/Assets/README.md
./Earth/earth-view-controller.js
./Global/view-manager.js
./Global/view-module-registry.js
./Stacks/stacks-feature-views.js
./Clouds/clouds-view.js
./Weather/weather-view.js
./Traffic/traffic-view.js
./Earthquakes/earthquakes-view.js
./Global/sky-view-controller.js
./Moon/moon-view-controller.js
./Moon/moon-lunar-interface.js
./Sun/sun-view-controller.js
./Sun/sun-surface-shared.webp
./Earth/location.html
./Earth/earth-orb-globe.js
./manifest.json
./Global/icon.svg
./Data/data-store.js
./Location/location.js
./Global/astronomy.js
./Home/moon-orbit.js
./Data/dataset-manifest.json
./Home/moon-surface-lroc-1536.jpg
./Moon/moon-sky-background-responsive.svg
./Moon/moon-sky-background-portrait.webp
./Moon/moon-sky-background-landscape.webp
./Sun/sun-sky-background-portrait.webp
./Sun/sun-sky-background-landscape.webp
./Global/update-manager.js
./Data/data-recovery.js
./Earth/earth.webp
./Moon/moon.webp
./Sun/sun.webp
./Location/location.webp
./Stacks/stacks.webp
```

### 3 runtime dependencies

| Cached local path | Fresh source strategy |
|---|---|
| `./vendor/three.core.js` | Three.js r180 CDN primary + unpkg fallback |
| `./vendor/three.module.js` | Three.js r180 CDN primary + unpkg fallback |
| `./EarthEngine/Assets/earth-land-ocean-ice-2048.png` | NASA Earth texture primary + Three.js example texture fallback |

The exact remote URLs and validation logic remain in `sw.js`; this list describes the three local runtime paths.

## 3. Verified launch behavior in current source

- The startup page expects all 47 paths and requests fresh online copies with `cache: "no-store"` and the `X-Live-Earth-Force-Fresh: 1` header.
- Each path gets up to two page-level attempts before the sync is considered failed.
- The Service Worker validates responses before replacing the corresponding saved cache entry. App-shell validation checks response status/type, content type, and a minimum byte size. Runtime dependencies also receive type and truncation checks.
- If **every** online request fails at the network layer, startup switches to the saved-shell path and verifies all expected paths before releasing Home.
- A partial sync or a response that fails HTTP/content-type/integrity validation does not silently fall back to cached content while online; startup remains blocked and requires retry/repair.
- When explicitly offline, startup checks the saved shell. Missing or invalid entries are repaired only when a usable connection is available, then rechecked before reload.
- During Service Worker installation, the candidate worker stages the 44 app-shell paths and 3 runtime dependencies before `skipWaiting()`. A failed install does not activate that candidate worker.
- The optional-resource cache is separately bounded at 48 entries. User IndexedDB/local data is not reset by this launch flow.

**Implementation nuance:** the ordinary online refresh path replaces validated cache entries per resource; it is not a single atomic 47-file transaction. A partial online refresh blocks Home. Do not describe this recurring refresh as an atomic batch. The separate new-Service-Worker install path does wait for all staged essentials before activation.

## 4. Regression workflow evidence

- Workflow: `LIVE // EARTH Regression Tests`
- Run: `42514084234`
- Commit tested: `cb0bcd4ab1edecdebd8813e997cc7b56e56b6e40`
- Result: **completed / success**
- Job: `JavaScript and Python regression checks` — success
- Successful steps: Node.js setup, Python setup, JavaScript syntax validation, JavaScript regression tests, Python compile and Editorial Engine unit tests.
- Run URL: https://github.com/z8t8fp99p9-glitch/Live-Earth/actions/runs/42514084234

The current `Tests/` inventory contains 10 files:

```text
Tests/earth-engine-view-separation.test.cjs
Tests/earth-modes-surface-alignment.test.cjs
Tests/earth-view-drag-orientation.test.cjs
Tests/earth-viewpoint-bridge.test.cjs
Tests/global-orb-system-contract.test.cjs
Tests/location-service-path.test.cjs
Tests/moon-earth-isolation.test.cjs
Tests/stacks-feature-folders.test.cjs
Tests/test_editorial_phases_1_2_3.py
Tests/test_editorial_text_intelligence.py
```

These are regression/source-level checks. They do not replace a real iPhone/browser run, an online/offline device test, or verification of a Pages deployment. No new Pages deployment result is claimed here.

## 5. Protected behavior

Keep Home's fixed camera/framing/zoom and high-detail Earth; keep Basic/HD and zoom controls in Earth View only. Preserve the Home Moon orbit and ensure it does not change Earth's orientation. Keep Sun/Moon independent, protect the Global Orb lifecycle, Location-OFF privacy, Stacks features, IndexedDB and recovery data. Do not change `sw.js`, `index.html`, build IDs, cache names or feature startup dependencies as part of the upcoming viewpoint task unless a directly evidenced dependency requires it.

## 6. Next workstream

Proceed to the **Earth Engine viewpoint issue** as a separate task. The specific current device symptom has not yet been recorded in this checkpoint, so do not claim a cause or prepare a patch yet. Start by capturing the exact observed behavior, then inspect the latest live source and trace the outgoing/incoming view lifecycle, quaternion owner identity, and affected controller. Keep the change narrow and add a regression for the reproduced failure.
