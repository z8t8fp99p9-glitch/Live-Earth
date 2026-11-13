# LIVE // EARTH — Clear Maple Pavilion 002 Runtime Patch

This ZIP is a runtime implementation patch for Weather Live Art.

## What it changes
- Adds backward-compatible `schemaVersion: 2` support for `ordered-pressure-strokes` in `Weather/Art/live-art-online.js`.
- Preserves the existing schema-version-1 closed-contour renderer for Rain and legacy artworks.
- Adds the actual 63-stroke continuous-centreline Clear asset, with pressure/taper profiles, a centred 90% composition, and a 75-second weighted Replay with stage pauses.
- Updates the active Weather catalogue to select Clear 002 while keeping Rain on its existing asset.
- Adds the production-guide and machine-readable direction Addendum 2.3.
- Replaces the earlier Clear 002 PENDING intent ledger with a runtime-ready 63-gesture index tied to the actual centreline asset.
- Adds a regression test for schema-v1 compatibility, schema-v2 validation, catalogue routing and ordering.

## Install
Extract this ZIP at the repository root, preserving the `Weather/` and `Tests/` folders. Do not rename paths. The package does not commit to GitHub; use the established ZIP upload/extractor workflow.

## Protected source files
The ZIP intentionally does not include or replace `clear-maple-pavilion-001.json`, `clear-weather-master-001.jpg`, the original Rain JSON, or Weather layout/forecast files. The new catalogue retains Rain's existing ID and data path.

## Validation already performed
- JavaScript syntax check: `node --check Weather/Art/live-art-online.js`
- Stroke asset and compatibility regression: `node Tests/weather-art-pressure-strokes.test.cjs`
- JSON parse, 63 unique ordered gestures, coordinate/pressure bounds, and 90% transform checks.
- Preview generated from the same centreline and pressure samples consumed by the new renderer.

## Commit title
`Implement Continuous Brush Strokes for Clear Weather Live Art`

## Device verification
After extraction/deployment, open Weather with Clear selected and Replay. The expected status is `PAINTING · 01 / 63` through `PAINTING · 63 / 63`, then `FINISHED`. Rain should continue to show its existing legacy path count and remain visually unchanged. Device rendering, GitHub deployment, and app cache/extractor behaviour still require your normal post-upload verification.
