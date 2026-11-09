# LIVE // EARTH — Residents 3D Shared-Play Refinement

**Date:** 9 November 2026  
**Baseline:** v138 — procedural residents restored and confirmed on the user's iPhone  
**Scope:** `Residents/resident-3d-engine.mjs`, one focused regression test, and this note.

## What changed

The ordinary Weather **Evening play** preview now has a coordinated three-person ball interaction. Red passes to the little lady, she returns it to Blue, and Blue sends it back to Red. The path is calculated from each resident's responsive `baseX`, so it follows the existing layout instead of relying on fixed screen coordinates. The ball stays near foot level and eases between residents, with a short receive/pause beat at each stop.

Each resident reacts with a small inside-foot tap and follows the ball with their gaze. The red hoodie boy's touch is the most energetic, the lady's movement is lighter, and the blue jacket boy has a gentler, curious return. The shared friendly pose and established identities remain intact. The play gait is softened so the pass reads clearly rather than looking like three residents marching in sync.

## Preserved boundaries

- All three procedural models, faces, hair, clothes, colours, accessories, relative scale and original identities.
- Weather screen layout, resident preview controls, forecast data and normal activity-preview behavior.
- Existing activity IDs and all non-play motion branches.
- Shared Three.js runtime, same-origin imports, reduced-motion handling, responsive positions and existing frame-rate ceiling.
- No new textures, external models, libraries, network calls, workflow changes, database changes or service-worker changes.

The patch replaces only `Residents/resident-3d-engine.mjs` and adds `Tests/resident-3d-play-interaction.test.cjs` plus this documentation note. It does not replace or modify the existing Residents refinement or engine-contract tests.

## Verification

The focused test checks the three-leg pass sequence, direction, endpoint receive beats, responsive actor-position use and foot-level ball height. Run:

```sh
node --check Residents/resident-3d-engine.mjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-3d-engine-contract.test.cjs
```

Local checks do not prove the deployed iPhone animation. After the user uploads and commits the ZIP, verify the extractor workflow and deployment, then inspect Weather → Residents Preview → Evening play on the iPhone. Confirm that the ball travels Red → Lady → Blue → Red, that the movement remains smooth at the narrow phone viewport, and that changing to another preview option still behaves as before.

## Rollback

Restore the previous v138 `Residents/resident-3d-engine.mjs`. No other existing file needs to be reverted.
