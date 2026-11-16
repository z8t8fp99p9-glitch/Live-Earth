# Weather 3D — Square World Composition v4

## Change requested

Revert the temporary 30% Landscape canvas shift and apply a 30-degree horizontal camera orbit.

## Fixed composition

- Canvas remains a centred `100vmax × 100vmax` square.
- Portrait and Landscape use the same square canvas and camera.
- No orientation-specific canvas position or size.
- The house remains the camera's look target at `(0, 2.5, -1.4)`.

## Camera

- Retain the V2 pull-back distance and 42-degree field of view.
- Rotate the camera 30 degrees around the vertical axis around the house target.
- Camera position becomes `(14.55, 9.55, 23.81)`, looking at `(0, 2.5, -1.4)`.
- This changes the horizontal viewing angle while preserving the camera-to-target distance and elevation.
- The experiment reveals a three-quarter view of the pavilion without translating the square canvas.

## Reversion

The Landscape-only `left: calc(50% - 30vw)` rule is removed. The square canvas is restored to `left: 50%` in all orientations.

## Preserved systems

Scene geometry, weather animation, forecasts, Open-Meteo data, Location permission checks, refresh lifecycle, feature registration, and shared views are unchanged.

## Upgrade behaviour

The service-worker extension upgrades the V3 cached module as well as known earlier square-camera variants. It is idempotent and guarded: if the expected source does not match, the original response is preserved.
