# Project Continuity

> **Critical project reference — read before starting work.**

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Baseline inspected:** 7 November 2026  

This document records the safeguards that prevent regressions. The latest source remains authoritative for exact implementation details.

## 1. Non-negotiable project rules

1. **Inspect first.** Read current `main`, relevant source, callers, contracts and tests before changing anything.
2. **Keep scope narrow.** Change only what the owner requested. Do not refactor unrelated modules.
3. **Protect Global Orb behaviour.** The Orb system and dependency chain are an established global standard. Do not alter interaction, sizing, layout, navigation or dependencies without explicit approval.
4. **Keep Moon and Sun independent.** They share a stage host but retain separate renderers, controllers and lifecycle responsibilities.
5. **Preserve Home.** Keep the approved Earth composition, camera/framing, texture, five Home Orbs, Moon/Sky placement and existing visual baseline.
6. **Preserve data and offline behaviour.** Do not remove runtime assets, alter service-worker shell paths, reset databases, clear browser storage or delete recovery material without a coordinated approved plan.
7. **Retain the Universal Editorial Engine.** The Editorial Engine core, browser helper, text-intelligence utilities and Editorial Engine Feature Orb are retained. Do not recreate the retired publishing system around them.
8. **Report truthfully.** Separate source inspection, local checks, ZIP validation, Actions, deployment and iPhone acceptance.

## 2. Protected application behaviour

### Home and five navigation Orbs
The established Home navigation contains five Orbs: Earth, Moon, Sun, Location and Stacks. Earth, Moon and Sun are primary views. Location and Stacks are global utilities; they must not unexpectedly close or replace an active primary view. Preserve the approved circular, width-driven Orb geometry and touch targets.

### iOS root flow and scrolling
`ios-standalone-root-flow.js` supports iOS full-screen/viewport behaviour. The orientation recovery in `orb-controls-v4.js` is intentionally narrower than ordinary resize handling. Do not remove or broaden this logic without tracing it and testing the installed iPhone app in portrait and landscape.

The owner previously identified a hidden Home image/visual that supports the scroller workaround. Its exact selector was not confidently identified. Do not remove an apparently unused hidden element or asset until its role is mapped from current source.

### Home visual lock
Preserve the approved Earth size, camera framing/position, texture, baseline geometry and renderer pixel ratio; Moon geometry; star/stardust and orbital visuals; and five Home Orbs. Exploration zoom/quality must not leak into the Home baseline.

### Stacks and feature workspaces
The feature Orb scatter and hit targets share a coordinate space. Keep each visible Orb aligned with its interactive hitbox; avoid nested scrolling that offsets touch positions. Preserve animation completion guards/fallbacks. `stacks-feature-views.js` provides the independent environmental Stacks features and must remain intact.

The Engine Feature Orb module now registers only **Editorial Engine**. It must not reintroduce collection, feed, source-discovery, policy-checking, image-processing or Publisher views.

### Location privacy
Location is OFF unless manually enabled. Do not trigger geolocation from Home, startup, verification or Moon View. When Location is OFF, observer-local values such as lunar rise/set times remain hidden by design. Never clear saved data as a location troubleshooting shortcut.

### Sun and Moon
`sky-view-controller.js` is the shared sky-stage/hosting layer. Moon-specific rendering is in `moon-view-controller.js`, with its interface/scroller in `moon-lunar-interface.js`. The Sun controller is `sun-view-controller.js`. Preserve each view's responsibilities and use the existing shared stage/registry integration rather than merging implementations.

### Startup, updates and local data
`sw.js` and `update-manager.js` coordinate the offline shell and staged updates. Their build identity and cache paths must be checked together before a release change. Validate the saved shell and runtime dependencies; do not bypass readiness checks to hide an error. `data-store.js` and `data-recovery.js` support local data/recovery. Do not reset IndexedDB, local records or caches without explicit approval and a migration/recovery plan.

## 3. Current content-tool boundary

The Universal Editorial Engine is the only retained editorial/content tool. Its Python core and browser helper remain preserved. It is not a source collector, rights checker, database writer, scheduled feed service or Publisher. Its former read-only approved-record input contract remains inside the preserved core but is dormant until a separate, explicitly approved input design exists.

The following systems and their related views were removed at the owner's direction on 7 November 2026: Global collection/Manager, Collector, Checker, Image Engine, Newsroom database writer, Source Scout, feed discovery/mini-browser, feed-collector service, Publisher and Magazine publishing scaffold. Do not restore them from old handoffs or recovery snapshots.

## 4. Documentation and continuity rules

- `PROJECT-CONTINUITY.md`, `GLOBAL-STANDARDS.md` and `PROTECTED-DECISIONS.md` stay directly at the repository root.
- `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` stays at the root, unchanged.
- Current guidance belongs in `docs/`; component documentation remains beside retained components; historical app decisions belong in `docs/history/`.
- Keep active standards separate from historical implementation records.

## 5. Safe working sequence

1. Read this file and the other two root-level project reference documents.
2. Read `docs/CURRENT-STATUS.md`, `docs/ARCHITECTURE.md` and the relevant component README/tests.
3. Inspect current source and callers.
4. Explain the scope in plain language before a risky or architectural change.
5. Make one focused change and run targeted checks.
6. Review the exact diff for unrelated and protected-file changes.
7. Build the ZIP using the root upload standard; validate every path, size and hash.
8. After upload, verify Actions, the resulting commit and deployed/device behaviour before calling the task complete.
