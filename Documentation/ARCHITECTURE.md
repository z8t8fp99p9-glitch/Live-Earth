# Application Architecture

## App shell and navigation

- `index.html` is the app shell and Home entry point.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared module registration, feature lifecycle, Stacks catalogue and the feature dock.
- `Global/orb-controls-v4.js` owns protected Home Orb interactions and orientation recovery.
- `ios-standalone-root-flow.js` supports iOS full-screen behaviour.

## Primary views

- Home owns its Earth scene, locked framing, Moon orbit and Home presentation.
- `Earth/earth-view-controller.js` owns the independent full-screen Earth View.
- `EarthEngine/Core/earth-engine.js` creates reusable Earth globe objects and manages quaternion-only viewpoint continuity.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` imports `earth-engine-3d-graphics-core.js`; both are runtime dependencies.
- `Earth/location.html` loads `Earth/earth-orb-globe.js`, which imports the canonical Earth Engine. The service worker stages this separate location view.
- Moon uses `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js`.
- Sun uses `Sun/sun-view-controller.js`; `Global/sky-view-controller.js` provides the shared sky host.
- `Global/astronomy.js` is shared by the Moon and Sun controllers. `Home/moon-orbit.js` uses `Home/moon-surface-lroc-1536.jpg`.
- Moon and Sun keep separate rendering and view-specific state.
- The unreferenced `Earth/basic-map.html` / `Earth/basic-map.js` standalone prototype has been retired. The separate `Earth/location.html` / `Earth/earth-orb-globe.js` path remains active and must not be confused with that retired prototype.

## Stacks and secondary features

`Stacks/stacks-feature-views.js` provides the shared feature runtime and retains Elevation. Separate feature modules live in `Weather/`, `Clouds/`, `Traffic/` and `Earthquakes/`. They mount into the existing full-screen stage below the shared three-Orb dock. The active feature Orb closes the view. Features must not create a parallel dock, close button or primary-view manager.

The primary registry is established by `Global/view-module-registry.js`. The Weather, Clouds, Traffic and Earthquakes modules register into the shared feature runtime; their source files are staged by the service worker. The Editorial Engine workspace is loaded lazily by `Global/update-manager.js`.

Current data sources: Weather uses Open-Meteo; Clouds uses NASA GIBS; Earthquakes uses USGS latest-day GeoJSON; Traffic/Live Cams uses its camera-directory integration. Missing or restricted data must be labelled honestly, never fabricated.

## Location, data and recovery

- `Location/location.js` owns explicit browser permission, GPS watch and fresh-fix lifecycle. Other views consume approved state only.
- `Data/data-store.js` and `Data/data-recovery.js` manage local IndexedDB records and portable recovery.
- `Recovery/` contains rollback guidance. Do not reset local data or caches as generic troubleshooting.

## Runtime, updates and offline

- `sw.js` owns the app-shell cache, optional caching, startup recovery and offline resource handling.
- `Global/update-manager.js` coordinates readiness, lazy Sun and Editorial Engine loading, and staged update activation.
- Their build identifiers must match; current identity is `v132-residents-removed`.
- Three.js module files and the Earth texture are staged as runtime dependencies for same-origin/offline module loading.
- `Weather/Art/service-worker-extension.js` is still imported by the service worker. Its paired Live Art compatibility file is inert; retain both until old-client compatibility is separately retired.
- `Tests/` contains source and contract tests. A GitHub Actions regression runner is not currently configured.

## Retained tools and dormant components

- `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` is a standalone developer tool that embeds `../index.html`; it is intentionally outside the normal app-shell navigation.
- `Global/universal-pdf-viewer.js` is not in the current app startup or app-shell dependency path. It is recorded as dormant and preserved pending an explicit decision about its standalone utility role.
- `Editorial-Engine/` contains the retained Universal Editorial Engine core, browser helper and text-intelligence utilities. The feature workspace is lazy-loaded by the update manager. Its former approved-record input contract is dormant without the removed upstream services.

## Dependency rule

A file referenced by `index.html`, the service worker, update manager, view registry, controller, module import, test or standalone tool is a dependency of that path even when it looks old. A file outside those paths is not automatically safe to delete; check tests, documentation and standalone entry points as well.
