# Weather 3D — Fuji Garden Scene v16

## Rear dark-green ridge refinement
- Lower only the distant dark-green rolling ridge: its peak parameter changes from `13` to `8.5` (approximately 35% lower).
- Preserve its horizontal span, depth range, continuous geometry, material and gently varied crest.
- Keep the middle green ridge (`peak = 10`) and nearer green ridge (`peak = 7`) unchanged.
- Retain the established three-layer rolling landscape and original green palette.

## Mount Fuji and composition lock
- Preserve the approved Mount Fuji height (`0.54` vertical scale) and rightward position (`x = +3.75`).
- Preserve Fuji depth (`z = -64`), grounded origin (`y = 6.048`), width, snow cap, colours and materials.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Do not move the pavilion, garden trees, water, stepping stones, clouds, lighting, weather effects, forecast UI or Location permission flow.

## Upgrade and verification
- The service-worker extension upgrades an already-transformed V15 Weather module by locating the continuous-terrain marker and replacing the full terrain section up to the Fuji group.
- Only the distant ridge height changes; the two nearer ridge definitions and all approved Fuji/camera values are retained.
- The transformed module is returned only after checks confirm the lowered ridge, both unchanged ridge definitions, Fuji, camera and tree layout.
