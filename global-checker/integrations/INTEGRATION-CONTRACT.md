# Global Checker — universal Collector handoff contract

**Interface version:** 2.0.0  
**Input:** Global Collector result using `LIVE_EARTH_UNIVERSAL_POST_V1`  
**One Checker:** all Manager-registered Views use the same implementation.

## 1. Pipeline position

`Global Collection Manager → Global Collector → Global Checker → downstream storage gate → Universal Editorial Engine → Global Image Engine (when required) → Global Checker final approval → View Publisher`

The Collector gathers and normalizes. The Checker evaluates rights, permissions, provenance and lineage. The Checker does not edit or summarize. Downstream gates enforce its decisions without asking it to rewrite a post.

## 2. Generic input and routing

The input object contains:

- `recordSchema: LIVE_EARTH_UNIVERSAL_POST_V1`
- `managerRegistryVersion`
- `job`: the full Manager job envelope
- `records`: universal posts

The universal Checker takes `viewId` from the validated Manager job. It does not enumerate Views in Python. Source policies in `source-registry.json` must either list the relevant View or deliberately use `views: ["*"]`. New sources begin UNKNOWN until registered.

Use `check_collection(collector_result, audit_connection=existing_view_db_connection)`. The caller supplies the already-open database connection; the Checker does not open a database or create a new View database.

## 3. Immutable identity chain

For every post the Checker requires `postId`, `viewId`, `sourceId` and a `collectionContext` matching the Manager job, including:

- `jobId`, `idempotencyKey`, `viewId`, `profileId`
- `assignmentIds`, `sourceIds`, `feedUrls`
- `collectorEntrypoint`, `collectorWorkflow`
- `destinationDatabaseId`, `destinationDatabasePath`
- `scheduledAt`, `requestWindowHours`, `configVersion`, `trigger`

The post's source feed must belong to the job, the source ID must belong to `sourceIds`, and `provenance.assignmentId` must belong to `assignmentIds`.

A post may carry no image or one image. More than one image is a structural HOLD. The single image must carry its own `mediaId`, parent `postId`, `viewId`, `sourceId`, and the matching Manager identity fields. No media ID or parent ID is generated/replaced by the Checker.

## 4. Decision semantics

- GREEN: evidence supports the exact registered use.
- AMBER: only the recorded limited use is supported.
- RED: a restrictive or prohibited route was identified.
- UNKNOWN: evidence is missing, conflicting or unregistered.
- PASS/HOLD in the report summarizes the structural, text, image and field-use results. It is not an editorial quality rating.

Text and image decisions are independent. A text approval never clears an image. An image approval never grants rights to the article text. The final publication stage must use the same post ID and the same evidence identity when rechecking the output.

A text route that permits a headline/link but not a summary is returned with an explicit field restriction. A source summary approval does not automatically permit full-article retrieval or raw-body storage. The Checker does not remove those fields; the downstream storage gate must enforce the field restrictions before storage.

## 5. Image decision

The image evaluator is configuration-driven. It supports the current central NASA, Wikimedia Commons and original Image Engine policies for any registered View, subject to exact source/image conditions. Additional routes belong in `imagePolicies.sourcePolicies` with explicit View scope, article domains, image domains, source-page domains, accepted licences and required evidence fields.

Unknown image providers, unregistered licences, missing creator/credit/caption/source page, mismatched article association or restrictive/third-party markers are held.

## 6. Internal audit

`global_checker_audit_log` is created additively in the caller-supplied View DB. The Checker writes only decision/audit metadata, not post/story content. Rows are append-only and contain the complete Manager ID chain, post ID, optional media ID, stage, verdict, pass/hold, policy ID/version, decision ID and evidence/reasons.

Use `internal_audit.query_audit()` or `internal_audit_cli.py` to inspect the results by `postId`, `jobId` or `viewId`. This audit data is internal only and is not a Live Feed field, Editorial Engine input, or public output.

## 7. Strict role boundary

The Global Checker MUST NOT fetch or collect sources, change post fields, write post/story tables, summarize, rewrite, enrich, rank, moderate, curate, generate images, format publications, or publish feeds. It returns decision data only. A separate downstream gate enforces storage/display restrictions and publication approval.

The existing Nature/Alien World automatic adapters are retained only for compatibility with their current workflows. Their two-View dispatcher is not the route for future Views. Future Views use this universal interface and registry configuration, then receive an end-to-end test before activation.

## 8. Educational/non-commercial purpose

Educational and non-commercial purpose is context, not blanket authorization. A source's explicit licence/terms, item-level restrictions and the intended storage/processing/transformation/display use still control. Where the registry cannot establish the right, the result is UNKNOWN/HOLD. Automated checks do not replace legal review for uncertain cases.
