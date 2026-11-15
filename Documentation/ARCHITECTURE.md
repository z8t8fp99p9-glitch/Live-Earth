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
- Moon uses `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js`.
- Sun uses `Sun/sun-view-controller.js`; `Global/sky-view-controller.js` provides the shared sky host.
- Moon and Sun keep separate rendering and view-specific state.
- The unreferenced `Earth/basic-map.html` / `Earth/basic-map.js` standalone prototype has been retired. The separate `Earth/location.html` / `Earth/earth-orb-globe.js` path remains staged and covered by the Earth Engine separation test; it is not classified as orphaned.

## Stacks and secondary features

`Stacks/stacks-feature-views.js` provides the shared feature runtime and retains Elevation. Separate feature modules live in `Weather/`, `Clouds/`, `Traffic/` and `Earthquakes/`. They mount into the existing full-screen stage below the shared three-Orb dock. The active feature Orb closes the view. Features must not create a parallel dock, close button or primary-view manager.

Current data sources: Weather uses Open-Meteo; Clouds uses NASA GIBS; Earthquakes uses USGS latest-day GeoJSON; Traffic/Live Cams uses its camera-directory integration. Missing or restricted data must be labelled honestly, never fabricated.

## Location, data and recovery

- `Location/location.js` owns explicit browser permission, GPS watch and fresh-fix lifecycle. Other views consume approved state only.
- `Data/data-store.js` and `Data/data-recovery.js` manage local IndexedDB records and portable recovery.
- `Recovery/` contains rollback guidance. Do not reset local data or caches as generic troubleshooting.

## Runtime, updates and offline

- `sw.js` owns the app-shell cache, optional caching, startup recovery and offline resource handling.
- `Global/update-manager.js` coordinates readiness and staged update activation.
- Their build identifiers must match; current identity is `v132-residents-removed`.
- `Tests/` contains source and contract tests. A GitHub Actions regression runner is not currently configured.

## Retained editorial utility

`Editorial-Engine/` contains the retained Universal Editorial Engine core, browser helper and text-intelligence utilities. Its former approved-record input contract is dormant without its removed upstream services. The app does not run a live collection, rights-checking, feed, database-writing, Publisher or Magazine pipeline.

## Dependency rule

A file referenced by `index.html`, the service worker, update manager, view registry, controller or lazy loader is a runtime dependency even when it looks old. Trace references before removing or moving anything. A file outside those paths is not automatically safe to delete; check tests, documentation and standalone entry points as well.
