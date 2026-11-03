# Global Image Engine ↔ Global Checker contract

## Position in the pipeline

`Global Collector → Global Checker (initial text/provenance review) → Global Image Engine → Global Checker (image review) → Global Editorial Engine → Publisher`.

The Image Engine is not a rights authority and does not publish. It returns a single staged media candidate to the Checker. The Checker evaluates that candidate using the central image policy registry. Only Checker-cleared text and image are eligible for Editorial.

## Checker input

`global-checker/image_engine_handoff.py` provides `build_image_engine_intake(collector_result, checker_result, repository_root=...)`.

The resulting JSON uses `phase: "image-engine-intake"` and contains:

- the complete Manager job envelope and Manager registry version;
- the Checker version and current Checker registry version;
- `imageEngineInputs`, limited to posts with valid lineage, permitted text use, usable title/article identity, and no already-approved image; restricted summaries are omitted from the image search context;
- `postId`, `viewId`, `sourceId`, source/article identity and Checker text-decision ID;
- the original `collectionContext` Manager lineage unchanged;
- search text made from the permitted title and, only when allowed by Checker, the source summary;
- image routes and asset destination read from the central Checker image policy registry.

If the Checker has not explicitly allowed a route for a View, the Image Engine must not use that route. Future Views are registered in the central policy registry; the shared Python Engine has no `ALLOWED_VIEWS` list or per-View code branch.

## Image Engine return

`image-engine/image_engine_newsroom.py` consumes the Checker intake and returns `phase: "checker-image-candidate-return"`.

Each candidate is a strict `LIVE_EARTH_UNIVERSAL_POST_V1` media object. It carries:

- a stable `mediaId` and its parent `postId`;
- `viewId`, `sourceId`, `jobId`, `profileId`, `assignmentIds`, `idempotencyKey`, `configVersion`, `destinationDatabaseId` and `destinationDatabasePath`;
- source page, creator, credit, caption, licence, rights notice and modification record;
- engine/version, staged file path and SHA-256 inside `metadata`.

There is no more than one candidate per post. Existing Manager and post IDs are copied, never generated or replaced by Image Engine. A new `mediaId` is generated only for the newly prepared image asset.

## Checker return review

`global-checker/image_engine_handoff.py` provides `review_image_engine_handoff(...)`.

It verifies the candidate identity, schema, staged-file hash and Manager lineage; merges the candidate against the correct `postId`; then invokes the same Universal Global Checker again. This is the only source of image approval. It returns `editorialEligiblePostIds` only for posts whose text and image both pass and whose text is permitted to be summarized/edited.

## One-image rule and publication boundary

- Maximum one image per post across `media` and `attachments`.
- A previous unapproved image candidate is replaced, not duplicated. Its initial Checker decision remains in the initial Checker report.
- Images remain in private run-scoped staging through Checker review.
- Image Engine does not write to `published/assets/`, any View database, feed, PDF, or public destination.
- Publisher owns the final asset copy and publication after the Checker-to-Editorial process.
- Missing or unknown policy, invalid provenance, hash mismatch, missing IDs, or unsafe path means HOLD/no candidate; approval is never inferred.

## Runner integration boundary

The existing legacy `editorial-engine/newsroom_pipeline.py` currently consumes the earlier `global_checker_workflow` `collection-intake` structure. This patch intentionally does not edit that runner or the Universal Editorial Engine. During the subsequent Editorial/Orchestrator repair, the runner must call `build_image_engine_intake`, pass that envelope to `process_checker_intake`, and return the candidate through `review_image_engine_handoff` before calling Editorial. This avoids silently adapting old story IDs or losing Manager lineage. Until that explicit runner change is made, this Engine contract is implemented and unit-tested but is not yet wired into the legacy scheduled run.
