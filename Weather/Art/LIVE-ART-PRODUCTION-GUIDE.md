# LIVE // EARTH — Weather Live Art Production Guide

**Document ID:** `WEATHER-LIVE-ART-ARTIST-ENGINE-001`  
**Version:** 3.1 — active Clear artwork on Rain schema-v1 renderer  
**Status:** Current production standard  
**Scope:** LIVE // EARTH Weather Live Art card only

---

## 1. Active Clear renderer

The active Clear artwork uses the **same schema-v1 `ordered-ink-wash-paths` renderer as Rain**. No new JavaScript renderer is introduced, and the Rain artwork or renderer code is not changed.

Clear is authored as exactly 100 ordered, closed pigment shapes. The renderer progressively traces the boundary of the current path and fills it when that path completes. Completed shapes remain on the canvas while the next path is drawn. The score contains the composition and the complete drawing order; no master image, source illustration, image reveal or stage mask is loaded.

**Technical limitation:** schema v1 is a simple path tracer/filler. It does not simulate dynamic pressure, drawing speed, separate bristles, wet-edge blending or true pigment granulation. Width and taper are authored into each closed path's geometry. Do not describe the active Clear renderer as the schema-v4 bristle engine.

## 2. Clear composition and exact order

The canvas remains 1000 × 700 logical units (10:7). The artwork must be processed in exactly this order, with 100 paths total:

| Stage | Paths | Subject |
|---|---:|---|
| 1 | 1–20 | House / pavilion — thick structural strokes |
| 2 | 21–35 | Tree — thick trunk and main branches |
| 3 | 36–50 | Tree — thin branches and tapered twigs |
| 4 | 51–65 | Distant mountains |
| 5 | 66–85 | Red maple leaves and falling leaves |
| 6 | 86–90 | Birds |
| 7 | 91–100 | Red sun and final details; the sun is painted last |

Preserve the reference composition: pavilion in the lower-left, sweeping maple tree on the left, leaves in the upper-left and upper-middle, wind chime hanging from the branch, distant mountains on the right, birds, and the red sun in the upper-right. Keep open paper; do not add unrelated landscape elements.

## 3. Path construction

- Every JSON path is one authored painting mark represented by a closed polygon.
- The polygon's outline carries its width, direction, taper and silhouette. It is not a centreline that relies on renderer-side pressure simulation.
- Use the palette for black ink, diluted mountain ink, warm paper-compatible neutrals and maple vermilion.
- Keep tree and pavilion structure bold; keep branches, birds, mountain contours and wind-chime details thin.
- Maple leaves should read as pointed maple forms, not generic round petals.
- The sun is the final subject and should read as a circular red disc with restrained broken-paper texture.
- Maintain negative space and the 10:7 composition. Do not crop or stretch the scene.

## 4. Replay behaviour

- Replay begins with the paper surface.
- Paths are processed in authored array order, one after another.
- The current path is traced progressively; once complete, its closed shape is filled.
- Previously completed paths remain visible.
- The completed canvas is the accumulated result of the 100 path operations. It is not substituted with an image.
- The schema-v1 renderer clamps the duration to 9–30 seconds; the Clear score requests 30 seconds.
- Schema v1 has no artist-authored pauses between the seven stages. Stage ranges are preserved as score metadata for validation and production notes.

## 5. Acceptance checks

1. The artwork validates as `schemaVersion: 1` and `renderMode: ordered-ink-wash-paths`.
2. Exactly 100 paths decode successfully and stay within the 1000 × 700 canvas.
3. The seven authored path ranges remain in the order shown above.
4. The catalogue selects `rendererVersion: 1` for Clear.
5. Replay advances through partial states and reports 100/100 at completion.
6. The Rain schema-v1 regression remains unchanged.
7. The final preview is visually inspected against the supplied composition reference.
8. Weather layout, 10:7 card ratio, portrait behaviour, forecast, controls and service-worker integration remain untouched.

## 6. Renderer compatibility

The runtime may continue to support schema v4 for other future artwork, but active Clear deliberately selects schema v1 because it is the established Rain renderer. Schema-v2 pressure ribbons and schema-v3 master-image reveal remain retired from the active runtime. Rain's source JSON is not included in this change.
