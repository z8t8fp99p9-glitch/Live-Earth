# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Inspected source baseline:** `de3b4f18048bc0802489dcee7209a81c11d1e603`  
**Baseline commit:** `Retire Live Cams and reduce startup essentials`

## Current decision — Live Cams retired for a clean rebuild

- By owner direction, the Live Cams implementation has been removed completely from the active app. The camera-directory view, WHEP player, public-source adapters and six discovery images are deleted.
- Live Cams is unregistered from the shared Stacks loader and removed from the startup controller bootstrap, service-worker app shell and startup repair list.
- Traffic remains as its own independent feature; its module and navigation remain intact. No Live Cams code or imagery is retained as an active Traffic dependency.
- The service-worker and Update Manager build identity is `v138-core-essential-shell`. The app-shell list has 42 entries plus three shared runtime dependencies (45 startup resources). The Weather artwork is not added to Essentials; it is fetched as an optional resource and uses a procedural fallback when unavailable.
- The previously supplied device screenshot showed 56, so the deployed iPhone count still needs to be checked after the current package is uploaded and activated.

## Release state

- Phase 3 runtime and asset audit documentation is prepared on the inspected baseline.
- The exact current Pages deployment and extractor status must be checked after the next upload; this checkpoint does not assume either has processed the pending package.
- Weather has been rebuilt as a responsive 2.5D scene. Its square hero composition remains intact through orientation changes, with adaptive scenery and layered weather motion around it.
- The Weather master artwork is `Weather/Art/weather-world-master-square.webp` (1024 × 1024). It is an optional same-origin asset, not a new essential startup resource.
- Installed-iPhone checks remain outstanding: Portrait/Landscape, repeated open/close, switching between Stacks views, Location ON/OFF, stale fix, offline and reconnection.

## Current application

- Home retains the approved Earth globe and five Home Orbs.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared module registration, feature lifecycle, Stacks catalogue and the feature dock.
- Earth View uses the shared Earth Engine; Moon and Sun remain independent views.
- Location remains OFF unless explicitly enabled.
- Stacks uses the shared feature runtime and three-Orb dock.
- Weather, Clouds, Traffic and Earthquakes are separate Stacks features. Traffic has no verified live-data provider connected. Live Cams is retired and no longer registered.
- The Universal Editorial Engine is retained as a utility; the former collection and publishing pipeline is not active.

## Weather Explorer — 15 November 2026

- The earlier Japanese illustrated Canvas scene has been replaced with a photographic square master composition: a vermilion Torii over a reflective lake, Mount Fuji-inspired mountain, autumn woodland and sunrise light.
- The protected 1:1 hero is sized from the shorter viewport edge (82% of that edge). It is not stretched to the device aspect ratio. Portrait adds sky/lake breathing room; landscape reveals additional side valleys and tree silhouettes.
- A softly blurred scene-derived environment sits behind the crisp square hero to blend the composition into the full screen. Canvas weather layers add clouds, mist, lake ripples, rain and splash rings, snow, drifting leaves, night lighting and storm flashes.
- The renderer is 2.5D, not a full 3D terrain or fluid simulation. The central master image itself remains static; motion is added through separate environmental layers and mood treatment.
- The scene selector remains a preview tool. Preview values are explicitly labelled sample values, never live forecast data.
- Open-Meteo integration, 15-minute refresh, approved-location gating and Location OFF default are preserved. No new location permission request was added.
- The existing Stacks lifecycle, three-Orb dock, close behavior, Home/Earth/Moon/Sun views and service-worker startup essentials were not changed.
- The master artwork is intentionally served through the existing bounded optional cache, not the essential app shell. If it has not been cached or is unavailable offline, the Weather view draws a procedural fallback scene.

## Verification completed for this package

