# LIVE // EARTH — Alien World single-Checker pipeline

**Historical implementation record — superseded on 3 November 2026.** `alien_world_pipeline.py` and `alien-world/collector/collector.py` are retired from the active route. Alien World now uses the same Global Collection Manager → Global Collector → shared Newsroom pipeline as every other View. See `NEWSROOM-PIPELINE-INTEGRATION-2026-11-03.md`. Do not restore the old entry points described below.

**Scope:** Alien World only. Nature keeps its current pipeline. No workflow YAML, database reset, schema reset, browser storage, view redesign or new service is introduced.

## The agreed order

1. **Collector** fetches the exact registered NASA feeds and extracts article text plus image candidates attached to each originating story. It performs transport and file-integrity work only: safe HTTPS/NASA host allowlisting, bounded downloads, file-size limits, raster decoding, minimum dimensions and image conversion.
2. **Global Checker** evaluates each story's text before storage and each image candidate before downloading. It alone owns source policies, copyright/third-party signals, attribution requirements, caption requirements, exact article association and publication decisions. RED/UNKNOWN material is held.
3. **Alien World SQLite** receives only text that passed the Checker and image metadata whose candidate passed. The existing `global_checker_decisions` audit table remains in the same Alien World database. The existing database is retained; no reset or merge occurs.
4. **Publisher** opens its database read-only and invokes the shared Engine. It owns the publication run and atomic output, not rights policy.
5. **Universal Editorial Engine** formats the candidate live feed. Its Alien World adapter performs technical media/file checks only and preserves `imageCaption`, `imageCredit`, `imageSourceUrl` and `imageRightsNote`. It does not approve or reject content rights.
6. **Publisher** receives the Engine result and hands the candidate payload to the final Checker gate.
7. **Global Checker** verifies the stored decision IDs and exact story/image evidence again. A story can publish with meaningful approved text, an approved image, or both. An image whose caption/evidence changed is stripped; the story remains only if its text route is eligible.
8. **Publisher** writes the Checker-approved `live-feed.json` atomically. A failed run or failed final gate leaves the last-good feed untouched.
9. **Live Feed View** renders the published JSON. It does not make rights decisions or retain an offline copy.

## What is delegated to the Checker

The active Alien World route replaces the Collector's local image eligibility and image-kind rules with a direct call to `global_checker.evaluate_image`. The source registry is applied before feed requests. The final Publisher boundary still calls `global_checker.gate_feed` after the Engine has built the candidate output.

The Engine's previous Alien World image approval/status filter is bypassed. It keeps only technical checks needed to avoid broken or unsafe media and passes the complete image evidence to the final Checker. In particular, `imageCaption` is now carried into the feed; this fixes the handoff that caused previously visible NASA images to be stripped.

The legacy Collector/Engine functions remain in their original modules for compatibility with unrelated callers, but the registered Alien World workflow entrypoints are routed through `alien_world_pipeline.py`, which replaces those active decision points before either component runs. Nature remains on `run_pipeline.py`.

## Preserved constraints

- Independent Alien World SQLite database and existing GitHub Actions cache family.
- 32-day database retention and 2,000-record cap.
- Hourly collection/publishing schedule at minute 45 UTC.
- Adaptive lookback stages 48, 96, 168, 336, 504 and 768 hours, up to 10 unique stories.
- Existing Publisher read-only database access and Live Feed-only output.
- Existing Pages rebuild request, online-only browser feed, five-minute view refresh and no browser persistence.
- No change to Home, Moon View, Sun View, other protected app composition, workflows or YAML files.

## Upload

Upload the ZIP as `LIVE_EARTH_MAIN_UPLOAD.zip` to the repository root. The extractor requires that exact filename. Suggested user commit title: `Unify Alien World Rights Decisions in Global Checker`. The extractor's own bot commit title remains `Apply LIVE // EARTH Main Upload`.
