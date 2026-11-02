# Universal Editorial Engine — Handoff Notes

## Files added

- `editorial-engine/universal_editorial_engine_newsroom.py`
- `editorial-engine/UNIVERSAL-EDITORIAL-ENGINE-NEWSROOM.md`
- `editorial-engine/UNIVERSAL-EDITORIAL-ENGINE-HANDOFF.md`

## Files deliberately not changed

- `editorial-engine/universal_editorial_engine.py`
- `editorial-engine/universal-editorial-engine.js`
- Nature and Alien World Collector / Publisher files
- Global Checker files and registries
- Global Collection Manager files
- Image Engine files
- `.github/workflows/*.yml`
- View databases, cache keys, local/browser storage and published feeds

## Handoff order

1. Global Checker runs `review_collection_batch(...)` for one View.
2. The Universal Editorial Engine adapter receives that exact intake JSON and creates `editorial-production` output.
3. Global Checker receives both the package and the same intake object in `review_editorial_package(...)`.
4. Only GREEN `approvedStories` are eligible for the View-specific database writer.
5. That View's own Publisher remains responsible for its feed/PDF destinations and last-good-output protection.

## Important limitations to retain

- The current Checker intentionally releases only `eligibleForGlobalEditor` records to this adapter. Records sent to the Image Engine-only branch are not silently promoted into editorial eligibility.
- The current Image Engine fallback package is a separate branch. This adapter does not accept an image merely because another component labels it approved; it reuses only `approvedOriginalImages` supplied in the exact Checker-approved editorial input. The final Checker rechecks any attached image.
- Source excerpts included in `evidence[]` are transient and must be passed directly to final Checker review, not written to a database or file.
- A deterministic keyword risk flag remains unresolved and is held by final Checker review.
- This package does not provide open-ended AI rewriting or independently verify facts. It must not be described as having those capabilities.
- Integration tests, scheduled workflow wiring, database persistence and end-to-end feed tests are intentionally postponed until the complete Newsroom system is built.
