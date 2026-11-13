# Clear Maple Pavilion — Hand-Guided Painted Master Reveal Plan 003

**Artwork:** `clear-maple-pavilion-003`  
**Source of truth:** `../References/clear-maple-pavilion-master-003.jpg`  
**Replay:** 30 seconds; maximum 100 gestures; current authoring count 100.

The approved painted master is immutable. Replay reveals its original pixels through pressure-sensitive brush gestures constrained by the five-stage painted-pixel mask atlas. It does not redraw the scene.

## Why the gesture data was rebuilt

The previous 003 gesture list used repeated, nearly full-width horizontal sweeps at regular vertical intervals. Although the masks preserved the final painting, that movement read as a printer or raster scan. This revision replaces those sweeps with 100 individual, hand-guided paths that follow the actual forms in the master: the maple trunk and branches, pavilion roof and supports, hanging chime, birds, mountain ridges, water, individual red leaves, flowering twig, and final sun.

Each gesture is a single continuous movement with a curved route, variable pressure, and a tapered lift. No gesture sweeps across unrelated objects or advances as a page-wide scanline. The master JPEG and stage-mask atlas are unchanged. The JSON paths only control how the original master is uncovered.

## Ordered stages

01. **Thick structural brushwork** — 28 gestures (orders 1–28): trunk, main branches, pavilion roof and post, foreground bank and major black forms.
02. **Attached thin brushwork** — 27 gestures (orders 29–55): twig extensions, pavilion fine structure, hanging cord, bell and charm.
03. **Air, birds and little details** — 12 gestures (orders 56–67): birds, mountain ridge strokes, sky movement and stream marks.
04. **Leaves after everything else** — 20 gestures (orders 68–87): individual maple leaves, falling leaves and the flowering twig accents.
05. **Sun and final finish** — 13 gestures (orders 88–100): curved sun reveal, source-pigment texture and final reflection marks.

The sun remains confined to the final stage. The actual JSON array order is executable Replay order. The immutable master remains the finished image at completion.
