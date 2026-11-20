# Numerical World Grid-Skin View Lifecycle

## Shared universal systems

The numerical worlds use the same three reusable systems:

1. `EarthEngine/Core/earth-engine.js` creates each view's globe through `createEarthGlobe()` / `createGlobe()`.
2. `EarthEngine/Graphics/universal-grid-system.js` loads, validates, decodes and normalizes numerical grid data. Persistent data storage remains in the scientific databases.
3. `EarthEngine/Graphics/earth-grid-gpu-skin.js` converts a prepared regular grid into a GPU texture skin on the globe.

Each world controller owns its view canvas, Three.js scene, camera, renderer, interactions, data selection, colours, legends and lifecycle cleanup. All seven numerical-style Stacks controllers call the Earth Engine directly; there is no extra `independent-world-globe.js` runtime/helper layer. The Atmospheric Composition adapter remains disconnected, but its controller shares the same rendering foundation.

The seven numerical-world controllers themselves are optional Stacks modules and load only when their Orb is selected. The Universal Grid System and GPU Grid Skin are also optional: the controller fetches them only when a selected dataset requires the grid pipeline. The core Earth Engine factory and required Three.js dependencies remain in the essential shell. These optional same-origin resources use the existing bounded optional cache, so first-use offline access is available only when the needed module has previously been cached.

## View lifecycle

When a numerical world opens, its controller mounts the feature UI, loads the shared grid APIs as needed, creates its own Three.js view renderer, calls the shared Earth Engine factory, and attaches the world-specific GPU skin to the Engine-created globe. It displays only verified data.

When the view closes, its controller aborts pending requests, disposes the GPU skin and layer resources, disposes its Engine-created globe, releases its renderer and removes its canvas. Home's globe and existing Stacks layers remain untouched.

## Boundaries

- `Stacks/stacks-feature-views.js` remains the feature-view shell and legacy Prime Earth layer interface.
- `EarthEngine/Core/earth-engine.js` is not modified.
- The shared Universal Grid System and GPU Grid Skin remain the only numerical-grid preparation/rendering systems.
- World controllers own dataset-specific presentation and controls.
- Point datasets such as earthquakes must use a point-data renderer, not be fabricated into a continuous grid.
- No sample or placeholder measurements are displayed.


## Atmospheric Composition separation

`Atmospheric-Composition/atmospheric-composition-view-controller.js` is a distinct Stacks world from `Atmosphere/atmosphere-view-controller.js`. It has its own controller, world ID, Orb registration and view lifecycle, while reusing the same Earth Engine, Universal Grid System and GPU Grid Skin. Its data adapter is intentionally pending; until verified composition datasets are connected, the view displays readiness/status information only and no fabricated measurements.
