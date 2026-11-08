# LIVE // EARTH — Engine-Owned Quaternion Viewpoint

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Source baseline:** `ffa3a17cc096627db155504177e51a110305f9e4`

## Current contract

- `EarthEngine/Core/earth-engine.js` is the single owner of the global quaternion viewpoint and view-transition lifecycle.
- The transferable state is only `{x, y, z, w}`. Cameras, zoom, scenes, renderers, surface-child alignment, feature layers and Moon state are never transferred.
- `live-earth-view-transition` captures the quaternion from the exact outgoing owner before cleanup. The owner named in the event is authoritative; the Engine does not prefer a potentially stale cached active-group pointer.
- `live-earth-view-changed` applies the saved quaternion to the incoming registered group immediately. If the incoming group is created asynchronously after the event, its registration applies the current snapshot before it is used.
- The sole persisted key is `liveEarthGlobalViewpointV1`. Old Home-only V3/V2/V1 data is not read or migrated.
- Home uses `earthGlobe.attachInteractions()` from the Engine. Its camera framing stays fixed and `zoom.enabled` remains false. Drag rotation is quaternion-only; Home has no direct Euler X/Y drag writes.
- Independent Earth View uses the same Engine interaction controller and keeps its own camera and pinch-zoom adapters.
- Stacks overlays without their own Earth group reuse the persistent Home Earth group.

## Retired components

- `EarthEngine/Core/earth-viewpoint-bridge.js` has been deleted.
- `Tests/earth-viewpoint-bridge.test.cjs` has been replaced by `Tests/earth-engine-viewpoint.test.cjs`.
- The old bridge was removed from the Service Worker app shell. The shell cache identity was advanced so clients do not retain the prior app-shell contract.
- The Engine no longer reads `liveEarthHomeViewpointV3`, `liveEarthHomeViewpointV2`, or `liveEarthHomeViewpointV1`.

## Verification

The focused regression test verifies legacy V3 is ignored, the Engine persists and applies only normalized quaternions, the outgoing owner's exact group is captured, incoming Home receives the outgoing pose synchronously, and Home uses the Engine interaction path with locked zoom. The broader regression suite must pass before upload. Installed-device confirmation is still required to verify the observed multi-second delay is eliminated.

## Protected boundaries

No Home camera, framing, star field, Moon orbit/path, Location marker state, lighting ownership, orb presentation or independent Sun/Moon controller is changed by the viewpoint cleanup. The assistant prepares a root ZIP only; the owner uploads it through the repository's ZIP extractor.
