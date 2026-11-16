# Weather 3D — Square World Composition

**Decision:** display-centric 1:1 world canvas with a centre-locked house.

## Composition contract

- The 3D canvas is always square: `100vmax × 100vmax` CSS pixels.
- `vmax` makes the square side equal to the longest viewport dimension.
- The square canvas is centred on the Weather view and clipped by its full-screen root.
- The screen is a viewing window into the square world. Portrait and Landscape reveal different portions; neither stretches nor rescales the scene to fit.
- The Japanese house remains the composition's anchor. The camera targets the house's centre at `(0, 2.5, -1.4)`.
- Camera aspect remains `1:1`, with one fixed position and field of view across orientation changes.
- Existing scene geometry, weather states, animation, forecasts, Location permission checks, refresh lifecycle, and feature cleanup remain unchanged.

## Rendering behaviour

The square renderer continues to use the existing device-pixel-ratio cap. The physical display clips the square canvas through the Weather view's existing overflow boundary. A ResizeObserver still updates the renderer when the viewport changes, but the square frame and camera composition do not switch between portrait and landscape presets.

## Rollout and validation

The service-worker extension applies a guarded source transformation to `Weather/weather-view.js` before a fresh response is cached. It also upgrades an already-cached copy during service-worker activation. The transformation is idempotent and only applies when both expected baseline snippets are present; otherwise, it preserves the original response and logs a diagnostic.

After uploading the ZIP, verify the automatic extraction workflow and extracted commit. Then test on the device in Portrait and Landscape, checking the house centre, scene crop, safe areas, Orb dock, weather effects, closing behaviour, and a return to Weather after another view has been opened.
