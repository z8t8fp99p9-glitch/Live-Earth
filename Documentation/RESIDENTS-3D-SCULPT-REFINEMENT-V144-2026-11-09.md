# LIVE // EARTH — Residents 3D Sculpt Refinement v144

**Date:** 9 November 2026  
**Baseline:** v143 character appearance refinement on `main` (`296693812a3039f745bc24df4f48d7bee02e1dd0`)  
**Scope:** `Residents/resident-3d-engine.mjs`, one focused sculpt regression test, and this note.

## Purpose

This is a second appearance pass on the three existing procedural 3D models. It improves connected geometry and the way fabric and hair sit on the characters. It does not change activities, animation timing, the Weather preview layout, the Residents library API, or the character identities.

## Model refinements

- Replaced the boys' clustered round hair pieces with one smooth scalp cap and a smaller set of connected curl ridges. Each raised strand is positioned against the cap surface so it reads as part of the hair rather than a floating bead.
- Rebuilt the Little Lady's bob around the same continuous cap, retaining her chestnut side locks and swept fringe.
- Added a shallow, warm eye-socket transition behind each eye to blend the eyeballs into the face.
- Replaced the Lady's rounded pinafore bib with a curved, beveled fabric panel.
- Replaced the Blue Jacket Boy's inflated cream/navy torso overlays with the existing tailored navy torso plus a shaped, beveled cream front insert. The collar, zip, badge and jacket colors remain.
- Replaced the Lady's straight cylinder skirt with a softly flared lathed shell that includes a returned hem profile.
- Removed the Red Hoodie Boy's separate oval chest overlay so the hoodie reads from the shaped torso and retained seams, drawstrings and kangaroo pocket.
- Preserved the current head and torso scales, limb rig pivots, hair colors/styles, red hoodie, denim pinafore, cream blouse, satchel, blue jacket, badge, footwear, and activity behavior.

## Protected boundaries

No Residents library API, activity IDs, interaction or movement logic, Weather layout, preview controls, forecast behavior, Three.js runtime, device-pixel-ratio cap, frame-rate ceiling, reduced-motion handling, offline behavior, database, service worker, Home, Earth, Moon, Sun or orb system is changed. No external models, textures, packages, network assets or new dependencies are introduced.

## Verification

Passed from a local snapshot of the current v143 repository state:

```sh
node --check Residents/resident-3d-engine.mjs
node Tests/resident-3d-animation-order.test.cjs
node Tests/resident-3d-appearance.test.cjs
node Tests/resident-3d-sculpt.test.cjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-activity-framework.test.cjs
node Tests/resident-3d-engine-contract.test.cjs
```

The engine-contract test was run with the unchanged `Residents/resident-library.js` fetched from the current `main` branch. Syntax validation and all seven test suites passed. The ZIP manifest file sizes and SHA-256 values were also verified.

Local checks do not replace device verification. After upload, extraction and deployment, inspect Weather → Residents Preview on the iPhone at the normal page scale. Check the hair silhouette from the front and sides, face integration, the Lady's pinafore and skirt edges, the Blue Jacket Boy's front insert, proportions, and activity changes. A screenshot confirms the normal view; a short orbit or side-angle recording is needed to judge depth from multiple angles.

## Rollback

Restore the v143 `Residents/resident-3d-engine.mjs`. No other application file needs to be reverted.
