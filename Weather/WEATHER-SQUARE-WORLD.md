# Weather 3D — Fuji Garden Scene v10

## Scenery refinement
- Reduce the vertical height of all ten rear green hills by 45% (`55%` of the prior height).
- Preserve each hill's horizontal footprint, depth position, material and colour.
- Preserve the bottom contact line while lowering the hill crests to avoid floating gaps.
- Keep Mount Fuji at its existing size and position (`z = -64`), including its snow cap.
- Keep the garden trees, pavilion, water, stepping stones, clouds, lighting and weather effects unchanged.

## Composition lock
- Preserve the approved V7 front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred `100vmax × 100vmax` square canvas in Portrait and Landscape.
- Do not move the pavilion or add orientation-specific camera or canvas offsets.

## Upgrade behaviour
The service-worker extension upgrades both cached and freshly fetched Weather modules. It supports the original procedural hill/tree source and upgrades an already-patched V9 Fuji garden scene in place. The hill-height marker makes the change idempotent.
