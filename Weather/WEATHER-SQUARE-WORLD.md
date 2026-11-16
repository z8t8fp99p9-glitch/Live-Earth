# Weather 3D — Pavilion Rotation v17

## Pavilion refinement
- Rotate the complete Japanese pavilion group 20 degrees clockwise around its vertical axis (`rotation.y = 20°`).
- Apply rotation to the parent `house` group so the roof, eaves, walls, shoji divisions, columns and lanterns remain aligned as one structure.
- Preserve the pavilion's existing position `(0, 0, -1.4)`, dimensions, materials and component geometry.
- Do not rotate the camera, ground, hills, Mount Fuji, trees, water or weather layers.

## Approved scenery and composition lock
- Preserve the V16 three-layer rolling hills and the lowered distant dark-green ridge.
- Preserve Mount Fuji height (`0.54` vertical scale), rightward position (`x = +3.75`), depth (`z = -64`) and grounded origin (`y = 6.048`).
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Keep forecast UI, weather effects, Location permission flow and feature lifecycle unchanged.

## Upgrade and verification
- The service-worker extension upgrades an already-cached V16 Weather module by inserting the rotation on the existing `house` group anchor.
- A refinement marker prevents duplicate rotation.
- The transformed module is returned only after checks confirm the 20-degree rotation, pavilion marker, approved Fuji values, rear ridge and camera.
