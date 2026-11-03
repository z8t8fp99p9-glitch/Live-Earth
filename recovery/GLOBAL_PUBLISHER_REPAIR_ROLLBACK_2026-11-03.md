# LIVE // EARTH — Global Publisher Repair Rollback

**Prepared:** 3 November 2026  
**Inspected baseline:** `c35cac4006446fc2eeb2c3515fed3a007ebf17ec`

## Files changed by this package

- `global-checker/live_earth_global_checker_bootstrap.py`
- `global-checker/tests/test_bootstrap.py`
- `image-engine/image_engine_integration.py`
- `image-engine/tests/test_image_engine_integration.py` (new)

The package also adds `README-FIRST.txt` and this rollback note.

## Rollback

The existing root ZIP Extractor creates one automatic commit titled
`Apply LIVE // EARTH Main Upload` after it validates and applies the package.
If a regression is confirmed, use GitHub's **Revert** action on that exact
application commit. This reverses only the package's file changes without
resetting or deleting either View's database/cache or any app data.

Do not run database cleanup or reset operations as a rollback measure.
Do not revert a later commit or the user's separate ZIP-upload commit by
mistake. Verify the selected commit's changed-file list before reverting.

## Protected boundaries

The package does not modify `.github/workflows`, source/rights policy, published
feeds, databases, cache keys, or view-specific code. The existing last-good
feeds remain the recovery point for the Publisher workflow.
