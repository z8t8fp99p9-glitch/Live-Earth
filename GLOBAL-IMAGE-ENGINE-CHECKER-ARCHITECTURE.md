# LIVE // EARTH — Global Image Engine + Global Checker Architecture

## Final agreed ownership

| Section | Owner | Name | Change rule |
|---|---|---|---|
| 1 | Global Collector | Manager ID Card | Frozen after Collector creation |
| 2 | Global Collector | Full Article | Frozen after Collector creation |
| 3 | Global Collector | Original Image Records | Frozen after Collector creation |
| 4 | Global Collector | Source & Rights Evidence | Frozen after Collector creation |
| 5 | Global Checker | Image URL Checker & Final Image | Frozen after initial Checker review |
| 6 | Global Checker | All the Checks | Frozen after initial Checker review |
| 7 | Global Checker | Text Approval Checks | Frozen after initial Checker review |
| 8 | Global Checker | Image Approval Checks | Frozen after initial Checker review |
| 9 | Global Image Engine | Image Intelligence, Editorial Enhancement & Final Checker Submission | Appended once; immutable after creation |
| 10 | Global Checker | Final Image Verification & Approval | New section; does not edit Sections 1–9 |
| 11 | Global Checker | Post-Engine Audit & Final Editorial Decision | New section; final release decision |

## Flow

`Global Collector (1–4) → Global Checker (5–8) → Global Image Engine (9) → Global Checker (10) → Global Checker (11) → Global Editorial`.

The Image Engine processes each post, prioritises a suitable already-approved original image, and may consider alternatives only under explicit Checker-issued route and temporary-processing permissions. It returns one exact final candidate or `NO IMAGE SELECTED` in Section 9. Section 9 does not grant image rights or publication permission.

Section 10 independently reviews the exact candidate returned by Section 9: candidate identity, source URL and host, Manager/post/source lineage, source and rights evidence, exact use permissions, actual staged bytes, decoded image format, dimensions, file size, SHA-256, and semantic visual suitability when a real visual-inspection adapter is configured.

Section 11 records the source decisions from Sections 7, 8, 9 and 10, continues the audit without modifying Section 6, and makes the final decision about eligibility for the Global Editorial Engine.

## Absolute immutability rule

After Section 9 has been created, Sections 1–9 are read-only. The Checker may read them and record references or hashes in Section 11, but may not edit, rebuild, append to, replace or silently reinterpret any of them.

In particular:

- Section 6 is never extended with Section 10 or Section 11 checks. It remains exactly as it was in the original Checker report.
- The original top-level per-post records are never rewritten with later decisions.
- Section 8 remains the original image-rights assessment. Section 10 is a separate review of the exact final candidate.
- Section 9 remains the Image Engine's immutable report and is never rewritten by Checker.
- Sections 10 and 11 are new sibling entries in `report.sections`; they do not get copied into previous section records.

## Section 11 final release rule

A post is `EDITORIAL_READY` only when the original Section 7 text decision is `YES`, Section 10's exact final-image decision is `YES`, all Section 10 checks are executed and `PASS`, and the Section 11 final audit checks all pass. Otherwise the post is `HOLD`. A missing or unknown image decision is not converted into text-only publication in this pipeline; each released post must have an approved image.

## Protected boundaries

- Collector Sections 1–4 remain untouched.
- Checker Sections 5–8 and Image Engine Section 9 remain untouched after creation.
- Section 6 remains the original audit record; Section 11 is the separate post-engine audit continuation.
- Image Engine never approves rights or publishes.
- Checker verifies the staged bytes independently; it does not create rights merely from technical validity.
- Editorial cannot override Checker decisions.
- Nature and Alien World use the same global engines while retaining separate View databases and asset destinations.

## Package boundary

This package contains the Section 9 engine, Checker Sections 10 and 11, a callable Collector-to-Checker-to-Image-Engine test pipeline, documentation and regression tests. It does not modify the scheduled Newsroom runner or workflow YAML. Production runner wiring, live source-network testing and a configured semantic visual-inspection provider remain separate steps; this package must not be described as production activation until those are tested.
