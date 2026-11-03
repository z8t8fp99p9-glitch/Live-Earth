LIVE // EARTH — GLOBAL NEWSROOM REPAIR
=======================================

This package changes the shared Global Newsroom downstream pipeline only.

Upload this ZIP as LIVE_EARTH_MAIN_UPLOAD.zip to the repository root on main.
Do not unpack it. The existing ZIP Extractor workflow validates UPLOAD_MANIFEST.json,
applies the listed files, and removes the upload ZIP.

Global Collector intake is intentionally unchanged.
No workflow YAML, source registry permissions, view UI, publisher, database, or
database-retention files are modified.

Changes:
- Global Checker evaluates every collected image candidate independently and
  identifies one approved mediaId; multiple candidates no longer fail lineage.
- Field restrictions remain recorded but are applied to the restricted fields,
  not used as an automatic whole-post veto.
- The educational/non-commercial project-use context is required and remains
  context only; it never overrides source, item, image, licence, attribution,
  storage, or transformation restrictions.
- Universal Editorial Engine selects only the exact Checker-approved mediaId.
- Post-Editorial Verification checks that selected image among the preserved
  original candidates, while retaining the complete sourceRecord.
- Regression tests cover multi-candidate selection and downstream selection.

Rollback:
Restore the corresponding pre-patch files from recovery/ in this package.
No database reset or migration is required.

Validation notes:
See the accompanying test report in the conversation. This patch does not claim
GitHub Actions or on-device verification.
