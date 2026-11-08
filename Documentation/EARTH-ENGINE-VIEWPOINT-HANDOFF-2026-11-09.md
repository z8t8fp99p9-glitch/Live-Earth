# LIVE // EARTH — Earth Engine Viewpoint Handoff

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Inspected HEAD:** `cb0bcd4ab1edecdebd8813e997cc7b56e56b6e40`

## Current implementation map

- `EarthEngine/Core/earth-engine.js` owns the global rotation-only viewpoint snapshot and tracks Engine globe groups by the effective active-view owner from `LiveEarthOrbSystem`.
- The active owner identity is `primary:<id>` or `secondary:<id>`.
- The Engine captures the outgoing group's normalized quaternion on `live-earth-view-transition`, and applies the saved quaternion to the incoming group's existing or newly created Engine group.
- The persisted key is `liveEarthGlobalViewpointV1`; older Home-only keys are accepted as migration inputs.
- `pagehide` captures the active Engine group.
- Existing Stacks overlays without a dedicated Earth group resolve to the persistent Home Earth group. A Secondary view that creates its own Engine globe registers its own group.
- The transferable state is only `{x, y, z, w}`. Camera, zoom, scene, renderer, lighting, Earth surface-child rotation, feature layers and Moon state are not part of the viewpoint snapshot.
- `EarthEngine/Core/earth-viewpoint-bridge.js` remains a legacy compatibility/migration module. Current views are expected to rely on the Engine-owned lifecycle, not individual view-specific publish/apply calls.

## Existing regression coverage

- `Tests/earth-viewpoint-bridge.test.cjs` covers migration, owner transitions, automatic viewpoint application to newly created Engine groups, Secondary view behavior, quaternion-only persistence, and no camera/zoom or per-view bridge calls.
- `Tests/earth-view-drag-orientation.test.cjs` covers the previously corrected first-drag orientation snap when yaw crosses the Euler branch boundary.
- `Tests/earth-modes-surface-alignment.test.cjs` covers Engine-owned rotation and canonical surface alignment.
- `Tests/moon-earth-isolation.test.cjs` protects Earth transform isolation from Moon orbit updates.
- `Tests/earth-engine-view-separation.test.cjs` protects Home/Earth Engine ownership and Home fixed-zoom separation.

The automated regression workflow passed on the current inspected HEAD (run `42514084234`). These tests are not a substitute for reproducing the current viewpoint symptom on the actual app/device.

## Next diagnostic sequence

1. Capture the exact visible symptom and the navigation sequence that triggers it.
2. Identify the active owner before transition, the expected incoming owner, and which Engine group is expected to retain/apply the orientation.
3. Inspect current source and the affected controller/caller on `main`; do not assume the earlier V122–V128 corrections are still the cause.
4. Reproduce the problem with a focused test before changing code.
5. Patch only the failing ownership/transition/rotation path. Preserve Home's fixed zoom, camera/framing, shared Engine group contracts, Moon isolation, independent Sun/Moon views and Global Orb lifecycle.
6. Run the full regression workflow, package only changed files plus any required docs, then have the owner upload the ZIP and verify the resulting Actions run, commit and app behavior.

## Status

**Known:** source and tests currently define a quaternion-only, Engine-owned viewpoint lifecycle; regression workflow passed.  
**Unknown:** the precise current user-visible viewpoint defect and its reproduction steps.  
**Not done:** no viewpoint code was changed and no diagnosis is claimed in this checkpoint.
