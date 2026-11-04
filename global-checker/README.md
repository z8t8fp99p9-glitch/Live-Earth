# LIVE // EARTH — Global Checker v2.1.1

This directory contains the sectioned Global Checker implementation and append-only post-Image-Engine review.

## Ownership and order

- Collector owns Sections 1–4. The Checker reads them without changing the Collector envelope.
- Global Checker creates Sections 5–8 during the initial review.
- Global Image Engine creates Section 9 and returns one exact candidate or `NO IMAGE SELECTED`.
- Global Checker creates Section 10 as a separate final-image review.
- Global Checker creates Section 11 as a separate post-engine audit and final Editorial eligibility decision.

`Sections 1–9 → Section 10 → Section 11` is strictly append-only.

## Files

- `global_checker_v2.py` — implementation, version 2.1.1.
- `GLOBAL-CHECKER-V2-INTEGRATION.md` — complete eleven-section contract.
- `GLOBAL-CHECKER-V2.1-SECTION10.md` — Section 10 checks and boundaries.
- `GLOBAL-CHECKER-V2.1-SECTION10-INTEGRATION.md` — Section 10 integration details.
- `GLOBAL-CHECKER-V2.1-SECTION11.md` — Section 11 audit and final decision.
- `tests/` — original Checker tests and append-only integration tests.

## Non-negotiable rules

- Section 10 and Section 11 are new entries under `report.sections`.
- No Section 10 or Section 11 check is appended to Section 6.
- The original `report.posts` array is not rewritten after Section 9.
- Sections 1–9 must remain value-identical between the Section 9 report and final Checker report.
- Section 8 remains the original image-rights decision. Section 10 makes an independent decision on the exact final candidate.
- Section 11 combines the original Section 7 text decision and Section 10 image decision. Only `EDITORIAL_READY` is released to Editorial; otherwise the post is `HOLD`.
- Unknown permissions, unknown visual inspection or incomplete checks never silently pass.

The older registry-driven `global_checker.py`, bootstrap and compatibility adapters remain separate components; this package does not silently replace them.
