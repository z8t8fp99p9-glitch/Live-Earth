# Project Continuity

**Project:** LIVE // EARTH  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch:** `main`  
**Documentation baseline:** 20 November 2026

This document contains the safeguards that apply to every task. Current code is authoritative for exact implementation details.

## Non-negotiable rules

1. Inspect current `main`, callers, runtime dependencies and relevant tests before changing code.
2. Keep each change narrow, reversible and limited to the requested scope.
3. Preserve Home composition, five Home Orbs, the feature dock and their interaction contracts.
4. Keep Moon and Sun as separate views. Do not create a competing primary-view manager.
5. Location is OFF until the user explicitly enables it. Feature views may consume an approved fresh fix; they must not request GPS themselves.
6. Preserve Stacks registration, close lifecycle, hitbox alignment and animation cleanup.
7. Preserve offline startup, service-worker shell, update manager, local data and recovery. Never clear or migrate user data as generic troubleshooting.
8. Retain the Universal Editorial Engine. Do not restore the removed Collector, Checker, source discovery, newsroom database, Publisher, feed or Magazine systems.
9. Report source checks, local tests, ZIP validation, Actions, Pages deployment and device acceptance as separate evidence.
10. The user uploads and commits manually. Do not write directly to GitHub.

## Protected Home and iOS behaviour

Prime Earth framing, size, texture, baseline geometry, Moon orbit, star field and five-Orb layout are protected. `ios-standalone-root-flow.js` and orientation recovery in `Global/orb-controls-v4.js` are deliberate safeguards. A historically identified hidden Home visual has not been conclusively mapped; do not remove it or related assets without tracing and installed-iPhone testing.

## Shared architecture boundaries

- `Global/view-manager.js` owns primary-view transitions.
- `Global/view-module-registry.js` owns shared feature registration, Stacks lifecycle and the three-Orb feature dock.
- `Stacks/stacks-feature-views.js` provides the shared feature runtime.
- `EarthEngine/Core/earth-engine.js` is the shared Earth globe factory and owns quaternion-only viewpoint continuity.
- `Location/location.js` owns explicit permission and GPS watch lifecycle.
- `sw.js` and `Global/update-manager.js` must keep build identity and update contracts synchronized.

## Working sequence

Read this file, `GLOBAL-STANDARDS.md`, `PROTECTED-DECISIONS.md` and the ZIP standard. Then read `Documentation/CURRENT-STATUS.md`, `Documentation/ARCHITECTURE.md` and the relevant component note. Inspect source and callers, make the smallest safe change, test it, review the exact file scope and update only the affected documentation.

## Documentation policy

Keep current guidance short and canonical. Put only durable decisions in `Documentation/PROJECT-HISTORY.md`. Old experiments and one-off patch notes are not current specifications; Git history retains deleted documentation. Never delete runtime source, assets, tests or recovery data as part of documentation cleanup.


## 18 November 2026 — Atmospheric Composition world separation

- Added `Atmospheric-Composition/atmospheric-composition-view-controller.js` as a separate Stacks world with ID `atmospheric-composition`, title **Atmospheric Composition**, and Orb symbol `◌`.
- At the 18 November checkpoint, registered the world in `Stacks/stacks-feature-views.js` catalogue and sequential module loader, immediately after Atmosphere. The 20 November v155 candidate supersedes that loading method with Orb-selected loading.
- At that checkpoint, added the controller to `sw.js` app-shell cache so the module was available for offline startup. The v155 candidate moves it to the bounded optional cache; first-use offline access requires a previously cached copy.
- Kept Atmosphere distinct and narrowed its catalogue description to temperature, pressure, wind and moisture. Composition is no longer listed as an Atmosphere topic.
- The new controller follows the established numerical-world lifecycle: its own Engine-created globe/view renderer and cleanup, while reusing the shared Earth Engine, Universal Grid System and GPU Grid Skin. It does not create another globe framework or navigation dock.
- No composition data adapter or measurements are connected in this separation phase. The view must remain honest and show readiness only until approved, verified datasets are connected.
- Updated architecture, Stacks feature and numerical-world lifecycle documentation.
- Package is prepared for the user's ZIP upload workflow; no direct GitHub changes were made.


