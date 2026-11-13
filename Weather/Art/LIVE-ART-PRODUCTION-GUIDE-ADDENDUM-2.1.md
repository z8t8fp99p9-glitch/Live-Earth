# LIVE // EARTH — Weather Live Art Production Guide Addendum

**Addendum:** `WEATHER-LIVE-ART-STANDARD-002-A1`  
**Version:** 2.1  
**Date:** 13 November 2026  
**Status:** Binding update; read with `LIVE-ART-PRODUCTION-GUIDE.md`.

## Superseding production rule

The approved source artwork must be reproduced in the Live renderer. Do not create a new or simplified illustration for Live. The artwork's encoded path asset is a technical representation of the source master, not a separate creative version.

`LIVE-ART-MASTER-FIRST-WORKFLOW.md` is now mandatory for every new Weather Live Art asset. Where older guide wording suggests generating a fresh art concept for the Live view, this addendum takes precedence when an approved master already exists.

## Approved Clear Weather master

- **Artwork ID:** `clear-maple-pavilion-001`
- **Title:** A Clear Day at the Maple Pavilion
- **Master:** `References/clear-weather-master-001.jpg`
- **Master dimensions:** 1500 × 1049 px
- **App drawing coordinates:** 1000 × 700 (10:7)
- **Weather tag:** `clear`
- **Status:** Approved source master; path-conversion asset prepared from this image.
- **Protected:** The source master must remain unchanged and must never be replaced by the encoded preview.

The master depicts the maple tree and vermilion leaves, pavilion roof and support, hanging wind chime and paper charm, distant birds, open red sun, mountain ridges, horizon/water marks, foreground bank, stones, grasses, and flowering twig. Keep all these elements in their original positions and proportions. Do not add, remove, rearrange, or embellish objects.

## Approved drawing sequence

1. **The maple tree structure** — thick near-black brush contours for the trunk and connected branches; preserve taper and dry-brush edges.
2. **The pavilion structure** — roof contours, central support, and small rails; retain the open paper spaces.
3. **The distant mountains and horizon** — both ridgelines plus restrained cloud/water marks, including the original soft-grey details.
4. **The foreground garden and water edge** — curved bank, water strokes, stones, grasses, and flowering twig in their exact positions.
5. **The wind chime and birds** — bell, hanging paper charm, and two distant birds; keep the charm interior open.
6. **The vermilion autumn accents** — red sun, maple leaves, drifting leaves, blossom/charm marks, and their subtle tonal/light details last.

The sequence above is represented by the stored path order. The existing renderer progressively reveals paths; it does not pause between named stages.

## Technical preservation notes

- Preserve the source JPEG byte-for-byte at the master path above.
- Keep the existing 10:7 card and `ordered-ink-wash-paths` schema.
- Keep near-black ink, soft-grey distance marks, and the source's textured vermilion accents. Do not collapse all red areas into one flat colour.
- Preserve intentional light gaps and dry-brush texture as separate contours where representable.
- Do not introduce a new renderer, image service, network behaviour, cache behaviour, or view layout as part of this artwork update.
- Compare the path preview with the original master before accepting the asset. Any remaining fidelity limitation must be recorded; it must not be hidden by calling the result pixel-identical.

## Minimal app routing update required

The inspected `live-art-online.js` currently admits only `rain` and `cloudy` in its weather-selection gate. The new catalogue entry alone cannot activate Clear Weather. Apply the root-level `apply-clear-weather-renderer-update.py` script. It verifies the expected renderer Git blob SHA before changing only these four details:

1. Add `clear` to the supported weather-selection list.
2. Retain `raw.weather` in the prepared artwork object.
3. Replace the Rain-specific same-artwork shortcut with a weather-aware check.
4. Replace the Rain-specific accessibility label with a generic Weather Live Art label.

The drawing decoder, closed-contour painting, Replay timing, paper treatment, online/on-demand fetch, cache policy, and all unrelated UI remain unchanged. The script refuses to modify a renderer whose source does not match the inspected baseline.
