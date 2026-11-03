# LIVE // EARTH Global Image Engine — shared View-independent engine

## Responsibility

The Global Image Engine receives a rights-limited job from the Universal Global Checker. It finds a relevant image candidate from a Checker-permitted source (currently Wikimedia Commons where the central registry permits it), or creates an original thematic illustration locally. It then returns exactly one candidate per post to the Checker.

The Engine is global: it has no hard-coded Nature/Alien World View allowlist and no View-specific Python branches. Its allowed image sources, local-illustration eligibility and Publisher asset destination come from the Checker-issued configuration and the central image policy registry. A new View is enabled by registering its image policy and asset folder, not by adding a code branch.

## Pipeline

1. Global Checker performs the initial text, provenance, permission and lineage review.
2. Checker creates an `image-engine-intake` envelope with complete Manager IDs, post IDs, permitted search text and configured image routes.
3. Global Image Engine prepares one candidate and returns it in `checkerHandoff`.
4. Global Checker independently evaluates the candidate and rechecks the complete post.
5. Only Checker-cleared text and image are eligible for the Universal Editorial Engine.
6. Publisher later writes the approved staged asset to the assigned View destination.

## IDs and lineage

Every returned media record preserves the original `postId`, `viewId`, `sourceId`, `jobId`, `profileId`, `assignmentIds`, `idempotencyKey`, `configVersion`, `destinationDatabaseId` and `destinationDatabasePath`. The Manager job and `collectionContext` are validated before processing. Missing or mismatched values cause a hold; the Engine never invents replacements.

A new stable `mediaId` is assigned to the newly prepared image and is explicitly linked to its parent `postId`. The media record follows the strict Universal Media schema. At most one image may be attached to a post.

## Image routes

- **Wikimedia Commons:** bounded HTTPS-only API and media requests; allowlisted redirects; exact Commons file page; explicit accepted licence; creator, credit and caption required; restrictive markers rejected; MIME, byte size, dimensions and image decoding validated; normalized locally to JPEG.
- **Original illustration:** local Pillow-generated thematic artwork, derived from the allowed title/search terms rather than View identity. It is visibly labelled `ILLUSTRATION / NOT A PHOTOGRAPH` and explicitly says it is not a literal report depiction or data-accurate scientific visualization.
- No hosted AI image API, API key or cloud generation service is used.

## Approval and publication

Image Engine does not evaluate rights, approve images, make Checker decisions, write View databases, or publish assets. Candidate media includes source evidence, staged path, SHA-256 and Checker review metadata. It remains private in a run-scoped staging directory. The Checker bridge rechecks the image using the central registry. Publisher controls the eventual public asset write.

See `IMAGE-ENGINE-CHECKER-CONTRACT.md` and `../global-checker/image_engine_handoff.py` for the precise input/output contract.

## Version compatibility

The source registry currently accepts Image Engine version `0.2.0` for its local-original-illustration policy. This build preserves that policy-facing version to avoid a mismatch. A future version bump must update the Checker registry's `acceptedEngineVersions` in the same coordinated release.

## Integration boundary for this release

This patch supplies the global Checker-to-Image-Engine contract and the Checker return-review adapter. It does not change the legacy `editorial-engine/newsroom_pipeline.py` runner in this Image Engine phase. That runner still emits the earlier `collection-intake` shape; the new adapter requires the Universal Checker `image-engine-intake` envelope created by `global-checker/image_engine_handoff.py`. The runner must be switched to `build_image_engine_intake → process_checker_intake → review_image_engine_handoff` during the subsequent Editorial/Orchestrator integration step. Until that wiring is complete, do not treat this patch alone as end-to-end Newsroom activation.
