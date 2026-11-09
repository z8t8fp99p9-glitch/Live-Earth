# LIVE // EARTH — Residents 3D Model Appearance Refinement v143

**Date:** 9 November 2026  
**Baseline:** v142 render recovery on `main` (`86d76868f6799ea32ea32c389e5ea1c9f83291f7`)  
**Scope:** `Residents/resident-3d-engine.mjs`, one appearance regression test, and this note.

## Purpose

This pass focuses on the three procedural 3D character models themselves, not their activities. The goal is to make their existing forms read as more dimensional, softly sculpted and naturally shaded while keeping the established friendly character style.

## Model refinements

- Replaced the plain head ellipsoid with a softly deformed head surface: a gentle jaw taper and subtle cheek fullness, with recomputed vertex normals.
- Replaced the round torso base with a smooth lathed shoulder-to-waist profile, retaining the existing normalized dimensions and breathing animation scale.
- Refined facial depth: smaller integrated eyes, subtle upper/lower eyelid contours, a shaped nose bridge and tip, quieter blush, and more softly drawn lips.
- Added curved strand contours to the existing hair silhouettes and a finer ear helix/inner-ear form.
- Changed fingers and thumbs from separate bead-like ellipsoids to rounded capsule forms while preserving the current arm/wrist rig.
- Adjusted material roughness toward softer skin, hair and fabric response; shoes retain a slightly more finished surface.
- Added two soft contact-shadow layers and a subtle three-quarter stance to help the models sit in the environment and reveal depth.
- Kept the existing low-power renderer, 30 fps ceiling, device-pixel-ratio cap, shared geometry/material cache, and local Three.js runtime.

## Protected design and systems

The Red Hoodie Boy, Little Lady and Blue Jacket Boy remain the same three identities. Their signature hair, face style, red hoodie, denim pinafore with cream blouse and satchel, blue jacket, colors, relative scale and accessory designs are preserved. No activity IDs, movement logic, Residents library API, Weather layout, forecast, preview controls, or unrelated app systems are changed. No external model, texture, dependency, network call, database, service-worker, offline, Home, Earth, Moon, Sun or orb changes are included.

## Verification

Passed locally:

```sh
node --check Residents/resident-3d-engine.mjs
node Tests/resident-3d-animation-order.test.cjs
node Tests/resident-3d-appearance.test.cjs
node Tests/resident-3d-play-interaction.test.cjs
node Tests/resident-3d-refinement.test.cjs
node Tests/resident-activity-framework.test.cjs
```

The existing `resident-3d-engine-contract.test.cjs` was reviewed but could not be executed from the focused v142 patch snapshot because that snapshot does not include `Residents/resident-library.js`; the library is unchanged by this patch. Run it from the full repository after extraction.

Local tests do not replace device verification. After the user uploads and deploys the ZIP, inspect Weather → Residents Preview on the iPhone at the normal page scale. Check all three faces, hair silhouettes, arm/hand joins, clothing edges, relative scale, framing and smoothness. Also switch through the existing preview activities to confirm the visual model changes have not affected animation or accessory behavior.

## Rollback

Restore the v142 `Residents/resident-3d-engine.mjs`. No other application file needs to be reverted.
