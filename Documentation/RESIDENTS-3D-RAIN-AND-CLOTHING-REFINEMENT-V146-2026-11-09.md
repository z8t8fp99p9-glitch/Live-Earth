# LIVE // EARTH — Residents 3D Rain and Clothing Refinement v146

Date: 2026-11-09  
Baseline branch: `main`  
Baseline commit: `eca6955b235008b72ffab90937262216f7b135c4`  
Baseline engine blob: `27f77430acc808435e88f94b733fe9e3a7785dbd`  
Package: `Residents-v146.zip`

## Scope

This is a narrow visual-model refinement. It changes only the Residents 3D engine and focused umbrella/wardrobe regression tests. It does not change the Residents library contract, character roster, Weather view, weather data, activity catalog, shared activity framework, or non-Residents systems.

## Changes

- Rebuilt the held umbrella around a palm-origin shaft extending along the forearm toward the canopy crown.
- Flipped the hemisphere so its crown points away from the hand and made the material double-sided so the underside remains visible from the low, front-facing Weather camera.
- Added eight curved underside ribs, a defined canopy rim, a crown cap, and a palm-side hook grip.
- Adjusted the Rain pose to lift the right arm more vertically with a small in-plane elbow bend and less wrist sway. Little Lady remains the rain dancer; Red Hoodie Boy and Blue Jacket Boy hold umbrellas.
- Replaced Little Lady's square pinafore straps with softly rounded denim straps and softened the collar trim.
- Simplified Blue Jacket Boy's front trim to one fitted cream panel, cleaner navy piping, a single zipper line and a rear hood lining; removed the extra crossing decorative strokes.

## Protected details

- Red Hoodie Boy, Little Lady and Blue Jacket Boy identities and their signature outfits remain intact.
- Hair, faces, body dimensions, roster names, accessories outside this targeted Rain/wardrobe adjustment, animation rig, activity definitions, and shared movement framework are preserved.
- The existing low-power renderer settings, 30 fps ceiling, reduced-motion behavior, and disposal lifecycle are unchanged.

## Verification

- All 9 Residents test suites passed locally.
- JavaScript syntax checks passed for `resident-3d-engine.mjs` and `resident-library.js`.
- Added a focused canopy/shaft alignment assertion, including a computed check that the shaft endpoint meets the canopy crown.
- ZIP manifest SHA-256 entries and archive integrity were verified after packaging.

These are local source/test checks. v146 has not yet been uploaded to GitHub or verified on the iPhone. The deployed, device-confirmed rollback baseline remains v145 until the user uploads and tests v146.

## Upload

Keep `UPLOAD_MANIFEST.json` at the ZIP root and upload the ZIP using the established repository extractor workflow. Suggested commit title: `Refine Residents Rain Umbrellas and Clothing Details`.

No direct GitHub write was performed while preparing this package.
