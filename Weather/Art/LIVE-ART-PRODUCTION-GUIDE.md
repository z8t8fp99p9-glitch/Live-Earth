# LIVE // EARTH — Weather Live Art Production Guide

**Document ID:** `WEATHER-LIVE-ART-STANDARD-002`  
**Version:** 2.0 — approved visual direction  
**Status:** Current binding production standard  
**Scope:** LIVE // EARTH Weather view — Live Art card only  
**Active visual benchmark:** `References/approved-style-reference-002.jpg`  
**Historical reference:** `References/approved-style-reference-001.jpg` (retained; superseded for new artwork)  
**Last updated:** 12 November 2026

---

## 0. Read this before creating or changing any Weather Live Art

This guide is the single source of truth for the appearance, composition, colour, drawing order, Replay preparation, and approval of Weather Live Art.

The matching machine-readable specification is `ART-DIRECTION.json`. The app-local catalogue `art-library.json` links to that specification and stores each artwork's own drawing plan. Read all three before preparing an artwork:

1. `LIVE-ART-PRODUCTION-GUIDE.md` — complete human-readable standard.
2. `ART-DIRECTION.json` — compact structured rules for production tools and assistants.
3. `art-library.json` — current artwork list and artwork-specific drawing plans.

Do not rely on memory, generic image prompts, or a previous artwork alone. Inspect the active reference and current catalogue every time. When the user supplies a new approved visual direction, update these files together in one documentation/catalogue package.

**Current art identity:** minimalist Japanese-inspired monochromatic ink line art on warm ivory paper. The illustration is made from a small number of confident, expressive marks. The paper and the unpainted space are part of the composition.

The earlier watercolor-heavy guide is superseded for future artwork. Its history is retained through the repository's commit history and the old reference file; do not use it as the active style target.

## 1. Purpose and promise

Weather Live Art is a collection of small, quiet visual moments inspired by weather. It is not a collection of weather icons, generic wallpapers, or densely detailed landscape paintings.

The weather is the setting or condition. A single intimate subject, a simple environment, and a few carefully chosen marks communicate the moment. A viewer should recognise the subject quickly, then notice the restraint and details.

Every image must feel like part of one coherent collection while presenting a genuinely different subject, setting, silhouette, and composition. The approved reference establishes visual language and drawing economy; it is not a scene template to copy.

## 2. Active visual identity — mandatory

### 2.1 Medium and mark-making

- Minimalist Japanese-inspired black ink line art on warm, subtly textured paper.
- Fine, continuous-feeling black ink strokes with slight natural variation, like deliberate hand-drawn brush movements.
- Prefer clear, economical outlines that suggest an object rather than fully describe every surface.
- Use confident long strokes for structural forms and expressive curved strokes for organic forms.
- Allow a small amount of dry-brush character or rough edge where it supports the mark; do not turn every line into a scratchy texture.
- Use almost no filled-black areas. Large solid silhouettes, broad black blocks, and heavily shaded objects are prohibited.
- Recognisability must come from silhouette, proportion, and a few defining marks — not micro-detail.
- The result should look intentionally simple and complete, never like an unfinished wireframe or a technical diagram.

### 2.2 What the style is not

Do not use:
- elaborate watercolor scenery or broad painted washes as the dominant technique;
- photorealism, 3D rendering, glossy surfaces, airbrushed gradients, or vector-perfect icon art;
- dense cross-hatching, stippling, repeated texture marks, or intricate surface decoration;
- large filled-black areas or thick blocks used as substitutes for line drawing;
- decorative props that do not help tell the weather moment;
- typography, captions, pseudo-calligraphy, labels, logos, signatures, borders, or watermarks inside the artwork.

### 2.3 Emotional character

Quiet, observant, intimate, balanced, and contemplative. The scene should feel like a small moment noticed rather than a stage filled with objects. Negative space is active composition, not unused space to fill.

## 3. Composition — the 70/30 rule

### 3.1 Fixed canvas and card

- Artwork composition: landscape **10:7**.
- Encoded drawing coordinate system: **1000 × 700** (the current ordered-path asset schema).
- App artwork export/reference target: **1200 × 840 px**, sRGB.
- Existing Weather Live Art card remains **10:7**. Do not change card sizing, layout, overlays, or responsive behaviour as part of art production.

### 3.2 Illustration footprint

