# Weather 3D — Real Scene Source V2

## Source-of-truth architecture
The approved Weather scene is authored directly in `Weather/weather-view.js`.
`Weather/Art/service-worker-extension.js` remains a runtime asset-registration file only.
It must not rewrite or intercept the Weather module.

## Pavilion floor correction
- Removed the redundant full-area `7.8 × 5.6` solid slab beneath the veranda boards.
- Retained the ten visible timber deck boards as the single walking surface.
- Added five narrow cross-joists beneath the boards, spanning between the long perimeter support beams.
- The joists replace the redundant slab as discreet structural support; they do not create a second visible floor.

## Pavilion perimeter rail alignment
The deck board footprint is approximately `x = -3.79..+3.79` and `z = -2.71..+2.695`.
- Left and right long-side rail outer faces now align to the deck's left and right edges.
- Long rails extend along the full deck depth.
- Rear rail outer face aligns with the rear deck edge.
- Front rail outer face aligns with the front deck edge.
- Front rail is split into matching side sections, leaving the full central stair width open.
- All rail geometry remains inside the rotated `house` group and inherits the approved 15° counter-clockwise pavilion rotation.

## Preserved approved scene
- Mount Fuji at height scale `0.54`, position `(3.75, 6.048, -64)`.
- Three continuous rolling ridges, including the lowered rear ridge.
- Balanced Japanese garden trees.
- Pavilion roof, eaves, walls, Shoji divisions and lanterns.
- Slim raised foundation, shortened support piers, traditional four-step stairs and stair infill.
- Approved square camera `(0, 7.0, 27.7)`, FOV `42°`, target `(0, 2.5, -1.4)`.
- Forecast controls toggle, weather UI/effects, water, Location privacy boundary and Stacks feature lifecycle.

## Regression prevention
Future refinements must modify the real scene in `Weather/weather-view.js`.
The service-worker extension must remain free of Weather source rewriting.
Any scene package must be checked for the Fuji, three ridges, trees, pavilion rotation, floorboards/joists, four rail sides, stair opening, camera and forecast toggle before delivery.
