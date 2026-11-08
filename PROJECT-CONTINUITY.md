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
`ios-standalone-root-flow.js` supports iOS full-screen/viewport behaviour. The orientation recovery in `Global/orb-controls-v4.js` is intentionally narrower than ordinary resize handling. Do not remove or broaden this logic without tracing it and testing the installed iPhone app in portrait and landscape.

The owner previously identified a hidden Home image/visual that supports the scroller workaround. Its exact selector was not confidently identified. Do not remove an apparently unused hidden element or asset until its role is mapped from current source.

### Home visual lock
Preserve the approved Earth size, camera framing/position, texture, baseline geometry and renderer pixel ratio; Moon geometry; star/stardust and orbital visuals; and five Home Orbs. Exploration zoom/quality must not leak into the Home baseline.

### Stacks and feature workspaces
The feature Orb scatter and hit targets share a coordinate space. Keep each visible Orb aligned with its interactive hitbox; avoid nested scrolling that offsets touch positions. Preserve animation completion guards/fallbacks. `Global/view-module-registry.js` owns the protected three-Orb feature dock: active feature (tap to close), Location and Stacks. `Stacks/stacks-feature-views.js` is the shared feature runtime and retains Elevation; Weather, Clouds, Traffic and Earthquakes have separate top-level folders and register through that runtime. Their view code may be developed independently, but the Global lifecycle and Orb behaviour remain unchanged.

The Engine Feature Orb module now registers only **Editorial Engine**. It must not reintroduce collection, feed, source-discovery, policy-checking, image-processing or Publisher views.

### Location privacy
`Location/location.js` is the shared Location permission and GPS service used by the Home Location Orb and other approved consumers. The Scanner button in `Earth/earth-view-controller.js` only shows/hides the already-approved marker in Earth View; it does not request permission or switch the Location Orb. Location is OFF unless manually enabled. Do not trigger geolocation from Home, startup, verification or Moon View. When Location is OFF, observer-local values such as lunar rise/set times remain hidden by design. Never clear saved data as a location troubleshooting shortcut.

### Sun and Moon
`Global/sky-view-controller.js` is the shared sky-stage/hosting layer. Moon-specific rendering is in `Moon/moon-view-controller.js`, with its interface/scroller in `Moon/moon-lunar-interface.js`. The Sun controller is `Sun/sun-view-controller.js`. Preserve each view's responsibilities and use the existing shared stage/registry integration rather than merging implementations.

### Startup, updates and local data
`sw.js` and `Global/update-manager.js` coordinate the offline shell and staged updates. Their build identity and cache paths must be checked together before a release change. Validate the saved shell and runtime dependencies; do not bypass readiness checks to hide an error. `Data/data-store.js` and `Data/data-recovery.js` support local data/recovery. Do not reset IndexedDB, local records or caches without explicit approval and a migration/recovery plan.

## 3. Current content-tool boundary

The Universal Editorial Engine is the only retained editorial/content tool. Its Python core and browser helper remain preserved. It is not a source collector, rights checker, database writer, scheduled feed service or Publisher. Its former read-only approved-record input contract remains inside the preserved core but is dormant until a separate, explicitly approved input design exists.

The following systems and their related views were removed at the owner's direction on 7 November 2026: Global collection/Manager, Collector, Checker, Image Engine, Newsroom database writer, Source Scout, feed discovery/mini-browser, feed-collector service, Publisher and Magazine publishing scaffold. Do not restore them from old handoffs or recovery snapshots.

## 4. Documentation and continuity rules

- `PROJECT-CONTINUITY.md`, `GLOBAL-STANDARDS.md` and `PROTECTED-DECISIONS.md` stay directly at the repository root.
- `ZIP-UPLOAD-AND-COMMIT-TITLE-STANDARD-2026-11-06.md` stays at the root, unchanged.
- Current guidance, architecture, standards and dated history belong directly in `Documentation/`. Retained component notes remain beside their relevant component folder.
- Keep active standards separate from historical implementation records.

## 5. Safe working sequence

1. Read this file and the other two root-level project reference documents.
2. Read `Documentation/CURRENT-STATUS.md`, `Documentation/ARCHITECTURE.md` and the relevant component README/tests.
3. Inspect current source and callers.
4. Explain the scope in plain language before a risky or architectural change.
5. Make one focused change and run targeted checks.
6. Review the exact diff for unrelated and protected-file changes.
7. Build the ZIP using the root upload standard; validate every path, size and hash.
8. After upload, verify Actions, the resulting commit and deployed/device behaviour before calling the task complete.


