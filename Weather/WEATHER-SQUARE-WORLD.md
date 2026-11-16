# Weather 3D — Fuji Garden Scene v14

## Rear landscape redesign
- Replace the low-poly icosahedron hill mounds with high-resolution smooth sphere-based hill forms (`48 × 32` segments).
- Add subtle, deterministic surface variation to avoid perfect bubble-like domes while retaining soft natural contours.
- Preserve the established layered hill layout, colours, relative depth and ground contact.
- Keep the approved 45% reduction in hill height (`0.55` vertical scale).
- The result should read as a continuous sequence of soft rolling hills rather than angular, overlapping polygon mounds.

## Mount Fuji and composition lock
- Preserve Mount Fuji's approved V13 height (`0.54` vertical scale) and rightward position (`x = +3.75`).
- Preserve Fuji depth (`z = -64`), proportional grounded origin (`y = 6.048`), width, snow cap, colours and materials.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Do not move the pavilion, garden trees, water, stepping stones, clouds, lighting, weather effects, forecast UI or Location permission flow.

## Upgrade behaviour
The service-worker extension upgrades the already-cached V13 Weather module in place, replacing only the hill geometry function. It also uses the smooth hill geometry in the generated scenery block. V14 markers prevent repeated application.
