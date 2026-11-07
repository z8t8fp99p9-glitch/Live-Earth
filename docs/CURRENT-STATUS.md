# LIVE // EARTH — Current Status Checkpoint

**Checkpoint date:** 7 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch inspected:** `main`  
**Inspected head:** `5d162a5d3d53685eb0daba804bd3e6e3c16d6610`

This checkpoint is a navigation aid, not a substitute for checking the live branch before a new task.

## App and views

- Treat the existing app shell and current view modules as production code.
- Moon and Sun are independent views. Keep their controllers and renderers separate.
- Preserve the shared stage/registry integration points unless a task explicitly changes them.
- Global Orb behaviour and dependencies are protected. Do not alter them as a side effect of another task.
- Keep existing offline/runtime assets. The repository contains real Moon surface imagery and Moon/Sun sky backgrounds used by the app shell.

## Shared modules

The repository contains reusable shared modules for:
- Global Collection Manager
- Global Collector
- Global Checker
- Global Image Engine
- Universal Editorial Engine
- Newsroom Database Writer

These modules are shared capabilities. Do not duplicate them into per-view implementations without an explicit architecture decision.

## Retired systems

- Nature and Alien World collection/publishing Views and their old schedules are retired.
- Old Nature/Alien World feed, workflow and database notes remain historical. They must not be used to reactivate those pipelines.
- Historical newsroom notes may describe a previous multi-view setup. The retirement handoff and current Manager configuration take precedence.

## Celestial experiment cleanup in this package

The package deletes these seven documentation files only:
- `CELESTIAL-ENGINE-TEST-REPORT-2026-11-07.md`
- `GLOBAL-CELESTIAL-ENGINES-FOUNDATION-2026-11-07.md`
- `ENGINE-FEATURE-VIEWS-ADDENDUM-2026-11-05.md`
- `MOON-ENGINE-API.md`
- `MOON-ENGINE-SPACE-PREVIEW-2026-11-07.md`
- `MOON-ENGINE-UPGRADE-TEST-REPORT.md`
- `MOON-PREVIEW-ZOOM-GESTURES-2026-11-07.md`

This is a notes-only deletion. It does not delete `tests/moon-engine-api.test.cjs`, `engine-feature-views.js`, Moon/Sun controllers, renderer files, or runtime assets. Those are code/test/runtime items and are deliberately outside this cleanup.

## Known separate follow-up

A previous read-only inspection noted a possible build-ID mismatch between `sw.js` and `update-manager.js`. It is not changed by this documentation package. Verify both current files and the intended release identity before addressing it in a separate task.

## Verification boundary

This package changes documentation and requests deletion of seven notes. It does not modify app JavaScript, HTML, CSS, Python engines, tests, service worker, update manager, workflows, databases or runtime assets. No runtime or device test is required for these documentation-only changes; successful application must still be confirmed in the GitHub Actions run and resulting commit.
