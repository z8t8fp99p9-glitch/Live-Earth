# LIVE // EARTH — Current Status (authoritative, 12 November 2026)

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Last inspected main commit before this documentation-pointer correction:** `01c2442f887db29d4156044f31c1bc44bad99c75` — `Refresh LIVE EARTH App Documentation and Weather Art Locks`  
**Latest app-source commit:** `f00750e4b374009b2ff8acfaed2d11f583921cc9` — `Keep Weather and Live Art illustration colours consistent across day and night`  
**Service-worker build identity:** `v132-residents-removed` (`sw.js`; verify matching identity in `Global/update-manager.js` before a future release).

This package changes documentation pointers only. Its upload will create a subsequent documentation-only commit; check GitHub `main` for the resulting current HEAD after the upload.

## 1. Current workflow position

- `.github/workflows/regression-tests.yml` was deleted in commit `a81afab9a007c0183d47073b35cd2831e3694b32`.
- Important correction: that file was not a regression-test workflow. It was an older duplicate root-ZIP extractor. It attempted to extract the same upload a second time after the newer extractor had already processed/removed it, producing the misleading `Upload one ZIP file at repository root.` failure.
- `.github/workflows/zip-extract-auto-upload.yml` remains present and intact. It is the active **manifest-validated ZIP extractor**. It validates one changed root ZIP, exact manifest membership, byte sizes, SHA-256 hashes, safe paths, and the task-specific `commitTitle` before applying the payload.
- The ZIP extractor rejects `.github/` paths, so future workflow-YAML changes require a separate manual GitHub edit/commit.
- All existing files under `Tests/` are retained. The deletion removed only the duplicate workflow YAML. The repository's test files remain available, but the removed workflow no longer runs a GitHub regression suite. Do not describe CI regression tests as passing/running unless a separate actual runner is introduced and verified.
- The workflow cleanup commit is not the current `main` HEAD; see the inspected commit pointer above. The documentation update itself does not change application source.

## 2. Current app release position

- The last app-source commit is `f00750e4b374009b2ff8acfaed2d11f583921cc9`. The Pages deployment for that app-source change succeeded; the user then confirmed the fixed Weather/Live Art colour behaviour in the app.
- The subsequent commits `a81afab...`, `f9e2da2...` and `01c2442...` were workflow/documentation changes, not new app-source releases.
- Do not confuse the last app deployment with later workflow-only or documentation-only commits.

## 3. Weather and Live Art — current accepted state

- Weather illustration and Live Art painting retain the same underlying artwork palette in DAY and NIGHT scenes. Do not reintroduce phase-specific palette switching.
- The sun/moon subject can change to represent day/night. Weather-specific content/effects may respond to weather/phase; that is not permission to recolour the underlying artwork palette.
- The shared background and Portfolio mode retain the approved fixed background treatment. Do not add weather-driven colour cycling.
- Portrait is locked; Landscape-only work must not alter Portrait.
- The accepted Landscape composition remains in place; do not reopen its sizing/layout without an explicit request.
- Live Art remains exactly **10:7** in both orientations.
- The shared Orb dock remains untouched: no resize, reposition, restyle, hit-target or lifecycle changes from Weather.
- The user confirmed on 12 November that the fixed artwork colours were working in-app.

Detailed Weather art direction: `Weather/WEATHER-DESIGN-DIRECTION.md`. Colour-lock evidence: `LIVE_EARTH_WEATHER_ART_COLOUR_LOCK_CHECKPOINT_2026-11-12.md` in the project Work Files/continuity records.

## 4. Protected application architecture

- Five Home Orbs: Earth, Moon, Sun, Location and Stacks.
- Moon and Sun remain independent views.
- Location remains OFF unless the user enables it.
- Preserve Home composition, Earth Engine ownership, Orb lifecycle, Stacks runtime, service-worker/update-manager safeguards, offline startup/recovery, databases and local data.
- `Editorial-Engine/engine-feature-views.js` registers only the retained Universal Editorial Engine workspace. Do not reintroduce the removed collection/feed/publishing systems.

## 5. Working and verification rules

- Inspect actual `main` and relevant source/callers/tests before every code task.
- Keep changes narrow and preserve unrelated files.
- User uploads and commits manually. The assistant does not write directly to GitHub.
- Distinguish local syntax/tests, ZIP manifest validation, Actions, Pages deployment and user device confirmation. Do not infer one from another.
- Do not add a new CI/regression workflow as part of this cleanup. The user explicitly removed the frustrating duplicate workflow; any future test-runner proposal must be discussed separately first.

---

# Historical architecture/status record — 9 November 2026 (superseded as current status)

The detailed v130 architecture/version ledger that previously followed this heading remains preserved in Git history and earlier continuity records. This dated current-status section supersedes its 9 November “current” label; the v130 implementation notes remain useful historical architecture documentation, not the latest release pointer.
