# Weather 3D — Fuji Garden Scene v12

## Scenery refinement
- Reduce all ten rear green hills to 55% of their previous vertical height (45% shorter).
- Preserve each hill's horizontal footprint, depth position, material and colour; anchor the lower edge at the same ground contact height.
- Reduce Mount Fuji to 60% of its previous vertical height (40% shorter).
- Preserve Fuji's horizontal width, depth position (`z = -64`), snow-cap shape and colours.
- Lower Fuji's group origin proportionally (`y = 6.72`) so the scaled cone remains grounded.
- Preserve garden trees, pavilion, water, stepping stones, clouds, lighting, weather effects, forecast UI and Location permission flow.

## Composition lock
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred `100vmax × 100vmax` square canvas in Portrait and Landscape.
- Do not move the pavilion or add orientation-specific camera or canvas offsets.

## Upgrade behaviour
The service-worker extension upgrades both cached and freshly fetched Weather modules. It can transform the original procedural hill/tree scene or upgrade a cached V9 Fuji garden scene in place. The V12 marker prevents repeated transformations.
