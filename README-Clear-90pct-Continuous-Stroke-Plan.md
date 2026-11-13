# Clear Weather — 90% Composition & Continuous Brush Plan

This bundle stages the next Clear Maple Pavilion art revision without overwriting the currently approved art.

## Included

- `Weather/Art/References/clear-maple-pavilion-002-90pct-preview.png` — 1200 × 840 visual preview with the full composition scaled to 90% and centred on a 10:7 paper canvas.
- `Weather/Art/LIVE-ART-PRODUCTION-GUIDE-ADDENDUM-2.2.md` — binding amendment defining one continuous gesture per stroke, pressure/taper, weighted Replay pacing, and renderer requirements.
- `Weather/Art/Plans/clear-maple-pavilion-002.md` — Clear revision composition and ordered 63-gesture plan.
- `Weather/Art/Plans/clear-maple-pavilion-002-stroke-intent.json` — machine-readable 63-stroke intent ledger. Geometry is deliberately marked PENDING.

## Important — not a live runtime deployment

This is a reference and authoring package, not a deployable Weather Live Art runtime update. The current app renderer and `clear-maple-pavilion-001.json` remain unchanged. The current renderer supports closed, filled version-1 contours, not the requested continuous pressure-sensitive brush strokes. A backward-compatible version-2 renderer, 63 actual centreline paths with pressure samples, catalogue wiring, and regression tests are still required before the revised painting can be enabled in the app.

## Preservation

Do not overwrite or delete:
- `Weather/Art/clear-maple-pavilion-001.json`
- `Weather/Art/References/clear-weather-master-001.jpg`
- `Weather/Art/References/clear-weather-path-preview-001.png`
- either approved Rain artwork or its data

## Suggested commit title when the final runtime implementation is ready

`Create Deliberate Continuous-Stroke Clear Weather Artwork`
