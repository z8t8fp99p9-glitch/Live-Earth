# LIVE // EARTH — Weather Live Art Production Guide Addendum 2.3

**Applies to:** `Weather/Art/LIVE-ART-PRODUCTION-GUIDE.md`  
**Status:** Binding production technique for schema-version-2 Live Art  
**Date:** 13 November 2026  
**Scope:** Stroke authoring, renderer behaviour, Replay pacing, and the active Clear Maple Pavilion revision

This addendum is now the active technical companion to the Weather Live Art Production Guide. It supersedes the planning-only Addendum 2.2 where that document marked the Clear 002 centreline geometry and pressure samples as pending. Addendum 2.2 is retained as a historical planning checkpoint. This addendum supersedes the version-1 filled-contour technique for new stroke-based artwork only. Existing version-1 artwork remains supported by the same renderer and is not rewritten.

## 1. Non-negotiable mark-making principle

**One stroke record equals one continuous artist's brush gesture.** A meaningful stroke has one start, one continuous route, variable pressure, and one natural lift at the end. Never split a single branch, roof line, ridge, or flowing contour into arbitrary fragments. Never join unrelated objects in one stroke.

For every gesture:
- Begin at a deliberate point; travel along a coherent centreline; lift at the true end.
- Use smooth, intentional curves. Do not approximate a natural line with a chain of tiny disjointed marks.
- Change pressure along the stroke. Let broad strokes carry the structure and fine strokes carry atmosphere.
- Taper naturally at the beginning/end where the brush lifts; do not use identical mechanical caps everywhere.
- Preserve exposed paper. Empty space is part of the drawing, not a gap that needs decorative marks.

A branch cannot fork into two independent arms without lifting or retracing. Use a separate stroke for each branch. A leaf can be its own intentional gesture; do not decompose one leaf into dozens of contour paths.

## 2. Version-2 authoring format

New continuous-stroke assets use:

- `schemaVersion: 2`
- `renderMode: "ordered-pressure-strokes"`
- `canvas: [1000, 700]` and a 10:7 composition
- a validated hex `palette`
- an ordered `strokes` array

Each stroke record contains:
- stable `id` and 1-based `order`;
- `stageId`, readable `stage`, and semantic `role`;
- `colorIndex` into `palette`;
- `widthClass` and `baseWidth` in 1000-unit canvas-width units;
- `opacity` in 0.05–1.0;
- `durationWeight` greater than zero;
- `points`, an ordered array of `[x, y, pressure]` tuples, where x and y are normalized 0–1 coordinates and pressure is 0–1.

The renderer smooths centreline samples and builds a variable-width brush ribbon from the pressure profile. This is not a closed image contour. A partial stroke reveals only the prefix of the same centreline, so the brush head visibly travels from start to end.

The renderer validates all stroke coordinates, pressure values, colour indexes, widths, opacity values, order indexes, and timing weights before drawing. Invalid version-2 assets are rejected and the Weather view falls back to its existing paper/unavailable state.

## 3. Renderer compatibility contract

`Weather/Art/live-art-online.js` supports both formats:

- **Version 1:** `ordered-ink-wash-paths`, unchanged closed-contour decoding and rendering for existing Rain and legacy artwork.
- **Version 2:** `ordered-pressure-strokes`, continuous open-centreline brush gestures with pressure-shaped ribbons.

Do not change or migrate the Rain JSON as part of a Clear revision. A version-2 record must never be passed to the legacy painter. Keep the online-on-demand catalogue lookup, same 10:7 card/canvas, offline paper state, ResizeObserver cleanup, replay control, and `prefers-reduced-motion` behaviour.

## 4. Brush hierarchy and visual restraint

| Weight | Use | Gesture character |
|---|---|---|
| Thick | Trunk, main branches, main bank, primary roof silhouette | Confident, broad body, slower movement, pronounced taper |
| Medium | Secondary branches, roof lines, chime, leaves, mountain ridges | Expressive and clear, with changing pressure |
| Thin | Twigs, birds, fine grasses, water, distant accents | Delicate, sparse, quickly lifted |

No blanket uniform width. Width and pressure are authored per gesture and sampled along its path. Accent colour must be reserved for the final intended stage. Do not create decorative texture to inflate the stroke count.

## 5. Replay rhythm

Replay should feel like watching a patient artist paint, not a progress bar racing through records.

- Use artwork-specific `durationMs`; the Clear Maple Pavilion revision starts at **75,000 ms**.
- Allocate time unequally using each stroke's authored `durationWeight` and measured centreline length.
- Structural strokes receive more time than tiny finishing marks.
- Insert brief pauses between major drawing stages. Do not pause after every point or create staccato motion.
- Finish one gesture before beginning the next. Avoid unrelated simultaneous strokes.
- Preserve the replay button, offline state, online-on-demand data loading, and reduced-motion completion behaviour.
- The status count represents authored gestures, not low-level points or polygons.

## 6. Clear Maple Pavilion revision 002

Active catalogue ID: `clear-maple-pavilion-002`  
Parent artwork/master: `clear-maple-pavilion-001` (preserved)  
Composition: original scene scaled uniformly to **90%** around the centre of the 1000 × 700 canvas  
Target: **63 authored gestures**  
Replay: 75 seconds with unequal per-stroke timing and stage pauses

The 63 gestures follow this sequence: maple trunk and branches (7); maple leaves and falling leaves (12); pavilion roof and structure (7); wind chime and charm (5); sun and sky details (4); birds (2); mountains and distant landscape (4); foreground bank, grasses and rocks (8); flowering twig (9); water and finishing accents (5).

The count is a design target, not a quota. If a real brush gesture needs to be added or removed for a natural result, amend the plan and preserve the one-gesture/one-record principle.

## 7. Production workflow

1. Inspect the approved master, active guide, direction file, catalogue, and current renderer.
2. Agree the exact scene with the user; preserve the master and establish a new revision ID.
3. Compose the full scene on a 10:7 canvas and apply the approved 90% transform uniformly when requested.
4. Plan the visual stages and intended brush gestures before encoding coordinates.
5. Author centreline coordinates and pressure samples for every gesture. Do not use `PENDING` placeholders in a runtime asset.
6. Validate the schema and ensure the path array is in exact drawing order.
7. Preview the complete image, partial replay frames, and actual card-scale rendering.
8. Test old version-1 artwork, new version-2 artwork, stage pauses, progress status, resize, reduced motion, offline/reconnect state, and replay cleanup.
9. Update the catalogue to point to the new asset only after validation. Preserve superseded source records outside the active weather-matching list.
10. Package root-relative file paths and a SHA-256 manifest. Never claim deployment or device success before the user's upload/extract and actual device test.

## 8. Protected boundaries

This art revision does not authorize changes to the Weather forecast/data engine, landscape painter, Japanese typography, portrait/landscape layout, 10:7 Live Art card, title/caption/Replay overlays, Home/Earth/Moon/Sun/Stacks/Location, service-worker cache policy, or database behaviour. Do not modify Rain data or the approved Clear 001 master. All new brush behaviour is contained in the Weather Live Art renderer's version-aware drawing path.
