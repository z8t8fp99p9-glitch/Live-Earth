# LIVE // EARTH — v155 Startup Essentials and On-Demand Feature Policy

**Policy checkpoint:** 23 November 2026  
**Current source:** `d1aa269836069554cb27888f6b611e446407478c` on `main`  
**Build identity:** `v155-on-demand-feature-views`  
**Deployment evidence:** GitHub Pages workflow run `45076364772` succeeded for that exact source commit on 22 November 2026. Installed-iPhone activation and acceptance remain a separate, unverified gate.

## 1. Essential startup

The versioned install-time app shell contains the resources needed to open and recover the core application: Home/Prime Earth, primary Earth, Moon and Sun, the shared Earth Engine and graphics runtime, the primary-view and feature registries, the shared Stacks catalogue/lifecycle runtime, Location and data/recovery services, the service worker/update manager, iOS startup support, app identity assets and primary-view textures.

The current v155 source has **37 distinct `APP_SHELL` files represented by 38 routing entries** (the `./` and `./index.html` entries resolve to the same file), plus 3 separately staged runtime dependencies: 40 distinct install-time resources. The v154 historical baseline had 51 `APP_SHELL` resources plus the same 3 runtime dependencies: 54. This is 14 fewer distinct staged resources (25.9%). Static `APP_SHELL` file-size accounting is 4,253,633 bytes for the candidate versus 4,581,676 bytes for v154, a reduction of 328,043 bytes (about 320.4 KiB); this is not a measured launch-time benchmark.

## 2. Feature controllers loaded on selection

The following 12 Stacks feature controllers are optional same-origin resources. Their catalogue metadata is registered synchronously by `Stacks/stacks-feature-views.js`; the controller script is downloaded only after the matching feature Orb is selected:

- Clouds — `Clouds/clouds-view.js`
- Weather — `Weather/weather-view.js`
- Elevation — `Elevation/elevation-view.js`
- Earthquakes — `Earthquakes/earthquakes-view.js`
- Traffic — `Traffic/traffic-view.js`
- Atmosphere — `Atmosphere/atmosphere-view-controller.js`
- Atmospheric Composition — `Atmospheric-Composition/atmospheric-composition-view-controller.js`
- Oceans — `Oceans/oceans-view-controller.js`
- Land — `Land/land-view-controller.js`
- Water & Ice — `Water-Ice/water-ice-view-controller.js`
- Earth Activity — `Earth-Activity/earth-activity-view-controller.js`
- Energy & Humanity — `Energy-Humanity/energy-humanity-view-controller.js`
- Editorial Engine workspace — `Editorial-Engine/engine-feature-views.js` (an additional optional workspace controller; not part of the 12 Stacks feature controllers)

Elevation's catalogue metadata remains in the shared Stacks runtime, but its complete feature-view implementation is now a separate optional controller. The shared runtime retains only the common feature catalogue, stage/lifecycle and reusable network/image utilities.

## 3. Feature-only numerical helpers

`EarthEngine/Graphics/universal-grid-system.js` and `EarthEngine/Graphics/earth-grid-gpu-skin.js` are not required to open Home or the primary Earth/Moon/Sun views. They are fetched by numerical-world controllers only when a selected dataset requires the shared grid pipeline. They are optional resources, not install-time essentials.

`EarthEngine/Assets/README.md` is documentation rather than an executable or runtime asset; it remains in the repository but is not staged as an app-shell resource.

## 4. Loading and lifecycle contract

- The Stacks shared runtime registers the complete catalogue in the preserved order before reporting `__liveEarthStacksFeatureViewsInstalled = true`.
- This readiness flag means the shared Stacks runtime and catalogue are ready; it does not mean every optional feature script has been downloaded.
- Selecting a feature starts one same-origin script request for that feature. Concurrent/repeated selection shares its in-flight request.
- A controller self-registers through `window.LiveEarthStacksFeatureRuntime.registerFeature()` when its script executes.
- The loader opens the view only after the controller registers and only if the same Orb is still active. A late response after the user closes or changes views must not open a stale view.
- Load failure is contained in the selected feature view with a recoverable status. It must not mark Home startup as failed.
- The existing registry still owns the global transition, stage, dock, close action, return to Home and cleanup lifecycle. Feature controllers do not create a second dock or primary-view manager.

## 5. Optional cache and offline behaviour

`sw.js` handles same-origin non-shell GET requests through the bounded `live-earth-optional-v1` cache (limit: 48 entries). The request router handles force-fresh Essentials, the app shell, staged runtime dependencies and navigation before it reaches `boundedOptionalCache()`. Optional-response validation belongs only inside that final optional-resource path. It must not alter Startup Essentials, readiness, recovery, the versioned shell cache or update activation.

Before an optional response is stored or reused, the service worker requires HTTP 200, a non-opaque response, and a MIME type compatible with the request destination/path. It probes only a small body prefix (with a five-second read bound) to reject empty/tiny resources and obvious HTML fallback documents without buffering large images or datasets. Existing saved optional entries are validated before use and removed if invalid. An invalid online response is treated as an unusable network result: a previously validated saved copy may be used; otherwise the feature request fails locally instead of caching or serving the invalid response. Online optional requests remain network-first; offline uses a validated saved optional copy when present.

A feature first opened online can therefore be available on later offline sessions after its script and required resources have been cached. A feature never downloaded before, and opened for the first time while offline, may report that it is unavailable. This limitation must remain local to that feature; Home and the primary views must continue working.

The optional cache is separate from the versioned app-shell cache and IndexedDB. Do not clear either optional cache contents or user data during update activation or troubleshooting. Retired app-shell caches are removed only after verified startup using the exact matching build ID.

## 6. Matching build identity

Both `sw.js` and `Global/update-manager.js` use exactly:

`v155-on-demand-feature-views`

The corresponding shell cache is:

`live-earth-shell-v155-on-demand-feature-views`

The service worker retires previous versioned app-shell caches only after the new app reports verified startup with this matching build identity. The bounded optional cache and IndexedDB remain untouched.

## 7. Protected resources and behaviour

Keep Home/Prime Earth, the five Home Orbs, the shared three-Orb dock, `Global/view-manager.js`, `Global/view-module-registry.js`, `Stacks/stacks-feature-views.js`, Elevation, the Earth Engine core and graphics engine, Moon and Sun, Location OFF privacy, core data and recovery, service-worker integrity/readiness, iOS root-flow support, offline startup and all user data protected.

Keep the original Stacks order: Clouds, Weather, Elevation, Earthquakes, Traffic, Atmosphere, Atmospheric Composition, Oceans, Land, Water & Ice, Earth Activity, Energy & Humanity, Editorial Engine.

## 8. Release and acceptance gates

A source package is not considered deployed when its ZIP is prepared. The user uploads one root-level manifest-validated ZIP. Then verify, separately:

1. Extractor commit and changed-file membership.
2. Exact `main` file identities and matching v155 build IDs.
3. GitHub Actions and Pages deployment for the resulting commit.
4. Installed-iPhone activation, Home startup and offline launch.
5. Stacks catalogue order; one-at-a-time feature loading; first-use-online and cached-offline behaviour.
6. Repeated open/close, bounded loader timeout and retry, rapid switching while a module is loading, dock/Orb hitboxes, portrait/landscape, Location ON/OFF, and return to the protected primary views.

The repository's checked-in `Tests/` suite was retired by explicit owner direction. Do not claim that it exists or that automated regression coverage passed. Report syntax checks, custom smoke checks, ZIP validation, CI, Pages and device acceptance as separate evidence.