## 8 November 2026 — V118 Stacks full-screen feature views

Starting from the V117 flat-folder ZIP, Weather, Clouds, Traffic and Earthquakes were separated into dedicated top-level folders. `Stacks/stacks-feature-views.js` remains the shared runtime and retains Elevation. The Global three-Orb registry and Orb controller are unchanged byte-for-byte. Feature registration order remains Clouds → Weather → Elevation → Earthquakes → Traffic so the feature Orb scatter order stays stable. The four dedicated views use full-stage layouts behind the existing three-Orb dock; Elevation keeps its prior compact panel. The service worker and update manager use the synchronized `v118-fullscreen-feature-views` identity, and all four modules are essential offline shell assets. See `Documentation/STACKS-FEATURE-VIEWS.md` for the view contracts.


## 8 November 2026 — V119 Location Orb controller path correction

Starting from V118, `Location/location-scanner.js` was renamed to `Location/location-orb-controller.js` to reflect its actual responsibility: the Home Location Orb permission request, GPS watch, fresh-fix validation and ON/OFF state. The Earth View Scanner button and its marker visibility remain in `Earth/earth-view-controller.js`; it reads the approved state and does not request geolocation. The original compatibility marker `window.__liveEarthLocationScannerInstalled` and public Location state APIs are intentionally retained to avoid changing the existing Orb/service handshake. All script loading, service-worker shell, recovery and startup-repair paths now use `Location/location-orb-controller.js`. The service-worker and update-manager build identity is synchronized to `v119-location-orb-controller`. No Orb code or Location behaviour was changed.


## 8 November 2026 — V120 Location service filename simplification

Starting from V119, `Location/location-orb-controller.js` was renamed to `Location/location.js`. Location is a shared utility/service, not a view, so its source filename no longer implies a dedicated Orb controller. Its permission request, GPS watch, fresh-fix checks, OFF-by-default privacy, existing public state APIs and legacy readiness marker are unchanged. The Earth View Scanner button and marker visibility remain in `Earth/earth-view-controller.js` and continue to consume only approved Location state. `index.html`, service-worker shell/recovery/startup-repair paths, tests and active guidance use `Location/location.js`. The synchronized build identity is `v120-location-service`. The manifest removes both superseded filenames from the repository. No Global Orb behaviour or GPS behaviour was changed.


## V122 persistent viewpoint bridge (correct group-only design)
The Global Earth Engine is the source of truth for one active-view rotation snapshot. `LiveEarthOrbSystem` supplies the effective active owner (`primary:<id>` or `secondary:<id>`). Earth Engine captures the outgoing active Engine group's normalized parent quaternion once before view cleanup and applies it once to the incoming existing group, or automatically when the incoming view later calls `createEarthGlobe()`. It persists only `{x,y,z,w}` on transitions and page hide. No camera, zoom, scene, renderer, light, surface-child transform, layer or Moon state is transferred. The former Home-only bridge remains as a legacy migration reference; current views no longer call it. Existing Stacks layers reuse the Home Earth group. Moon and Sun remain independent unless a future view explicitly creates its own Engine Earth group.

### V124 bridge change (incorrect; superseded)
V124 incorrectly treated Moon Orbit's legacy sidereal Earth-surface write as a required part of the Earth viewpoint and copied the child-surface quaternion. That was the wrong ownership model. The V124 design is superseded by V125 and must not be reintroduced.


## V125 correction — strict Earth ownership

The V124 diagnosis was wrong. The Moon Orbit module had a direct write to the Home Earth mesh: `earthSurface.rotation.y = greenwichMeanSiderealAngle(date)`, executed during Moon Orbit initialization and the scheduled 30-second update. V124 then expanded this coupling by copying the child surface quaternion through the viewpoint bridge. This is not acceptable. V125 removes the Earth-surface lookup/write from Moon Orbit; Moon updates only its own position. The bridge transfers only Home's user-controlled parent-group quaternion. Home, Independent Earth View and Earth Modes all use the single `EarthEngine/Core/earth-engine.js` factory and the same Earth texture/base calibration, with separate instances only to preserve their independent scenes and renderers. No Moon or Sun calculation may modify Earth's transform.


