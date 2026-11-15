# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Inspected source baseline:** `5f320c9da0f877f679c4fcb1dc1715b108d77813`  
**Baseline commit:** `Add in-app Live Cams WHEP video player`

## Current decision — Live Cams retired for a clean rebuild

- By owner direction, the Live Cams implementation has been removed completely from the active app. The camera-directory view, WHEP player, public-source adapters and six discovery images are deleted.
- Live Cams is unregistered from the shared Stacks loader and removed from the startup controller bootstrap, service-worker app shell and startup repair list.
- Traffic remains as its own independent feature; its module and navigation remain intact. No Live Cams code or imagery is retained as an active Traffic dependency.
- The service-worker and Update Manager build identity is `v138-core-essential-shell`. The app-shell list drops nine Live Cams resources: 51 to 42 entries; with three shared runtime dependencies, the source-defined startup total drops from 54 to 45. The previously supplied device screenshot showed 56, so the deployed iPhone count still needs to be checked after this package is uploaded and activated.
- Live Cams technical notes are retained only as archived history. The feature will be designed again from a clean slate when requested.

## Release state

- Phase 3 runtime and asset audit documentation is prepared on the inspected baseline.
- The exact current Pages deployment and extractor status must be checked after the next upload; this checkpoint does not assume either has processed the pending package.
- The Weather rewrite is `Weather/weather-view.js`; the current view is a full-screen, responsive 2D Canvas atmosphere.
- The service worker and Update Manager share the build identity `v138-core-essential-shell`.

## Current application

- Home retains the approved Earth globe and five Home Orbs.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared module registration, feature lifecycle, Stacks catalogue and the feature dock.
- Earth View uses the shared Earth Engine; Moon and Sun remain independent views.
- Location remains OFF unless explicitly enabled.
- Stacks uses the shared feature runtime and three-Orb dock.
- Weather, Clouds, Traffic and Earthquakes are separate Stacks features. Traffic has no verified live-data provider connected. Live Cams is retired and no longer registered.
- The Universal Editorial Engine is retained as a utility; the former collection and publishing pipeline is not active.

## Weather and compatibility

- The old Live Art Home injection has been retired. The no-op compatibility files remain referenced by the service worker and older cached-shell compatibility path.
- The disconnected Living Topography prototype and its obsolete tests were removed after a repository reference check.
- The current Weather view retains its own full-screen responsive Canvas renderer and direct Open-Meteo integration.
- Installed-iPhone checks remain outstanding: Portrait/Landscape, repeated open/close, switching between Stacks views, Location ON/OFF, stale fix, offline and reconnection.

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


## 15 November — Live Cams retirement before rebuild

- The user rejected the current Live Cams experience because of provider restrictions and unreliable feeds, and directed that the entire implementation be removed before a fresh rebuild.
- Removed all nine active Live Cams files: three JavaScript modules and six category images. Removed Live Cams registration and loader references from the shared Stacks runtime and startup bootstrap.
- Removed all nine Live Cams paths from the service-worker app shell and all three Live Cams script paths from startup repair diagnostics. Advanced the service-worker/Update Manager build ID to `v138-core-essential-shell` so installed clients can replace the old shell.
- Kept Traffic independent, with no provider or camera dependency. Historical Live Cams documentation and the prior decision trail are retained as archived records, not active code or current architecture.
- Source-defined startup total is now 45 resources (42 app-shell entries plus 3 shared runtime dependencies). Installed-device confirmation remains pending until after upload/deployment.
