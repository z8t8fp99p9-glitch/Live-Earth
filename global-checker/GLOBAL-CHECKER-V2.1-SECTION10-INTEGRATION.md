# Global Checker v2.1.1 — Section 10 Integration

## Call

```python
final_report = GlobalChecker().finalize_image_review(
    nine_section_report,
    final_image_policies=fresh_exact_candidate_policies,
    staging_root=".image-engine-staging",
)
```

The input must contain Sections 1–9, the Section 9 `checkerHandoff`, and one handoff entry per original post. `staging_root` is mandatory so Checker can independently resolve and hash the staged file.

## Output location

Section 10 records are located at:

`final_report["sections"]["finalImageVerificationAndApproval"]["posts"]`

Section 10 does not insert its result into the older `final_report["posts"]` records. It does not edit any earlier section.

## Image permissions

For an unchanged original image, the exact Section 8 approval may be reused only when the Section 9 candidate URL is identical to Section 5's selected URL and all original Section 8 image checks passed. Section 10 still rechecks the exact staged bytes, hash, host, lineage and visual assessment.

For an alternative image, a fresh `final_image_policies[postId]` object must contain an exact candidate URL, explicit matching policy, allowed hosts and explicit use/attribution/storage permissions. Temporary processing must already have been authorised before retrieval.

## Section 6 and Section 11

Section 10 checks are not copied to Section 6. Section 6 remains unchanged. Section 11 independently records the Section 10 check references and final editorial decision.

See `GLOBAL-CHECKER-V2.1-SECTION11.md` for the final release rule and audit structure.
