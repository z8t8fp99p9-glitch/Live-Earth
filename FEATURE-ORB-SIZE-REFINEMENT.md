# LIVE // EARTH V88.6 — Feature Orb Size Refinement

## Scope
This draft only enlarges the six scattered Stacks feature Orbs slightly. It does not alter the Home Orb sizing, Home globe renderer, Earth camera/framing, Moon geometry, location privacy behavior, service worker, or saved-data storage.

## Sizing change
- Normal feature Orb: `clamp(40px, 11vmin, 52px)` → `clamp(44px, 12.5vmin, 58px)`.
- Very short viewport feature Orb: `clamp(32px, 9vmin, 40px)` → `clamp(36px, 10vmin, 44px)`.
- The constrained-landscape button width is increased slightly so the feature labels have room: `clamp(64px, 18vmin, 78px)` → `clamp(70px, 20vmin, 82px)`.
- Fallback geometry estimates now use the new feature-Orb size so the collect/deploy animation starts at the correct visual centre even if layout measurement has not settled yet.

All measurements still use `vmin`, the shortest viewport dimension. The main layout and random asymmetric placement algorithm are unchanged.

## Explicitly deferred
The possible vertical stretching of the Home globe after the earlier scroll workaround is a separate issue. This draft does not touch globe rendering or its sizing logic.

## Manual test sequence
1. Open Stacks in portrait: confirm all six feature Orbs are slightly larger and remain separated, visible, and easy to tap.
2. Tap each feature and confirm the selected view opens and the previous view is deactivated first.
3. Return to Home, rotate to landscape, open Stacks, and confirm the compact-size rule is active without clipping labels.
4. Rotate while Stacks is open and confirm positions recalculate without a touch offset.
5. Close Stacks and verify the original five Home Orbs remain unchanged.
6. Later, investigate the Home globe's vertical stretch as a separate task.
