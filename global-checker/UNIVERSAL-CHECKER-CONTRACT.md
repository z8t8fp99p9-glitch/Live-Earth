# LIVE // EARTH — Universal Global Checker Contract v2

## Role boundary

The Global Checker is a rights, permissions, provenance and compliance decision system only. It is not a Collector, Editor, Moderator, Curator, Publisher, summarizer or rewriting engine.

It MUST NOT modify, rewrite, summarize, shorten, enrich, rank, classify editorial quality, choose a headline, generate content, or change the body of a post. It returns decisions, evidence references, field-use restrictions and reasons. The downstream pipeline enforces a HOLD or an allowed-use restriction; it does not ask the Checker to edit the content.

The Checker does not write post/story records or public feeds. An optional audit connection may receive only the additive internal `global_checker_audit_log` rows.

## Universal input

Input is the Global Collector batch with `recordSchema=LIVE_EARTH_UNIVERSAL_POST_V1`, the complete Manager job envelope, and `records[]` using the one universal post schema.

Every post is checked against the same schema. View-specific source rights are configuration entries, not Python branches. `views: ["*"]` explicitly makes a rights policy reusable across registered Views; a named View list restricts a policy. New Views are not added to the Checker source code.

## Identity and lineage checks

For every post, validate:

- `postId`, root `viewId`, and `sourceId`.
- `collectionContext.jobId`, `idempotencyKey`, `viewId`, `profileId`, `assignmentIds`, `sourceIds`, `feedUrls`, `destinationDatabaseId`, `destinationDatabasePath`, and `configVersion` against the Manager job.
- `sourceFeedUrl` is in the job feed URLs; `sourceId` is in job source IDs; `provenance.assignmentId` is in the job assignment IDs.
- The single image, when supplied, carries its `mediaId`, parent `postId`, `viewId`, `sourceId`, and the same Manager lineage fields.
- At most one image may be attached to a post. More than one image is a structural HOLD.

The Collector validates its Manager registry contract. The Checker verifies that the same job identity and source assignment references survive into each post and image; it does not invent or replace IDs.

## Rights and provenance checks

1. Exact HTTPS article URL, source feed URL, source identity and registered route.
2. Source policy and View applicability from the central versioned registry.
3. Source/item copyright, licence and restrictive notices, including third-party authorship signals.
4. Storage, temporary processing, transformation and display permissions as separate uses.
5. Headline/link-only restrictions and source-summary permissions.
6. Full-article temporary-processing and raw-text storage permissions. Full article content is not automatically allowed because a feed summary is allowed.
7. Image checked independently against its exact source page, creator, licence, credit, caption, modifications and item-level restriction signals.
8. NASA image checks include exact originating-article association, third-party restrictions, brand/logo exclusion and concept-art/illustration distinction.
9. Original Image Engine artwork requires registered engine/version/provenance and a clear non-documentary caption and rights note.
10. Missing, conflicting or unregistered evidence fails closed as UNKNOWN/HOLD.

Automated checks are internal safeguards, not a legal opinion or guarantee that all rights have been disclosed by the source.

## Educational and non-commercial context

The registry records the project's educational/non-commercial purpose as context. It does not convert that purpose into a blanket copyright licence or override source terms. A source-specific policy must still expressly allow the intended storage, processing, transformation and display route, or the material is held. Attribution is required where the applicable source policy requires it, but attribution alone is never permission.

## Internal audit

The optional audit log records one lineage result, one text result, one image result when an image exists, field restrictions, and a post-level outcome. Each row includes the post ID, optional media ID, View/source IDs and the complete Manager lineage. Decision rows are appended with unique decision IDs; repeated checks do not overwrite prior decisions.

The audit log stores decision metadata and policy evidence, not raw source body text. The `internal_audit.query_audit()` API can filter by `postId`, `jobId` or `viewId`. Reports are marked `INTERNAL_ONLY_NOT_FOR_PUBLICATION` and must never be added to a Live Feed.

## Explicit non-responsibilities

- No collection or network fetching.
- No database writes to story/post records.
- No content editing, summarization or editorial decision.
- No publication or feed generation.
- No assumption that non-commercial educational use automatically authorizes reuse.
