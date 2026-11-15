# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Inspected source baseline:** `47bb304bb7218151a15bd08b807897dfba5923a3`  
**Baseline commit:** `Document Phase 3 Runtime and Asset Audit`

## Release state

- Phase 3 runtime and asset audit documentation is prepared on the inspected baseline.
- The exact current Pages deployment and extractor status must be checked after the next upload; this checkpoint does not assume either has processed the pending package.
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

## Weather and compatibility

- The old Live Art Home injection has been retired. The no-op compatibility files remain referenced by the service worker and older cached-shell compatibility path.
- The disconnected Living Topography prototype and its obsolete tests were removed after a repository reference check.
- The current Weather view retains its own full-screen responsive Canvas renderer and direct Open-Meteo integration.
- Installed-iPhone checks remain outstanding: Portrait/Landscape, repeated open/close, switching between Stacks views, Location ON/OFF, stale fix, offline and reconnection.

## Phase 3 runtime and asset audit

- The first Phase 3 cleanup retired only `Earth/basic-map.html` and `Earth/basic-map.js`, which had no app, test, documentation or standalone entry-point references.
- The runtime startup, lazy-load, service-worker and feature-registration paths are traced in `Documentation/PHASE-3-RUNTIME-AUDIT.md`.
- `Global/universal-pdf-viewer.js` remains dormant and preserved. No deletion is authorized by the current evidence.
- The asset inventory covers the Home/primary-view images, Earth and Three.js runtime resources, Moon/Sun textures and sky backgrounds, Stacks artwork, Traffic discovery imagery, and Weather art archive.
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
