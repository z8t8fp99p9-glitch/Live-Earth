# Weather 3D — Fuji Garden Scene v13

## Mount Fuji refinement
- Reduce Mount Fuji by a further 10% relative to the current V12 scene: vertical scale changes from 0.60 to 0.54 (54% of the original height).
- Move Mount Fuji 15% of its 25-unit base radius to the right: X position changes from 0 to +3.75.
- Preserve its depth (`z = -64`), horizontal width, snow-cap geometry, colours and materials.
- Lower the group origin proportionally from `y = 6.72` to `y = 6.048` so the cone remains grounded.
- Retain the existing 45% reduction to the rear green hills.

## Composition lock
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Do not move the pavilion, garden trees, water, stepping stones, clouds, lighting, weather effects, forecast UI or Location permission flow.

## Upgrade behaviour
The service-worker extension upgrades an already-cached V12 Weather module in place and also retains the earlier V9 Fuji transform path. V13 markers prevent repeated application.
