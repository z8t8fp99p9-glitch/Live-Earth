# LIVE // EARTH — Sun/Moon View Separation

Date: 6 November 2026

## Package contents
- `sun-view-renderer.js` — standalone Sun View renderer generated from the uploaded Sun conversion adapter and the matching Moon controller source.
- `UPLOAD_MANIFEST.json` — exact file sizes and SHA-256 checksums, plus the suggested GitHub commit title.

## What changed
The Sun renderer is now a static implementation. It no longer fetches `moon-view-controller.js`, transforms Moon source at runtime, or depends on Moon/Lunar identifiers. Sun-specific solar calculations, renderer lifecycle, Arc/scroller behaviour, sunrise/sunset endpoint artwork and amber styling are contained in the Sun file.

## What remains shared
The existing `#le-sky-view` stage and `window.LiveEarthViewModules` registry remain the shared integration points. Global Orb behaviour and all other protected files are outside this package and are not changed.

## Upload instructions
Upload the ZIP contents to the repository root, allowing the existing extraction workflow to replace only `sun-view-renderer.js` and add this note and manifest. Do not replace or edit the shared sky controller, Orb controls, view manager, Moon controller, update manager, service worker, HTML entry point, or any other view files.

## Validation performed
- JavaScript syntax checked with `node --check`.
- Static checks confirm no Moon/Lunar text, no `fetch(`, no Moon controller path, and presence of the shared stage/registry, Sun module handoff, solar calculations, Arc/scroller sparkle functions, and separate sunrise/sunset icon artwork.

## Validation not performed
No live browser/device runtime test or GitHub Actions/deployment verification has been performed in this package build. Those should be checked after the user uploads the package.

## Suggested GitHub commit title
`Separate Sun View renderer from Moon View implementation`
