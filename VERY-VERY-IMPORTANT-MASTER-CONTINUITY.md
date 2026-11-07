# VERY VERY IMPORTANT — MASTER CONTINUITY

**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Baseline inspected for this documentation rebuild:** `fcb2f778abb0faf78886de14cfbea85919b84f55`  
**Inspection date:** 7 November 2026

This is the first continuity document to read before any LIVE // EARTH task. It records the decisions that prevent repeated mistakes and accidental regressions. It is a guide to what must be protected; the latest source code remains the authority for exact implementation details.

## 1. The non-negotiable project rules

1. **Inspect first.** Read the actual `main` branch, current commit, relevant source, callers, contracts and tests before changing anything. An old note or previously prepared ZIP is not proof of current code.
2. **Keep scope narrow.** Change only what the owner asked for. Do not redesign, refactor or clean up unrelated modules to make a patch look more complete.
3. **Protect Global Orb behaviour.** The Orb system and its dependency chain are an established global standard. Do not change its interaction, sizing, layout, navigation or dependencies unless the owner explicitly asks.
4. **Keep Moon and Sun independent.** They are separate views with their own renderer/controller responsibilities. Shared hosting does not mean merging their rendering or lifecycle logic.
5. **Preserve Home.** Keep the approved Earth composition, camera/framing, texture, five Home Orbs, Moon/Sky placement and existing visual baseline.
6. **Preserve data and offline behaviour.** Do not remove runtime assets, alter service-worker shell paths, reset databases, clear browser storage or delete recovery material without a coordinated, approved plan.
7. **Keep shared services global.** The Global Collection Manager, Global Collector, Global Checker, Global Image Engine, Universal Editorial Engine and generic Newsroom Database Writer are shared capabilities. Do not create view-specific copies.
8. **Do not resurrect retired Views.** Nature and Alien World collection/publishing Views and their old schedules are retired. Their dated notes are historical records only.
9. **Report truthfully.** Separate source inspection, local tests, ZIP validation, GitHub Actions, deployment and iPhone acceptance. One does not prove the others.

## 2. Protected application behaviour

### Home and five navigation Orbs
The established Home navigation contains five Orbs: Earth, Moon, Sun, Location and Stacks. Earth, Moon and Sun are primary views. Location and Stacks are global utilities; they must not unexpectedly close or replace an active primary view. Preserve the approved circular, width-driven Orb geometry and touch targets.

### iOS root flow and scrolling
`ios-standalone-root-flow.js` supports the iOS full-screen/viewport flow. The orientation recovery in `orb-controls-v4.js` is intentionally narrower than ordinary resize handling: stale scroll is cleared on an orientation transition, not on every resize. Do not remove or broaden this logic without tracing it and testing the installed iPhone PWA in portrait and landscape.

A separate Home visual/image has been described by the owner as intentionally hidden while supporting the scroller workaround. Its exact selector has not been confidently identified in the historical audit. Until it is identified from current source, do not remove or optimise away a hidden image, placeholder or visibility rule merely because it is not visible in the normal Home composition.

### Home visual lock
Preserve the approved Earth size, camera framing/position, texture, baseline geometry and renderer pixel ratio; Moon geometry; star/stardust and orbital visuals; and five Home Orbs. Exploration zoom/quality must not leak into the Home baseline.

### Stacks and feature workspaces
The feature Orb scatter and its hit targets share a coordinate space. Keep each visible Orb aligned with its interactive hitbox; avoid nested scrolling that offsets touch positions. Preserve animation completion guards/fallbacks so an absent `transitionend` event cannot leave the interface stuck. `engine-feature-views.js` is a working feature-workspace controller and is not the deleted Celestial experiment note set.

### Location privacy
Location is OFF unless manually enabled. Do not trigger geolocation from Home, startup, verification or Moon View. When Location is OFF, observer-local values such as lunar rise/set times remain hidden by design. Never clear saved data as a location troubleshooting shortcut.

### Sun and Moon
`sky-view-controller.js` is the shared sky-stage/hosting layer. Moon-specific rendering is in `moon-view-controller.js`, with its Moon interface/scroller in `moon-lunar-interface.js`. The Sun renderer is `sun-view-renderer.js`. Preserve each view's responsibilities and use the existing shared stage/registry integration rather than merging implementations.

### Startup, updates and local data
`sw.js` and `update-manager.js` coordinate the offline shell and staged updates. Their build identity and cache paths must be checked together before any release change. Validate the saved shell and runtime dependencies; do not bypass readiness checks to hide an error. `data-store.js` and `data-recovery.js` support local data/recovery. Do not reset IndexedDB, local records or caches without explicit approval and a migration/recovery plan.

## 3. Shared Global services — ownership is fixed

- **Global Collection Manager:** owns source catalogue, View profile, source-to-View assignments, schedules and immutable job creation. It assigns work; it does not fetch sources or make rights decisions.
- **Global Collector:** one universal source-intake service for every View. It collects evidence and returns a transient structured package. It does not decide rights, edit, publish or write the View database.
- **Global Checker:** owns source, provenance, text, image and approval decisions. Unknown or incomplete permission evidence must not silently pass.
- **Global Image Engine:** prepares an exact candidate only within permissions supplied by the Checker. It does not grant rights or publish.
- **Universal Editorial Engine:** shared deterministic editorial/output system. It uses approved input; it does not invent reporting or override Checker decisions.
- **Newsroom Database Writer:** shared persistence layer. It writes only final Checker-approved stories into the destination selected by a valid Manager View profile; it does not publish the public feed.
- **View Publisher:** a presentation/output adapter for its own destination. It must not become a second Collector or rights authority.

The component READMEs and contracts beside these engines contain their detailed input/output schemas. Read them before working on an engine.

## 4. Current Manager position and retired Views

The current `global_collection_manager/README.md` states that Nature and Alien World have been retired and that the active source catalogue, source-to-View assignments, View profiles and schedules are empty. The shared Manager and Collector remain available for a future, separately registered View.

This distinction matters:
- Shared engine code may remain in the repository even when no View is currently assigned to use it.
- Historical Nature/Alien World workflow notes do not reactivate those Views.
- No current collection schedule, active feed or successful run should be inferred from old cron values or old test reports.
- A future View must be deliberately registered through the Manager configuration and have corresponding Checker policy, isolated destination, Publisher and tests.

## 5. Documentation and continuity rules

- The three `VERY VERY IMPORTANT` master files stay directly at the repository root.
- `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` also stays directly at the root, unchanged. It must never be moved, renamed, rewritten or deleted.
- Current guidance belongs in `docs/`; component contracts remain beside their components; superseded decisions belong in `docs/history/`.
- Keep the distinction between active standards, historical implementation records and unresolved questions.
- Do not create another root-level note when the same information can be added to an existing canonical guide.
- This documentation rebuild consolidates root-level notes. Their earlier versions remain available in Git commit history; the consolidated history guide records what each former note contributed.

## 6. Safe working sequence

1. Read this file and the other two `VERY-VERY-IMPORTANT` root files.
2. Read `docs/CURRENT-STATUS.md` and `docs/ARCHITECTURE.md`.
3. Read the relevant component README/contract and tests.
4. Inspect current source and callers.
5. Explain the scope in plain language before a risky or architectural change.
6. Make one focused change and run targeted checks.
7. Review the exact diff for unrelated and protected-file changes.
8. Build the ZIP using the root upload standard; validate every path, size and hash.
9. After upload, verify the Actions run, resulting commit and deployed/device behaviour before calling the task complete.
