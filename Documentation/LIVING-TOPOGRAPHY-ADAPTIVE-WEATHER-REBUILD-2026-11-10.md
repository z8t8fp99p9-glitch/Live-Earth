# LIVE // EARTH — Adaptive Living Topography Weather Rebuild

**Date:** 10 November 2026  
**Status:** Replacement package prepared for owner upload and real-device verification  
**Repository baseline:** `main` at `df7d6ecb6540d42cff69deb6316ff5620e8a1a92` (`Replace Weather View with Immersive Living Topography`)  
**Replacement commit title:** `Rebuild Weather as Adaptive Living Topography`

## Why this rebuild exists

The previous Weather scene did not match the approved Living Topography direction. It read as a flat green plane with repeated cone trees, while its river and waterfall did not establish a clear water feature. It also used one narrow camera/layout treatment rather than a deliberate composition for different viewport shapes.

This package replaces that scene foundation in the actual Weather feature. It is not a standalone prototype and does not add a second Weather route.

## Art direction and world construction

The Weather view is a designed miniature island world. Its geography is imaginative; live, permitted location weather drives its atmosphere and conditions. The separate Earth Engine remains the real-geography Explorer.

The rebuilt scene includes:

- An irregular oval island perimeter, clipped top terrain mesh and surrounding ocean. There is no large rectangular green ground plane.
- A sculpted landform made from multiple mountain masses, ridges, valleys and rolling slopes, with smooth averaged normals to avoid a faceted low-poly grid appearance.
- Contrasting terrain materials: meadow and forest greens, sandy coastal shelves, warm copper/ochre rock exposures, high rock and pale summit surfaces.
- Three exposed cliff bands forming a visible layered island edge, plus a shoreline highlight and ocean wave rings.
- A winding reflective river following the valley into a front-facing waterfall and tidal pool. The water is placed as an explicit scene feature rather than an incidental hidden plane.
- A varied forest assembled from conifer silhouettes, broad-canopy trees, shrubs and rock outcrops. Vegetation is clustered and instanced; it is not a uniform field of identical cones.
- Large independent, multi-lobed 3D cloud masses at different heights and depths. They have no support poles and are not flat weather icons.
- A gradient sky dome, directional lighting, atmospheric fog, local dawn/day/evening/night response, rain/snow particles and restrained reflective water details.

The terrain design is procedurally generated in the existing Weather module. No new image asset, external model download or third-party runtime dependency is introduced.

## Adaptive layout and camera

The complete island world shares a responsive footprint. A pure viewport profile changes its horizontal and depth scale based on the actual Weather stage aspect ratio, then derives the camera field of view and distance to keep the island framed.

The composition is explicitly adapted for:

- Compact phone portrait and standard/large phone portrait.
- Phone landscape, including short landscape heights.
- Tablet portrait and tablet landscape.
- Desktop and ultrawide desktop.

The user interface also changes composition. Portrait keeps the current readings above the forecast shelf. Landscape moves the current readings and forecast into separate columns so the timeline does not cover the whole world. Tablet and desktop layouts widen the reading and forecast regions without turning the Weather view into a dashboard card wall. Short landscape screens compress typography and forecast controls. Top and bottom safe areas remain respected.

`ResizeObserver`, window resize/orientation events and the mobile `visualViewport` resize event all reframe the renderer. Device pixel ratio is capped and the render resolution observes a bounded pixel budget. Mesh density, vegetation and particles are tiered for compact/low-memory devices.

## Preserved Weather and app contracts

- The existing Stacks Weather registration and route remain in place.
- Uses the already-cached same-origin Three.js runtime at `vendor/three.module.js`.
- Keeps Open-Meteo as the data source and the current-conditions plus 18-hour forecast contract.
- Uses Celsius, km/h and millimetres.
- Selecting an hourly forecast changes the same world's lighting, cloud, fog and precipitation state.
- Reads location only through the existing enabled Location Orb / `LiveEarthScene.getLocation()` path.
- Does not invoke the Geolocation API, request permission itself or persist coordinates.
- Turning Location OFF aborts requests and clears displayed forecast values.
- Offline mode does not label old forecast values as current.
- Attribution remains visible.
- Reduced-motion mode renders a static scene; hidden tabs pause rendering; closing Weather releases listeners, geometries, materials and the WebGL context.

No Home, Earth Engine, Moon, Sun, Orb, Location service, Stacks runtime, database, service-worker or update-manager source is changed.

## Files in this package

- `Weather/weather-view.js` — replaces the current Weather scene and responsive Weather layout in the existing feature module.
- `Tests/weather-immersive-scene.test.cjs` — validates the terrain, island, ecosystem, live forecast, privacy/lifecycle and responsive viewport profile. It executes the actual viewport profile against eight representative screen sizes.
- `Tests/weather-floating-overlay-morning.test.cjs` — validates responsive portrait/landscape/tablet/short-screen layout, forecast shelf, local-time lighting and cleanup.

## Verification

Passed locally:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
```

The automated viewport profile covers 320×568, 393×852, 430×932, 844×390, 820×1180, 1180×820, 1440×900 and 2560×1080.

These checks validate JavaScript syntax, source contracts and responsive framing logic. They do **not** substitute for a real WebGL run, iPhone/iPad visual inspection, thermal/frame-rate testing, or deployed online/offline testing. Those remain pending after owner upload and deployment.

## Upload

Upload this ZIP intact to the repository root on `main`. Keep `UPLOAD_MANIFEST.json` at the archive root. The archive includes SHA-256 and byte-size entries for every payload file.

**Commit title:**

`Rebuild Weather as Adaptive Living Topography`

No GitHub write, commit, push or deployment was performed while preparing this package.
