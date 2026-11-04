# LIVE // EARTH — Live Feed Editor (Section 12)

**Component:** `editorial-engine/live_feed_editor.py`  
**Editor version:** 1.0.0  
**Input:** completed Global Checker v2.1.1 report with Sections 1–11  
**Output:** append-only Section 12, `Live Feed Output`

## Responsibility

The Editor takes only the material needed to assemble a Live feed package:

- Section 11 `releaseToEditorial` / `EDITORIAL_READY` is the single editorial eligibility gate.
- Section 2 supplies the permitted full-article text, headline and canonical article URL. The existing Checker Section 7 explicitly handles full-article permission; the Editor does not repeat that decision.
- Section 9 supplies the final image candidate and its metadata.
- Section 10 supplies the final approved image URL and SHA-256.
- Section 8 may supply attribution fields when the final image metadata does not contain them.

It creates one new Section 12 card with the Live headline, extractive summary, exact approved image reference and Live feed payload. It does not repeat Checker checks, create rights decisions, find or replace images, fetch websites, write a database, or publish.

## Summary behavior

The Editor reuses the existing local TF-IDF/TextRank/MMR and source-locked composition routines. Only the Live target is different:

- Allowed range: 100–150 words.
- Preferred range: 120–130 words.
- A permitted source of 150 words or fewer is preserved after safe cleanup and near-duplicate removal; it is never padded.
- Longer material is reduced using complete verbatim source sentences in their original order.
- If complete sentences cannot safely fit the Live limit, the post is held instead of cutting sentences or inventing text.

## Append-only behavior

The function deep-copies its input report, appends `sections.liveFeedOutput`, and appends `liveFeedOutput` to `sectionOrder`. It refuses to overwrite an existing Section 12. Sections 1–11, the original top-level `posts`, and other pre-existing report fields are preserved.

## Run

From the repository root after saving the completed Checker report as JSON:

```bash
python editorial-engine/live_feed_editor.py --checker-report-file checker-report.json --output-file checker-report-with-live.json
```

The original Checker report is read-only. The new file contains the original report plus Section 12.

## Integration boundary

This module is an additive Editor component for the v2.1.1 eleven-section report. The repository's current scheduled `newsroom_orchestrator.py` still uses the older v2.0 handoff contract. Therefore this addition does not claim that the scheduled Nature/Alien World workflows have been migrated to the 11-section report or that the new Editor is already invoked by those workflows. That separate orchestration migration must be completed and tested before a scheduled run can use Section 12.
