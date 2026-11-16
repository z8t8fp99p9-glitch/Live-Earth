# Weather 3D — Square World Composition v5

## Revert

- Remove the experimental 30% Landscape canvas translation.
- Revert the 30-degree horizontal camera orbit.
- Restore the V2 front-facing camera position `(0, 9.55, 27.7)`.
- Keep camera target height/depth `(?, 2.5, -1.4)` and FOV `42°`.

## New framing experiment

- Keep the 1:1 canvas at the display centre in every orientation.
- Keep the house fixed at the centre of the square world.
- Portrait camera target remains `(0, 2.5, -1.4)`.
- Landscape shifts only the camera look target right, so the stationary house appears toward the left side of the display.
- Target offset is calculated to approximate a 30%-of-screen-width composition shift, scaled for the square canvas dimensions and camera field of view.
- Camera position and camera-to-world geometry are not translated; no black strip can be introduced by moving the canvas.

## Preserved systems

Scene geometry, weather animation, forecasts, Open-Meteo data, Location permission checks, refresh lifecycle, feature registration and shared views remain unchanged.

## Upgrade behaviour

The service-worker extension upgrades cached V1–V4 camera variants. It removes the old Landscape CSS translation, restores the centred square canvas, resets the 30-degree orbit, and applies the Landscape-only look-target offset. The patch is idempotent and guarded.
