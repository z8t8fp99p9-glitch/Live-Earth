# Weather 3D — Fuji Garden Scene v9

## Scenery refinement

- Keep Mount Fuji large, centred, and much farther behind the pavilion (`z = -64`).
- Give Fuji a broad, softly coloured volcanic silhouette and a continuous, irregular snow cap rather than a sharp striped cone.
- Restore layered low-poly green hills between the pavilion and Fuji to recover atmospheric depth.
- Restore fuller Japanese garden trees in balanced side groupings; keep the pavilion's front elevation unobstructed.
- Preserve water, stepping stones, pavilion geometry, clouds, lighting, weather effects, forecast UI, Open-Meteo data and Location permission flow.

## Composition lock

- Preserve the approved V7 front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred `100vmax × 100vmax` square canvas and centre anchor in Portrait and Landscape.
- Do not move the pavilion or add orientation-specific camera or canvas offsets.

## Upgrade behaviour

The service-worker extension upgrades both cached and freshly fetched Weather modules. It supports the original procedural hill/tree source and the first Fuji garden version, then marks the refined V9 scene. Scene replacement is guarded and idempotent.
