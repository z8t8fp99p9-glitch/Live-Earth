# LIVE // EARTH — Global Celestial Engines Foundation

**Prepared:** 7 November 2026  
**Base:** `z8t8fp99p9-glitch/Live-Earth` · `main`  
**Scope:** three reusable JavaScript engines and three isolated Feature Orb inspection workspaces.

## What this package adds

- `earth-engine.js` — a reusable 3D Earth renderer with axial tilt, sidereal rotation, a NASA Earth surface texture loaded from the existing service-worker runtime asset, a procedural fallback texture, atmosphere rim, pointer rotation, pause/resume, speed, date and reset controls.
- `moon-engine.js` — a reusable 3D Moon system with a procedurally generated lunar surface texture, an elliptical low-precision orbit model, synchronous orientation toward its reference Earth, sunlight-driven phase/illumination, pointer rotation, pause/resume, speed, date and reset controls.
- `sun-engine.js` — a reusable 3D solar surface renderer using the existing `sun-surface-equirectangular.png`, a procedural fallback texture, glow/corona, solar rotation, pause/resume, speed, date and reset controls. It also exposes a directional-light bridge for future consumers.
- `celestial-engine-feature-views.js` — registers three separate Feature Orb workspaces: Earth Engine, Moon Engine and Sun Engine. A workspace starts its own temporary preview only when opened and disposes it when closed.
- `update-manager.js` — extends the existing optional Feature Orb loader to load the celestial inspection workspaces after the existing Engine Feature Orb controller.

## Engine/API arrangement

The complete engine and its bridge API live together in each JavaScript file. The global namespace is `window.LiveEarthCelestialEngines` with `earth`, `moon` and `sun` entries. Each entry offers:

- `createPreview(container, options)` — creates a temporary inspection instance.
- `mountShared(container, options)` — creates or reuses one shared renderer instance for future app consumers.
- `getShared()` and `releaseShared()` — inspect or dispose that shared instance.

The engine handle exposes lifecycle controls (`pause`, `resume`, `setSpeed`, `setDate`, `reset`, `getState`, `getObject3D`, `attach`, and `destroy`, where applicable). These APIs are the bridge; the Three.js scenes, meshes, materials, textures and behaviour remain inside their respective JS engine files.

Preview rotation/orbit is intentionally accelerated so its behaviour can be inspected without waiting hours or days. Shared mounts use normal real-time progression by default. A later view integration can explicitly choose its own preview or production timing.

## Isolation and protected systems

- No new engine is attached to Home Earth, the existing Moon View, the existing Sun View, Weather, Clouds or any other production view.
- The Moon preview's small Earth is only a local visual reference inside the Moon engine; it is not the Home Earth or the Earth Engine instance.
- Existing `astronomy.js`, `moon-orbit.js`, `sun-view-renderer.js`, `moon-view-controller.js`, `index.html`, `view-module-registry.js`, `engine-feature-views.js` and `sw.js` are not changed by this package.
- The Global Orb registry, Orb sizing/behaviour, dock, open/close lifecycle and Orb dependencies are not edited.
- The new controller uses the existing `LiveEarthFeatureViews.register/open/close` bridge and has its own CSS namespace.
- The update-manager's existing startup-ready message and service-worker build ID are preserved. The new feature loader is optional and catches its own errors, so failure to load these previews does not block existing app views.

## Accuracy and current limits

This is a functioning first foundation, not a claim of final scientific-grade ephemeris. Earth uses a standard sidereal-rotation calculation and a visual axial tilt. The Moon uses a low-precision Keplerian orbit approximation and a generated lunar surface texture. The Sun uses the repository's existing solar surface map and a 25.38-day visual rotation reference. These models can be refined independently before any production view migration. The three engines do not currently supply weather, clouds, live Earth orientation updates, high-precision lunar perturbations, solar activity data or production-view integration.

## Existing resource reuse

- Earth texture: `./runtime-assets/earth-land-ocean-ice-2048.png`, already declared by the current service worker as a runtime dependency.
- Sun texture: `./sun-surface-equirectangular.png`, already present in the repository and already used by the existing Sun View.
- Moon texture: generated internally by `moon-engine.js`; no additional asset file is required.
- Three.js: the existing local `./vendor/three.module.js` runtime module is reused.

No new service-worker shell requirements or asset dependencies are introduced.

## Loading sequence

The existing page bootstrap loads `update-manager.js`. The update manager continues loading the existing Sun renderer and Magazine/Engine Feature Orb controllers. After the existing Engine Feature Orb controller step, it optionally loads `celestial-engine-feature-views.js`. The three engine scripts themselves are loaded lazily when their individual Feature Orb workspace is opened.

## Validation still required on device

Static JavaScript syntax and lifecycle/registration checks are part of package validation. Real WebGL rendering, texture fetches, touch dragging, iPhone safe-area layout and Feature Orb transitions must still be verified in the app after the ZIP is uploaded and the workflow commit completes. No GitHub files have been written by the assistant.
