# Weather 3D — Fuji Garden Scene v8

## Mount Fuji background and smaller garden trees

- Remove the oversized procedural hill row that crowded the background behind the pavilion.
- Replace it with a distant, low-poly Mount Fuji silhouette, finished with a pale, irregular snow cap.
- Keep Fuji behind the pavilion and centred on the scene's existing world axis.
- Reduce and reposition the garden trees into smaller side groupings so they frame the pavilion rather than competing with it or covering the mountain.
- Keep the water, stepping stones, pavilion geometry, weather effects, lighting, clouds, forecasts, Open-Meteo data and Location permission flow intact.

## Camera and composition preserved

- Keep the approved V7 front-facing camera exactly: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Keep the square canvas `100vmax × 100vmax`, centred on the display in both orientations.
- Keep the pavilion at the centre of the world. Do not shift the canvas or introduce orientation-specific framing.

## Upgrade behaviour

The service-worker extension upgrades cached V1–V7 Weather modules as well as fresh source responses. It keeps the V7 camera and centre anchor, replaces the exact old hill and tree blocks as one guarded scene update, and is idempotent after the Fuji garden marker is present.
