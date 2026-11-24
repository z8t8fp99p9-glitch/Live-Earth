# Numerical World Grid-Skin View Lifecycle

## Shared universal systems

The numerical-style views use the same three reusable systems:

1. `EarthEngine/Core/earth-engine.js` creates each view's globe through `createEarthGlobe()` / `createGlobe()`.
2. `EarthEngine/Graphics/universal-grid-system.js` loads, validates, decodes and normalizes numerical grid data from the Universal current-value store.
3. `EarthEngine/Graphics/earth-grid-gpu-skin.js` converts a prepared regular grid into a GPU texture skin on the globe.

Each world controller owns its view canvas, Three.js scene, camera, renderer, interactions, data selection, colours, legends and lifecycle cleanup. All seven numerical-style Stacks controllers call the Earth Engine directly; there is no extra `independent-world-globe.js` runtime/helper layer. The six original database Worlds remain distinct from the separate Atmospheric Composition Stacks view.

The seven numerical-style controllers are optional Stacks modules and load only when their Orb is selected. The Universal Grid System and GPU Grid Skin are also optional: a controller fetches them only when the selected dataset requires the grid pipeline. The core Earth Engine factory and required Three.js dependencies remain in the essential shell. These optional same-origin resources use the existing bounded optional cache, so first-use offline access is available only when the needed module has previously been cached.

## View lifecycle

When a numerical view opens, its controller mounts the feature UI, loads shared grid APIs as needed, creates its own Three.js view renderer, calls the shared Earth Engine factory and attaches the world-specific GPU skin to the Engine-created globe. It displays only verified current data. A dataset's source observation/valid time and retrieval time remain distinct; a stored grid is not assumed to be newer or more complete than the upstream source has published.

When the view closes, its controller aborts pending requests, disposes the GPU skin and layer resources, disposes its Engine-created globe, releases its renderer and removes its canvas. Home's globe and existing Stacks layers remain untouched.

## Globe-first presentation

Atmosphere, Oceans and Atmospheric Composition are the three current globe-first scientific views. Their controllers initialize a dedicated Earth Engine globe asynchronously and guard against a late result after the view has been closed or another view selected. A valid globe must expose `attachLayer`; the controller stores the engine-ready state, requests a render and shows errors only within the still-active view.

The shared `Global/view-module-registry.js` suppresses the generic Stacks preview stage for these three feature IDs. It does not place a placeholder card over their full-screen scientific globe. Oceans and Atmospheric Composition remove the generic feature heading/pill from their mounted view; their own presentation remains controller-owned. Closing or switching a view runs the shared deactivate/cleanup lifecycle and disposes its resources.

## Data-world boundaries

The Universal Data registry defines six original numerical database Worlds: Atmosphere, Oceans, Land, Water & Ice, Earth Activity and Energy & Humanity. Atmospheric Composition is a separate seventh numerical-style Stacks view. Its controller currently exposes seven direct dataset selections backed by NOAA GFS and NASA GEOS-CF current-value grids; source semantics and the outstanding World-assignment metadata mismatch are in `ATMOSPHERIC-COMPOSITION-DATA.md`.

Atmosphere's four controls map to five NOAA GFS dataset IDs. The Wind selection uses the verified speed grid for the scalar GPU colour surface and the paired direction grid to drive streamline motion. The combined derived `earth.atmosphere.wind_vector` product remains future work; see `WIND-VECTOR-DATA-ARCHITECTURE.md`.

Oceans has its own ten-control view/controller and independent dataset presentation. Its configured source adapters and current-value store are shared infrastructure, not a second globe or navigation framework.

## Boundaries

- `Stacks/stacks-feature-views.js` remains the shared feature-view shell and legacy Prime Earth layer interface.
- `Global/view-module-registry.js` remains the shared catalogue activation/deactivation/stage/dock owner.
- `EarthEngine/Core/earth-engine.js` owns independent Engine globe construction and disposal.
- The shared Universal Grid System and GPU Grid Skin remain the numerical-grid preparation/rendering systems.
- World controllers own dataset-specific presentation and controls.
- Point datasets such as earthquakes must use a point/event renderer, not be fabricated into a continuous grid.
- No sample or placeholder measurements are displayed.
