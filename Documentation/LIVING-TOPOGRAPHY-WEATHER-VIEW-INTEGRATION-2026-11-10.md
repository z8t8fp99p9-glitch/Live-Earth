# LIVE // EARTH — Living Topography Weather View Integration

**Date:** 10 November 2026  
**Status:** Direct Weather-view implementation prepared for owner upload and device verification  
**Baseline:** `main` at `ea3e5576044f9edf999ea3b25b808111045c5f31` (`Remove Residents Feature and Retire Character Assets`)

## Product direction

The Weather feature now uses the immersive Living Topography direction in the actual Stacks Weather view. It is not a standalone prototype or a second Weather route.

- Main Weather is our designed, persistent miniature world. Its geography is imaginative; the user's actual selected/current location supplies the weather applied to it.
- The existing Earth Engine remains the real-Earth experience and is not replaced or duplicated by this miniature world.
- No residents, characters, people or mascots are included.

## Immersive world renderer

The Weather view builds its world in the existing `Weather/weather-view.js` feature module and dynamically loads the already-packaged same-origin `vendor/three.module.js` runtime. No new dependency download or renderer file is introduced.

The world includes:
- A height-field terrain mesh with sculpted ridges, peaks, valleys and rolling relief.
- Contour lines sampled from the same terrain height field (Contour Morphism).
- Instanced forest geometry for dense surface detail with controlled draw calls.
- A river following the valley, reflective water, a cascade and pool.
- Independent clustered 3D cloud volumes at different heights and depths.
- Directional lighting, soft shadows, atmospheric fog and local-time lighting states.
- A water lens/ring and clear-coated materials for restrained Optical Morphism.
- A layered forecast shelf with fine markers, compact readings and instrument-like detail.
- Smooth weather-state transitions and weather particles for rain, storm and snow (Fluid Morphism).

The terrain fills the Weather view; it is not placed inside a card or presented as a floating-island wallpaper.

## Weather and privacy contract

- Uses the existing Open-Meteo forecast request in the Weather feature.
- Shows current conditions and an 18-hour hourly forecast.
- Selecting an hour updates the same world: cloud density, lighting, fog and precipitation response change without swapping to a new landscape.
- Weather only reads an already-enabled fresh position from the shared Location Orb / `LiveEarthScene.getLocation()` path.
- It never invokes the Geolocation API, asks for permission independently, or writes location coordinates to storage.
- Turning Location OFF aborts active requests and clears forecast values. The scene returns to a neutral, non-weather state.
- Offline mode shows no stale forecast as current.
- Forecast attribution remains visible.

## Performance and lifecycle

- Uses the existing Three.js runtime already staged by the current service worker.
- The Weather module is already part of the essential app shell, so no service-worker or update-manager path change is required for this integration.
- Caps device pixel ratio, uses instanced vegetation, keeps weather particles bounded, and caps the render loop at approximately 30 fps.
- Respects `prefers-reduced-motion` and pauses while the document is hidden.
- ResizeObserver and window listeners are removed on view close; scene geometries/materials and WebGL context are released.
- If WebGL is unavailable, the 3D stage displays a readable fallback while forecast information remains usable.

## Changed files in this package

- `Weather/weather-view.js` — replaces the old illustrated 2D Weather visual foundation with the immersive renderer and keeps the existing Stacks, Location, forecast, status and attribution contracts.
- `Tests/weather-immersive-scene.test.cjs` — checks the immersive renderer, shared runtime, live forecast and privacy/lifecycle requirements.
- `Tests/weather-floating-overlay-morning.test.cjs` — checks the transparent overlay, morphism forecast shelf, local day phases and renderer cleanup.

No Home, Earth Engine, Moon, Sun, Orb, Location service, Stacks runtime, database, service-worker or update-manager source is changed.

## Verification and release state

- JavaScript syntax check passed locally for `Weather/weather-view.js`.
- Both changed focused Weather tests passed locally.
- These are source-level checks. Target-iPhone visual quality, frame pacing, thermal impact, memory use, online/offline rendering and final deployed integration still require owner upload/deployment and device verification.
- No GitHub write, commit, push or deployment was performed while preparing this package.

## Upload

Upload the ZIP intact to the repository root on `main`, with `UPLOAD_MANIFEST.json` at the archive root. The related commit title is:

`Replace Weather View with Immersive Living Topography`