- JavaScript syntax check: passed (`node --check`).
- Mock-runtime smoke test: Weather feature registered and activated successfully in portrait (390 × 844) and landscape (844 × 390) viewport simulations.
- Scene preview smoke test: clear, cloudy, rain, storm, snow, fog, wind, heat, night and auto transitions completed without a runtime exception in the mock environment.
- Browser screenshot execution was unavailable in this container, so no visual browser-render claim is made.
- Installed iPhone acceptance remains outstanding. This package has not been uploaded to GitHub Pages or tested on the user's device.

## Phase 3 runtime and asset audit

- The first Phase 3 cleanup retired only `Earth/basic-map.html` and `Earth/basic-map.js`, which had no app, test, documentation or standalone entry-point references.
- The runtime startup, lazy-load, service-worker and feature-registration paths are traced in `Documentation/PHASE-3-RUNTIME-AUDIT.md`.
- `Global/universal-pdf-viewer.js` remains dormant and preserved. No deletion is authorized by the current evidence.
- The active asset inventory covers Home/primary-view images, Earth and Three.js runtime resources, Moon/Sun textures and sky backgrounds, Stacks artwork, and the Weather art archive. Live Cams discovery imagery has been removed.
- The repository contains two pairs of exact duplicate image blobs in the Weather archive:
  - `clear-maple-pavilion-002-90pct-master-scale-proof.png` and `clear-maple-pavilion-002-90pct-preview.png`.
  - `clear-maple-pavilion-master-003.jpg` and `clear-weather-master-001.jpg`.
- These duplicate copies are intentionally preserved because they belong to named production/master history.
- Runtime asset references and optional dependencies remain preserved.

## Test-file retirement decision

- By explicit user direction, the repository's complete `Tests/` directory is being retired, including its JavaScript contract tests, Python Editorial Engine tests and Weather-only runner.
- This removes automated regression-test files; it does **not** remove or modify any application engine, feature module, runtime controller, data/recovery module, service worker, ZIP extractor workflow or Editorial Engine utility.
- No claim of automated regression coverage should be made after this change.
- Future verification must distinguish source inspection, syntax checks, ZIP validation, GitHub Actions, Pages deployment and installed-device acceptance.

## Evidence rule

Never infer iPhone acceptance from a green Pages build. Report only checks actually performed.

### 15 November — Live Cams retirement before rebuild

- The user rejected the current Live Cams experience because of provider restrictions and unreliable feeds, and directed that the entire implementation be removed before a fresh rebuild.
- Removed all nine active Live Cams files: three JavaScript modules and six category images. Removed Live Cams registration and loader references from the shared Stacks runtime and startup bootstrap.
- Removed all nine Live Cams paths from the service-worker app shell and all three Live Cams script paths from startup repair diagnostics. Advanced the service-worker/Update Manager build ID to `v138-core-essential-shell` so installed clients can replace the old shell.
- Kept Traffic independent, with no provider or camera dependency. Historical Live Cams documentation and the prior decision trail are retained as archived records, not active code or current architecture.
- Source-defined startup total is 45 resources (42 app-shell entries plus 3 shared runtime dependencies). Installed-device confirmation remains pending until after upload/deployment.


## Six numerical discovery worlds — 17 November 2026

- Added six new Stacks feature Orbs: Atmosphere, Oceans, Land, Water & Ice, Earth Activity, and Energy & Humanity.
- Each world has its own locally generated animated visual identity, responsive portrait/landscape composition, and contextual Discover / Signals / Timeline / Compare controls.
- The six entries use the existing shared Stacks registry and feature lifecycle. Home's five Orbs, primary-view manager, Earth Engine, Moon, Sun and the shared dock were not modified.
- This is the visual/UX foundation only. Numeric provider adapters, verified event intelligence, timeline playback and comparisons remain future backend work. The interface labels disconnected functions honestly and does not invent data or events.
- No imagery data, satellite feeds or webcam feeds are used by these new visual scenes.
- Service-worker and Update Manager build identity advanced together to `v139-six-data-worlds`.
- Source syntax checks passed for the four changed/new JavaScript files. Installed-device visual acceptance and data integration remain outstanding.
