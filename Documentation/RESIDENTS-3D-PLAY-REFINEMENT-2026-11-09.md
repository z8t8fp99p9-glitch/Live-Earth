# LIVE // EARTH — Residents 3D Evening Play Refinement v140

**Date:** 9 November 2026  
**Baseline:** v139 — three-way shared ball interaction on `main`  
**Scope:** `Residents/resident-3d-engine.mjs`, the focused play regression test, and this note.

## Refinements

- Replaced the inward reaching/waving posture with relaxed, bent-elbow balancing gestures. The characters no longer read as holding hands while playing.
- Added a visible contact beat before the ball leaves the passer, followed by a smooth flight and a clear receiving pause.
- Distinguished the receiving touch from the outgoing kick and selected the appropriate inside foot for each role.
- Kept the ball close to ground level with only a soft lift during travel.
- Preserved the responsive actor-position path and the existing gentle play gait.

## Preserved boundaries

All three procedural models, faces, hair, clothing, accessories, colors, relative scale and identities remain unchanged. Weather layout, forecast, preview controls, activity IDs, all non-play modes, same-origin Three.js runtime, reduced-motion behavior, frame-rate ceiling, offline behavior, databases, service worker, orbs, Home, Earth, Moon and Sun systems are untouched. No new textures, external models, libraries, network calls or workflow changes.

## Verification

Run:

```sh
node --check Residents/resident-3d-engine.mjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-3d-engine-contract.test.cjs
```

The focused regression test checks the contact-before-flight timing, all three pass directions, receive pauses, appropriate foot roles, low ball path, natural arm pose and responsive spacing. Local tests do not prove the deployed iPhone animation. After upload/extraction/deployment, inspect Weather → Residents Preview → Evening play on the iPhone and verify that the ball passes Red → Lady → Blue → Red, hands stay apart, and other preview modes remain unchanged.

## Rollback

Restore the v139 `Residents/resident-3d-engine.mjs` to revert this refinement. No other existing file needs to be reverted.
