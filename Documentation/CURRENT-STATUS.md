# Current Status

**Reviewed:** 20 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Current inspected baseline:** `af75d0ce789c88044adf9c0652f83e247a2f9f00` (v154)  
**Baseline commit:** `Restore Stacks Feature Controllers and Service Worker Shell`

## Current candidate — v155 on-demand Stacks feature views

- **Candidate package:** `LIVE-EARTH-v155-On-Demand-Feature-Views.zip`  
  **Manifest commit title:** `Move Feature Views Out of Startup Essentials`

- The uploaded `Live-Earth-main 16.zip` was checked against the current GitHub `main` source. Six high-impact application files matched their Git blob identities exactly.
- v154 currently stages 51 `APP_SHELL` paths plus 3 runtime dependencies: 54 install-time essential resources. Their `APP_SHELL` payload totals 4,581,676 bytes.
- The v155 candidate moves all 12 Stacks feature-view implementations out of startup: 11 standalone controllers leave `APP_SHELL`, and Elevation is extracted from the shared Stacks source into its own optional controller. It also moves 2 feature-only numerical grid helpers and the documentation-only `EarthEngine/Assets/README.md` out of the shell. The candidate stages 37 `APP_SHELL` paths plus 3 runtime dependencies: 40 essential resources (14 fewer staged entries, a 25.9% reduction). The `APP_SHELL` payload totals 4,253,633 bytes, 328,043 bytes (about 320.4 KiB) less by static file-size accounting; no launch-speed claim is made.
- The Editorial Engine browser workspace was already outside the app shell but v154 loaded it during startup; the candidate moves it to the same Orb-selected on-demand loader.
- The shared Stacks runtime registers all 13 catalogue entries synchronously, preserving the order. The 12 Stacks feature controllers and the Editorial Engine workspace are separate optional modules fetched on Orb selection; Elevation is no longer bundled in the shared runtime.
- The optional module loader fetches the controller when selected, waits for its self-registration, checks the Orb is still active before opening it, and surfaces download errors within that feature. A delayed script response cannot reopen a view after the user closes or switches away.
- The optional cache remains separate and is not cleared. A feature first opened online can be reused offline after its controller/resources are cached; a never-cached feature first opened offline may report unavailable without affecting Home.
- Matching candidate build ID: `v155-on-demand-feature-views` in both `sw.js` and `Global/update-manager.js`.
- **Status:** locally prepared candidate only. It has not been uploaded, extracted, committed, deployed or tested on the installed iPhone.

## Verification recorded for the candidate

- `node --check` passed for all 16 involved runtime JavaScript files: the three core startup/loader files plus all 13 optional feature controllers.
- The expanded mock-runtime loader check passed for the exact 13-entry catalogue, zero optional script requests at startup, each of the 13 optional modules loading only on selection, shared in-flight request handling, switch-away/switch-back token safety, late-response suppression after close, error/retry, and loaded-module reuse.
- A separate Elevation controller lifecycle check passed: it registers as a connected feature, mounts against the shared Prime Earth layer interface, performs no network request when offline, removes online/offline listeners on close, and disposes the attached layer.
- The repository's checked-in automated `Tests/` directory was retired earlier by explicit owner direction. No claim of full regression-suite coverage is made.
- Remaining gates are ZIP manifest/integrity validation, user extractor upload, resulting `main` identity, Actions/Pages and installed-iPhone online/offline acceptance.

## Protected areas retained

Home/Prime Earth composition and the five Home Orbs; primary Earth; Moon and Sun; Earth Engine core/graphics runtime and core texture/vendor dependencies; `Global/view-manager.js`; `Global/view-module-registry.js`; the shared Stacks runtime and Elevation's preserved feature contract; the three-Orb feature dock; Location OFF privacy; core data/recovery; iOS root-flow and orientation recovery; service-worker readiness/update coordination; local data and IndexedDB; the retained Editorial Engine utilities; and all unrelated views.

## Historical checkpoint — 15 November 2026 (superseded by the 20 November startup split below)

## Previous decision — Live Cams retired for a clean rebuild

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


### 17 November — Numerical-world Orb registration correction (v140)

- Device review showed the six numerical-world Orbs were absent from the Stacks library even though the v139 module had been loaded.
- Root cause: `registerFeature()` requires every feature id to be declared in `VIEW_META`; the six ids were missing, so their registrations were rejected.
- Added metadata for Atmosphere, Oceans, Land, Water & Ice, Earth Activity, and Energy & Humanity. Kept the original five feature entries and their ordering unchanged.
- Set the six worlds to preview status because numerical source adapters and verified live data are not connected yet.
- Advanced the matching service-worker and Update Manager identity to `v140-data-world-orb-registry` so installed clients request the corrected files.
- Syntax, registry-id matching, runtime registration smoke checks and ZIP manifest integrity are checked in this correction package. Installed-device confirmation remains pending until the corrected build is deployed and tested.


## Numerical Earth Intelligence — GitHub-only rebuild

- Replaces the Cloudflare Worker/D1 proposal with GitHub Actions, a private GitHub archive repository and curated public snapshots.
- The public `Live-Earth` repository must never contain the raw one-year archive because the repository is public.
- A private GitHub vault stores daily JSONL archive partitions with a rolling 365-day retention policy.
- The public app reads only curated Publisher JSON snapshots and lets the user choose 24h, 7d, 30d, 90d or 1y.
- First connected source adapter: USGS Earthquake GeoJSON for Earth Activity. Remaining worlds are intentionally marked as awaiting approved source adapters.
- The new scheduled workflow is supplied separately because the existing ZIP extractor protects `.github/` paths and cannot install it.
- Deployment is not complete until the private vault, repository secrets and manual workflow are configured and the first scheduled run succeeds.
