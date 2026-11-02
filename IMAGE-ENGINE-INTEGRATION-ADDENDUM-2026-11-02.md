# LIVE // EARTH — Global Image Engine Integration Addendum

**Date:** 2 November 2026 (Asia/Kolkata)  
**Integration version:** Global Image Engine `0.2.0`  
**Status:** Built and locally validated; awaiting user upload and GitHub Actions smoke run.

## What is now connected

The shared Global Image Engine is called by both the Nature and Alien World Publisher adapters immediately before the final Global Checker feed gate. It supplies a local, deterministic procedural illustration only when a story has no existing image. Existing approved documentary or Commons images retain priority and are never overwritten.

Before an illustration is staged for publication, the helper confirms that the exact story has a current publishable text decision under the active registry version. The Image Engine then creates the artwork locally and submits its complete evidence to the Global Checker. Only a matching GREEN decision for the same view, story and image can be attached to the candidate and allow the asset to be copied to that view's published folder. The final feed gate checks the evidence again. Rejected/stripped generated assets are removed from the final publication output.

## Artwork classification

Generated artwork is visibly labelled `ILLUSTRATION / NOT A PHOTOGRAPH`. Its caption says it is thematic artwork, not a literal depiction of the linked report, not a documentary photograph and not a data-accurate scientific visualization. The Global Checker enforces those caption disclosures and recognizes this as a distinct `illustrative-artwork-only` use. It is not a documentary-photo approval.

## Separation and protected behaviour

- Nature and Alien World keep separate databases, temporary staging folders and published asset folders.
- No database reset, destructive migration, cloud storage, hosted AI service, API key or paid image service is introduced.
- Nature's existing Collector-side Commons allowlist and rights review remain unchanged; existing approved photos take precedence.
- The Engine contains bounded Wikimedia Commons discovery/preparation code, but this release does not introduce new automatic Commons searches in the Publisher. The live hand-off currently activates local original-illustration fallback only; the discovery functions are covered by mocked-response tests, not live API tests.
- Collector cadence, workflow schedules, rolling feed windows, retention settings, the 32-day retention boundary and the configured 50-story Nature cap are not changed by this integration.
- Home composition, Earth/Moon placement, Moon View, protected orbs and other unrelated app views are untouched.

## Runtime asset destinations

- Nature: `nature/published/assets/`
- Alien World: `alien-world/published/assets/`

Nature's existing workflow already commits its entire `published/` folder. Alien World's current workflow commits only `live-feed.json`; it must be updated to stage `alien-world/published/` so generated image files are committed with the feed. The repository ZIP extractor intentionally disallows `.github` files, so this workflow replacement is supplied separately as `ALIEN-WORLD-PUBLISHER-WORKFLOW-REPLACEMENT.yml`.

## Validation

- Global Checker: 77 tests passed.
- Nature: 16 tests passed.
- Alien World: 14 tests passed.
- Image Engine: 23 tests passed.
- Python `compileall`: passed.
- Total: 130 tests passed.
- ZIP archive and its upload manifest were verified against the extractor's exact file/hash rules.
- Wikimedia Commons live-network requests were not exercised in this sandbox. Engine discovery tests use mocked responses.

## Deployment state

No changes have been pushed to GitHub from this build. The upload ZIP is prepared for the repository's existing `LIVE_EARTH_MAIN_UPLOAD.zip` mechanism. After the ZIP extractor applies the regular project files, the separate Alien World workflow replacement must be applied, then both publisher Actions should be manually run for the first live smoke test. Until those steps finish, this milestone is **locally validated, not yet deployed**.