- The complete illustration should occupy **about 70% of the 10:7 canvas**.
- Preserve roughly **30% as clean, warm paper around the illustration**. This is the visual breathing-space budget, not a demand for an exact pixel mask.
- Judge the visual footprint by the composed scene — its structural lines, focal object, and supporting marks — not by counting non-paper pixels. Fine line art naturally uses fewer ink pixels than a painted image.
- Keep the scene comfortably inside the canvas. Leave visible warm-paper separation on every side; no essential object or stroke should be clipped or pressed against the edge.
- The composition may be asymmetrical. Balance one side with open paper rather than adding more objects.
- Avoid a tiny central stamp. The subject must remain readable at the actual card size while retaining the generous paper field.
- Do not zoom, crop, or stretch artwork to force it into the card. Compose natively for 10:7; if adapting a reference, extend matching paper rather than cutting off the artwork.

### 3.3 Visual hierarchy

Use this hierarchy unless the story genuinely requires otherwise:
1. One primary focal subject or moment.
2. One simple supporting setting that makes the subject understandable.
3. Zero to three secondary details that create atmosphere or identify the weather.

A composition should normally communicate its idea with one glance. If the scene needs a paragraph of explanation, simplify the drawing.

## 4. Stroke hierarchy and object construction

Use three deliberately chosen visual weights. The labels describe the intended appearance; they are not instructions to apply uniform software stroke widths to every path.

| Visual weight | Typical use | Drawing character |
|---|---|---|
| **Thick / structural** | Window or door frame, main branch, kettle silhouette, mountain or roof silhouette | Confident, long, decisive strokes; establish the scene |
| **Medium / object-defining** | Teacup, pavilion, small house, wind chime, pot, umbrella, main leaf shapes | Clear outlines with a few recognisable details |
| **Thin / atmospheric** | Rain, steam, distant birds, delicate twigs, tiny surface marks | Very sparse; only where needed to suggest motion or depth |

Rules:
- Vary stroke weight intentionally. Do not outline every object with the same thickness.
- Use thick strokes for structure, medium strokes for the principal objects, and thin strokes sparingly for atmosphere.
- Prefer a continuous contour or a small set of connected marks over many disconnected fragments.
- Break a line only when the visual design calls for an opening, overlap, or implied edge.
- Avoid filling object interiors. Use one or two interior marks only where they materially improve recognition.
- Red accents are separate late-stage marks, not a substitute for black structure.

### 4.1 Current renderer constraint — important for production

The current renderer accepts `ordered-ink-wash-paths`. Each entry in `paths` is a palette index plus encoded point data. The renderer reveals the `paths` array progressively, in its stored array order. It does not currently read per-path `strokeWidth`, semantic object names, stage timing, or named pauses.

The renderer completes each path as a filled closed shape. To create the appearance of a line with this schema, author each ink mark as a narrow closed ribbon/contour whose geometry defines the apparent thickness. Use narrow shapes for fine lines, wider shapes for structural strokes, and avoid large filled regions. Do not assume a `strokeWidth` field will affect rendering — it is not part of the current schema.

The human/machine drawing plan records stage names and intent. The actual visible Replay sequence is driven by the order of records in `paths`. Therefore the path array itself must be authored in the specified stage order. Do not shuffle or sort it after authoring.

The existing Replay progressively reveals the whole ordered path stream over `durationMs`. It does not stop at named stage boundaries. Adding stage holds, object-level controls, true open stroke paths, or a new stroke-width engine would require a separate renderer implementation and explicit testing; it is not authorised by this guide update.

## 5. Colour and weather — fixed visual language

### 5.1 Base palette

- Warm ivory / cream paper as the ground.
- Black or near-black ink as the principal drawing colour.
- Optional very restrained soft grey only when a light secondary line materially helps separation or depth.
- Vermilion / muted red as a rare accent.

Keep the artwork predominantly monochrome. Red should normally be limited to one small family of meaningful accents — for example, the sun and a few maple leaves — not scattered decoration.

### 5.2 Weather must not recolour the illustration

**Weather influences the subject and its details, not the overall colour treatment.**

- Clear weather may be suggested by an open sky, a simple sun, a few birds, crisp shadows, or a quiet outdoor object.
- Rain may be suggested by sparse thin rain strokes, a wet sill, a drip, or a sheltered object.
- Wind may be suggested by a tilted hanging object, bent grass, or a few travelling leaves.
- Snow may be suggested by bare branches and a small number of falling flakes.
- Fog may be suggested through restrained broken horizon lines and open paper.
- Storm may be suggested through a few decisive cloud or rain strokes and a protected focal subject.

These are examples, not recipes. Do not add a sun, red maple leaves, a wind chime, a house, or a tea set to every scene. Select details only when they belong to that particular story.

