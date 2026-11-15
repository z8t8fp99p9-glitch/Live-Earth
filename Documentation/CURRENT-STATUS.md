# Current Status

**Reviewed:** 15 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Latest inspected source baseline:** `c49e1c67f5e987270db4310ed9c60941c136dcc0`  
**Baseline commit:** `Document Phase 3 Runtime Dependency Audit`

## Release state

- Phase 3 runtime dependency audit documentation is on `main`.
- ZIP extractor run `43671534323` succeeded.
- GitHub Pages run `43671549151` succeeded for the exact inspected source baseline.
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

## Phase 3 runtime and asset audit

- The first Phase 3 cleanup retired only `Earth/basic-map.html` and `Earth/basic-map.js`, which had no app, test, documentation or standalone entry-point references.
- The runtime startup, lazy-load, service-worker and feature-registration paths have been traced and recorded in `Documentation/PHASE-3-RUNTIME-AUDIT.md`.
- `Global/universal-pdf-viewer.js` remains dormant and preserved. No deletion is authorized by the current evidence.
- The asset inventory covers the Home/primary-view images, Earth and Three.js runtime resources, Moon/Sun textures and sky backgrounds, Stacks artwork, Traffic discovery imagery, and Weather art archive.
- The repository contains two pairs of exact duplicate image blobs in the Weather archive:
  - `clear-maple-pavilion-002-90pct-master-scale-proof.png` and `clear-maple-pavilion-002-90pct-preview.png`.
  - `clear-maple-pavilion-master-003.jpg` and `clear-weather-master-001.jpg`.
- These duplicate copies are intentionally preserved at this stage. The master-003 image is referenced by the historical schema-v3 artwork record; the clear-weather alias is represented in the archive's historical checksum record. The 90% pair are retained production-study artefacts. No artwork is removed solely to reduce repository size.
- No additional asset or code deletion is justified by the audit. Runtime asset references and optional dependencies remain preserved.
- No identical source-code blobs were found in the repository tree.

## Evidence rule

Record source inspection, local test execution, ZIP validation, Actions, Pages deployment and user device confirmation separately. Never infer iPhone acceptance from a green Pages build.
