# LIVE // EARTH — Shared Earth Engine Interactions

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch baseline:** `main` at `95d64872b8e09540cd25f3ab0210ba6f6b69f704`  
**Scope:** Shared default finger gestures and Home return-orientation correction.

## Approved experience

Home remains intentionally simple:

- One Home Earth globe instance created by the reusable Earth Engine.
- Home uses the Engine's shared quaternion rotation gesture.
- Home camera framing and zoom remain locked. Its Engine interaction attaches with `zoom.enabled: false`.
- The existing Home Moon layer and orbital path stay additive under the same Engine group and are not modified by this work.
- The existing five Home Orbs, placement, styling, touch targets and global lifecycle are not modified.

Independent Earth View uses the same Engine gesture implementation, with its own camera-distance adapter and limits. Its Basic/HD controls, plus/minus zoom buttons, Scanner, renderer, scene, camera and visual lifecycle remain view-owned.

## Shared Engine API

`EarthEngine/Core/earth-engine.js` now exposes `earthGlobe.attachInteractions({ ... })` on each Engine-created globe. The existing Engine-owned viewpoint snapshot, active-owner transitions, persistence key and `live-earth-view-transition` / `live-earth-view-changed` lifecycle are unchanged.
The Engine-owned global quaternion lifecycle is the only viewpoint handoff. The retired Home-only bridge file and legacy V3/V2/V1 storage migration are removed from the app shell and runtime.

Defaults:

- One pointer rotates the globe using local-Y yaw and world-X pitch quaternion deltas.
- The pitch is recovered directly from the transferred quaternion; gesture code never reads or writes Euler X/Y.
- Two pointers enter pinch mode. They do not rotate the globe while pinching.
- Pinch zoom is enabled only when the view supplies `zoom.enabled: true`, `getDistance`, `setDistance`, and its own optional min/max distance adapters.
- Views supply their own `enabled` predicate and redraw/interaction callbacks.
- The returned handle supports `reset()` and `dispose()`; disposing the globe also disposes any attached interaction controllers.
- Gesture listeners run in capture phase so an older per-view pointer handler cannot run a second, conflicting rotation path.

## Root-cause correction

The recording showed Earth View rotation transferred successfully, then the first Home touch caused an upside-down snap. The earlier Home Euler drag path was replaced by the shared Engine quaternion controller. Both Home and Independent Earth View now use axis-angle quaternion deltas; neither reads or writes Euler X/Y for user drag rotation.

Both Home and Independent Earth View now delegate pointer rotation to the same Engine implementation. This removes the split Euler/quaternion gesture ownership.

## Files changed in the package

- `EarthEngine/Core/earth-engine.js` — shared Engine interaction controller and `attachInteractions` API.
- `index.html` — Home attaches shared rotation and explicitly disables zoom; legacy Home Euler drag handler removed.
- `Earth/earth-view-controller.js` — attaches the same Engine interactions with Earth View's own pinch-zoom camera adapter and limits; duplicate per-view drag/pinch handler removed. Basic/HD, buttons and Scanner remain.
- `Tests/earth-view-drag-orientation.test.cjs` — expanded regression coverage for yaw beyond 90°, first Home touch, pitch tracking, two-finger zoom limits, and locked Home zoom.

`Home/moon-orbit.js`, Sun, Location, Global Orb files, Moon/Sun controllers, `sw.js`, and `Global/update-manager.js` are intentionally unchanged. All modified runtime paths are already in the current Service Worker app shell; the existing online fresh-sync / offline verified-cache startup contract remains in place.

## Verification boundary

- JavaScript syntax checks passed for the changed Engine, Home inline module, Earth View controller and regression test.
- Focused shared-interaction regression test passed locally, including the first-touch yaw-branch case, bounded pitch, Home pinch lock, and Earth View pinch-distance limit.
- The complete repository regression workflow and actual installed-iPhone retest still need to run after the owner uploads the ZIP. The existing workflow discovers `Tests/*.test.cjs`, so this focused regression test will run in CI.
- Do not claim the on-device issue is fully resolved until the owner repeats: Home → Earth View → rotate past 90° yaw → Home → first touch.

## Protected boundaries

No camera, zoom or renderer is transferred between views. No Moon surface transform, orbit, or path is modified. Home remains fixed zoom, fixed high detail, and uses its existing scene, camera, renderer, solar layer, Location marker, feature layers and five Orbs. Sun/Moon and Global Orb lifecycle remain untouched.

The owner uploads/commits/deploys. The assistant does not write directly to GitHub.
