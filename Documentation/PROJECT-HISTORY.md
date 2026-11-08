# LIVE // EARTH — Consolidated Application History

**Purpose:** preserve the important application, visual and recovery decisions while keeping historical implementation detail separate from current runtime configuration.

## 28–31 October 2026 — App continuity and view boundaries

The engineering continuity register recorded safeguards that must not be removed as apparent cleanup:
- iOS full-screen/root-flow and viewport recovery, including orientation-only stale-scroll clearing.
- An owner-identified hidden Home image/visual used by the scroller workaround. Its exact selector was not conclusively located; it remains protected until traced.
- Home visual lock: Earth framing, size, texture, renderer baseline, Moon geometry, star/stardust/orbit visuals and five Home Orbs.
- Five Home Orbs and the distinction between primary views (Earth, Moon, Sun) and global utilities (Location, Stacks).
- Stacks scatter/hitbox alignment and animation completion fallback.
- Location OFF privacy; no automatic geolocation; local observer-time values remain hidden when off.
- Startup integrity checks, online/offline readiness, staged updates, local data/recovery and coordinated `sw.js`/`Global/update-manager.js` release identities.
- Basic Map was retained pending route clarification.

A 31 October Views Separation audit described `Global/view-manager.js` as the primary-view authority, `Global/view-module-registry.js` as the shared module/feature registry, `Global/sky-view-controller.js` as the shared sky host, Moon's controller/interface as separate, and Sun's renderer as separately loaded. The PDF Reader was a shared, view-independent utility.

Historical build references from that period are snapshots/candidates, not current release configuration. Inspect current source before changing a build identity.

## 1–6 November 2026 — View and renderer refinements

The application work during this period established the current protections for independent Sun and Moon implementations, the shared sky stage, and the existing feature Orb lifecycle. The Sun controller remains separate from the Moon controller and lunar interface. A Sun-only amber Rise/Set marker refinement did not alter Moon colours, positions, calculations, Home or Orb behaviour.

The Global Orb standard, Stacks coordinate/hitbox alignment, Location-OFF privacy, iOS root-flow handling and recovery boundaries remain important application decisions. Historical test reports from this period are snapshots only; they are not current proof of a green build or iPhone acceptance.

## 7 November 2026 — Content systems retirement

At the owner's direction, the former content-collection and publishing system and its related views, services, component documentation, tests and implementation-specific recovery snapshots were removed from the application. The Universal Editorial Engine core, browser helper, text-intelligence utilities, editorial-quality tests and Editorial Engine Feature Orb were retained.

The retained Engine core was not rewritten as part of that removal. Its former read-only approved-record input contract remains dormant because the upstream services that previously supplied it are no longer present. No live source collection, scheduled feed or Publisher operation is implied.


## 9 November 2026 — Engine-managed Home renderer lifecycle

The Earth Engine now exposes a generic `registerViewRuntime({ activate, deactivate })` adapter on each Engine-created globe. The Engine suspends an outgoing renderer before a transition only when the incoming owner resolves to a different Engine Earth group. On the incoming `live-earth-view-changed` event, the Engine applies the shared quaternion first and then activates the runtime associated with that group. Home therefore pauses its on-demand render scheduling, pending viewport work, Moon refresh timer and active pointer gesture while a separate Earth group owns the screen; it resumes and requests a fresh frame when the Home group becomes active again. Home's Earth group, texture, camera framing, Moon orbit, star field and locked zoom remain allocated. Stacks Secondary overlays without their own globe continue using Home's shared Earth renderer for their registered layers; a Secondary view with its own globe takes over and suspends Home. The Engine public API is 2.4.0 and the Service Worker / Update Manager identity advances together to `v130-home-engine-lifecycle`. All nine JavaScript regression tests, all JavaScript syntax checks and all 24 Python tests pass locally. Installed-iPhone transition testing remains pending.

## Historical test-report caveat

Former test reports recorded mixed snapshots and explicitly distinguished local tests from GitHub Actions, deployment and iPhone verification. They are not current test results and must not be presented as proof of current green tests.

## 9 November 2026 — Engine-owned quaternion viewpoint cleanup

The retired Home-only viewpoint bridge (`EarthEngine/Core/earth-viewpoint-bridge.js`) and bridge test were deleted. The Global Earth Engine now reads only `liveEarthGlobalViewpointV1`; legacy Home-only V3/V2/V1 session keys are no longer migration sources. The obsolete bridge was removed from the offline shell, and the Service Worker / Update Manager cache identity advanced together to `v129-engine-quaternion-viewpoint`.

The Engine now selects the outgoing Earth group by the exact owner named in the pre-transition event, rather than preferring a potentially stale cached active-group pointer. The incoming group receives the saved quaternion immediately at the post-transition event, or on registration if it is created asynchronously. Home's existing Engine interaction path is quaternion-only and remains zoom-locked; the independent Earth View uses the same shared controller. All JavaScript regression tests and 24 Python tests passed locally. Device acceptance remains pending.
