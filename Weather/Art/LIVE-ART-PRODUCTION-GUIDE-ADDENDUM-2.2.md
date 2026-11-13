# LIVE // EARTH — Weather Live Art Production Guide Addendum 2.2

**Applies to:** `Weather/Art/LIVE-ART-PRODUCTION-GUIDE.md`  
**Status:** Binding creative/technical direction for new stroke-based artwork revisions  
**Date:** 13 November 2026  
**Scope:** Artwork authoring, stroke representation, Replay pacing, and the Clear Maple Pavilion revision

This addendum supplements the main Weather Live Art Production Guide. It does not replace the established 10:7 canvas, warm-paper identity, approved palette, negative-space principles, or approved artwork masters. Where this addendum conflicts with the older filled-contour path workflow, this addendum governs new stroke-based artwork. Existing version-1 assets remain readable and unchanged until a separately tested renderer upgrade is approved.

## 1. New mark-making rule: one record equals one brush gesture

The artwork must look as though a human artist painted it deliberately, one continuous brush movement at a time. A stroke starts at a meaningful point, travels along a coherent route, changes pressure naturally, and lifts at a meaningful endpoint.

- One authored stroke is one continuous gesture with one start and one end.
- Do not split a single branch, roof edge, mountain ridge, or other continuous line into many arbitrary fragments.
- Do not combine unrelated marks into one path merely to reduce the count. The brush must not teleport between objects.
- Lift and begin a new stroke when the artist would naturally lift the brush: a separate leaf, another roof line, a bird, a blossom, or a distant ridge.
- A branching structure may require several gestures because a physical brush stroke cannot fork into two independent arms without retracing.
- The stroke path should follow a centreline. It must not be represented as a stack of tiny filled polygons or a dense set of disconnected contour fragments.

## 2. Pressure, thickness, and taper

Every stroke must have its own visual intent. Width is not one global constant.

- **Structural strokes:** broad, confident, flowing gestures for trunks, primary branches, and major silhouettes.
- **Object-defining strokes:** medium pressure for roof lines, pavilion supports, bell forms, mountain ridges, and larger leaf shapes.
- **Atmospheric strokes:** delicate, restrained marks for distant lines, grasses, birds, water, and tiny accents.
- Vary pressure along the stroke. A stroke may begin lightly, gain pressure through its body, then release into a fine taper.
- Use rounded or brush-shaped ends only where the gesture calls for them; avoid uniform mechanical caps.
- Avoid drawing the entire object as a closed filled shape. The visible mark should come from the brush's centreline and pressure profile, with dry-brush texture used selectively.
- Keep the warm paper visible between marks. Negative space is a deliberate part of the composition.

## 3. Stroke data contract for the next renderer

The current production renderer accepts `schemaVersion: 1` / `ordered-ink-wash-paths`. It treats each path as a closed filled contour and does not consume pressure, named stages, or per-stroke timing. Changing only the old JSON records will not create authentic brush gestures.

The next renderer revision must introduce a versioned stroke format, for example:

- `schemaVersion: 2`
- `renderMode: "ordered-pressure-strokes"`
- each stroke has a stable `id`, `stage`, `role`, `color`, `widthClass`, `opacity`, `points`, and a timing weight;
- each point carries normalized `x`, `y`, and pressure in a documented 0–1 range;
- stroke order is the Replay order; never sort by colour or object after authoring;
- support natural interpolation/smoothing and variable-width brush outlines;
- render a partial stroke along its centreline from beginning to end, not as a partial outline of a closed filled contour;
- preserve schema-version-1 support while version-2 is introduced and tested.

Do not ship a version-2 artwork until the renderer validates its schema, draws complete and partial strokes correctly, replays in order, handles resize/reduced-motion/offline states, and passes the Weather Live Art regression tests. The old renderer must never be pointed at a version-2 asset.

## 4. Animation rhythm: slow, deliberate, and unequal

Replay is a painting process, not a race through a path counter.

- The initial target for the Clear Maple Pavilion study is **75 seconds** for the full painting, subject to device testing and review.
- Give structural strokes more time than tiny leaves, blossoms, or finishing marks.
- Derive timing from stroke length, pressure changes, and visual importance. Do not give every stroke an equal time slice.
- Add brief, intentional pauses between major stages so the viewer can register the composition.
- Avoid simultaneous bursts of unrelated marks. One gesture should normally complete before the next begins.
- Respect reduced-motion preferences and existing Replay controls.

A slower replay must still feel fluid. Do not create a choppy stop-start animation or hold every tiny mark for an identical delay.

## 5. Clear Maple Pavilion — 90% composition revision

The supplied Clear composition is reduced to **90% of its original overall size**, centred on the same 10:7 canvas. The artwork keeps its original relative proportions, subject placement, palette, and asymmetry. The additional paper margin is intentional. Do not crop, stretch, or rearrange the scene to achieve this scale.

For normalized 1000 × 700 coordinates, apply the same centred transform to every point:

- `x_new = 500 + 0.90 × (x_old − 500)`
- `y_new = 350 + 0.90 × (y_old − 350)`

The visual reference preview is `References/clear-maple-pavilion-002-90pct-preview.png` (1200 × 840 px). It is a composition proof, not a replacement for the approved source master.

## 6. Clear Maple Pavilion — 63-gesture planning target

Use **63 meaningful gestures as the initial design target**, not as a quota that overrides natural drawing. The approved first-pass breakdown is:

| Stage | Gestures | Intent |
|---|---:|---|
| Maple trunk and branches | 7 | One flowing trunk gesture, then distinct connected branch gestures |
| Maple leaves and falling leaves | 12 | Individual deliberate leaf marks, not tiny contour fragments |
| Pavilion roof and structure | 7 | One gesture per roof line or structural line |
| Wind chime and charm | 5 | Hanging line, bell forms, connector, and charm outline |
| Sun and sky details | 4 | Circular sun gesture and a few restrained atmosphere marks |
| Birds | 2 | One continuous gesture per bird |
| Mountain and distant landscape | 4 | Each major ridge/horizon line as its own sweep |
| Foreground bank, grasses, and rocks | 8 | Main ground contour, selected grass gestures, rock outlines, and ground accents |
| Flowering twig | 9 | Main stem, branch gestures, and selected blossom accents |
| Water and finishing accents | 5 | A few deliberate surface/ripple marks |
| **Total** | **63** | **Initial intended gesture count** |

The detailed intent ledger is `Plans/clear-maple-pavilion-002-stroke-intent.json`. It is a planning document, not renderable path geometry. The centreline coordinates and pressure samples still need to be authored and reviewed before the new runtime asset can be built.

## 7. Preservation and approval

- Preserve `clear-weather-master-001.jpg`, `clear-weather-path-preview-001.png`, and `clear-maple-pavilion-001.json` unchanged.
- Keep the 90% composition as a new revision/reference; do not overwrite the approved master.
- Rain remains the style benchmark for restraint and elegance, not a source to copy scene details from.
- Do not alter the Weather view layout, 10:7 card, portrait layout, typography, catalogue selection, or unrelated app views as part of this art revision.
- The 90% preview and intent ledger do not constitute a live runtime deployment. The new pressure-stroke geometry, renderer support, catalogue wiring, and tests must be completed and reviewed before enabling it in the app.
