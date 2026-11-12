# Weather Live Art — App Production Materials

This folder is the exclusive home for LIVE // EARTH Weather Live Art production material.

## Read these files before creating or changing artwork

1. `LIVE-ART-PRODUCTION-GUIDE.md` — binding human-readable visual and production standard (v2.0).
2. `ART-DIRECTION.json` — structured specification for assistants and production tooling.
3. `art-library.json` — app-local catalogue, links to the active standard, and stores each artwork's drawing plan.
4. `References/approved-style-reference-002.jpg` — active minimalist monochrome line-art benchmark.

`References/approved-style-reference-001.jpg` is retained as historical material and is superseded for new work.

## Current visual rule

Minimalist Japanese-inspired monochromatic black ink line art on warm ivory paper. The illustration occupies about 70% of the 10:7 canvas; roughly 30% remains quiet warm paper. Use deliberate thick, medium, and sparse thin marks; almost no filled-black areas; very few vermilion accents. Weather influences the scene, not the overall colour treatment.

## Drawing and Replay rule

Every artwork has its own approved, named drawing sequence. The actual Replay order is the order of entries in the artwork JSON `paths` array. The current renderer reveals that ordered array progressively. It does not interpret semantic stage labels, per-path stroke-width metadata, or named stage pauses. See section 4.1 and section 6 of the guide before authoring encoded paths.

The existing 10:7 card, renderer, progressive Replay, app shell, service worker, online/on-demand loading, and offline/recovery behaviour are protected. This documentation/catalogue package does not alter those systems. Production metadata is stored here for the app project and future artwork production; the current renderer ignores the additional production fields in the catalogue.

## Workflow

One artwork at a time. Confirm the requested weather. Present one concept, obtain approval, create its drawing plan, author paths in that order, validate, then package. Do not generate batches or silently add unapproved artwork to the catalogue.
