# LIVE // EARTH — Residents Library 1.3.0

**Prepared:** 9 November 2026  
**Base:** `main` at `44f780c0bea48bb48ad795bc18b366adca8393c7`

## Cast and rendering

The shared Residents library now renders the established three-character cast from transparent WebP artwork: the red-hoodie boy, the little lady (cream blouse, denim pinafore and brown satchel/boots), and the blue-jacket boy. The existing resident IDs and scene positions remain stable: `one` (left), `two` (centre), `three` (right). The artwork is held in `Residents/assets/`; `resident-library.js` remains the single owner of the roster, asset paths, movement and weather props.

The images are display sprites, not rigged 3D meshes. Existing CSS movement animates each complete figure as a lightweight 2.5D character. No Three.js character renderer, canvas layer, video or model runtime is introduced. Each WebP is 640 pixels high and transparency-preserving.

## Weather activity mapping

- Fair dawn: red-hoodie boy moves energetically, the little lady follows the butterfly, and the blue-jacket boy stretches.
- Rain: the two boys carry umbrellas; the little lady enjoys the rain.
- Snow, heat, wind, play and stargazing continue to be selected by the existing forecast-state logic. Strong-gust lift remains assigned to the rightmost blue-jacket boy.

Weather continues to mount/unmount the library through its existing lifecycle. Only the resident-library version contract changes to `1.3.0`; the Weather forecast calculations, Location privacy behaviour, scene, Orb system and other views are untouched.

## Offline and verification

The three images are same-origin resources referenced from SVG `<image>` nodes. They use the existing service worker's bounded optional-resource cache, so successful online retrieval makes them reusable offline without changing the essential shell, cache identity or update manager. The focused Residents test now verifies all three sprite paths, the cast identities, activities and lifecycle.