Do not automatically recolour the whole image according to rain, clear, cloudy, day, night, temperature, or device time. Do not create blue cold-weather versions, purple night versions, or darkened night filters. The underlying paper, ink, and accent logic remain stable. Weather selection can choose a different artwork; it must not apply a colour filter to the same artwork.

## 6. Progressive drawing and Replay — mandatory

Replay is part of the artwork's presentation, not an optional decorative effect. Every production asset must have an intentional drawing order.

### 6.1 Global ordering principles

- Establish the setting before the focal objects.
- Draw large structural contours before smaller supporting shapes.
- Draw the main subject after the viewer understands its setting.
- Add sparse atmospheric marks after the main forms, unless the artwork-specific plan intentionally places them earlier.
- Add strong colour accents last unless a user-approved artwork plan explicitly says otherwise.
- Preserve a coherent spatial and visual progression. Do not let unrelated objects appear in arbitrary order.

### 6.2 Artwork-specific direction is required

Each artwork must have its own named drawing plan before path authoring begins. The plan must state:
- artwork ID and title;
- weather tags and one-sentence scene story;
- canvas and approximate 70/30 composition;
- focal subject, setting, and secondary marks;
- the ordered drawing stages;
- intended stroke weight for each stage/object;
- colour-accent stage and exact accent subjects;
- any specific exclusions (objects, clutter, palette, or details not wanted).

A plan for one artwork must never be copied wholesale to another artwork. The global style stays consistent; the drawing sequence and subject composition are specific to that artwork.

### 6.3 Approved sequence — A Rainy Tea Afternoon

This sequence is approved and must be retained exactly in this order:

1. **The door / window frame** — strong, confident structural strokes establish the setting and sill. Use thick weight; keep the shape simple and recognisable.
2. **The tree branch** — draw the flowing main branch, then add only a few selected leaves. Use thick weight for the branch and medium weight for the leaves.
3. **The hills** — add long, elegant, restrained lines in the distance. Use medium-to-thin marks; keep the horizon quiet.
4. **The little house / pavilion** — reveal the small distant structure with only the necessary roof and building lines. Use medium weight; do not add architectural micro-detail.
5. **The kettle and teacup** — draw the principal still-life objects carefully. Use confident medium outlines with a few defining details; leave interiors mostly as paper.
6. **The red essence** — add the red sun, red maple leaves, and only the intended tiny red accents last. Do not introduce additional red decoration.

Replay for this artwork must follow that order. Do not reorder the path records for visual convenience, colour grouping, or compression. Within each stage, draw the most structural marks first and the small details after them.

### 6.4 New artworks

Before drawing a new artwork, first agree the weather and scene with the user. Then prepare its own ordered stages. Do not assume the rainy tea sequence applies to clear weather, wind, snow, or any other condition. A clear-weather drawing plan has not yet been approved; do not invent or register one until the user approves the subject and composition.

## 7. Subject diversity and collection planning

Weather Live Art is a collection of distinct small observations, not one repeated room/window scene.

Before proposing a new artwork, check the current catalogue and record:
- weather condition;
- focal subject or moment;
- setting;
- viewpoint;
- dominant silhouette;
- supporting detail;
- accent colour use;
- proposed Replay order.

Avoid giving consecutive artworks the same focal subject, setting, and composition. Vary interiors, thresholds, courtyards, paths, plants, small objects, water edges, rooftops, and open-air moments, while keeping each illustration restrained. Variation must come from the story and silhouettes, not from adding more detail.

## 8. Production workflow — one artwork at a time

1. Read this guide, `ART-DIRECTION.json`, the active reference, and the current catalogue.
2. Ask/confirm the weather condition if it is not explicit. Never substitute a different condition.
3. Propose one concise scene concept that matches the requested weather and established style.
4. Show one artwork concept at a time. No collages, multi-weather boards, or unrequested batches.
5. Obtain user approval of the subject and composition before preparing an app asset.
6. Write the artwork-specific drawing plan, including its exact Replay order and stroke hierarchy.
7. Create the drawing paths in that order, with geometry suited to the current renderer.
8. Review the full illustration at 10:7 and at actual card scale. Check the 70/30 breathing-space balance and monochrome discipline.
9. Validate the asset schema, palette indices, encoded coordinates, path count, ID, and duration. Confirm that the `paths` array order matches the approved drawing plan.
10. Add one catalogue record and preserve all existing artwork IDs and paths.
11. Package the artwork and catalogue update, validate hashes/manifest, and present it for user upload.
12. Do not claim app or device success until the ZIP extractor, deployment, and actual user test have been confirmed.

Never interpret “more art” as permission to generate a batch. Work one artwork at a time, as requested.

