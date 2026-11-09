# LIVE // EARTH — Residents 3D Refinement

**Date:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Scope:** `Residents/resident-3d-engine.mjs` only, plus a focused test and this note.

## Refinement

The first procedural 3D build remains the baseline. This refinement preserves the three established residents and all existing Weather activity IDs while improving the model detail and animation rig:

- Smoother shared mesh geometry and a shared material palette reduce duplicate GPU resources.
- Faces gain layered eyes, irises, pupils, catchlights, brows, ears, cheeks, freckles and a shaped smile. Blinks remain staggered per character.
- Hair is built from layered locks and curls, with subtle movement independent of the head.
- Hands now have palms, four fingers and thumbs. The rig separates shoulder, elbow, wrist, hip, knee, ankle and foot.
- Shoes gain soles, toe caps and visible laces; the lady retains her brown boots, chestnut bob, denim pinafore and satchel. The red hoodie and blue jacket remain distinct.
- Walking and play use alternating leg swing, knee flex, counter-swinging arms and foot/ankle response. Weather-specific movements remain character-specific rather than synchronized.
- Umbrella, scarf, fan, kite and watering-can offsets are reset before each pose so switching preview modes cannot leave an accessory stuck in a previous activity.

## Runtime boundaries

The engine continues to import the app's existing same-origin `vendor/three.module.js`. It adds no external model downloads, GLB/GLTF assets, extra renderer or new service-worker shell dependency. The renderer remains alpha-transparent, low-power, capped at approximately 30 fps, reduced-motion aware and disposed when Weather deactivates.

The primitive geometries and palette materials are shared module resources; per-scene geometries are disposed at unmount, while shared cached resources remain alive for the next Weather visit. This avoids remounting with already-disposed cached geometry.

## Verification

`node --check Residents/resident-3d-engine.mjs` and `node Tests/resident-3d-refinement.test.cjs` pass. These are source/syntax checks. A real iPhone WebGL visual pass, movement review, and performance check remain required after the ZIP is uploaded. No claim is made that those device checks have already passed.

## Protected boundaries

No Weather layout, forecast or Location behaviour, Residents preview controls, Global Orb, Home/Earth Engine, Moon, Sun, Stacks, service-worker build identity, update-manager build identity or database code is changed by this patch.
