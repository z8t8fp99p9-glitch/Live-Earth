# LIVE // EARTH — Global Checker Section 13

**Component:** Existing Global Checker v2.1.1 continuation  
**Section:** 13 — Post-Editorial Final Verification  
**Input:** Completed Sections 1–12, including Live Feed Editor Section 12  
**Output:** One append-only Section 13 card  
**Database / publication authority:** None

## 1. Ownership and append-only rule

Section 13 continues the existing `GlobalChecker` class and preserves the registered identity:

- Checker: `LIVE // EARTH Global Checker`
- Version: `2.1.1`
- Section 13 owner: the same Global Checker
- Section 13 key: `postEditorialFinalVerification`

Importing `section13_final_verification.py` attaches `finalize_post_editorial_review()` to the existing `GlobalChecker` class. It does not define a second Checker identity or replace Sections 1–11.

The function deep-copies its input. It requires exactly Sections 1–12, in their registered order, and refuses to overwrite an existing Section 13. It compares Sections 1–12, the original Checker `posts` array, and all pre-existing top-level report fields before returning. Only Section 13 and the final `sectionOrder` entry are added.

## 2. Per-post checks

Every Section 13 check includes a stable check ID, check name, evidence reference, expected value, actual value, result, mandatory flag, and reason.

| Check IDs | Verification |
|---|---|
| C13-01–02 | Section 11 release/hold is preserved; a held post cannot become READY in Section 12 |
| C13-03, C13-06 | Section 2 article, original headline, and canonical HTTPS source URL |
| C13-04–05 | Summary recomputed using the existing Live Feed Editor; source and summary SHA-256, sentence trace, sentence order, complete-sentence extraction, and word-count rule |
| C13-07–10 | Section 9/10 final-image URL and SHA-256, exact Section 12 image object, creator, credit, caption/alt text, rights basis, source page, and Section 4 rights-evidence linkage |
| C13-11 | Manager job, View, source, post and image lineage; active Manager View-profile match; Manager ID Card hash; immutable Section 1–9 hashes; original Checker post-record hash |
| C13-12–13 | Minimum story hand-off fields and registered View destination identity; consistency of the nested Live Feed object and Section 12 input references |
| C13-14, C13-19 | Explicit safety/privacy/rights flags and obvious email/phone patterns in public summary metadata |
| C13-15 | Explicit `NOT_APPLICABLE` record: this deterministic checker does not claim independent semantic fact-checking |
| C13-16 | Duplicate canonical article URL detection within the batch |
| C13-17–18 | No raw article-body leakage into Section 12; Section 7 full-article use permission and text-rights checks |

The summary verification re-runs the registered local Editor function. It does not invent, paraphrase, pad, truncate, or reorder sentences. A permitted source of 150 words or fewer may be preserved without padding; the short-source exception is explicitly recorded.

The image check reuses the registered Editor's exact Section 9/10-to-12 image assembly function. It does not select or replace an image, fetch a URL, or independently grant image rights.

## 3. Outcomes and release rule

Supported per-check outcomes are:

- `PASS`
- `FAIL`
- `HOLD`
- `NOT_APPLICABLE`

`NOT_APPLICABLE` is recorded with an explanation and is never counted as a pass. Every mandatory check must be `PASS`. Any `FAIL` or `HOLD` blocks the post.

Per-post final decisions are:

- `APPROVE_FOR_DATABASE`
- `HOLD`

Section 13 produces itemised per-post reports and aggregate counts for received, approved, held, and check outcomes. A Section 12 Editor hold may reduce the READY count without invalidating the batch; inconsistent aggregate counts hold the entire batch.

## 4. Boundaries

Section 13 does not open or write either View database, archive the report, fetch source websites, download/replace images, or publish a feed. It only appends a verification record in memory or to the explicitly selected JSON output file when run from its CLI.

`APPROVE_FOR_DATABASE` is the Section 13 content/evidence gate. It is **not** proof that the current v2.0 Writer can consume Sections 1–12: the existing Writer still requires its registered legacy Checker hand-off, Universal Editorial Engine package, and verification contract. A strict adapter is a separate required integration step. The Writer must not be weakened or bypassed.

## 5. Current integration status

This module is additive and testable, but it is not yet called by the scheduled Nature or Alien World orchestrator. The current scheduled entry point still runs the older v2.0 Newsroom contract. Do not treat Section 13 as active in production until the orchestrator migration, strict Writer adapter, archive persistence design, and end-to-end View tests are complete.

No `.github/workflows/*.yml` files are changed by this component. Both current YAML workflow files remain untouched.

## 6. Invocation

After Sections 1–12 have been produced as one JSON report:

```bash
python global-checker/section13_final_verification.py \
  --checker-report-file /path/to/sections-1-through-12.json \
  --output-file /path/to/sections-1-through-13.json
```

Python integration uses the same Checker instance/class:

```python
from global_checker_v2 import GlobalChecker
import section13_final_verification  # registers the Section 13 continuation

checker = GlobalChecker()
report_with_section_13 = checker.finalize_post_editorial_review(report_with_sections_1_to_12)
```

## 7. Tests

Run from the repository root:

```bash
python -m pytest -q global-checker/tests/test_section13_final_verification.py
```

Tests cover the approval path, append-only behavior, tampered summary, altered image URL, upstream Section 11 hold, Manager/View mismatch, missing Section 12, overwrite prevention, short-source exception, incomplete sentence trace, privacy flag, missing Writer story field, raw article-body leakage, cross-View database path, a per-post Editor hold without batch-wide failure, source lineage mismatch, registered Manager profile mismatch, and same-Checker class registration.
