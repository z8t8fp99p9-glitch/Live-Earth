# LIVE // EARTH — Weather Live Art Production Guide

**Document ID:** `WEATHER-LIVE-ART-STANDARD-002`  
**Version:** 2.5 — painted-master brush-reveal standard  
**Status:** Current binding production standard  
**Scope:** LIVE // EARTH Weather view — Live Art card only  
**Active visual benchmark:** `References/clear-maple-pavilion-master-003.jpg` (approved painted master)

---

## 0. Read this before creating or changing Weather Live Art

This guide is the binding source of truth for Live Art appearance, composition, brushwork, drawing order, Replay timing, and approval. Read it with `ART-DIRECTION.json`, `art-library.json`, and the artwork-specific plan. The original approved artwork is the visual source of truth. Do not redesign, simplify, redraw, or reinterpret it to suit the renderer.

## 1. Core visual identity — preserve the original art

Live Art uses the approved Japanese-inspired brush-painted aesthetic: confident black ink brushwork, natural taper and dry-brush texture, expressive red accents, subtle warm paper, and carefully balanced negative space. Preserve the approved master painting's actual shapes, colours, proportions, texture, and composition.

**Do not convert painted masters into thin contour drawings, wireframes, kindergarten-style outlines, icons, or simplified substitutes.** Do not replace broad painted forms with mechanically uniform paths. Do not add decoration or new objects that are absent from the master.

The master image must remain immutable. A Live replay is a reveal of that same painting through authored brush gestures, not a second illustration. At completion, the displayed artwork must match the approved master exactly within the 10:7 presentation area.

## 2. Canvas and composition

- Artwork and Live Art card remain **10:7**.
- Encoded drawing coordinates use **1000 × 700** normalized space.
- Preserve all composition, spacing, focal hierarchy and negative space from the approved master.
- No crop, stretch, repositioning, recolouring, added typography, border, watermark or unrelated visual edits.
- Do not change Weather layout, card dimensions, overlays, typography or responsive behaviour as part of artwork production.

## 3. Master-wide Replay standard — binding for every new artwork

Every new Live Art replay follows these limits:

- **Maximum 100 brush strokes** for the complete artwork. This is a ceiling, not a target; use fewer when the master can be faithfully revealed with fewer.
- **30 seconds total** from the first brush mark to the finished scene.
- A stroke is one continuous brush gesture with a deliberate start, route, pressure profile and lift. A stroke may not join unrelated objects merely to reduce the count.
- Brush character is essential: broad-to-fine width variation, natural taper, pressure variation and expressive flow. No rigid mechanical uniformity.
- The master painting itself supplies the exact final pigment, paper grain and brush texture. The animated gesture reveals those source pixels; it does not redraw or approximate them.

### Required stroke order — never change this sequence

1. **Thick strokes first.** Establish the main structural brush forms and dominant silhouettes: trunks, principal branches, roofs, banks, major foreground or architectural masses.
2. **Attached thin strokes second.** Add the connected branches, structural edges, interior brush marks, contours and delicate details belonging to the major forms.
3. **Air, birds and little things after the big things.** Add atmospheric marks, birds, grasses, distant details, small objects and light movement only after the principal scene is established.
4. **Leaves after everything else.** Reveal leaves and other late organic colour accents after all structural and atmospheric artwork is complete.
5. **Sun always at the end.** Reveal the sun last, then apply only the intended final finishing gesture. The sun must never appear during an earlier stage.

The ordered stroke list is the actual Replay order. Stage labels in documentation do not reorder the artwork. The last stage must contain the sun and finishing gesture.

## 4. Brush authoring and rendering

Each authored gesture is represented by an ordered centreline and pressure samples. The stroke width describes the reveal-brush width in 1000-unit canvas coordinates. Low-pressure endpoints taper naturally; broad structural marks use more pressure and width, while attached and atmospheric marks are finer.

For master-reveal artwork, the renderer places the approved master beneath a warm-paper veil. Each authored brush gesture progressively removes the veil, revealing the original master image exactly underneath. The brush path is an animation mask only; it is not a replacement outline or pigment stroke. Each stage mask must be derived from the actual painted pixels belonging to that stage, preserving filled brush forms, pigment texture and soft edges. Thin edge traces, skeletons, contour-only masks and generic redraws are not acceptable. Completed Replay reveals the whole master.

Each gesture receives an equal share of the 30-second drawing budget; only brief pauses at the four stage boundaries are additional. The progress counter must advance steadily and reach 100/100 at 30 seconds.

New master-reveal files use:
- `schemaVersion: 3`
- `renderMode: "ordered-master-brush-reveal"`
- `masterImagePath` pointing to the immutable approved JPEG under `Weather/Art/References/`
- `durationMs: 30000`
- a `strokes` array containing 1–100 ordered gestures
- five authored stages in the required order (the last stage is sun and finish)

The renderer must continue to support legacy schema-version-1 ordered ink-wash paths and schema-version-2 pressure strokes. Do not break existing Rain or historical artworks when adding or changing newer rendering modes.

## 5. Colour and paper

Preserve the original master palette. Do not automatically recolour artwork for weather, time of day, or night. Vermilion accents remain selective and meaningful. Paper is warm and quiet; it is not a reason to flatten, over-texture or decorate the scene.

## 6. Production and acceptance workflow

1. Identify and preserve the exact user-approved master, byte-for-byte.
2. Inspect the active catalogue, renderer, Rain asset and existing guide before any changes.
3. Author no more than 100 reveal gestures in the prescribed sequence.
4. Build a local preview at 10:7 using the same image, gesture data, renderer and 30-second timeline used by the app.
5. Verify that the fully completed preview matches the approved master; verify that each stage reveals in the correct order and the sun is last.
6. Validate JSON, image path, stroke count, pressure bounds, coordinate bounds, ordered stage IDs, 30-second duration, schema compatibility and Rain regression.
7. Package changes for the repository's manifest-validated ZIP workflow. Do not write directly to GitHub or claim deployment/device success before the user's upload and verification.

**Acceptance rule:** Technical validity is not artistic approval. The completed artwork must preserve the original professional painted appearance. If the rendering turns it into simplified line art, it fails.

## 7. Protected areas

The Rain artwork and its existing schema-version-1 rendering remain unchanged. The Weather view layout, portrait composition, landscape behaviour, card ratio, temperature/forecast typography, controls, service worker, online-only loading and offline/recovery behaviour are outside the scope of artwork-only changes and must remain untouched.
