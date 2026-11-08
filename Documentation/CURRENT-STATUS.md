# LIVE // EARTH — Current Status

**Updated:** 8 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Working branch:** `main`  
**Source baseline:** user-supplied `Live-Earth-flat-folder-layout-v117.zip`  
**Working package:** V118 — full-screen Stacks feature views

This checkpoint is based on the supplied V117 ZIP, not a fresh GitHub branch-head query. Re-check `main` before any later task.

## 1. Application

The application and existing source modules are production code. Important areas include:
- `index.html` — app shell.
- `Global/view-manager.js` — primary-view transitions.
- `Global/view-module-registry.js` — shared module and feature lifecycle/registry.
- `Global/orb-controls-v4.js` — protected Orb controls and orientation recovery.
- `ios-standalone-root-flow.js` — iOS full-screen root-flow support.
- `Global/sky-view-controller.js` — shared Sun/Moon sky stage.
- `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js` — Moon renderer and interface.
- `Sun/sun-view-controller.js` — Sun controller.
- `Stacks/stacks-feature-views.js` — shared feature runtime and Elevation view.
- `Weather/weather-view.js`, `Clouds/clouds-view.js`, `Traffic/traffic-view.js`, `Earthquakes/earthquakes-view.js` — dedicated full-screen Stacks feature views.
- `Editorial-Engine/engine-feature-views.js` — Editorial Engine workspace only.

## 2. Protected behaviour

- Global Orb behaviour/dependencies and the five Home Orbs are protected.
- Preserve the approved Home composition and visual baseline.
- Moon and Sun are independent views.
- Location is OFF unless manually enabled.
- Preserve runtime/offline assets, startup/update safeguards, local data and recovery paths.
- Do not clear browser storage or reset a database as a generic fix.

## 3. Retained editorial capability

The Universal Editorial Engine remains under `Editorial-Engine/`. Its Python core, browser helper, text-intelligence utility and two general editorial-quality test files are retained. The Editorial Engine Feature Orb remains registered.

The preserved Python core still contains its prior read-only approved-record input contract. That contract is dormant: the associated collection and publishing services were removed. No live content collection, scheduled feed or Publisher run is active.

## 4. Removed systems

At the owner's direction, this cleanup removes the former collection/Manager, Collector, Checker, Image Engine, Newsroom database writer, Source Scout, Feed Collector and mini-browser, feed service, Publisher workspace, and Magazine/Nature/Alien World publishing scaffold. Their directories, integration modules, view loaders, tests, and implementation-specific recovery snapshots are deleted. No app-shell, Home, Orb, Sun, Moon, Location, Stacks environmental, service-worker, or generic PDF Reader files are included in the deletion list.

## 5. Stacks feature views
Weather, Clouds, Traffic and Earthquakes now each have a dedicated top-level folder and view module. All four use the shared Stacks feature runtime and Home Earth layer interface. Their full-screen surfaces preserve the Global three-Orb dock (active feature toggle, Location toggle, Stacks library). Elevation remains in the shared Stacks module and retains its prior compact panel layout.

- Weather only reads an already-enabled, fresh Location fix; it never requests geolocation.
- Clouds uses NASA GIBS daily cloud-fraction imagery, not a fabricated cloud texture.
- Earthquakes uses the USGS latest-day GeoJSON feed and clears live data when offline.
- Traffic is a full-screen preview only until a verified live traffic source is approved.

## 6. Verification boundary

The supplied V117 ZIP was extracted and used as the local working baseline. V118 JavaScript syntax checks passed for all 27 JavaScript files; the Earth Engine regression suite passed all 11 checks; the Stacks feature-folder and runtime registration tests passed; all 24 Editorial Engine Python tests passed. The Global three-Orb registry and Orb controller remain byte-for-byte unchanged. The service-worker shell references and archive membership, byte sizes and SHA-256 hashes are validated. `Tests/moon-engine-api.test.cjs` remains an existing stale test that expects a root `moon-engine.js` absent from the supplied baseline; it was not changed as part of this feature-view task. No claim is made about GitHub Actions, deployment or installed-iPhone acceptance until those are checked after upload.
