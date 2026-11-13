# LIVE // EARTH — Weather Live Art: Master-First Production Workflow

**Document ID:** `WEATHER-LIVE-ART-MASTER-FIRST-001`  
**Version:** 1.0 — binding workflow  
**Scope:** Every artwork in `Weather/Art/`  
**Purpose:** Prevent approved artwork from being redesigned, simplified, or replaced during conversion into the Live renderer.

## Non-negotiable rule

**The approved artwork is the artwork. The Live asset is a faithful drawing-data reproduction of that same artwork. It is not a second design.**

The original approved master is the single source of visual truth. Never create a separate “Live version” by prompting for a new composition, simplifying the scene, changing objects, changing proportions, or replacing details. The encoded JSON exists to reproduce the approved master progressively.

## Required workflow

1. **Locate the source master.** Use the exact image or artwork the user created and approved. When the user supplies an image and explicitly asks to use it for an artwork, treat that supplied image as the master.
2. **Preserve the master.** Copy it byte-for-byte into the artwork's production reference archive. Never overwrite, crop, recolour, repaint, or discard the original. Any working-size render is a separate derived file.
3. **Inspect the existing app implementation.** Read the current Rain asset, `art-library.json`, the production guide, the direction file, and the renderer. Confirm the accepted schema and known limitations before authoring paths.
4. **Trace the master, do not redesign it.** Build ordered paths from the approved image itself. Preserve its composition, proportions, silhouettes, line character, negative spaces, colour accents, and distinctive texture as closely as the existing renderer permits.
5. **Preserve details deliberately.** Retain small but meaningful marks, interior gaps, dry-brush edges, and tonal variations. Do not flatten textured colour into one solid shape or discard details merely to reduce path count. If a visible feature cannot be represented by the current format, document the limitation and stop for a technical decision; do not silently invent a substitute.
6. **Write an artwork-specific drawing plan.** Define the order of objects and marks based on the approved master. Do not copy another artwork's sequence.
7. **Encode in the existing format.** Use the currently supported `schemaVersion: 1` and `renderMode: "ordered-ink-wash-paths"` unless a separately approved and tested renderer change is authorised. Respect the 1000 × 700 coordinate canvas. The paths array is the actual Replay order.
8. **Reconstruct and compare.** Render a local preview from the encoded paths. Compare it against the untouched master at 10:7 and at actual card scale. Check all focal objects, outlines, negative spaces, small details, red accents, and overall composition. Correct path-conversion errors, not the artwork.
9. **Validate.** Check JSON syntax, asset ID, weather tags, palette indexes, base64/varint decoding, minimum point counts, coordinate bounds, path order, and catalogue linkage. Do not alter the shared renderer or protected app views as part of artwork-only production.
10. **Package without deploying.** Include the new artwork JSON, catalogue update, production record, untouched source master, preview, and hashes. Do not claim deployment or device success until the user uploads and tests the package.

## Renderer constraints to respect

The current Weather Live Art renderer decodes pairs of signed delta-varints from base64, interprets points in a 1000 × 700 coordinate space, and progressively reveals the `paths` array in stored order. Each completed path is a filled closed contour. The renderer does not interpret semantic stage labels, named pauses, or per-path `strokeWidth`. Line thickness must therefore be represented by the contour geometry itself.

A drawing plan explains intent; it does not control the app by itself. The `paths` array must physically follow the plan's sequence. Do not add unsupported fields and assume they affect Replay.

## Approval and preservation rules

- User approval applies to the source master, not to an independently generated reinterpretation.
- Keep approved master files immutable and retain previous versions.
- Do not replace an existing artwork ID or overwrite another artwork.
- Never change Rain or shared renderer behaviour to make a new artwork fit.
- Do not create a second composition for “Live”; create only the faithful path representation.
- If the app preview visibly differs from the master, it is not finished.
- A technically valid JSON file is not proof of artistic fidelity.

## Narrow Clear Weather routing exception

The inspected renderer's weather gate currently accepts only `rain` and `cloudy`. Therefore, the Clear artwork will not load until the weather selector is allowed to accept `clear`. Use only the supplied `apply-clear-weather-renderer-update.py` script, which verifies the inspected renderer's Git blob before applying four exact replacements: allow `clear`, carry the asset's weather tags into prepared artwork, compare the active artwork against the selected weather rather than hard-coding the Rain ID, and make the canvas accessibility label generic.

This is a selection/routing correction only. Do not change `decodePath`, path painting, animation timing, paper rendering, Replay controls, online loading, cache policy, or any other view.
