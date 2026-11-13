# Clear Maple Pavilion — 90% / Continuous Brush Revision

**New artwork revision ID:** `clear-maple-pavilion-002`  
**Parent/master:** `clear-maple-pavilion-001` (preserved unchanged)  
**Visual proof:** `../References/clear-maple-pavilion-002-90pct-preview.png`  
**Canvas:** 1000 × 700 (10:7)  
**Composition scale:** 90%, centred  
**Gesture target:** 63 meaningful strokes  
**Initial Replay target:** 75 seconds  
**Status:** Composition preview and stroke intent approved for authoring; runtime geometry not yet production-ready

## Composition

Retain the exact Maple Pavilion scene and relative internal layout from the approved master. Scale the overall composition to 90% around the canvas centre, preserving all proportions and the 10:7 canvas. This adds approximately 5% canvas breathing room on each side. Do not stretch, crop, rearrange, recolour, or add objects. Red accents remain restrained and the warm paper remains the dominant negative space.

## Drawing order and 63-gesture budget

| Order | Element | Gestures | Direction |
|---:|---|---:|---|
| 1 | Maple trunk and branches | 7 | One flowing trunk, then meaningful connected branch gestures |
| 2 | Maple leaves and falling leaves | 12 | Separate leaf gestures, each with a start, body, and tapered finish |
| 3 | Pavilion roof and structure | 7 | One stroke for each roof/structural line |
| 4 | Wind chime and charm | 5 | Hanging line, bell, connector, and charm gestures |
| 5 | Sun and sky details | 4 | A deliberate sun sweep and a few restrained atmosphere marks |
| 6 | Birds | 2 | One complete gesture per bird |
| 7 | Mountain and distant landscape | 4 | Each major ridge/horizon sweep is continuous |
| 8 | Foreground bank, grasses, and rocks | 8 | Main bank first; selected grasses and stone contours afterward |
| 9 | Flowering twig | 9 | Main stem, offshoots, then selected blossoms |
| 10 | Water and finishing accents | 5 | A few low-contrast finishing lines, last |
| **Total** |  | **63** |  |

A 63-stroke target is a composition plan, not a quota. Adjust by a few gestures if the actual brush movement requires it; never fragment a natural continuous line just to meet the count.

## Gesture-level intent

The companion file `clear-maple-pavilion-002-stroke-intent.json` lists all 63 intended gestures in exact order, with their role, weight class, colour role, and relative duration weight. It deliberately marks centreline point data and pressure samples as `PENDING`; it must not be treated as render-ready artwork.

## Brush behaviour

- One stroke record equals one continuous physical brush gesture.
- Use normalized centreline coordinates plus pressure samples, not filled closed contour polygons.
- Thick structural gestures must have a fuller body and natural taper; thinner marks must remain sparse and delicate.
- No branch can fork within one path; use a new stroke at a natural brush lift.
- Draw in the listed stage order. Red leaves/blossoms and selected accents follow the underlying structure.
- Give important long strokes more time. Tiny accents are quicker. Pause briefly between major stages.
- Initial Replay target is 75,000 ms, then tune on device. Keep reduced-motion and Replay control behaviour intact.

## Explicit exclusions

No new objects, no altered subject placement, no palette redesign, no new decorative strokes, no denser outlining, no changes to Rain, no Weather layout changes, no catalogue wiring, and no changes to the existing approved master or version-1 JSON.

## Production gate

The current `live-art-online.js` is a schemaVersion 1 renderer for closed filled contours and does not read pressure, centreline strokes, stage pauses, or per-stroke duration. The new 63-gesture source must therefore wait for a backward-compatible schemaVersion 2 stroke renderer and regression tests. Do not point the live catalogue at this intent ledger or preview. The current bundle contains a visual scale proof and authoring specification only.
