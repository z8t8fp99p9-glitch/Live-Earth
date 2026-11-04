# LIVE // EARTH Global Checker v2.1.1 — Section 10

**Section owner:** Global Checker  
**Section number:** 10  
**Title:** Final Image Verification & Approval  
**Position:** after Image Engine Section 9 and before Section 11.

## Purpose

Section 10 is the Checker-owned independent review of the exact image candidate returned by Image Engine Section 9. An Image Engine `READY_FOR_CHECKER_REVIEW` result is a candidate handoff, never legal approval or publication permission.

Section 10 is stored at `report.sections.finalImageVerificationAndApproval`. It does not modify Sections 1–9, the original per-post records, the original summary or any earlier audit.

## What Section 10 verifies

1. The complete Section 9 report, handoff post identity, View/job/source lineage and candidate identity.
2. The exact final image URL and its correspondence to the Section 9 candidate records.
3. The exact Manager ID Card payload and SHA-256, all media-lineage fields, and the post source's membership in the Manager-assigned source list.
4. Explicit source-host and temporary-processing boundaries.
5. Exact source/creator/credit/licence evidence and use permissions for the candidate. An alternative image requires fresh exact-candidate policy; rights do not transfer from the original.
6. Actual staged file presence, safe staging path, byte limit, decoded image type, MIME, dimensions and recomputed SHA-256.
7. Semantic visual suitability only when a real inspector adapter supplies structured evidence. Without it, the outcome is `UNKNOWN` and cannot pass.
8. That Image Engine did not claim rights approval or publication authority.

## Output

Section 10 creates one record per post with its exact candidate URL/hash, decision (`YES`, `NO`, `UNKNOWN`, or `NO IMAGE SELECTED`), individual checks and check counts. It is stored only in the new Section 10 container.

Section 10 does not append its checks into Section 6. Section 6 remains untouched. The final editorial release decision is made separately in Section 11.

## Boundaries

- No changes to Sections 1–9.
- No changes to Section 6 or the original post-level records.
- No source fetching or image downloading by Checker.
- No database writes, public-asset writes or publication.
- No approval inferred from public availability, host identity, credit or technical validity alone.
