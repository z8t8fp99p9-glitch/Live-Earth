# Weather 3D — Square World Composition v7

## Subtle front-facing camera adjustment

- Keep the approved square world and its centre anchor exactly as restored in V6.
- Keep the square canvas `100vmax × 100vmax`, centred on the display in both orientations.
- Keep the camera horizontally centred at `X = 0` and preserve its distance from the scene at `Z = 27.7`.
- Keep the field of view at `42°` and retain the same look-at target `(0, 2.5, -1.4)`.
- Lower only the camera eye point from `Y = 9.55` to `Y = 7.0` to reduce the downward viewing pitch and reveal more of the pavilion's front elevation.
- Do not move the house, shift the canvas, orbit the camera, or introduce orientation-specific framing.

The camera's approximate downward pitch changes from 13.6° to 8.8°. This is a modest front-view adjustment, not a fully level/eye-height shot.

## Preserved systems

Scene geometry, weather animation, forecasts, Open-Meteo data, Location permission checks, refresh lifecycle, feature registration and shared views remain unchanged.

## Upgrade behaviour

The service-worker extension upgrades cached V1–V6 variants, including the current V6 centre-anchor restoration. It preserves the centred square canvas, replaces earlier camera resize functions with the V7 front-view framing, and remains guarded and idempotent.
