# LIVE // EARTH — Current Source Status & Views Separation Audit Addendum

**Date:** 31 October 2026 (Asia/Kolkata)  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Scope:** source-state verification after Global PDF Reader v4.0.0 and Cleanup 01  
**Type:** additive current-state record; earlier engineering history remains intact

## 1. Verified repository state

Read-only inspection of GitHub `main` on 31 October 2026 found:

- Initial Views Separation audit `main` HEAD: `8a8b8671a9278391e07d7df5b02114b61ac6ba97` — `Apply LIVE // EARTH Main Upload`.
- Cleanup upload commit: `0c62906439a06d7f2fb48e2b7c90fc87e62c1362` — `Remove obsolete setup and V97 patch documentation`.
- The following extractor commit confirms the package application: `8a8b8671a9278391e07d7df5b02114b61ac6ba97`.
- Current recursive Git tree at that inspection: 64 tracked files, 15 directories, approximately 4.89 MB total blob payload. This is a source-tree inventory, not a measurement of the deployed app or browser cache.
- The four intended cleanup files are absent from `main`: `README-FIRST.txt`, `PIPELINE_WORKFLOW_INSTALL.md`, `SW-VERSION-PATCH.md` and `UPDATE-MANAGER-PATCH.md`.
- The temporary `LIVE_EARTH_MAIN_UPLOAD.zip` is absent after successful extraction.
- No other tracked files were removed by Cleanup 01.

## 2. Current live-source version references

| Component | Verified source state |
|---|---|
| `sw.js` | SHA `762de109dcc10fd9a31519453c2d31dfb9317f2e`; `BUILD_ID` is `v109-alien-view-reset`; cache is `live-earth-shell-v109-alien-view-reset` |
| `update-manager.js` | SHA `e010967394b1b956d4607981e83fc29f85b8e3ab`; build ID matches `v109-alien-view-reset` |
| `index.html` | SHA `d04a1bd3f9b0efac0074458bf2a8d5ae7f95c883`; retains five Home Orbs and the ordered startup bootstrap |
| `universal-pdf-viewer.js` | PDF Reader v4.0.0; blob SHA `e020fd6e20ba3b17dae88eb6058405d2e0f1d889` |
| `view-manager.js` | Primary-view coordinator for Home, Earth Explorer, Moon and Sun |
| `view-module-registry.js` | Shared module lifecycle and Stacks/feature Orb catalogue and dock |
| `.github/workflows/zip-extract-auto-upload.yml` | Existing main ZIP importer remains installed; unchanged by Cleanup 01 |
| `.github/workflows/alien-world-publisher.yml` | Current Alien World scheduled/manual collection and publication workflow |

The owner confirmed on 31 October 2026 that the deployed app's magazine opening and new PDF Reader are working well on the iPhone. This is owner-reported device verification, not a claim that every view or orientation has been retested in this milestone.

## 3. Global PDF Reader v4.0.0 — current accepted state

- The user-approved visual direction is Glassmorphism + Claymorphism.
- Full-screen PDF page with preserved source aspect ratio; floating controls do not resize the page.
- Row 1: Previous / Next. Row 2: Download / Close. Independent floating page counter remains visible when controls are hidden.
- Tap shows/hides both control rows. Swipe navigates at normal zoom; pinch/double-tap zoom and drag pans while zoomed.
- The reader remains shared and view-independent. It receives the selected PDF from a caller and returns to that caller on close.
- Existing API, PDF.js engine version/cache, IndexedDB `live-earth-pdf-library` v1 / `issues` store and saved PDFs remain protected.
- The user has now confirmed that everything is working well. Do not redesign or make speculative visual changes. Reopen the reader only for a concrete observed defect or a specifically requested improvement.

## 4. Cleanup 01 — completed

The owner manually uploaded `LIVE_EARTH_MAIN_UPLOAD.zip` and committed it using the existing ZIP Extractor workflow.

**User upload commit title:** `Remove obsolete setup and V97 patch documentation`  
**Extractor commit title:** `Apply LIVE // EARTH Main Upload`

Deleted only:

1. `README-FIRST.txt` — copied one-off PDF Reader upload instructions, now superseded.
2. `PIPELINE_WORKFLOW_INSTALL.md` — stale one-time publisher workflow installation instructions, now superseded by the current installed workflow.
3. `SW-VERSION-PATCH.md` — historical V97 service-worker patch instructions that do not match the current V109 build.
4. `UPDATE-MANAGER-PATCH.md` — historical V97 update-manager patch instructions that do not match the current V109 build.

