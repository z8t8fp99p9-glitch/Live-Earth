# LIVE // EARTH — Current Status

**Inspected:** 7 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Commit inspected:** `fcb2f778abb0faf78886de14cfbea85919b84f55`  
**Commit title:** `Add prominent LIVE EARTH master notes`

This checkpoint describes the repository snapshot inspected for this documentation rebuild. Always re-check `main` before a later task.

## 1. Application

The application and its existing source modules are to be treated as production code. The documentation package does not modify any application/runtime code.

Important source areas include:
- `index.html` — app shell.
- `view-manager.js` — primary-view transitions.
- `view-module-registry.js` — shared module and feature lifecycle/registry.
- `orb-controls-v4.js` — protected Orb controls and orientation recovery.
- `ios-standalone-root-flow.js` — iOS full-screen root-flow support.
- `sky-view-controller.js` — shared Sun/Moon sky stage.
- `moon-view-controller.js` and `moon-lunar-interface.js` — Moon-specific renderer and interface.
- `sun-view-renderer.js` — Sun-specific renderer.
- `engine-feature-views.js` and `stacks-feature-views.js` — feature workspaces; do not confuse these with retired Celestial experiment notes.

## 2. Protected behaviour

- Global Orb behaviour/dependencies are protected.
- Preserve the approved Home composition and five navigation Orbs.
- Moon and Sun are independent views.
- Location is OFF unless manually enabled.
- Preserve runtime/offline assets, startup/update safeguards, local data and recovery paths.
- Do not clear browser storage or reset a database as a generic fix.

## 3. Shared engine modules

The repository contains:
- `global_collection_manager/`
- `global_collector/`
- `global-checker/`
- `image-engine/`
- `editorial-engine/`
- `newsroom-database-writer/`

Their component READMEs describe distinct responsibilities and contracts. The single Global services remain shared; do not create view-specific duplicates.

## 4. Current Manager configuration and retired Views

The current `global_collection_manager/README.md` records that Nature and Alien World are retired and that the source catalogue, assignments, View profiles and schedules are empty. The shared Manager and Collector remain available for a future approved View.

Consequences:
- There are no active Nature or Alien World collection/publishing Views in the current documented Manager configuration.
- Old Nature/Alien World workflows, schedules, database retention values, feed windows and test outcomes are historical.
- Do not treat old 32-day/768-hour/10-story/50-story settings as current settings for any future View.
- A future View must be registered through Manager configuration and receive applicable Checker policy, an isolated destination, a Publisher and tests.

## 5. Documentation baseline

This package replaces the earlier scattered root-level notes with:
- three detailed `VERY VERY IMPORTANT` root master documents;
- concise root `README.md` and `README-FIRST.txt`;
- current standards under `docs/standards/`;
- architecture references under `docs/architecture/`;
- a consolidated historical record under `docs/history/`.

The permanent ZIP upload standard remains at the root unchanged. The repository's component-specific implementation READMEs and tests remain in their component folders.

## 6. Separate follow-ups

This documentation task does not change build IDs, service-worker caches, app controllers, runtime assets, source policies, database schemas or workflow YAML. Any suspected runtime mismatch must be verified from current source in a separate, scoped engineering task.

## 7. Verification boundary

The inspected GitHub branch and current tree were read. This package's file paths, sizes, SHA-256 manifest and ZIP structure are validated locally. No application tests, runtime tests, GitHub Actions run, deployment or iPhone acceptance test is claimed for a documentation-only package. Those must be checked after upload.
