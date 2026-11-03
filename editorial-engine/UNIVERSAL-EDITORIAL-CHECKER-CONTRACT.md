# Universal Editorial Engine — Global Checker Handoff

**Adapter:** `universal_editorial_engine_newsroom.py` v2.0.0  
**Core production Engine:** `universal_editorial_engine.py` v1.3.0  
**Authority:** LIVE // EARTH Global Checker only

## Position in the global pipeline

`Global Collection Manager → Global Collector → Global Checker (initial text/provenance review) → Global Image Engine → Global Checker (image review) → Universal Editorial Engine → Global Checker (post-Editorial verification) → configured View Publisher`

The Editorial Engine receives its input from the completed Checker hand-off. It never receives an independent editorial instruction or rights decision from the Image Engine. After editorial production, the unchanged Checker-cleared hand-off and editorial package go to `global-checker/post_editorial_verification.py` for a final integrity PASS/HOLD before Publisher release.

## Checker input contract

The Newsroom adapter accepts only the completed Checker result produced by `global-checker/image_engine_handoff.py`:

- `phase` must be `checker-image-review-complete`.
- Checker identity and version must match the registered Universal Global Checker.
- Manager and Checker registry versions must still match the current registries.
- Each `editorialEligiblePostIds` entry must have a matching Checker `PASS` record, an allowed text decision with `summaryAllowed=true`, no field restrictions, a passed lineage result, and an allowed image decision.
- The original Collector record must contain exactly one image across `media` and `attachments`; the Checker image decision must reference that exact `mediaId`.
- The post's full `collectionContext` and the complete Manager job must match field-for-field.

The Engine does not calculate eligibility. It verifies that the expected Checker-issued hand-off has arrived and that the associated IDs and image remain attached.

## Editorial Engine responsibilities

The Universal Editorial Engine performs only editorial production:

1. Prepare a 200–500-word extractive summary from the Checker-cleared summary text when enough permitted source material exists.
2. Preserve the complete Checker-cleared source post separately and unchanged. The generated summary never replaces the source record.
3. Preserve every Manager field, `postId`, `sourceId`, `mediaId`, source metadata, provenance, Checker decision and source URL.
4. Keep exactly one Checker-cleared image attached to each editorial story.
5. Prepare Live Feed and Magazine layout data from the same editorial story and image.

When the permitted source summary itself contains fewer than 200 words, the Engine returns it intact and marks `SOURCE_UNDER_200_WORDS`. It never pads a short source or invents details to satisfy the target range.

## Explicit non-responsibilities

The Editorial Engine does not:

- grant or interpret copyright, storage, transformation or display permissions;
- decide whether a post is eligible for editorial work;
- create or approve image rights decisions;
- independently fact-check, moderate, rank, curate or classify posts;
- discard Checker-approved source fields, change source IDs or regenerate Manager IDs;
- fetch websites, write View databases, publish feeds, copy public assets or generate PDFs directly in this hand-off stage.

The existing shared production core and its Live Feed / Magazine output capability remain in place. This adapter prepares a common editorial story package for the configured Publisher/output renderer.

## View independence

There is no `ALLOWED_VIEWS` constant or Python branch for Nature, Alien World, or another individual View. The adapter resolves the View ID, enabled profile, profile ID and destination identity from the Manager registry. A future View can use the same Engine when it is registered in the Manager configuration and the Checker issues a matching hand-off.

## Internal data handling

The complete source record and Checker evidence are carried transiently for provenance and summary traceability. They are not public feed fields and are not written to a database by the Editorial Engine. The Publisher must render only the explicit public fields allowed by the final Checker verification report, not the internal Checker/source evidence objects.

## Integration note

The existing `editorial-engine/newsroom_pipeline.py` is still the legacy adapter for the earlier `collection-intake` schema. It has not yet been migrated in this package. Before a scheduled end-to-end Newsroom run, the Global Pipeline Orchestrator must use this order:

1. Run Universal Global Checker on the Universal Collector batch.
2. Call `build_image_engine_intake(...)` in `global-checker/image_engine_handoff.py`.
3. Call the Global Image Engine with that Checker-issued intake.
4. Call `review_image_engine_handoff(...)` so Checker reviews the returned image candidate and creates `editorialEligiblePostIds`.
5. Pass that completed Checker hand-off to `produce_editorial_package(...)`.
6. Pass both the original completed Checker hand-off and the unchanged Editorial package to `review_editorial_package(...)` in `global-checker/post_editorial_verification.py`.
7. Allow the configured View Publisher to receive the package only when the final Checker report returns `verdict="PASS"`, `releaseForPublisher=true`, and the story ID is in `approvedStoryIds`.

The existing legacy scheduled runner, database writer and public Publisher have not yet been migrated or end-to-end verified. This stage is a tested post-Editorial integrity gate, not a claim that the scheduled pipeline is active.
