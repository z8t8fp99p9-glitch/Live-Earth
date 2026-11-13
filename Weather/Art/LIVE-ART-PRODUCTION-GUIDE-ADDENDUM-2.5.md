# LIVE // EARTH — Weather Live Art Production Guide Addendum 2.5

**Applies to:** `Weather/Art/LIVE-ART-PRODUCTION-GUIDE.md`  
**Status:** Binding refinement for schema-version-3 master brush reveal  
**Date:** 13 November 2026

## Purpose

Correct the first schema-v3 Clear Maple Pavilion replay, whose stage atlas retained too little of the source pigment and therefore made the painting appear as a thin contour drawing. The approved master remains unchanged.

## Binding mask rule

- Stage masks are derived from the actual painted pixels in the approved master, including the filled body of broad ink strokes, red pigment, antialiased edges and intentional dry-brush texture.
- Do not use edge-only masks, skeletons, contour traces or narrow vector outlines as substitutes for painted areas.
- Structural stages exclude the red leaf regions and sun. Leaves are revealed only in stage 4. The sun and its finishing marks are revealed only in stage 5.
- The animated brush gesture is a reveal mask: it uncovers original master pixels and never paints a new line over the master.
- At 100/100, the renderer displays the immutable master directly, preserving every source pixel.

## Timing rule

- Schema-v3 artwork duration is exactly 30,000 ms.
- Every authored gesture receives an equal share of the drawing budget.
- Short pauses may occur only at the four stage boundaries; the progress counter advances steadily and completes at 100/100 at 30 seconds.
- Reduced-motion mode may display the completed master immediately.

## Clear Maple Pavilion stage order

1. Thick structural brushwork.
2. Attached thin brushwork.
3. Air, birds and little details.
4. Leaves after everything else.
5. Sun and final finish.

## Regression protection

This refinement is limited to schema-v3 master-reveal timing and the Clear stage-mask atlas. Schema-v1 Rain rendering, schema-v2 historical assets, Weather layout, card ratio, typography, forecast data, service worker and online loading remain unchanged.