The root upload ZIP was removed by the importer only after successful validation and application. Recovery records, tests, app source, workflow files, data and published issues were not part of this deletion package.

## 5. Views Separation — source audit findings

This section records the current boundaries observed in source. It is not an instruction to refactor all modules at once.

### Primary-view authority

- `view-manager.js` is the single primary-view state authority. It supports `home`, `explorer`, `moon` and `sun`, commits the transition once and emits `live-earth-primary-view-change` / `live-earth-primary-view-state` events.
- `earth-mode-navigation.js` owns the Earth Explorer Basic/HD, zoom and Scanner controls. It listens to the manager's transition event, and also retains a click-capture fallback for the case where the manager failed to load. Do not remove that fallback until its failure mode and iPhone interaction path are deliberately tested.
- `orb-controls-v4.js` owns the Location state and its privacy gate. It also paints pressed states while deferring primary Earth/Moon/Sun state to `view-manager.js` and Stacks state to `LiveEarthFeatureViews`.

### Shared module and feature registry

- `view-module-registry.js` exposes `LiveEarthViewModules` for modules that declare the primary views they serve and receive activate/deactivate/change lifecycle calls.
- The same file owns `LiveEarthFeatureViews`, the feature catalogue/library and the three-Orb feature dock. Preserve the existing shared Location/Stacks utility behaviour and lifecycle cleanup.
- `sky-view-controller.js` creates the shared Sun/Moon sky stage and registers it as `sky-container` for both primary views.
- Moon-specific rendering and lunar-scroller behaviour remain separate from the shared sky container (`moon-view-controller.js` and `moon-lunar-interface.js`). Moon View is locked; this audit is not permission to edit it.
- `sun-view-renderer.js` is loaded on demand by `update-manager.js` and registers its Sun-specific renderer through the shared module registry.
- `stacks-feature-views.js` registers Clouds, Weather, Elevation, Earthquakes and Traffic views through the shared feature catalogue and uses the existing Earth/layer interface rather than creating a second globe.

### Alien World and shared editorial services

- `alien-world-view-controller.js` owns the Alien World Main Page and its activation lifecycle. It loads shared browser services on demand.
- `alien-world-publisher-client.js` reads completed published feed/catalogue data, manages the view's saved-magazine list and opens selected PDFs with the shared reader. It must not collect news, access the source database or generate magazines.
- `universal-editorial-engine.js` is the browser-side output-contract validator/helper. The production shared engine is `editorial-engine/universal_editorial_engine.py`.
- `data-collection/alien-world/collector.py` alone performs external source collection and database writes for Alien World.
- `publishers/alien-world/publisher.py` reads the view database in read-only mode, passes records/instructions to the shared Engine and routes completed outputs. Its network and database-write access remain disabled.
- These modules are not candidates for deletion or consolidation: their separation is an approved architectural boundary.

## 6. Documentation drift identified

The previous root `README.md` still described the Alien World view as an empty shell, the Publisher/Engine/shared reader as future integrations, and V109 as a package that had not yet been uploaded. Those statements no longer describe current `main` or the user's iPhone verification.

The README refresh was subsequently applied to `main` in the documentation package. It corrects the current guide while preserving `LIVE-EARTH-CONTINUITY.md` as the historical fixes register. Historical V96/V97/V109 entries are not erased; they remain history rather than current deployment instructions.

## 7. Deferred cleanup candidates — do not delete yet

- `basic-map.html` / `basic-map.js`: retain until the intended Basic Map versus Location route is resolved, as already required by the historical continuity register.
- `LIVE-EARTH-LAYOUT-EDITOR.html`: retain as a development/preview utility unless explicitly retired by the owner.
- `recovery/`: preserve dated rollback and baseline files.
- `tests/`: preserve regression coverage.
- `published/alien-world/`: preserve feed/catalogue and actual magazine PDFs; these are current product outputs, not temporary patch files.
- `moon-sky-background-responsive.svg`: remains in the active service-worker APP_SHELL; do not delete it based only on current CSS references.
- Do not delete or rename any service-worker shell path without a coordinated code release, cache/build alignment, dependency trace and fresh online/offline testing.

## 8. Next work sequence