## 9. Production brief — copy-ready base prompt

> Create ONE original LIVE // EARTH Weather Live Art illustration for the approved scene: **[one-sentence scene]**. Use minimalist Japanese-inspired monochromatic black ink line art on warm ivory textured paper. Compose natively for a landscape 10:7 canvas. The illustration should occupy about 70% of the canvas, with roughly 30% remaining as clean, warm paper around it. Use fine, continuous-feeling black ink marks with deliberate variation: thick strokes for structural forms, medium strokes for object-defining outlines, and very few thin strokes for rain, steam, birds, or atmosphere. Prefer simple expressive outlines that suggest objects through silhouette rather than fully describe them. Use almost no filled-black areas. Keep the image predominantly monochrome; use only a very small number of vermilion accents when the approved scene calls for them. Let the requested weather change the scene and its details, never automatically recolour the whole illustration. Keep the composition quiet, balanced, recognisable at small card size, and free of clutter. No text, pseudo-writing, border, watermark, 3D, photorealism, elaborate watercolor wash, dense shading, or extra props. **Artwork-specific ordered drawing plan:** [insert exact approved stages, objects, and stroke weights here]. The final path data must follow this exact order for progressive Replay.

Do not submit this generic prompt by itself. Fill in the weather, scene, negative constraints, and ordered drawing plan every time.

## 10. File, catalogue, and app rules

- All Weather Live Art production material belongs under `Weather/Art/` only.
- Active visual reference: `References/approved-style-reference-002.jpg`. This is a style/composition benchmark, not a display artwork and not part of the artwork catalogue.
- Keep `References/approved-style-reference-001.jpg` as historical material; it is superseded for new artwork and must not be deleted as part of this revision.
- `ART-DIRECTION.json` is the structured companion specification; keep it consistent with this guide.
- `art-library.json` is the app-local artwork catalogue. It links to the production standard and stores artwork-specific drawing plans as metadata. The current renderer ignores production metadata and reads the established artwork fields (`weather`, `dataPath`, `id`); unknown metadata must not be mistaken for runtime drawing instructions.
- Individual artwork files retain the current `schemaVersion: 1` and `renderMode: "ordered-ink-wash-paths"` unless a separately tested renderer change is approved.
- Keep the current encoded canvas at 1000 × 700 and the current 10:7 app card. Export/reference images target 1200 × 840 px, sRGB.
- Do not overwrite or recycle an artwork ID. Add a new ID for a genuinely new scene.
- New approved artwork data is loaded online on demand by the existing renderer. Do not add a remote image-generation service, external art API, or unapproved cache behaviour.
- Do not put production image references into the runtime artwork catalogue.

## 11. Protected boundaries

This guide does not authorise changes to:
- the Weather landscape painter, weather readings, forecast data, typography, or Weather layout;
- the existing 10:7 Live Art card, title/caption/status/Replay overlays, or their behaviour;
- the shared Orb dock, Location privacy, Home, Earth, Moon, Sun, Stacks, or any other view;
- the shared renderer, path decoder, progressive timing, service worker, app shell, network policy, Cache Storage policy, offline/recovery behaviour, or database.

A future renderer enhancement for explicit stage pauses, path semantics, or true stroke-width metadata must be a separate narrow source task with repository inspection, tests, and user approval. Documentation and catalogue metadata must not pretend those features already exist.

## 12. Final quality gate

- [ ] User explicitly selected the weather condition; no substitution.
- [ ] One original scene only; no batch or collage.
- [ ] The subject is instantly recognisable from simple shapes.
- [ ] The illustration occupies about 70% of the canvas; about 30% remains quiet warm paper.
- [ ] The canvas/card remains exactly 10:7.
- [ ] The image is predominantly black ink on warm paper.
- [ ] Stroke weights are intentionally varied: thick structure, medium objects, sparse thin atmosphere.
- [ ] Large filled-black areas are absent or exceptionally rare.
- [ ] Red accents are few, meaningful, and placed at the approved final stage.
- [ ] Weather changes depicted details, not the whole image's colour.
- [ ] No clutter, excess props, dense micro-detail, text, border, or watermark.
- [ ] Artwork-specific drawing sequence is documented and matches `paths` array order.
- [ ] Existing progressive Replay and 10:7 card are preserved.
- [ ] Asset and catalogue schema validate; no protected source behaviour changed.

---

## The collection rule

**One visual language. One quiet scene at a time. About 70% illustration, 30% warm paper. Black ink first, rare red accents last. Every artwork has its own deliberate drawing plan. Replay follows the authored path order.**
