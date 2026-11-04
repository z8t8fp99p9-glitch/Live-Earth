# Global Checker v2.1.1 — Eleven-Section Integration Contract

## Agreed order

1. Global Collector produces Sections 1–4.
2. `GlobalChecker.run()` creates Checker Sections 5–8.
3. `ImageEngineSection9.run()` receives that report and appends Section 9 for every post.
4. The complete nine-section report and its `checkerHandoff` return to `GlobalChecker.finalize_image_review()`.
5. Checker appends Section 10, the independent exact-image review.
6. Checker appends Section 11, the post-engine audit and final Editorial decision.
7. The original Sections 1–9 remain unchanged. Section 6 is not extended. The original `posts` array is not rewritten.
8. Only Section 11 posts with `releaseToEditorial: true` and `editorialEligibility: EDITORIAL_READY` may proceed to Editorial.

## Required API

```python
from global_image_pipeline import run_global_image_pipeline

final_report = run_global_image_pipeline(
    collector_batch,
    staging_dir=".image-engine-staging",
    text_policy=text_policy_by_source,
    image_policies=initial_exact_image_policies,
    image_engine_dispatch=checker_issued_image_routes,
    final_image_policies=fresh_exact_alternative_policies,
    discovered_candidates=authorised_candidates_by_post,
    candidate_discoverer=authorised_discovery_callback,
    visual_inspector=vision_adapter,
)
```

The initial Checker phase does not accept the obsolete `image_engine_candidates` argument. Section 5 candidates come from Collector records only. Image Engine candidates are submitted later in Section 9 and independently evaluated in Section 10.

## Permissions and host boundaries

All source and use permissions are explicit policy inputs. A policy ID alone is not approval. `imageEngineDispatch[postId].allowedHosts` must be explicit. Alternatives require `temporaryProcessingAllowed: true` before retrieval. A different final image requires a fresh Section 10 policy with the exact candidate URL, explicit allowed hosts and explicit use/attribution/storage permissions.

No permission is inferred from a well-known domain, public availability, educational purpose, non-commercial purpose or credit.

## Manager and Collector lineage

Section 9 requires the full Section 1 Manager ID Card payload and SHA-256. It preserves the exact job envelope, Manager IDs, profile/assignment/source IDs, idempotency/configuration values and destination database details. Section 10 independently verifies the Manager payload/checksum, media lineage and that the post source ID belongs to the Manager-assigned `sourceIds`.

Collector Sections 1–4 remain unchanged. The Checker accepts the current nested Collector schema and earlier separate-section schema without reconstructing the source values.

## Section 10 and Section 11 contracts

**Section 10 — Final Image Verification & Approval** contains the independent checks for the exact Section 9 candidate. It is stored only at `report.sections.finalImageVerificationAndApproval.posts[]`.

**Section 11 — Post-Engine Audit & Final Editorial Decision** references the original decisions from Sections 7 and 8, Section 9's candidate-only handoff, and Section 10's independent result. It is stored only at `report.sections.postEngineAuditAndFinalDecision.posts[]`.

Section 11 final rule:

- `APPROVE_FOR_EDITORIAL` / `EDITORIAL_READY`: Section 7 is `YES`, Section 10 is `YES`, every Section 10 check is executed and `PASS`, and all Section 11 checks pass.
- `HOLD`: any other outcome, including no image candidate or `UNKNOWN` visual inspection.

## Absolute immutability contract

The finalization function deep-copies the nine-section report and adds only two new sibling keys under `report.sections`, plus their names in the top-level `sectionOrder` index. It does not alter any existing section object, including Section 6. It does not alter `report.posts`, the existing summary or previous boundaries.

The integration tests compare every Section 1–9 object and the entire original `posts` array before and after finalization.

## Boundary

This is a callable pipeline and test contract. It does not modify the scheduled Newsroom runner, workflows, database writer, View publishers or feeds. Production runner wiring and live smoke tests remain separate work.
