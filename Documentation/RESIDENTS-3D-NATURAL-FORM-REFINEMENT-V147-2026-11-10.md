# LIVE // EARTH — Residents 3D Natural Form Refinement v147

Date: 2026-11-10  
Baseline: v146 on `main`  
Scope: `Residents/resident-3d-engine.mjs` only, plus focused regression tests and this note.

## Purpose

The v146 device screenshots confirmed that the three Residents render in all tested scenes, but their appearance still read as assembled toy-like pieces. This pass improves the continuity of the forms and the response of skin surfaces while preserving their established stylized identity.

## Model refinements

- Added a dedicated, cached skin material with a very restrained clear-coat response and soft roughness. Skin materials are included in the shared-resource retention set so they survive a Weather renderer disposal/revisit.
- Replaced the separate spherical nose bridge and tip with one smooth lathed nose profile and smaller nostril shadows.
- Reduced sclera and iris scale slightly and added a fine limbal ring to give the eyes more depth without changing the characters' expression style.
- Softened the visible shoulder, elbow, hand, thigh, knee and ankle volumes. Existing shoulder, elbow, wrist, hip, knee, ankle and foot pivots remain in place for the activity engine.
- Slimmed finger geometry and aligned the sleeve cuff to the forearm's native axis.
- Reduced the head group by 1.5% uniformly; this is a subtle proportion adjustment, not a redesign.
- Replaced festival's glossy pill-shaped confetti with thin paper strips that tumble in three axes.

## Preserved

- Red Hoodie Boy, Little Lady and Blue Jacket Boy identities, faces' overall style, hairstyles, signature clothes, accessories and roster IDs.
- Existing Residents activity IDs, activity framework, poses, timings, interactions and Weather preview contract.
- Existing Three.js same-origin import; no external models, textures, libraries or network dependencies.
- iPhone low-power renderer preference, pixel-ratio cap, 30 fps ceiling and reduced-motion behavior.

## Validation

Passed locally:

- `node --check Residents/resident-3d-engine.mjs`
- `node Tests/resident-3d-wardrobe-accessory.test.cjs`
- `node Tests/resident-3d-rain-umbrella.test.cjs`
- `node Tests/resident-3d-natural-form.test.cjs`
- ZIP integrity, manifest sizes and SHA-256 entries.

These are source-level and focused regression checks. The v147 geometry has not yet been rendered or verified on the iPhone; device validation is still required.

## Deployment and rollback

No GitHub writes were made. v146 remains the device-confirmed rollback baseline. Upload/extract v147 through the existing ZIP workflow; do not upload by manually replacing individual files.

Suggested commit title:

`Refine Residents Natural 3D Form and Surface Detail`
