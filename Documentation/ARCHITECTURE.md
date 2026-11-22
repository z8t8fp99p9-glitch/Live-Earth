# Application Architecture

This document is the high-level map of the running application. Detailed contracts remain in the component references linked below; this file should not repeat their implementation notes.

## App shell and navigation

- `index.html` is the app shell and Home entry point.
- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared feature registration, Stacks lifecycle and the three-Orb feature dock.
- `Global/orb-controls-v4.js` owns protected Home Orb interactions and orientation recovery.
- `ios-standalone-root-flow.js` supports iOS full-screen behaviour.

## Earth and celestial views

- **Prime Earth** is the Home-owned globe and scene. It is not the Earth Engine.
- **Earth Engine** (`EarthEngine/Core/earth-engine.js`) is the reusable factory for independent Earth globe instances. Each Engine-owned view owns its scene, camera, renderer and lifecycle; quaternion-only viewpoint continuity is the shared handoff.
- **Earth View** (`Earth/earth-view-controller.js`) creates its own Engine globe. `Earth/location.html` is a separate standalone location view.
- Existing features that intentionally attach to Prime Earth use `window.LiveEarthPrimeScene`. `window.LiveEarthScene` is a compatibility alias only; new code must not use it to blur Prime Earth and Engine ownership.
- Moon and Sun remain separate views, controllers, renderers and state. They share a sky host and astronomy utilities, not a view implementation.

Canonical detail: [`EARTH-ENGINE.md`](EARTH-ENGINE.md).

## Stacks and secondary features

`Stacks/stacks-feature-views.js` registers the complete catalogue and shared feature runtime at startup. The 12 feature controllers and Editorial Engine workspace load only after their matching Orb is selected. `Global/view-module-registry.js` continues to own activation, deactivation, the stage, the existing three-Orb dock and close cleanup. No feature may create a second navigation manager or dock.

Canonical detail: [`STACKS-FEATURE-VIEWS.md`](STACKS-FEATURE-VIEWS.md).

## Data worlds and feature boundaries

- Weather, Clouds and Earthquakes use their documented providers and source/permission constraints. Traffic has no verified live-data provider connected and must not fabricate conditions.
- Seven numerical-style worlds use the shared Stacks catalogue/lifecycle and shared Earth Engine; the Universal Grid System and GPU Grid Skin are optional helpers loaded by a selected world when needed. Data views must label unconnected adapters and preview states honestly.
- Atmosphere and Atmospheric Composition are distinct worlds. The approved Wind-vector proposal is additive; existing scalar speed/direction products remain preserved until a separately approved implementation.

Canonical detail: [`NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md`](NUMERICAL-WORLD-GRID-SKIN-LIFECYCLE.md), [`WIND-VECTOR-DATA-ARCHITECTURE.md`](WIND-VECTOR-DATA-ARCHITECTURE.md), [`EARTH-INTELLIGENCE-ARCHITECTURE.md`](EARTH-INTELLIGENCE-ARCHITECTURE.md).

## Weather

Weather is a Stacks feature and follows the same shared stage, dock, location and lifecycle boundaries. Its approved square-world design, 2.5D renderer and art references are documented separately. Weather refactoring is not part of the current reliability package.

Canonical detail: [`WEATHER-EXPLORER-WORLD.md`](WEATHER-EXPLORER-WORLD.md) and [`../Weather/WEATHER-DESIGN-DIRECTION.md`](../Weather/WEATHER-DESIGN-DIRECTION.md).

## Location, data and recovery

- `Location/location.js` is the sole owner of explicit browser permission, GPS watch and fresh-fix state. Other views consume approved location state only.
- `Data/data-store.js` and `Data/data-recovery.js` manage local IndexedDB records and portable recovery. Do not reset local data or caches as generic troubleshooting.
- `Recovery/` contains rollback guidance.

## Essential and optional resources

The versioned app shell contains the resources needed for core startup, readiness and recovery. Stacks feature controllers and feature-only helpers are optional same-origin resources. The service worker handles the shell, runtime dependencies, navigation and optional resources through distinct routes; do not infer one cache policy from another.

Canonical policy: [`../STARTUP-ESSENTIALS-POLICY.md`](../STARTUP-ESSENTIALS-POLICY.md).

## Retained tools and dormant components

- `Tools/LIVE-EARTH-LAYOUT-EDITOR.html` is a standalone developer tool, not normal app navigation.
- `Global/universal-pdf-viewer.js` remains dormant and preserved pending an explicit decision about its standalone utility role.
- The Weather Art folder is a preserved creative archive; only assets referenced by the active renderer are runtime dependencies.
- The Universal Editorial Engine core, browser helper and text utilities are retained, while its former upstream collection/publishing systems remain retired.
- `.github/workflows/zip-extract-auto-upload.yml` is protected from ordinary ZIP payloads.

## Dependency and verification rules

A file referenced by `index.html`, the service worker, update manager, view registry, controller, module import or standalone tool is a dependency of that path even when it looks old. The repository `Tests/` directory was retired by explicit owner direction; source/syntax checks, targeted mocks, ZIP validation, Actions, Pages and installed-device acceptance must be reported as separate evidence.
