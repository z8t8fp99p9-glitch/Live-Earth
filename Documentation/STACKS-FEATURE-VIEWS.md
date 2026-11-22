# Stacks Feature Views

## Shared contract

`Global/view-module-registry.js` owns the shared feature catalogue, activation/deactivation transitions and three-Orb dock. `Stacks/stacks-feature-views.js` owns the common Stacks catalogue/runtime, view shell, shared utilities, stage mounting and cleanup. All feature-view implementations register through `window.LiveEarthStacksFeatureRuntime.registerFeature()` when their optional controller script is loaded.

Every feature must:
- Mount into its approved workspace/stage and remain below the existing three-Orb dock where it uses the shared stage.
- Use the active feature Orb as its close action.
- Clean up timers, observers, animation frames, listeners, pending requests and renderer/layer resources on close.
- Preserve the shared dock's size, position, hitboxes and navigation behaviour.
- Avoid direct primary-view state changes and duplicate navigation/dock implementations.
- Consume approved Location state only; never request GPS permission itself.

## Catalogue and module loading

The shared runtime registers the full catalogue immediately in this order:

1. Clouds
2. Weather
3. Elevation
4. Earthquakes
5. Traffic
6. Atmosphere
7. Atmospheric Composition
8. Oceans
9. Land
10. Water & Ice
11. Earth Activity
12. Energy & Humanity
13. Editorial Engine

All 12 Stacks feature-view implementations are separate optional controllers, including Elevation. The additional Editorial Engine workspace is also an optional controller. Each is fetched only when the user selects its matching Orb and self-registers with the shared runtime. The loader waits for registration and opens it only if that same Orb is still selected; closing or switching views while a request is pending prevents a late response from activating a stale view.

`__liveEarthStacksFeatureViewsInstalled` means the shared runtime and complete catalogue are installed. It does not wait for optional controller downloads. This allows the Home startup gate to complete without downloading all feature controllers.

Optional feature scripts use the Service Worker's bounded same-origin optional cache. Online selection prefers fresh network content and refreshes the optional cache; later offline selection may use the saved copy. First-ever access to a feature while offline is not guaranteed until that feature has been cached. Such a failure must remain local to the selected feature and must not fail Home startup.

### Optional-loader reliability and close behaviour

- Each optional controller request has one shared in-flight promise. A request is bounded by a 25-second deadline; timeout and download failure return the controller state to `idle`, so selecting the Orb again can retry. The loader suppresses late `load`/`error` callbacks and retains the existing activation-token check, so an old selection cannot reopen a view after close or switch.
- Removing a timed-out script element does not guarantee that the browser cancels an already-started network transfer. Late registration therefore must not bypass the current active-feature/token checks.
- Closing the Stacks library is an immediate Stacks-local operation. Selecting a feature keeps the existing short Orb-collection transition before activation. Neither action may override or rewrite `window.setTimeout` or change timers belonging to other views.
- These rules apply only to optional Stacks modules and the Stacks library. They do not change Startup Essentials, primary-view readiness, app-shell caching or Weather rendering.

## Stacks features

| Feature | Controller | Data and behaviour |
|---|---|---|
| Clouds | `Clouds/clouds-view.js` | NASA GIBS cloud-fraction imagery |
| Weather | `Weather/weather-view.js` | Open-Meteo conditions only with an approved fresh Location fix; Location must be ON |
| Elevation | `Elevation/elevation-view.js` | Retained elevation workspace using the shared Prime Earth layer |
| Earthquakes | `Earthquakes/earthquakes-view.js` | USGS latest-day GeoJSON |
| Traffic | `Traffic/traffic-view.js` | Independent traffic workspace; show live traffic only after a verified provider is connected |

## Numerical worlds

All seven numerical worlds use the same Stacks catalogue, three-Orb dock and per-view lifecycle:

| World | Controller | Scope |
|---|---|---|
| Atmosphere | `Atmosphere/atmosphere-view-controller.js` | Temperature, pressure, wind and moisture |
| Atmospheric Composition | `Atmospheric-Composition/atmospheric-composition-view-controller.js` | Atmospheric constituents and chemistry |
| Oceans | `Oceans/oceans-view-controller.js` | Ocean currents, heat, salinity, sea level and marine productivity |
| Land | `Land/land-view-controller.js` | Terrain, soils, vegetation and land-cover change |
| Water & Ice | `Water-Ice/water-ice-view-controller.js` | Freshwater and cryosphere systems |
| Earth Activity | `Earth-Activity/earth-activity-view-controller.js` | Geophysical/environmental activity and event data |
| Energy & Humanity | `Energy-Humanity/energy-humanity-view-controller.js` | Radiation, night lights and human activity indicators |

The controllers dynamically reuse the core Earth Engine and, when required by a selected dataset, load `EarthEngine/Graphics/universal-grid-system.js` and `EarthEngine/Graphics/earth-grid-gpu-skin.js`. Those two helpers are optional resources, not install-time shell dependencies. The shared Earth Engine core and Three.js runtime remain essential for primary Earth operation.

Numerical data must be verified. Missing or pending adapters must be labelled honestly; never fabricate sample measurements or events.

## Editorial Engine workspace

`Editorial-Engine/engine-feature-views.js` is the optional browser workspace controller and loads only after the Editorial Engine Orb is selected. The retained Python core, browser helper and text-intelligence utilities remain in the repository. The former Collector, Checker, discovery, rights-processing, newsroom database, Publisher, feed and Magazine systems remain retired.

## Verification

The checked-in `Tests/` directory was retired by explicit owner direction. Do not claim automated regression coverage. Check source/syntax, catalogue order, no feature-controller requests at startup, one controller request on selection, late-response suppression, repeated open/close, switch while loading, error/retry, cache-first offline reuse after a prior online open, orientation, dock clearance, Location ON/OFF and protected primary-view transitions. Verify online and offline behaviour on the installed iPhone after deployment.
