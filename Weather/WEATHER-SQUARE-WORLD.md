# Weather 3D — Slim Raised Pavilion Foundation v22

## Foundation refinement
- Reduced the thickness of the main raised platform slab by 40% (0.25 to 0.15 scene units).
- Reduced the thickness of all four perimeter framing beams by 40% (0.25 to 0.15 scene units), shifting their centre height slightly to preserve their upper alignment.
- Kept the platform footprint, house centre, veranda boards, stone footings and timber piers unchanged.

## Entrance stair refinement
- Replaced the three bulky solid stair blocks with four slim, open-riser timber treads.
- Each tread uses a 0.16-unit structural board with a thin 0.024-unit top surface.
- Kept the stair run centred and aligned toward the raised veranda.
- Tread elevations rise in four measured steps toward the deck.

## Preserved
- Existing pavilion rotation: 15 degrees counter-clockwise from original.
- Existing walls, Shoji divisions, columns, roof, eaves and lanterns.
- Mount Fuji position, height and depth.
- Three rolling hill ridges and surrounding trees.
- Front-facing square camera, forecast toggle, weather UI, weather effects, water and feature lifecycle.

## Verification
- The service-worker transform upgrades the original Weather module and inserts V21 foundation geometry, then refines it to V22.
- A runtime fixture verified the 40% thinner slab and beams, four slim treads, preserved Fuji/house rotation/camera/toggle, and parsed the transformed Weather module successfully.
- ZIP manifest payload sizes and SHA-256 digests are checked during packaging.
