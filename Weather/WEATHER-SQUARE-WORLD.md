# Weather 3D — Fuji Garden Scene v15

## Rear landscape redesign
- Replace the previous collection of separate low-poly and sphere-like hill mounds with three continuous, custom-buffer-geometry rolling ridgelines.
- Each ridge spans the landscape width and uses a smooth depth profile plus gently varied crest contours to create natural, connected hills.
- Keep the established green palette and layered depth; preserve the 45% reduced hill-height scale.
- The ridgelines are generated as continuous surfaces rather than individual dome objects.

## Mount Fuji and composition lock
- Preserve the approved V13/V14 Mount Fuji height (`0.54` vertical scale) and rightward position (`x = +3.75`).
- Preserve Fuji depth (`z = -64`), grounded origin (`y = 6.048`), width, snow cap, colours and materials.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Do not move the pavilion, garden trees, water, stepping stones, clouds, lighting, weather effects, forecast UI or Location permission flow.

## Upgrade and verification
- The service-worker extension upgrades an already-transformed V14 Weather module by locating the existing landscape marker and replacing the complete hill section up to the Fuji group. It does not depend on an exact minified hill-function string match.
- The same continuous-ridge geometry is used when the scenery block is generated from an older original Weather module.
- The transformed module is returned only after checks confirm the new terrain marker, all three ridges, approved Fuji position/height, camera and tree layout.
