# LIVE // EARTH — Nature Single-Checker Pipeline

**Historical implementation record — superseded on 3 November 2026.** `nature_pipeline.py` and `nature/collector/collector.py` are retired from the active route. Nature now uses the same Global Collection Manager → Global Collector → shared Newsroom pipeline as every other View. See `NEWSROOM-PIPELINE-INTEGRATION-2026-11-03.md`. Do not restore the old entry points described below.

## Runtime route

Both existing Nature workflow entrypoints now dispatch to `global-checker/nature_pipeline.py`:

- `nature/collector/collector.py` → `nature_pipeline.py collect --view nature`
- `nature/publisher/publisher.py` → `nature_pipeline.py publish --view nature`

No workflow YAML, Nature view UI, profile, source registry, or database schema changes are required by this adapter.

## Approved pipeline order

**Collector → Global Checker → Nature SQLite → Publisher → Universal Editorial Engine → Publisher → Global Checker → Publisher → Nature Live Feed**

1. **Collector:** gathers the configured source feeds and retrieves only the existing allowlisted Wikimedia Commons files. Bounded HTTPS requests, host checks, byte caps, response MIME checks, image decoding, resizing, and file integrity stay here.
2. **Global Checker:** makes the source/text decision before a story is persisted. It makes the Commons image decision before image bytes are downloaded, then rechecks the prepared image when its evidence is written to the database. The Collector's former duplicate creator/licence pass/fail logic is bypassed on the active route.
3. **Nature SQLite:** remains the independent Nature database. It continues to hold the Collector records and Checker decision evidence; no other view's database is opened.
4. **Publisher:** remains read-only and supplies the selected records to the Editorial Engine. Its former image-status, creator, credit, and licence filtering is bypassed so it cannot make a second rights decision. Exact story-to-file association and local file existence remain technical safeguards.
5. **Universal Editorial Engine:** formats the selected stories and passes the source text and image evidence through unchanged. It does not decide image rights.
6. **Publisher:** stages the approved local image files, verifies their hashes, and prepares the matched feed and image-rights manifest.
7. **Global Checker:** makes the final story/image publication decision against the stored evidence. The Publisher atomically commits the approved feed and matching image-rights manifest; failed publication preserves the last-good feed.
8. **Nature Live Feed:** the existing online-only view reads the published JSON. Its design and five-minute refresh behavior are unchanged.

## Preserved Nature rules

- Exact Wikimedia Commons file allowlist, expected creator, accepted licence, contextual caption, creator attribution, file-page link, and modification note.
- No unrelated, invented, or substituted photographs.
- Nature's own source policies and Global Source Registry remain authoritative and unchanged.
- 48-hour initial feed window with adaptive expansion of **48 → 96 → 168 → 336 → 504 → 768 hours**, targeting up to 10 eligible stories.
- Collector photo matching spans the maximum configured adaptive window so an older eligible story can retain its exact reviewed contextual photo when the Publisher expands the feed window. The saved 48-hour initial window is not changed.
- Independent Nature database, 32-day retention, hourly schedule, and online-only feed behavior.
- No changes to Nature visual design, browser storage, Home, Moon View, Sun View, or Alien World.

An empty feed remains possible when the current candidates have neither meaningful text use approved by the Checker nor an independently approved, exact Commons image. The pipeline does not fill such gaps with unrelated material.


## Publisher handoff regression fix

The first production publish attempt exposed an object-aliasing bug after the final Global Checker gate: `gate_feed()` returns the same feed object it filters in place, while the adapter cleared that object before copying it back. This removed the `stories` array and caused Publisher failure. The adapter now preserves the in-place result and only replaces the payload when the Checker returns a distinct object. Two regression tests cover both return patterns.
