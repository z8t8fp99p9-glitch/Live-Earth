# Global Checker — Post-Editorial Verification Contract

**Gate:** `post_editorial_verification.py` v1.0.0  
**Authority:** LIVE // EARTH Global Checker  
**Accepted Editorial adapter:** Universal Editorial Engine Newsroom adapter v2.0.0  
**Mode:** integrity and hand-off verification only

## Position in the Newsroom pipeline

`Global Collection Manager → Global Collector → Global Checker (initial text/provenance review) → Global Image Engine → Global Checker (image review) → Universal Editorial Engine → Global Checker (post-Editorial verification) → Configured View Publisher`

The post-Editorial gate is the final Checker-owned verification boundary immediately before a Publisher is allowed to consume an editorial package.

## Inputs

The gate receives both original, unchanged inputs:

1. The completed `checker-image-review-complete` hand-off from `global-checker/image_engine_handoff.py`.
2. The `editorial-production` package from `editorial-engine/universal_editorial_engine_newsroom.py` v2.0.0.

It verifies that both refer to the same Manager job, View, registered profiles, current Manager and Checker registry versions, and exact eligible post set.

## Required checks

For each Checker-released `postId`, the gate verifies:

- The story ID, `postId`, `sourceId`, View ID, and every Manager lineage field are unchanged.
- The complete `sourceRecord` and `managerLineage` match the exact Collector record and original Manager context.
- The original Checker PASS record, text decision, image decision, lineage decision, and internal-only designation remain exactly attached.
- Exactly one image remains attached. Its `mediaId`, parent `postId`, `sourceId`, View ID, media metadata, and Manager lineage match the image that the Checker approved.
- The summary is derived from the exact Checker-cleared source summary. For source summaries up to 500 words, the source is preserved exactly. For longer sources, the summary must be 200–500 words and consist only of exact source sentences in source order, or the explicit unchanged-prefix boundary fallback emitted by the approved adapter.
- The word count, summary status, method and SHA-256 digests agree with the actual source and generated summary.
- Live Feed and Magazine layouts reference the same summary, title, and single approved `mediaId`.
- Transient summary evidence matches the source summary and output digests and remains marked Checker-only.

A source summary under 200 words is not padded. It must be preserved exactly and marked `SOURCE_UNDER_200_WORDS`.

## Decision semantics

The gate emits `PASS` only when the entire package passes. Any global or per-story failure emits `HOLD`, and `releaseForPublisher` is false. The `approvedStoryIds` list is empty on HOLD. There is no partial release from a mixed PASS/HOLD package.

The gate does **not** create or replace rights decisions. Existing Global Checker text, image, lineage and eligibility decisions remain the sole authority. This stage checks integrity and contract compliance after editorial production; it does not independently grant copyright, storage, transformation or display permissions.

The gate does not edit the story, rewrite the summary, replace an image, rank or moderate content, fetch source websites, open/write a database, publish feeds/PDFs, or copy public assets. Both input objects are checked for mutation and remain unchanged.

## Publisher boundary

The verification report is internal-only and must never be published. The Publisher may consume a story only when `verdict` is `PASS`, `releaseForPublisher` is true, and its `postId` is in `approvedStoryIds`.

The Publisher must use the report's `decisionBoundary.publisherPublicFieldAllowlist`. It must never expose the gate's internal fields, including `sourceRecord`, `managerLineage`, `checkerDecisions`, `checkerRecord`, `checkerReportVisibility`, or transient `evidence`. The staged image is still private; only the Publisher may perform the approved asset-copy operation to the relevant View's own asset destination.

## Python API

```python
from post_editorial_verification import review_editorial_package

result = review_editorial_package(
    checker_handoff,
    editorial_package,
    repository_root=".",
)

if result["verdict"] == "PASS" and result["releaseForPublisher"]:
    # Pass only approvedStoryIds plus the unchanged package to the matching View Publisher.
    ...
else:
    # HOLD: do not publish or write a View database.
    ...
```

## Standalone CLI

```bash
python global-checker/post_editorial_verification.py \
  --checker-handoff-file checker-image-review-complete.json \
  --editorial-package-file editorial-production.json \
  --repository-root .
```

Exit code `0` means PASS. Exit code `2` means HOLD or a blocked verification. JSON output is an internal report, not publication content.

## Integration status

This module and its focused unit tests establish the post-Editorial Checker contract. The existing `editorial-engine/newsroom_pipeline.py` remains a legacy runner and has not yet been migrated to the new v2.0 Checker → Image Engine → Checker → Editorial contract. The Global Pipeline Orchestrator must call this gate after `produce_editorial_package(...)` and before any Publisher or database writer. Scheduled Newsroom runs must remain inactive until that orchestration and end-to-end path are migrated and tested.
