# Weather 3D — Scene Restoration and Four-Side Pavilion Rails v27

## Why V26 appeared to remove the scene
- V26 contained a circular patch prerequisite: the V25 long-side rail insertion required the V26 four-side rail marker to exist first.
- The V26 four-side insertion in turn required the V25 marker.
- Starting from the V24 Weather module, neither marker existed, so neither rail patch ran and the extension returned no transformed module.
- The browser was consequently served the unmodified Weather module, which explains why the Fuji, rolling hills, balanced trees, approved pavilion framing and refined architecture appeared to disappear.
- V27 is rebuilt from the known V24 transformation and applies all four rails in one ordered patch. It does not depend on the broken V25/V26 marker chain.

## V27 pavilion rails
- Left and right long sides: upper and lower timber rails with three vertical balusters per side.
- Rear short side: continuous upper and lower rails with three vertical balusters.
- Front short side: matching rail returns split around the central entrance staircase.
- All rails use existing house timber, deck and dark support materials and inherit the house's approved rotation.

## Preserved V24 scene
- Three continuous rolling hills and lowered rear ridge.
- Mount Fuji height, position and depth.
- Balanced Japanese garden trees.
- Pavilion rotation: 15 degrees counter-clockwise from original.
- Raised slim foundation, shortened support piers, traditional four-step stair and closed stair infill.
- Approved front-facing square camera and forecast controls toggle.
- Weather UI, effects, water, Location permission flow and feature lifecycle.

## Verification
- Runtime test applied V24 to the original Weather fixture, then applied V27 to the transformed V24 module.
- Test confirmed the V27 marker, all four rail sections, stair infill, Fuji, three rolling ridges, pavilion rotation, camera and forecast toggle.
- The final transformed Weather module passed JavaScript syntax parsing.
- ZIP integrity, manifest payload list, sizes and SHA-256 digests are verified.
- Device rendering still requires upload and user testing.


## V28 rail elevation correction
- Raised all four foundation guard-rail runs to the pavilion deck/floor perimeter.
- Raised lower rails and shortened balusters to form a coherent guard assembly above the deck, rather than below the floor.
- Front rail remains split around the entrance staircase; rear and both long sides remain continuous.
- Pavilion geometry, rotation, camera, Fuji, hills, garden, stairs and weather controls are unchanged.
