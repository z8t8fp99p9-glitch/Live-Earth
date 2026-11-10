# LIVE // EARTH — Living Coast & Riverlands: Full Weather Scene Rebuild

**Date:** 10 November 2026  
**Status:** Direct Weather-view replacement prepared for owner upload  
**Repository baseline inspected:** `main` at `a9b6a33c7425f16c958c2c45bdeeeff18ca8be9e`  
**Baseline Weather blob:** `ecf0ff62342f9904f408f6434aff437d6ebccf0a`

## Design objective

Replace the previous narrow, rectangular slab-and-mountain composition with a full-screen weather environment. The approved portrait art direction gives the upper frame to sky, the middle to mountain ranges and living river valleys, and the lower foreground to a restrained coastal sea. The scene is landscape-first in its natural forms, but portrait is the authored camera composition. It is not an island, a wallpaper, or a static image.

## Scene rebuilt

### Sky and atmosphere

- A continuous full-screen gradient sky dome replaces the narrow backdrop band.
- Six independently placed volumetric cloud families occupy several upper-sky depths and heights.
- Cloud visibility and scale respond to the selected forecast's cloud-cover field; wind direction and speed move the formations downwind.
- The sun/moon cue, directional light, ambient sky/ground light and fog transition with the selected local forecast hour and weather.
- Rain streaks, snow particles and thunderstorm-only lightning are separate systems. No rods or support objects are used beneath clouds.

### Mountains and riverlands

- Three connected mountain groups form a multi-peak range with separate ridges, shoulders and saddles rather than a single gaussian mound.
- Exposed copper/ochre rock, weathered stone and summit tones are blended by elevation and location.
- Foothills transition into broad, greener valleys with clustered broadleaf trees, layered conifers, shrubs and grouped rock outcrops.
- A single winding river ribbon descends from the high mountain valley through the forest corridor and reaches the coast. It has moving texture and foam markers.
- A coastal waterfall, pool and spray complete the river-to-sea transition.

### Coast and ocean

- The old rectangular plinth/core, visible board rim and stacked perimeter bands are removed.
- The terrain mesh is clipped at an irregular natural shoreline; it no longer continues beneath the sea as a pale rectangular shelf.
- Shallow turquoise coves, beach shelves, shore foam and wave fronts transition into a foreground-only ocean surface.
- The ocean is deliberately secondary to sky and land. There are no unsupported wave-height, tide or marine forecasts represented as real data.

## Portrait-first camera

- Portrait uses a 49-degree field of view, an elevated look target and a low three-quarter pitch to keep the distant mountain skyline around mid-frame and leave an expansive sky window above it.
- Terrain geometry is not stretched to fit portrait or landscape.
- Landscape, short landscape, tablet and desktop use distinct camera profiles; this iteration prioritises the portrait reference.
- The canvas remains full-bleed inside the existing Weather stage. UI overlays, forecast shelf, attribution and bottom Orbs remain in their current app-owned layout.

## Weather is functional, not decorative

The selected hourly forecast continues to update both the readings and the environment:

- Cloud cover controls cloud density/visibility; wind controls downwind cloud movement.
- Local dawn/day/evening/night controls sky and horizon colour, celestial cue and directional/ambient light.
- Actual forecast precipitation drives rain streak intensity and river-flow response. Probability alone does not create rain.
- Snow and fog use distinct particle/atmosphere behaviour.
- Lightning is storm-only.
- Wind roughens the coastal water; water texture, river foam, waterfall, spray and wave lines animate.
- No river-gauge discharge or ocean swell data is invented.

## Preserved application contracts

- The existing `Weather/weather-view.js` Stacks route is retained; no prototype or separate Weather route is added.
- Existing same-origin `vendor/three.module.js` runtime import remains in use and is already part of the app's offline shell.
- Existing Open-Meteo current conditions and 18-hour forecast remain; temperature is Celsius, wind km/h and precipitation mm.
- The existing shared Location Orb permission gate and `LiveEarthScene.getLocation()` path remain authoritative. Weather never requests browser Geolocation and does not persist coordinates.
- Location OFF clears local readings and aborts active requests. Offline mode does not present an old forecast as current.
- Existing forecast strip, scrubber, refresh, attribution, reduced-motion handling, hidden-view pause, resize/orientation handling, cleanup and WebGL resource disposal remain.
- No changes are made to Home, Earth Engine, Moon, Sun, Location service, Global Orbs, Stacks runtime, databases, service worker, Update Manager or unrelated views.

## Files in this package

- `Weather/weather-view.js` — direct replacement for the current Weather module.
- `Tests/weather-immersive-scene.test.cjs` — scene structure, geometry, weather, privacy, responsive-camera and lifecycle contracts.
- `Tests/weather-floating-overlay-morning.test.cjs` — UI overlay, forecast shelf, local phase and safe-area contracts.
- `Tests/weather-scene-runtime.test.cjs` — mocked Three.js scene construction, forecast-state updates and disposal smoke test.
- `Tests/weather-sky-dominant-composition.test.cjs` — portrait camera and composition-specific regression checks.

## Verification performed

Passed locally:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
node Tests/weather-scene-runtime.test.cjs
node Tests/weather-sky-dominant-composition.test.cjs
```

The runtime test uses a mocked Three.js API. It verifies construction, update and disposal wiring only. It is not a real browser/WebGL screenshot or iPhone GPU test. The visual direction has been checked against the supplied reference and camera geometry, but final visual acceptance still requires the deployed iPhone portrait render. This package must not be described as device-verified until that screenshot is reviewed.

## Upload

Upload the ZIP intact to the repository root on `main`; keep `UPLOAD_MANIFEST.json` at the archive root. The manifest lists exact payload sizes and SHA-256 hashes.

**Commit title:** `Rebuild Weather as Full-Screen Living Coast and Riverlands`

No GitHub write, commit, push or deployment was performed while preparing this package.
