# LIVE // EARTH — Residents 3D realism pass v148

Date: 2026-11-10
Base: deployed v147 / current `main` Residents 3D engine

## Goal
Move the three Residents toward a more natural, professionally sculpted stylized-3D finish while preserving their recognizable childlike identities, hair, clothing, accessories, roster, activity definitions, and shared animation rig.

## Model changes
- Added a dedicated vertex-colour face skin material. Low-contrast warmth is blended into the head geometry around both cheek planes, replacing the separate pink cheek discs.
- Preserved the existing sculpted jaw and continuous lathed nose, iris ring, eyelids, and face expression controls.
- Slightly eased the head-to-body ratio from 0.985 to 0.965 without changing overall character scale or camera framing.
- Reduced the visible spherical shoulder, elbow, hip, knee, and ankle caps while retaining the existing capsules and animation pivots.
- Made shoe uppers less glossy with a more natural matte roughness.
- Adjusted the existing hemisphere/key/fill/rim balance toward a little more form definition, without enabling shadow maps or increasing renderer resolution / frame rate.

## Protected behaviour
- No roster, character identity, hairstyle, clothing colour, accessory, or activity ID changes.
- No changes to the shared Residents Activity Framework, activity timing, Weather UI, Location, Home, Moon/Sun, or app shell.
- Existing same-origin Three.js dependency, low-power renderer, 30 fps ceiling, reduced-motion handling, and resize lifecycle are preserved.
- New face material is included in shared cache retention so it survives Weather view remounts.

## Verification
- `node --check Residents/resident-3d-engine.mjs`
- `node Tests/resident-3d-natural-form.test.cjs`
- `node Tests/resident-3d-wardrobe-accessory.test.cjs`
- `node Tests/resident-3d-rain-umbrella.test.cjs`
- `node Tests/resident-3d-model-realism.test.cjs`
- ZIP manifest sizes and SHA-256 entries generated from final payloads.

These are source-level and regression checks. Final material appearance must still be inspected on the iPhone after upload/deployment, especially the face blush at small preview scale and side-profile transitions.
