# LIVE // EARTH Global Checker v2.1.1 — Section 11

**Section owner:** Global Checker  
**Section number:** 11  
**Title:** Post-Engine Audit & Final Editorial Decision  
**Position:** after Section 10 and before Global Editorial.

## Purpose

Section 11 is the separate audit continuation and final Editorial gate after Image Engine Section 9 and Checker Section 10.

It references—but never edits—the original decisions in Sections 1–9. In particular, it does not append to Section 6. It does not rewrite the original `report.posts` records.

## What Section 11 records

For every post, Section 11 records:

- the original Section 7 text decision and its check references;
- the original Section 8 image-rights decision and its check references;
- the Section 9 Image Engine decision and candidate-only status;
- the Section 10 independent final-image decision, candidate identity and hash;
- references to the original Section 6 audit without inserting any new Section 10/11 checks into it;
- hashes of the original Sections 1–9 as they existed when Section 11 was appended;
- every Section 11 final-gate check, decision reasons and final release status.

## Individual Section 11 checks

- `N11-01`: Sections 1–9 are present and preserved as read-only inputs.
- `N11-02`: the original Section 7 text decision is `YES`.
- `N11-03`: the original Section 8 decision is retained and explicitly referenced (`YES`, `NO` or `UNKNOWN`); Section 11 does not replace it.
- `N11-04`: Section 9 did not claim image-rights approval or publication authority.
- `N11-05`: Section 10 independently approved the exact final image.
- `N11-06`: every Section 10 check executed and returned `PASS`.

## Final decision

`APPROVE_FOR_EDITORIAL` / `EDITORIAL_READY` is permitted only when all Section 11 checks pass. Otherwise the result is `HOLD`.

This means an unknown visual-inspection result, missing image, incomplete check, unapproved text or unapproved final image cannot be passed to Editorial as a text-only item. The Newsroom's agreed requirement is that every released post has an approved image.

## Output location

`final_report["sections"]["postEngineAuditAndFinalDecision"]["posts"]`

The Section 11 container also reports counts for posts reviewed, approved for Editorial and held.

## Immutable prior-section contract

The finalizer deep-copies the nine-section report and adds Section 10 and Section 11 as new sibling entries. The prior section objects, Section 6 audit and original post records remain unchanged. Tests compare the exact JSON values before and after finalization.
