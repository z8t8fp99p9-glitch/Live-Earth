# Weather 3D — Pavilion Counter-Clockwise Correction v18

## Pavilion orientation
- Set the complete Japanese pavilion to 15 degrees counter-clockwise from its original forward orientation (`rotation.y = -15°`).
- This is a 35-degree correction from the previous V17 setting of +20°.
- Rotate the parent `house` group so roof, eaves, walls, shoji divisions, columns and lanterns stay aligned.
- Preserve the pavilion's original position `(0, 0, -1.4)`, dimensions, materials and component geometry.

## Approved scenery and composition lock
- Preserve the V16 three-layer rolling hills and lowered distant dark-green ridge.
- Preserve Mount Fuji height (`0.54` vertical scale), rightward position (`x = +3.75`), depth (`z = -64`) and grounded origin (`y = 6.048`).
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the centred square canvas in Portrait and Landscape.
- Keep forecast UI, weather effects, Location permission flow and feature lifecycle unchanged.

## Upgrade and verification
- The service-worker extension replaces the previous +20° pavilion rotation with -15° when upgrading a V17 Weather module.
- A refinement marker prevents duplicate rotation.
- The transformed module is returned only after checks confirm the -15° rotation, pavilion marker, approved Fuji values, rear ridge and camera.