## 2026-11-08 — V126 Earth View first-touch orientation correction
- Observed behaviour: Home viewpoint transferred correctly when Earth View opened, but the first touch/drag in Earth View flipped the globe.
- Cause: Earth View copied Home's quaternion, then its pointer handler read `earthGroup.rotation.x` and wrote Euler X/Y. Three.js may decompose a valid transferred XYZ quaternion using the alternate Euler branch when yaw crosses +/-90 degrees. The existing pitch clamp then snapped X to its bound on the first pointer movement.
- Correction: recover Home's bounded pitch directly from the XYZ quaternion, and apply horizontal/vertical drag deltas using local-Y/world-X axis-angle quaternion multiplication. No Home gesture, Moon, Engine, texture, camera or Orb behaviour changed.
- Build identity: `v127-earthengine-root-folder`.


## 2026-11-08 — V127 EarthEngine folder architecture
The dedicated root-level `EarthEngine/` folder separates Core, Graphics and Assets ownership. `Core/earth-engine.js` is the stable public globe factory and now owns global viewpoint continuity; `Graphics/earth-engine-3d-graphics-engine.js` assembles each view-owned globe group/surface/atmosphere, while `Graphics/earth-engine-3d-graphics-core.js` owns low-level geometry/material helpers and shared texture acquisition/disposal. The Global Orb System provides one registry and effective-view lifecycle for Primary views, utility Feature Orbs and expandable Secondary views. The five-Orb and three-Orb layouts, Moon/Sun systems, Home group identity, Three.js vendor-runtime placement and per-view scenes/cameras/renderers remain protected.

The supplied ZIP did not contain `earth-land-ocean-ice-2048.png` as a tracked binary. The service worker retains the existing NASA download plus fallback and now caches it at `EarthEngine/Assets/earth-land-ocean-ice-2048.png`; `EarthEngine/Assets/README.md` documents the virtual runtime asset and NASA credit. Do not claim the image binary is physically committed until a source archive containing that exact file is available. Build identity: `v127-earthengine-root-folder`.


## 8 November 2026 — Global Orb System (V128)

- One `LiveEarthOrbSystem` facade now describes Home, Earth, Moon, Sun, Location, Stacks and all registered Secondary views.
- Home is the default Primary screen, not a sixth button. The main five controls remain Earth/Moon/Sun/Location/Stacks.
- Location and Stacks are Feature Orbs; neither replaces the active view.
- Secondary views remain single-active and use the three-Orb dock [active Secondary, Location, Stacks].
- `live-earth-view-transition` is emitted before outgoing cleanup; `live-earth-view-changed` follows incoming activation.
- Earth Engine owns one rotation-only snapshot and no longer needs per-view bridge calls.
- Existing Home group identity and additive Moon orbit remain untouched.
- Build identity: `v128-global-orb-system`.


## 9 November 2026 — Engine-owned quaternion viewpoint cleanup (V129)

The old Home-only `EarthEngine/Core/earth-viewpoint-bridge.js` module and its bridge-specific test were retired and deleted. `EarthEngine/Core/earth-engine.js` is the sole owner of viewpoint state; it reads/writes only `liveEarthGlobalViewpointV1` and no longer falls back to the old Home-only V3/V2/V1 session keys. The Service Worker no longer treats the bridge as an essential offline asset, and both `sw.js` and `Global/update-manager.js` now use the synchronized `v129-engine-quaternion-viewpoint` identity.

The outgoing transition event's explicit owner is now authoritative when selecting the Earth group to capture. This avoids capturing from a stale cached active-group pointer. The incoming group receives the normalized quaternion directly on the view-changed event; an Engine group created asynchronously later receives the current snapshot on registration. `Tests/earth-engine-viewpoint.test.cjs` covers stale V3 rejection, exact outgoing-owner capture, synchronous Home restoration, and quaternion-only state.

Home's current runtime already uses `earthGlobe.attachInteractions()` from Earth Engine, with `zoom.enabled: false`; its drag path contains no direct Euler X/Y writes. The independent Earth View uses the same quaternion controller. A separate Euler-based drag implementation remains in `Earth/earth-orb-globe.js` for the standalone Earth Modes renderer; it is not Home and was intentionally left outside this Home/viewpoint patch. The remaining active Home presentation, stars, Moon orbit/path, Location marker state, lighting, camera framing and Orb behaviour were not changed.

All JavaScript regression tests and 24 Python tests passed locally. Installed-iPhone confirmation is still required to verify that the observed multi-second viewpoint delay has been eliminated.
