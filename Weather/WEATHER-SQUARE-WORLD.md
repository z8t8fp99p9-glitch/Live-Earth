# Weather 3D — Square World Composition v6

## Reversion to the approved centre anchor

- Remove the Landscape-only 30vw canvas shift.
- Remove the Landscape-only camera target offset.
- Revert the 30-degree horizontal camera orbit.
- Restore the approved V2 front-facing camera: position `(0, 9.55, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Keep the square canvas `100vmax × 100vmax`, centred on the display in both orientations.
- Keep the house at the centre of the square world.

## Preserved systems

Scene geometry, weather animation, forecasts, Open-Meteo data, Location permission checks, refresh lifecycle, feature registration and shared views remain unchanged.

## Upgrade behaviour

The service-worker extension upgrades cached V1–V5 variants, removes the old Landscape CSS translation, removes the camera target offset, and restores the exact V2 camera framing. The patch is idempotent and guarded.
