# Application Architecture

## App shell and navigation

- `index.html` is the app shell and Home entry point.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared module registration, feature lifecycle, Stacks catalogue and the feature dock.
- `Global/orb-controls-v4.js` owns protected Home Orb interactions and orientation recovery.
- `ios-standalone-root-flow.js` supports iOS full-screen behaviour.

## Earth ownership and naming

- **Prime Earth** is the Home-owned globe and scene. It is not the Earth Engine.
- **Earth Engine** (`EarthEngine/Core/earth-engine.js`) is the reusable factory for independent Earth globe instances.
- **Earth View** creates its own Engine globe, scene, camera and renderer.
- Existing Stacks features currently attach to Prime Earth through `window.LiveEarthPrimeScene`.
- `window.LiveEarthScene` is a temporary compatibility alias only. New code must use `window.LiveEarthPrimeScene` when it intentionally targets Prime Earth.
- A view requesting an independent Earth must call `createEarthGlobe()` and own its instance lifecycle. It must never silently fall back to Prime Earth.

## Primary views

- Prime Earth owns its scene, locked framing, Moon orbit and Home presentation.
- `Earth/earth-view-controller.js` owns the independent full-screen Earth View.
- `EarthEngine/Core/earth-engine.js` creates reusable Earth globe objects and manages quaternion-only viewpoint continuity.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` imports `earth-engine-3d-graphics-core.js`; both are runtime dependencies.
- `Earth/location.html` loads `Earth/earth-orb-globe.js`, which imports the canonical Earth Engine. The service worker stages this separate location view.
- Moon uses `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js`.
- Sun uses `Sun/sun-view-controller.js`; `Global/sky-view-controller.js` provides the shared sky host.
- `Global/astronomy.js` is shared by the Moon and Sun controllers. `Home/moon-orbit.js` uses `Home/moon-surface-lroc-1536.jpg`.
- Moon and Sun keep separate rendering and view-specific state.

## Stacks and secondary features

`Stacks/stacks-feature-views.js` provides the essential shared feature catalogue/runtime, common lifecycle and reusable network/image utilities. All 12 Stacks feature implementations—including Elevation—are separate optional controllers. Clouds, Weather, Elevation, Earthquakes, Traffic and the seven numerical-style views register through the shared runtime; their catalogue metadata is registered synchronously, while each controller is downloaded only after its feature Orb is selected. Controllers mount into the existing full-screen stage or their documented workspace below the shared three-Orb dock. The active feature Orb closes the view. Features must not create a parallel dock, close button or primary-view manager.

### Atmospheric Composition world separation

- **Atmosphere** (`Atmosphere/atmosphere-view-controller.js`) remains the world for atmospheric conditions such as temperature, pressure, wind and moisture.
- **Atmospheric Composition** (`Atmospheric-Composition/atmospheric-composition-view-controller.js`) is a separate Stacks world with ID `atmospheric-composition` and its own registered Orb (`◌`).
- The new world owns its own controller, independent Engine-created globe instance and view lifecycle. It reuses the same Earth Engine, Universal Grid System and GPU Grid Skin; it does not create a second shared infrastructure stack or a second navigation dock.
- Its data adapter is not connected yet. It must show no invented or placeholder composition measurements. Approved future datasets may cover greenhouse gases, ozone, aerosols, particulates and other atmospheric constituents.
- The controller is registered in the shared Stacks catalogue and loaded on Orb selection through the bounded optional cache; it is not an install-time app-shell dependency.

The primary registry is established by `Global/view-module-registry.js`. Weather, Clouds, Traffic, Earthquakes and all numerical-world controllers register into the shared Stacks runtime when their optional scripts are first loaded. The Stacks runtime loads the matching controller only after its Orb is selected. The Editorial Engine workspace follows the same path; `Global/update-manager.js` loads only the primary Sun controller during startup.

Current data sources: Weather uses Open-Meteo; Clouds uses NASA GIBS; Earthquakes uses USGS latest-day GeoJSON. Traffic has no verified provider connected yet and must not display fabricated conditions. Missing or restricted data must be labelled honestly, never fabricated.

## Weather Explorer rendering contract

- `Weather/weather-view.js` owns the full-screen Weather experience and registers only with the shared Stacks feature runtime.
- The visual composition uses a protected square hero scene, sized from the shorter viewport edge, so the mountain, red Torii and lake remain together through portrait/landscape changes. The hero is not stretched to fill the screen.
- The surrounding viewport is an adaptive environmental extension: landscape reveals additional side valleys and tree silhouettes; portrait reveals additional sky and lake. A softened scene-derived backdrop blends the square hero into those extensions.
- The square master artwork is `Weather/Art/weather-world-master-square.webp` (1024 × 1024). It is a bounded optional resource rather than a new app-shell essential. The existing optional cache stores it after a successful online request. A procedural fallback scene is drawn if the artwork is unavailable.
- Weather motion is a layered 2.5D Canvas treatment: drifting cloud and mist fields, water ripples, rain streaks and splash rings, snowfall, wind-blown leaves, day/night lighting and storm flashes. It is not a full 3D terrain or fluid simulation.
- The Canvas renderer pauses while the document is hidden or the Weather feature is inactive, caps device pixel ratio, and respects reduced-motion preferences.
- Weather data continues to use Open-Meteo. `Location/location.js` remains the sole owner of explicit permission and fresh-fix lifecycle. Weather consumes the approved location state only; Location remains OFF unless the user enables it.
- The existing shared stage, feature lifecycle and three-Orb dock remain authoritative. Weather must not add another dock, close action, view registry or location-permission path.

## Numerical discovery worlds — initial visual implementation

- The numerical-world Stacks Orbs are declared by `VIEW_META` and registered by the shared `Stacks/stacks-feature-views.js` catalogue: Atmosphere, Atmospheric Composition, Oceans, Land, Water & Ice, Earth Activity, and Energy & Humanity.
- Each opens a distinct procedural animated visual environment and a shared Discover / Signals / Timeline / Compare interaction pattern.
- The seven numerical-style views are appended after the existing five Stacks features. They use the existing feature registry, full-screen stage, close lifecycle and three-Orb dock; they do not modify Home or create another navigation system.
- This first implementation is a visual and interaction foundation. Numeric source adapters, verified event detection, time-series playback and regional comparison are not connected yet. The UI explicitly labels those states as not connected and does not fabricate measurements or events.
- The visual scenes are generated locally from canvas geometry and particles; they do not use satellite imagery, webcam feeds or third-party visual feeds.
- Each numerical-world controller is optional and loaded only on selection. The shared Earth Engine remains essential; the Universal Grid System and GPU Grid Skin helpers are optional and are fetched when a selected numerical view needs them.

### Registry contract for numerical worlds

- Every Stacks feature id must have a matching `VIEW_META` entry in `Stacks/stacks-feature-views.js`; `registerFeature()` rejects undeclared ids. All seven numerical-world controller ids are declared there.
- The worlds are registered as preview views until numeric source adapters are connected, so the Stacks library shows `View preview` rather than implying live data integration.

## Location, data and recovery

- `Location/location.js` owns explicit browser permission, GPS watch and fresh-fix lifecycle. Other views consume approved state only.
- `Data/data-store.js` and `Data/data-recovery.js` manage local IndexedDB records and portable recovery.
- `Recovery/` contains rollback guidance. Do not reset local data or caches as generic troubleshooting.

## Essential versus on-demand resources

The v155 candidate keeps Home, primary views, shared registries/runtime, core data/recovery, Location, iOS support and required Earth/Three.js assets in the versioned app shell. It removes the 11 already-separate Stacks controller scripts, extracts the previously inline Elevation controller into its own optional file, and removes the two numerical-grid helper scripts plus the documentation-only `EarthEngine/Assets/README.md` from that shell. These feature resources use the bounded optional cache and are fetched only when their view or dataset is explicitly selected. A first-ever offline selection may fail locally until the resource has been cached; it does not block Home startup.

## Runtime, updates and offline

- `sw.js` owns the app-shell cache, optional caching, startup recovery and offline resource handling.
- `Global/update-manager.js` coordinates readiness, primary Sun loading and staged update activation. Feature controller loading belongs to the shared Stacks runtime; the runtime registers only the catalogue at startup and loads the selected controller on demand.
- The v155 candidate identity is `v155-on-demand-feature-views` in both worker and Update Manager; deployment remains unverified until user upload and CI/Pages checks.
- Three.js module files and the Earth texture are staged as runtime dependencies for same-origin/offline module loading.
- The Weather master artwork is deliberately not added to the app-shell essential list, so the Weather redesign does not increase the Essentials count. It uses the existing bounded optional cache and has a local procedural fallback.
- `Weather/Art/service-worker-extension.js` is still imported by the service worker. Its paired Live Art compatibility file is inert; retain both until old-client compatibility is separately retired.

## Retained tools, dormant components and archival assets

- `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` is a standalone developer tool that embeds `../index.html`; it is intentionally outside the normal app-shell navigation.
- `Global/universal-pdf-viewer.js` is not in the current app startup or app-shell dependency path. It is recorded as dormant and preserved pending an explicit decision about its standalone utility role.
- `Editorial-Engine/` contains the retained Universal Editorial Engine core, browser helper and text-intelligence utilities. The feature workspace is loaded by the shared Stacks runtime only when its Orb is selected. Its former approved-record input contract is dormant without the removed upstream services.
- The Weather Art folder is a preserved creative archive, not the active renderer. The new Weather world master is a specifically referenced optional runtime asset; the rest of the art archive remains unchanged.
- `.github/workflows/zip-extract-auto-upload.yml` is the protected ZIP extractor workflow. It must remain intact and is not changed by ordinary ZIP payloads.

## Verification status

The repository's `Tests/` directory has been retired by explicit user direction. There is no longer a checked-in automated regression suite. This does not mean the application engines were removed or that the app has passed device acceptance testing.

## Dependency rule

A file referenced by `index.html`, the service worker, update manager, view registry, controller, module import or standalone tool is a dependency of that path even when it looks old. A missing test reference is not grounds to remove an application dependency.


## Numerical Earth Intelligence — GitHub-native pipeline

- The six original numerical database worlds remain registered through the shared Stacks feature runtime. Atmospheric Composition is a separate seventh numerical-style Stacks view; its data adapter is not part of the original six-world database foundation.
- `Backend/GitHub-Intelligence/` contains the scheduled collector, rolling archive manager, publisher and tests.
- The full one-year archive lives in a separate private GitHub repository; it is never copied into the public Pages output.
- The public app repository contains only curated `Data/Published/worlds/*.json` snapshots.
- `Data/data-worlds-live.js` reads only those snapshots and offers 24-hour, 7-day, 30-day, 90-day and 1-year display windows.
- No Cloudflare Worker, D1 database, external hosting platform, or browser-local intelligence database is used.
- The first connected source is the USGS earthquake GeoJSON feed for Earth Activity. Other worlds remain explicitly pending source approval; no synthetic values are published.