## 20 November 2026 — v155 on-demand feature-view separation candidate

- **Verified source baseline:** uploaded `Live-Earth-main 16.zip` matches the inspected current GitHub `main` blobs for `sw.js`, `Global/update-manager.js`, `Stacks/stacks-feature-views.js`, `Global/view-module-registry.js`, `index.html` and `STARTUP-ESSENTIALS-POLICY.md`. The latest inspected commit is `af75d0ce789c88044adf9c0652f83e247a2f9f00` (v154, `Restore Stacks Feature Controllers and Service Worker Shell`).
- **Reason for the change:** the earlier v153 attempt registered no-op catalogue entries but had no working click-to-load path in the shared feature registry. v154 restored controllers to startup. Do not revert to v153; v155 adds a real selection-driven loader inside the Stacks shared runtime.
- **Candidate design:** register all catalogue metadata immediately; load one controller after its Orb is selected; allow the controller to self-register; activate only if that same Orb is still selected. A delayed response after close/switch is ignored. Failures are displayed within the feature and do not fail Home startup.
- **Essential resources:** v154 has 51 app-shell paths + 3 runtime dependencies = 54 staged resources. v155 candidate has 37 app-shell paths + 3 runtime dependencies = 40. Eleven already-separate Stacks controller files leave the app shell, and Elevation's previously inline controller is extracted into its own on-demand file. All 12 Stacks feature controllers are now optional. Editorial Engine's browser workspace is also moved from eager startup to Orb-selected loading, though it was not in the app-shell list.
- **Preserved:** Elevation's visual/data behaviour and its shared Prime Earth layer contract remain intact, but its controller is now optional; the shared Stacks catalogue/lifecycle stays essential. Home/Prime Earth, five Home Orbs, three-Orb dock, primary Earth, Moon, Sun, Location OFF privacy, core Earth Engine, data/recovery, iOS and service-worker safeguards remain core. The retained Editorial Engine utility and retired-publishing boundary are unchanged.
- **Optional caching:** existing bounded optional cache remains the fetch path; no optional cache or IndexedDB clearing is introduced. First-time offline access to a never-cached feature may fail locally while Home remains available.
- **Validation:** `node --check` passed for the three core startup/loader files and all 13 optional controllers. The expanded mock loader test passed for all 13 catalogue modules, zero startup optional fetches, one-on-selection loading, in-flight request sharing, switch-away/switch-back race handling, stale response suppression, failure/retry and loaded-module reuse. The separate Elevation smoke test passed registration, shared-layer attachment, offline no-fetch behaviour, listener cleanup and layer disposal. App-shell audit confirms 37 paths + 3 runtime dependencies = 40, all shell paths exist, none of the 13 optional modules or 2 grid helpers are in the shell, and worker/update-manager build IDs match.
- **Package:** `LIVE-EARTH-v155-On-Demand-Feature-Views.zip`; manifest commit title: `Move Feature Views Out of Startup Essentials`.
- **Status:** locally prepared and validated only. No GitHub writes were made. User upload/extraction, Actions/Pages and installed-iPhone verification remain pending. This entry supersedes the 18 November note that Atmospheric Composition's controller was in the app shell; its controller is now an optional on-demand view in the v155 candidate.


## 21 November 2026 — Atmosphere Wind vector plan

The approved next Wind architecture is an additive derived Central Database product, `earth.atmosphere.wind_vector`, sourced from aligned NOAA 10 m UGRD/VGRD components. Preserve current speed and direction products. The combined grid carries U, V and speed; interpolate components before reconstructing meteorological direction FROM north; animate particles toward `(U,V)`. Use one coordinated Wind GPU surface with speed, direction and vector-flow modes. Any multi-channel grid/GPU support must be optional and backward-compatible. No collector, publisher, database, shared-grid or renderer change is authorised by this documentation-only checkpoint. See `Documentation/WIND-VECTOR-DATA-ARCHITECTURE.md`.
