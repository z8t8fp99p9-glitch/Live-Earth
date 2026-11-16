# Weather 3D — Raised Japanese Pavilion Foundation v21

## Foundation and entrance redesign
- Widen the existing foundation slab from `6.8 × 4.5` to `7.8 × 5.6` scene units while preserving its centre and elevation.
- Add a framed perimeter under-beam around the raised platform.
- Add eight visible timber support piers on stone footings to lift the veranda above the garden ground.
- Add ten narrow deck-board strips to suggest a timber engawa/veranda surface around the house.
- Add three broad, centred, solid timber entrance steps with separate top tread boards. The stair run meets the front edge of the raised platform.
- Keep all new foundation geometry inside the existing `house` group, so it inherits the approved pavilion rotation as a single architectural unit.

## Preserved architecture and scenery
- Preserve the approved pavilion orientation: 15 degrees counter-clockwise from original (`rotation.y = -15°`).
- Preserve the existing walls, Shoji divisions, four corner columns, roof, eaves and lanterns.
- Preserve Mount Fuji height (`0.54` vertical scale), rightward position (`x = +3.75`), depth (`z = -64`) and grounded origin (`y = 6.048`).
- Preserve the three continuous rolling ridges and lowered distant dark-green ridge.
- Preserve the approved front-facing camera: position `(0, 7.0, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- Preserve the forecast controls toggle, weather UI, weather effects, Location permission flow, water, trees and feature lifecycle.

## Upgrade and verification
- The service-worker extension upgrades the current V20 Weather module by replacing the original foundation slab dimensions and adding the raised foundation, pier, veranda-board and stair geometry after the existing shared box helper.
- A foundation marker prevents duplicate geometry when the module is already transformed.
- The V20-to-V21 runtime fixture verifies the widened slab, footings/piers, deck boards, three stair blocks, preserved Fuji, pavilion rotation, camera and forecast toggle. The transformed module is also syntax-parsed.
