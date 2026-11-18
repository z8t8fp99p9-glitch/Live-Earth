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

`Stacks/stacks-feature-views.js` provides the shared feature runtime and retains Elevation. Separate feature modules live in `Weather/`, `Clouds/`, `Traffic/` and `Earthquakes/`. They mount into the existing full-screen stage below the shared three-Orb dock. The active feature Orb closes the view. Features must not create a parallel dock, close button or primary-view manager.

### Atmospheric Composition world separation

- **Atmosphere** (`Atmosphere/atmosphere-view-controller.js`) remains the world for atmospheric conditions such as temperature, pressure, wind and moisture.
- **Atmospheric Composition** (`Atmospheric-Composition/atmospheric-composition-view-controller.js`) is a separate Stacks world with ID `atmospheric-composition` and its own registered Orb (`◌`).
- The new world owns its own controller, independent Engine-created globe instance and view lifecycle. It reuses the same Earth Engine, Universal Grid System and GPU Grid Skin; it does not create a second shared infrastructure stack or a second navigation dock.
- Its data adapter is not connected yet. It must show no invented or placeholder composition measurements. Approved future datasets may cover greenhouse gases, ozone, aerosols, particulates and other atmospheric constituents.
- The new controller is registered in the Stacks catalogue and loader and included in the service-worker app shell so its controller is available offline.

The primary registry is established by `Global/view-module-registry.js`. The Weather, Clouds, Traffic and Earthquakes modules register into the shared feature runtime; their source files are staged by the service worker. The Editorial Engine workspace is loaded lazily by `Global/update-manager.js`.

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

- Six new Stacks feature Orbs are registered by `Data/data-worlds.js`: Atmosphere, Oceans, Land, Water & Ice, Earth Activity, and Energy & Humanity.
- Each opens a distinct procedural animated visual environment and a shared Discover / Signals / Timeline / Compare interaction pattern.
- The six worlds are appended after the existing five Stacks features. They use the existing feature registry, full-screen stage, close lifecycle and three-Orb dock; they do not modify Home or create another navigation system.
- This first implementation is a visual and interaction foundation. Numeric source adapters, verified event detection, time-series playback and regional comparison are not connected yet. The UI explicitly labels those states as not connected and does not fabricate measurements or events.
- The visual scenes are generated locally from canvas geometry and particles; they do not use satellite imagery, webcam feeds or third-party visual feeds.
- `Data/data-worlds.js` is included in the service-worker app shell. The matching service-worker and Update Manager build identity is `v139-six-data-worlds`.

### Registry contract for numerical worlds

- Every Stacks feature id must have a matching `VIEW_META` entry in `Stacks/stacks-feature-views.js`; `registerFeature()` rejects undeclared ids. The six numerical-world ids are declared there.
- The worlds are registered as preview views until numeric source adapters are connected, so the Stacks library shows `View preview` rather than implying live data integration.

## Location, data and recovery

- `Location/location.js` owns explicit browser permission, GPS watch and fresh-fix lifecycle. Other views consume approved state only.
- `Data/data-store.js` and `Data/data-recovery.js` manage local IndexedDB records and portable recovery.
- `Recovery/` contains rollback guidance. Do not reset local data or caches as generic troubleshooting.

## Runtime, updates and offline

- `sw.js` owns the app-shell cache, optional caching, startup recovery and offline resource handling.
- `Global/update-manager.js` coordinates readiness, lazy Sun and Editorial Engine loading, and staged update activation.
- Their build identifiers must match; current identity is `v138-core-essential-shell`.
- Three.js module files and the Earth texture are staged as runtime dependencies for same-origin/offline module loading.
- The Weather master artwork is deliberately not added to the app-shell essential list, so the Weather redesign does not increase the Essentials count. It uses the existing bounded optional cache and has a local procedural fallback.
- `Weather/Art/service-worker-extension.js` is still imported by the service worker. Its paired Live Art compatibility file is inert; retain both until old-client compatibility is separately retired.

## Retained tools, dormant components and archival assets

- `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` is a standalone developer tool that embeds `../index.html`; it is intentionally outside the normal app-shell navigation.
- `Global/universal-pdf-viewer.js` is not in the current app startup or app-shell dependency path. It is recorded as dormant and preserved pending an explicit decision about its standalone utility role.
- `Editorial-Engine/` contains the retained Universal Editorial Engine core, browser helper and text-intelligence utilities. The feature workspace is lazy-loaded by the update manager. Its former approved-record input contract is dormant without the removed upstream services.
- The Weather Art folder is a preserved creative archive, not the active renderer. The new Weather world master is a specifically referenced optional runtime asset; the rest of the art archive remains unchanged.
- `.github/workflows/zip-extract-auto-upload.yml` is the protected ZIP extractor workflow. It must remain intact and is not changed by ordinary ZIP payloads.

## Verification status

The repository's `Tests/` directory has been retired by explicit user direction. There is no longer a checked-in automated regression suite. This does not mean the application engines were removed or that the app has passed device acceptance testing.

## Dependency rule

A file referenced by `index.html`, the service worker, update manager, view registry, controller, module import or standalone tool is a dependency of that path even when it looks old. A missing test reference is not grounds to remove an application dependency.


## Numerical Earth Intelligence — GitHub-native pipeline

- Six numerical worlds remain registered through the shared Stacks feature runtime.
- `Backend/GitHub-Intelligence/` contains the scheduled collector, rolling archive manager, publisher and tests.
- The full one-year archive lives in a separate private GitHub repository; it is never copied into the public Pages output.
- The public app repository contains only curated `Data/Published/worlds/*.json` snapshots.
- `Data/data-worlds-live.js` reads only those snapshots and offers 24-hour, 7-day, 30-day, 90-day and 1-year display windows.
- No Cloudflare Worker, D1 database, external hosting platform, or browser-local intelligence database is used.
- The first connected source is the USGS earthquake GeoJSON feed for Earth Activity. Other worlds remain explicitly pending source approval; no synthetic values are published.
