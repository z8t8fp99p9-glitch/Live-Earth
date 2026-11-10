# LIVE // EARTH — Living Topography: Portrait-First Weather World

**Date:** 10 November 2026  
**Status:** Direct Weather-view replacement package prepared for owner upload  
**Repository baseline inspected:** `main` at `c416f3babb9b32c984d721a06a416b432a7d98cc`  
**Baseline Weather blob:** `6eb01f8eca86507bf3c0770cdf56599ed5abbf16`  
**Proposed commit title:** `Rebuild Portrait Weather World with Forecast-Driven Environment`

## The reference, correctly interpreted

The visual target is not a floating oval island. It is a detailed miniature topographic world presented on a portrait, screen-sized rectangular surface. The land is a continuous landscape with a prominent exposed mountain range, contrasting foothills, dense vegetation, a real coastal water region, and clouds suspended at multiple heights. The mountain and forest composition—not an oval shoreline—is the focal point.

This revision makes portrait the master art direction. The rectangular terrain keeps its physical proportions. It is never non-uniformly stretched to fit a viewport. Landscape uses a different camera framing for now; extending the landform horizontally for a dedicated landscape composition is intentionally deferred until the portrait result is accepted.

## Portrait world construction

The actual existing `Weather/weather-view.js` module is replaced. No standalone prototype or additional Weather route is created.

- **Terrain board:** A portrait 13.0 × 25.6 world footprint with a slim rectangular model base and three geological side bands. The terrain edges close down to the base; there is no oval island perimeter.
- **Mountain spine:** A dominant, jagged, warm copper/orange and ochre ridge with multiple peaks, shoulders, exposed rock, fine alpine relief and scree. The mountain is the central visual landmark.
- **Foothills and lowlands:** Continuous height-field relief transitions from rock to meadow and forest floor. Fine procedural grain textures are generated locally at runtime; no external image/model downloads are introduced.
- **Forest:** Instanced layered conifers, separate broadleaf canopies, trunks, shrubs and understorey arranged in irregular ecological clusters. Density is tiered for compact and low-memory screens.
- **Coast and water:** The shoreline follows a front and right-hand coastal shelf within the rectangular terrain. A generated water mesh, shallow turquoise shelves, coast trace and moving wave fronts distinguish land from sea.
- **River and waterfall:** A winding waterway follows a mountain valley through forest clearings and descends at the coast. The river carries an animated water texture and moving foam markers. The waterfall has animated water texture, spray and a small optical pool/ring.
- **Atmosphere:** Independent multi-lobed 3D cloud formations sit at different heights and depths above the mountains and forest. They cast shadows; they are not flat weather icons or held by support poles.

## Weather is functional, not decorative

The selected hour in the existing 18-hour forecast calls the scene's `setState` with the source-backed weather fields. These drive the environment:

| Weather input | Environmental response |
|---|---|
| Cloud cover | Cloud formations appear/recede and change scale/coverage. Rain, storm and snow retain appropriate cloud masses. |
| Wind speed and direction | Clouds drift downwind using the direction-from convention; coastal roughness and wave movement respond; river flow strengthens modestly. |
| Local forecast hour | The sun moves along a daily arc. Dawn, day, evening and night change sunlight colour, ambient sky/ground light and scene palette. |
| Precipitation and rain probability | Rain/storm produce falling streaks and droplets; river flow and waterfall spray respond. |
| Snowfall / snow codes | Snow has its own slower particle motion and does not create rain shafts. |
| Humidity | Atmospheric haze/fog responds to relative humidity. |
| Temperature | Warm conditions increase the subtle atmospheric heat-haze treatment. |
| Thunderstorm WMO codes 95/96/99 | Brief lightning flashes are enabled only for thunderstorm states. |

The river remains a flowing landscape feature between forecast changes; measured precipitation and wind modify its flow. The world remains an artistic environment, not a precise local terrain model or a claim that every physical effect is meteorologically simulated.

## Adaptive behaviour

- Portrait is the master composition, designed around a narrow, deep terrain footprint.
- Compact phones and low-memory devices use the lower terrain grid and reduced instance counts.
- Standard/large portrait devices preserve the same land geometry and use camera framing only.
- Landscape, tablets and desktop receive viewport-specific camera framing; the map is not stretched. The horizontal landscape terrain extension is deliberately a later stage after portrait acceptance.
- `ResizeObserver`, window resize/orientation and `visualViewport` events reframe the camera.
- Device pixel ratio and total render pixel budget remain capped; the scene targets a bounded frame rate.

## Preserved contracts

- Existing Stacks Weather registration and activation/deactivation route.
- Existing same-origin, already-cached `vendor/three.module.js` runtime.
- Open-Meteo current conditions and the 18-hour forecast remain the data source.
- Celsius, km/h and millimetres remain the units.
- Existing Location Orb permission gate and shared `LiveEarthScene.getLocation()` path remain the only location source.
- Weather does not call the Geolocation API, request permission itself or persist coordinates.
- Location OFF aborts requests and clears local forecast values. Offline mode never represents stale forecast values as current.
- Open-Meteo attribution remains.
- Reduced-motion mode produces a static scene; hidden views pause animation; deactivation releases listeners, geometry, materials and WebGL context.
- Home, Earth Engine, Moon, Sun, Global Orbs, Location service, Stacks runtime, databases, service worker, Update Manager and unrelated views are untouched.

## Package contents

- `Weather/weather-view.js` — direct replacement for the actual Weather feature.
- `Tests/weather-immersive-scene.test.cjs` — portrait art direction, terrain, weather-response, camera framing, data/privacy and lifecycle contracts.
- `Tests/weather-floating-overlay-morning.test.cjs` — forecast shelf, overlay, safe-area, local phase and responsive UI checks.
- `Tests/weather-scene-runtime.test.cjs` — constructs the scene with a mocked Three.js API, exercises clear/rain/storm/snow state updates, and calls disposal. This is a JavaScript wiring smoke test, not a real renderer or visual test.
- `Documentation/LIVING-TOPOGRAPHY-PORTRAIT-WEATHER-REBUILD-2026-11-10.md` — this implementation record.

## Verification performed

Passed locally:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
node Tests/weather-scene-runtime.test.cjs
```

The runtime smoke test uses a deliberately minimal mocked Three.js API. It catches scene-construction, forecast-state wiring and cleanup errors, but it does **not** establish visual fidelity, device GPU compatibility, frame rate, battery/thermal behaviour or live network behaviour. A real iPhone portrait screenshot and online weather-state check are still required after owner upload and deployment.

## Upload

Upload this ZIP intact to the repository root on `main`. Keep `UPLOAD_MANIFEST.json` at the archive root. Its `files` entries contain each payload's exact byte size and SHA-256.

**Commit title:**

`Rebuild Portrait Weather World with Forecast-Driven Environment`

No GitHub write, commit, push or deployment was performed while preparing this package.
