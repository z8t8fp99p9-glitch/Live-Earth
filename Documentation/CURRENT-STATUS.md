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
- Weather, Clouds, Traffic, Live Cams and Earthquakes are separate Stacks features. Traffic has no verified live-data provider connected; Live Cams owns the camera-directory integration.
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
- The asset inventory covers the Home/primary-view images, Earth and Three.js runtime resources, Moon/Sun textures and sky backgrounds, Stacks artwork, Live Cams discovery imagery, and Weather art archive.
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


## Traffic / Live Cams separation checkpoint

- The former combined Traffic module has been split into `Traffic/traffic-view.js` and `LiveCams/live-cams-view.js`.
- The six camera-discovery image assets now live in `LiveCams/Assets/`; the previous `Traffic/Assets/live-cams-discovery/` copies are marked for deletion in the upload manifest.
- Both features register independently through the existing Stacks runtime. The Global Orb registry, shared Earth, Home, primary views and dock are not rewritten by this change.
- The service-worker shell cache has a new build identity and includes the new Live Cams module and image assets.
- This is a source-package checkpoint only. GitHub Actions, Pages deployment and installed-device open/close acceptance still require verification after the user uploads the ZIP.


## Live Cams interaction and preview recovery checkpoint

- The featured camera window now supports timed rotation, swipe navigation and keyboard arrow navigation; rotation pauses when the document is hidden or reduced motion is requested.
- Live Cams now resolves missing access/media metadata from the per-camera catalogue endpoint before deciding whether a row can be opened.
- Preview rendering follows the OpenEye catalogue contract: verified OpenEye image previews and permitted source-image previews can render; source-link cameras may use a verified directory poster while retaining the publisher as their destination.
- Mandatory publisher attribution remains enforced when the API marks it required. Unknown-access and paid rows are never opened as free.
- Live video uses a separate WHEP session and may be metered per second. This patch does not silently start or pay for video sessions; the current in-app preview path is still-image based.
- The Live Cams service-worker cache identity was advanced to force the corrected module to refresh.
- Source validation only at this checkpoint; GitHub extraction, Pages deployment and iPhone acceptance remain to be verified after upload.


## 15 November — Live Cams provider-permission correction

- Live Cams now requests the provider's documented `embeddable=1` catalogue projection for searchable camera results rather than filling result grids with directory-only/source-only rows.
- Provider-permitted `redistribution.preview_embed` images can be displayed independently of the separate full-feed pricing flag. The application still does not open a publisher page or start any metered video session unless public access is confirmed.
- Rows without a permitted preview or confirmed public viewing route are excluded from playable result grids and reported as unavailable rather than presented as working feeds.
- Preview, live/offline, and access labels are kept distinct; still-image previews are not represented as continuous video.
- Service-worker cache identity: `v135-live-cams-embeddable-results`. Installed-device and provider-response validation remain required.