1. Finish the Views Separation map: for each view, document activation/deactivation, DOM ownership, state/data ownership, shared service dependencies and close/return route.
2. Trace and test existing fallback event handlers before considering consolidation. Do not optimize by deleting handlers solely because a central manager exists.
3. Select one confirmed boundary issue and make one small, reversible change.
4. Validate syntax and integration, then package for the owner's upload. The owner tests the affected iPhone view before the next change.
5. Do not modify Home composition/five primary Orbs, Sun View, Moon View, Stacks lifecycle, Location privacy, app startup/offline recovery, databases, or the Alien World Publisher/Engine contract during an unrelated view separation task.

**Current milestone:** Cleanup 01 verified; PDF Reader v4.0.0 working on the owner's iPhone; current source map updated; Views Separation audit is the next engineering phase. No application runtime code was changed by Cleanup 01 or by this documentation refresh package.


## 9. Universal Editorial System consolidation — upload candidate (31 October 2026)

**Inspected base:** `main` at `60b7008f7b67621293d5052c1dbbd69e9d630164` (`Apply LIVE // EARTH Main Upload`). The following changes are prepared locally in one root-ZIP package and are not yet uploaded, deployed or iPhone-verified.

### Agreed global architecture

The owner approved naming this shared infrastructure the **LIVE // EARTH Universal Editorial System**. It is global app infrastructure, not an Alien World-only subsystem. There is one shared system with two execution layers and one separate global PDF Reader:

- Browser companion: `editorial-engine/universal-editorial-engine.js`; the existing global remains `window.LiveEarthUniversalEditorialEngine` and the output-validation/helper API is unchanged.
- Python production Engine: `editorial-engine/universal_editorial_engine.py`; the existing `run_engine(...)` interface is unchanged.
- Python dependencies and system guidance remain beside both implementations as `editorial-engine/requirements.txt` and `editorial-engine/README.md`.
- Each content-producing view owns its own logical database and Publisher. Its Collector, when needed, owns external collection and writes to that view database. The Publisher reads only its own database read-only and calls the one shared Python Engine.
- Browser views load the shared JavaScript companion on demand and validate their own view-specific feed/catalogue. All views use the one global PDF Reader for PDF outputs.
- No separate Engine, browser validator or PDF Reader should be created for a new view. The shared Engine does not collect external data, open databases, own a schedule or write view records.

### Prepared file operations

| Operation | Path | Purpose |
|---|---|---|
| Add | `editorial-engine/universal-editorial-engine.js` | Place the browser companion beside the Python Engine. |
| Update | `alien-world-view-controller.js` | Load the browser companion from its new shared directory; no other Alien World view behaviour is intentionally changed. |
| Update | `editorial-engine/README.md` | Document both execution layers and the universal integration contract. |
| Update | `README.md` | Record the global architecture and directory layout. |
| Update | This addendum | Preserve the approved architectural decision and exact package scope. |
| Delete | `universal-editorial-engine.js` | Remove the old root-level copy after moving the implementation. |
| Delete | `config/nasa-feeds.json` | Remove the obsolete duplicate feed configuration; the active Collector reads `publishers/alien-world/profile.json`. |

The Python Engine, Python requirements, Collector, Publisher, Publisher profile, publication workflow, published data/PDFs, tests, global PDF Reader and all view controllers other than the one script-loading path remain unchanged. The current workflow continues to use `editorial-engine/requirements.txt`, `data-collection/alien-world/collector.py` and `publishers/alien-world/publisher.py`.

### Cache and rollout decision

The browser companion is loaded on demand by Alien World and is not in the essential `APP_SHELL`. Its requests use the existing service worker's bounded optional-resource cache. The new folder URL is a distinct request key and is fetched network-first when online. No service-worker shell entry, service-worker build ID, update-manager build ID, startup dependency, or cache database is changed by this move. Alien World remains online-only; it must not show live content as current while offline. The previous root path is no longer requested by the updated controller.

### Validation and owner acceptance still required

Before upload, validate the ZIP manifest/path allowlist and hashes, JavaScript syntax, the controller's single new script path, and the absence of any active references to the deleted root script or Config JSON. After the owner uploads it through the existing root ZIP Extractor, re-inspect `main` and test on iPhone: open Alien World, load Live Feeds, load the magazine catalogue, open a magazine in the global PDF Reader, close back to Alien World, and confirm offline state does not present live feed data as current. Home composition, five Home Orbs, Sun View, locked Moon View, Stacks lifecycle, Location-OFF privacy, startup/offline recovery, local databases and saved PDFs must remain untouched.

**Status:** prepared package only. Do not mark this consolidation complete until GitHub application and owner iPhone acceptance are confirmed.
