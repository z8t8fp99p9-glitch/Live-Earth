# LIVE // EARTH — Global Checker

**Role:** shared, View-independent rights, provenance and approval service.  
**Current registration state:** Nature and Alien World are retired. Their historic policies and pipelines are not active Manager assignments. The shared Checker implementation remains available for future approved Views.

## Ownership and report order

- Collector owns Sections 1–4 and supplies them as source evidence. Checker reads these sections without changing them.
- Global Checker creates Sections 5–8 during initial review.
- Global Image Engine creates Section 9 and returns one exact candidate or `NO IMAGE SELECTED`.
- Global Checker creates Section 10 as a separate final-image review.
- Global Checker creates Section 11 as a separate post-engine audit and final Editorial eligibility decision.

`Sections 1–9 → Section 10 → Section 11` is append-only.

## Non-negotiable rules

- Section 10 and Section 11 are new entries under `report.sections`.
- No Section 10 or Section 11 check is appended to Section 6.
- The original `report.posts` array is not rewritten after Section 9.
- Sections 1–9 remain value-identical between the Section 9 report and the final Checker report.
- Section 8 remains the original image-rights decision. Section 10 independently reviews the exact final candidate.
- Section 11 combines the original text decision and the final-image decision. Only the configured ready decision is released to Editorial; otherwise the post is held.
- Unknown permissions, unknown required visual inspection or incomplete checks never silently pass.
- Technical image validity does not create rights permission.

## Component map

- `global_checker_v2.py` — sectioned Checker implementation.
- `GLOBAL-CHECKER-V2-INTEGRATION.md` — eleven-section integration contract.
- `GLOBAL-CHECKER-V2.1-SECTION10.md` and related integration note — Section 10 review.
- `GLOBAL-CHECKER-V2.1-SECTION11.md` — Section 11 audit/final decision.
- `tests/` — original and append-only integration tests.

Older registry-driven checker modules, bootstraps and compatibility adapters remain distinct components. Do not assume this sectioned Checker silently replaces them; inspect the active entrypoint and its caller before changing integration.

## Reusable source-policy principles

Rights are item- and use-specific. Text and images are separate works. Public access, attribution, source URL or educational/non-commercial intent is not a blanket reuse grant. Unregistered/unknown sources or missing evidence are held. The current policy registry and the Manager job—not a historical dated note—determine whether a future View is allowed to use a source.
