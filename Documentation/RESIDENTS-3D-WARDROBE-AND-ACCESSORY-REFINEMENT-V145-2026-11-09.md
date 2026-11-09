# LIVE // EARTH — Residents 3D Wardrobe & Accessory Refinement v145

**Date:** 9 November 2026  
**Baseline:** v144 — device-confirmed sculpted hair and clothing  
**Scope:** `Residents/resident-3d-engine.mjs`, one focused regression test, and this note.

## Why this refinement

The v144 device screenshots showed two remaining presentation problems: the Little Lady's pinafore bib and Blue Jacket Boy's cream jacket insert appeared to intersect the torso at some edges; rain umbrellas looked detached above the boys' heads; and snow hats did not move as part of the head.

## Changes

- Replaced the width-only parabolic clothing warp with a fitted torso-front surface function. It interpolates the same shoulder-to-waist radius profile as the shared torso mesh and places each panel using both its X and Y coordinates.
- Reduced panel thickness and bevel size so the Lady's denim bib and Blue Jacket Boy's cream jacket insert read as fitted layers rather than thick floating plates.
- Kept the shaped pinafore skirt and the existing blue/cream clothing designs.
- Parent-mounted rain umbrellas to each character's right palm. The Red and Blue characters now raise their right arms into a holding pose, while the Lady retains her rain-dance role.
- Parent-mounted snow cap, brim and pom-pom to each character's head so the winter accessory follows head movement. Reduced the scarf volume so it sits closer to the neck.
- Moved the shoulder pivot slightly inward to increase overlap with the torso and soften the arm-to-body join.

## Preserved boundaries

All three permanent identities, facial designs, v144 hair geometry, colors, clothing identity, satchel, badge, ball interaction, shared activity framework, activity IDs, Weather layout and forecast behavior remain intact. The renderer still uses the same local Three.js module, low-power preference, existing pixel-ratio cap, reduced-motion preference and existing render lifecycle. No external assets, network requests, additional libraries, or application-wide changes.

## Verification

- `node --check Residents/resident-3d-engine.mjs`
- All eight `Tests/*.test.cjs` suites pass.
- The new wardrobe/accessory regression test executes the torso surface mapping and checks fitted bib/jacket panels, hand-mounted umbrellas, rain holding pose, head-mounted snow accessories and preserved model/runtime contracts.
- ZIP manifest sizes and SHA-256 hashes verified.

Local tests cannot prove the final appearance on the deployed iPhone. After upload/extraction/deployment, inspect Weather → Residents Preview in Evening Play, Rain and Snow. In Rain, confirm the two boys hold umbrellas in their raised right hands and the Lady still dances. In Snow, confirm caps stay seated on their heads. Check the Lady's bib and Blue Jacket Boy's cream panel from the front and a slight side angle.

## Rollback

Restore the v144 `Residents/resident-3d-engine.mjs`. No other existing file needs to be reverted.
