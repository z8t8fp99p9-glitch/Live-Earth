# LIVE // EARTH Global Image Engine — Section 9

**Section owner:** Global Image Engine  
**Section number:** 9  
**Engine version:** 1.0.0  
**Position:** after Global Checker Sections 1–8 and before Checker Sections 10 and 11.

## Purpose

The Image Engine appends Section 9 to the existing eight-section Global Checker report. It processes every post. An already-approved original image receives first priority; an unsuitable, inaccessible or unapproved original is not silently reused, and alternatives are considered only through routes explicitly authorised by Checker.

Section 9 returns one final image candidate (or `NO IMAGE SELECTED`) together with the image's identity, provenance, technical assessment, visual assessment, editorial enhancement notes, staged file hash and every individual check. Checker independently creates Section 10; Section 11 then records the audit continuation and final Editorial decision. `READY_FOR_CHECKER_REVIEW` is a handoff state, not rights approval.

## Section 9 contents

1. **Source and candidate identity** — post ID, candidate ID, original URL, source page, creator, credit, licence and originating article association.
2. **Image retrieval and provenance** — Checker-approved host allowlist, temporary-processing permission, final response URL, MIME and byte limit.
3. **Image integrity and duplicates** — successful decode, exact SHA-256 and perceptual dHash to identify exact or near duplicates among candidates.
4. **Visual intelligence** — an injectable semantic visual-inspector adapter. Without one, semantic understanding remains `UNKNOWN`; the engine never invents depicted people, places or events from the filename or article.
5. **Story relevance and context** — metadata relevance signals, plus visual relevance and misrepresentation warnings only when an inspector actually returns them.
6. **Technical quality** — decoded format, width, height, aspect ratio, byte size, grayscale variance and edge-energy indicators. These are technical signals, not an invented subjective quality score.
7. **Selection and preparation** — approved original priority; alternatives only under explicit Checker route/processing policy; the original is copied byte-for-byte. No crop, resize or recompression is performed by default.
8. **Editorial enhancement** — source-grounded caption and alt-text suggestions, context notes, layout recommendation and crop guidance. No visual claims are invented.
9. **Final Checker submission** — one exact candidate, staged path, SHA-256, evidence, per-candidate audit and Section 10 handoff reference; the final audit and release decision follow in Section 11.

## Input contract

`ImageEngineSection9.run(checker_report, route_policies=..., discovered_candidates=..., candidate_discoverer=...)`

- `checker_report`: full Global Checker v2.1.1 report with Sections 1–8 and per-post Sections 5/8.
- `route_policies[postId].allowedHosts`: explicit HTTPS host allowlist. No arbitrary host is fetched.
- `route_policies[postId].temporaryProcessingAllowed`: explicit permission for a not-yet-approved alternative to be downloaded for temporary inspection.
- `route_policies[postId].modificationAllowed`: optional. This version does not modify images; it always retains source bytes unchanged.
- `route_policies[postId].discoveryRoutes`: explicitly enabled source routes. For built-in Commons, `wikimediaCommons` must include accepted licences, its own HTTPS `allowedHosts`, and `temporaryProcessingAllowed: true`. For local illustration, `localIllustration.enabled` and the unchanged Manager job envelope are required; the internal route uses only its fixed asset-host allowlist. The source image allowlist is not silently expanded for unrelated external candidates.
- `discovered_candidates[postId]`: optional candidate metadata from a policy-authorised discovery connector.
- `candidate_discoverer`: optional callback receiving `post_id`, article `context`, `policy` and `checker_post`.
- `visual_inspector`: injected at engine construction. It can be a callable or an object exposing `inspect(image_path=..., context=..., candidate=...)` and returns a structured object with `status`, `description`, `visibleEntities`, `eventContext`, `articleRelevance` and `misrepresentationWarnings`.

## Output contract

The returned full report preserves Checker Sections 1–8 unchanged, appends `sections.imageIntelligenceEditorialEnhancementAndFinalCheckerSubmission`, extends `sectionOrder` to nine entries, and includes:

- `imageEngine` execution summary;
- per-post Section 9 report;
- `checkerHandoff.phase = checker-image-final-review`;
- exact final candidate reference, staged path and SHA-256;
- `imageRightsApproved = false` and `publicationAuthorized = false`.

A missing image is returned as `NO IMAGE SELECTED`, not a guessed URL or an invented image. One candidate maximum is submitted per post.

## Safety boundaries

- Image Engine never approves rights, changes Checker Sections 5–8, edits Collector Sections 1–4, writes a View database or publishes.
- An initial Section 8 `YES` gives the original first priority but does not bypass the fresh Section 10 review of the exact final candidate.
- A Section 8 `NO` candidate is not reused as if it were approved. A new alternative needs explicit temporary-processing permission and will be rechecked by Section 10, then evaluated for release in Section 11.
- Download requests are HTTPS-only, host-allowlisted, redirect-allowlisted, size-bounded and MIME-checked.
- The source image is retained byte-for-byte. Derivative creation is not performed in this version.
- The module does not claim semantic visual inspection when no vision adapter is configured. In that case `visualIntelligence.status = UNKNOWN` and the reason is included in the report.
- The Engine never infers legal permission from a domain name, educational purpose, non-commercial purpose, credit line or public availability.

## Existing component compatibility

The existing `image-engine/image_engine.py` remains unchanged and retains its registered core version `0.2.0`. This new Section 9 coordinator is a separate `1.0.0` layer. It can use the existing core's bounded Wikimedia Commons and local-original-illustration routes only when the per-post Checker route policy explicitly enables them. No source registry, Checker registry or View-specific allowlist is modified by this module.
