# Weather 3D — Square World Composition v2

**Decision:** retain the fixed display-centric 1:1 canvas and pull the camera back while keeping the pavilion centre-anchored.

## Composition contract

- The 3D canvas remains `100vmax × 100vmax`.
- The square canvas remains centred on the Weather view; the physical display is a centred crop window.
- Camera aspect remains `1:1` in every orientation.
- The camera target remains `(0, 2.5, -1.4)`, the centre of the Japanese pavilion composition.
- Camera position moves from `(0, 7.2, 18)` to `(0, 9.55, 27.7)`. This is a 1.5× pull-back along the same camera ray from the fixed target, preserving the viewing direction and centre anchor.
- Field of view remains `42°`; no orientation-specific camera presets are introduced.
- The wider view is intended to restore more of the lake, garden and sky around the house without changing world scale or stretching the scene.

## Preserved systems

Scene geometry, weather-state lighting, rain/snow/cloud animation, hourly and 7-day forecasts, Open-Meteo data, Location permission checks, refresh lifecycle, feature registration, and view cleanup remain unchanged.

## Upgrade compatibility

The service-worker extension applies a guarded transformation to the original responsive camera source, and also upgrades the previous square-world V1 camera if that version is already cached. The transformation is idempotent. If the expected source does not match, the original response is preserved and a diagnostic is logged.

## Device validation

After automatic extraction, test both orientations:
- Pavilion centre stays aligned to the centre of the square composition.
- Roof no longer dominates the frame.
- More sky and lake are visible around the pavilion.
- Portrait and Landscape show different crops of the same square world.
- Orb dock, safe areas, forecast controls, weather effects and view closing remain unaffected.
