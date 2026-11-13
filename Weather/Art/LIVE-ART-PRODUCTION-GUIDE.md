# LIVE // EARTH — Weather Live Art Production Guide

**Document ID:** `WEATHER-LIVE-ART-ARTIST-ENGINE-001`  
**Version:** 3.0 — independent artist-led pigment engine  
**Status:** Current production standard  
**Scope:** LIVE // EARTH Weather Live Art card only

---

## 1. The artist, not a reveal effect

The Live Art engine creates paintings directly on its canvas. It is not an image player, tracing system, mask revealer, or slideshow. The final scene must be the accumulated result of the engine's own brush marks and pigment deposits.

Each Clear-weather artwork is an independent creation. Do not use previous Rain or Clear artwork as a visual reference, trace its paths, derive a score from its pixels, or load a finished image into the renderer. The artist score must be authored for the new scene itself.

**Schema Version 3 master-reveal is retired and removed from the active runtime.** No master image or stage-mask atlas is permitted in a Clear artwork record or renderer input. Completion must not replace the canvas with another image.

## 2. Canvas and composition

- The artwork surface remains 1000 × 700 logical units (10:7).
- Keep the existing Weather card, layout, crop, responsive behaviour and portrait composition unchanged.
- Preserve a deliberate balance of large and small value masses, depth, focal hierarchy, directional flow and open paper.
- The scene may use washes, broad paint masses, broken brush marks, fine details and quiet accents. Do not reduce every subject to an outline.
- Negative space is an intentional compositional element, not unused canvas.

## 3. Brush and pigment model

The artist engine uses a bundle of individually varied bristles rather than a single uniform ribbon. The engine must respond to:

- **Pressure:** changes width, pigment transfer and the natural lift/taper of a mark.
- **Speed:** changes deposited width and density; faster movement leaves a lighter, narrower mark.
- **Direction:** determines brush angle, bristle fan and edge movement.
- **Bristle variation:** individual bristles vary in spacing, length, opacity and continuity.
- **Pigment load:** controls the amount of colour transferred to the surface.
- **Wetness:** creates a restrained soft edge and wash behaviour.
- **Dryness:** creates broken marks and exposed-paper gaps.
- **Granulation:** distributes pigment unevenly instead of producing mechanically flat fills.
- **Overlap:** later deposits interact with earlier deposits on the persistent paint surface.

The paper surface is generated procedurally. It must not be loaded from a finished source illustration.

## 4. Artist score and painting order

Each score is an ordered series of authored painting events. Events specify their path, brush profile, pigment, width, opacity, pigment load, wetness, granulation and timing weight. The engine may add deterministic bristle-level variation, but it may not invent a hidden finished image.

The authoring artist determines the order of large masses, depth planes, structural forms, water or atmosphere, foreground and finishing detail. There is no universal five-stage template and no arbitrary maximum of 100 gestures. The score's own phases and duration control Replay.

## 5. Progressive Replay

- The replay begins with the paper surface and deposits pigment as each event is painted.
- The middle of the replay must show a believable work in progress, not an almost complete image hidden under a veil.
- A completed event remains on the canvas while the next event is painted.
- Replaying rebuilds the canvas deterministically from the authored score.
- Resizing or returning from a hidden tab reconstructs the correct partial painting state.
- Reduced-motion mode may render the completed score immediately, but it must still render the same brushwork and must not swap in another image.
- The final frame is only the final accumulation of deposited pigment.

## 6. Production acceptance

A new artist score is accepted only after:

1. JSON and event ordering validate.
2. Every brush event contains valid coordinates, pressure, pigment, timing and brush settings.
3. The active renderer has no source-image or mask-loading path.
4. Browser previews are inspected at the beginning, early build, middle, late build and completion.
5. The final frame is composed entirely from canvas paint operations.
6. Replay, resizing, tab visibility, reduced motion and error/offline states are tested.
7. Rain schema-v1 regression passes unchanged.
8. Weather layout and the 10:7 card ratio remain untouched.

Technical tests alone do not establish artistic quality. Intermediate and final browser renders must be visually inspected before packaging.

## 7. Protected areas

Rain's existing artwork and schema-v1 drawing behaviour remain protected. Weather layout, the 10:7 card ratio, portrait composition, forecast and temperature information, controls, service-worker injection and online-only artwork fetching are outside the scope of the painting-engine rebuild.
