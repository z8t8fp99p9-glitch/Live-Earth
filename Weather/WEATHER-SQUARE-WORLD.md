# Weather 3D — Square World Composition v3 (temporary Landscape offset)

## Fixed world rules

- Square canvas remains `100vmax × 100vmax`.
- Camera remains 1:1 with the V2 pull-back: position `(0, 9.55, 27.7)`, target `(0, 2.5, -1.4)`, FOV `42°`.
- House remains centred inside the square world.
- Portrait remains display-centred and unchanged.

## Temporary Landscape experiment

- In Landscape only, shift the entire square canvas 30% of the viewport width to the left.
- Implemented as `left: calc(50% - 30vw)` while retaining the canvas's `translate(-50%, -50%)`.
- This moves the world composition and its house anchor left on screen without moving the house inside the world, changing the square canvas size, or changing camera framing.
- Returning to Portrait removes the offset automatically.

## Preserved systems

All existing scene geometry, lighting/weather states, animation, forecasts, Location privacy checks, refresh behaviour, feature lifecycle, and shared app views remain untouched.

## Compatibility

The service-worker extension upgrades the original renderer and cached square-world V1/V2 variants. It is guarded and idempotent. If the expected source is not found, the original response is retained.

## Device review

Compare Landscape and Portrait after extraction. Confirm the Landscape house placement feels balanced, Portrait remains centred, and the shifted square world still provides a useful lake/sky/house composition. The 30% offset is intentionally experimental and can be adjusted or removed later.
