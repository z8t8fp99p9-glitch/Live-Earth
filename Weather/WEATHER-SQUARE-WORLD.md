# Weather 3D — Fuji Garden Scene v11

## Scenery refinement
- Reduce the vertical height of all ten rear green hills by 45% (55% of their previous height).
- Reduce Mount Fuji's vertical height by 40% (60% of its previous height).
- Preserve Fuji's horizontal width, depth position (`z = -64`), snow-cap shape and colours.
- Scale Fuji's vertical position together with its height so its base remains grounded.
- Preserve hill footprints, depth positions, colours and ground contact.
- Keep garden trees, pavilion, water, stepping stones, clouds, lighting and weather effects unchanged.

## Composition lock
- Preserve the approved V7 front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred `100vmax × 100vmax` square canvas in Portrait and Landscape.
- Do not move the pavilion or add orientation-specific camera or canvas offsets.

## Upgrade behaviour
The service-worker extension upgrades both cached and freshly fetched Weather modules. It supports the original procedural hill/tree source and upgrades an existing V9 Fuji garden scene. Separate hill and Fuji markers make both refinements idempotent.
