# LIVE // EARTH — Living Coast: Horizon-led Weather World

**Date:** 10 November 2026  
**Status:** Direct Weather-view revision prepared for owner upload  
**Repository baseline inspected:** `main` at `d4cba6b769e7189995d7980b147317106bcacda3`  
**Baseline Weather blob reported by GitHub:** `c07b7bf8c603fa2c085dae69cf4e0060459cf543`  
**Commit title:** `Introduce Weather-Reactive Coastal Horizon to Living Topography`

## Design intent

This iteration develops the already-integrated portrait Weather world using the selected coastal art direction: Nāpali-inspired folded mountain ridges and valleys, Big Sur-inspired coves and waterfall-to-sea transitions, and a clear atmospheric horizon. These are visual references, not geographic replicas. LIVE // EARTH retains its own terrain, palette and miniature-world identity.

The goal is not to build a detached island or put a static illustration behind weather numbers. It is a single weather-responsive environment with four readable depth zones:

1. **Sky:** weather and local-time colour, cloud volumes, sunlight/moonlight, rain, snow, fog and thunderstorm effects.
2. **Horizon:** a separate sky-to-sea gradient, layered distant coastal headlands and a moving celestial cue.
3. **Land:** connected mountain ridges, warm exposed rock, foothills, forest, ground cover, scree, trails and elevation contours.
4. **Coast and water:** irregular coves, shallow shelves, moving wave fronts, river, waterfall, spray and foam.

The existing portrait rectangular terrain board remains the master composition. The world is not non-uniformly scaled to fill another aspect ratio. This revision improves portrait's horizon and depth while retaining the current adaptive camera profiles; a dedicated landscape extension remains a later stage.

## Changes in this revision

### Horizon and atmosphere

- Added a broad vertical horizon backdrop with distinct sea, haze and sky colour bands. Its plane is positioned behind the terrain, so the coast and mountain silhouettes remain in front of it.
- Added three layered distant headland silhouettes to establish atmospheric depth between the land and sky.
- Horizon bands and distant ridges transition across dawn, day, evening and night palettes. Rain, overcast, fog, storm and hot conditions tint the horizon separately from the land.
- Added a small sun/moon cue that moves with the selected local forecast hour and changes appearance between day and night.
- The existing sky dome, directional sunlight, hemisphere lighting, cloud volumes, rain shafts, snow particles, fog and thunderstorm-only lightning remain active.

### Landform and coast

- Broadened the mountain chain into connected primary and secondary ridges with more than one summit and shoulder mass.
- Made the shore curve less uniform, adding coves and headlands to the front and eastern coastal shelves.
- Reduced the artificial slab thickness and softened its edge colours so the terrain, rather than a stack of platform bands, remains the focal point.
- Retained the true coastal water mesh, shallow turquoise shelves, shoreline traces and animated wave fronts.
- Kept the winding river and coastal waterfall; the river carries a moving water texture and foam markers, while the falls retain spray and a pool.
- Broadleaf vegetation now has separate side-canopy lobes in addition to its main and upper crown. Conifers retain their layered silhouettes. Instancing and low-memory count tiers remain in place.

### Weather truth and UX

- The existing 18-hour forecast strip and scrubber remain the primary time control. Selecting an hour updates both the numeric readout and the scene, following the useful synchronized-timeline approach seen in weather UX research.
- Wind continues to drive downwind cloud drift and ocean roughness/waves.
- River response is driven by forecast precipitation, not wind speed. Wind is not treated as a river-discharge measurement.
- Visible rain intensity follows actual forecast precipitation. A high rain probability by itself can inform the outlook but does not create falling rain particles when the selected forecast amount is zero.
- Cloud coverage, selected-hour lighting, humidity/fog, snowfall, and thunderstorm-only lightning remain weather-driven.
- No unconnected marine swell, tide, river-gauge, or water-temperature values are invented. The sea is an artistic environment; the app does not claim a precise wave forecast.

## Preserved contracts

- Same existing `Weather/weather-view.js` route inside Stacks; no separate demo or second Weather view.
- Existing same-origin `vendor/three.module.js` import and already-established service-worker runtime path.
- Open-Meteo source and 18-hour forecast, Celsius, km/h and millimetres.
- Existing shared Location Orb permission gate and shared `LiveEarthScene.getLocation()` path. Weather does not call browser Geolocation or persist coordinates.
- Location OFF aborts active requests and clears local weather. Offline mode does not present stale forecast values as current.
- Existing attribution, refresh control, hourly buttons and forecast slider.
- Reduced-motion static render, hidden-view pause, resize/orientation/visual-viewport handling, deactivation cleanup and WebGL resource disposal.
- No changes to Home, Earth Engine, Moon, Sun, Location service, Global Orbs, Stacks runtime, databases, service worker, Update Manager or unrelated views.

## Package contents

- `Weather/weather-view.js` — direct replacement for the existing Weather module.
- `Tests/weather-immersive-scene.test.cjs` — terrain, coastal horizon, horizon/weather palette, multi-ridge, vegetation, weather response, camera framing, privacy and lifecycle contracts.
- `Tests/weather-floating-overlay-morning.test.cjs` — forecast shelf, overlay, safe area, local phases and responsive layout checks.
- `Tests/weather-scene-runtime.test.cjs` — mocked Three.js construction, forecast-state updates and disposal smoke test.
- `Documentation/LIVING-COAST-HORIZON-WEATHER-REVISION-2026-11-10.md` — this revision record.

## Verification performed

Passed locally:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
node Tests/weather-scene-runtime.test.cjs
```

The runtime test uses a mocked Three.js API. It verifies scene construction, weather-state updates and cleanup wiring, but it does **not** establish visual fidelity, browser WebGL compatibility, device GPU behaviour, battery/thermal performance, or live network behaviour. A real iPhone portrait screenshot and checks at dawn/day/night and at least one precipitation state are still required after owner upload and deployment.

## Upload

Upload the ZIP intact to the repository root on `main`. Keep `UPLOAD_MANIFEST.json` at the archive root; its payload entries contain exact byte sizes and SHA-256 hashes.

**Commit title:** `Introduce Weather-Reactive Coastal Horizon to Living Topography`

No GitHub write, commit, push or deployment was performed while preparing this package.
