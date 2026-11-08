# Current architecture — v128-global-orb-system (8 November 2026)

The Global Orb System now exposes one registry and effective-view lifecycle for Home/Primary views, Location and Stacks utility Orbs, and expandable Stacks Secondary views. The existing five-Orb main row and three-Orb Secondary dock remain visually and behaviourally protected. Location toggles state without navigation; Stacks opens/closes its library without replacing the active view; Secondary views open, close or switch exclusively.

`window.LiveEarthOrbSystem` is the unified public facade. `Global/view-module-registry.js` emits `live-earth-view-transition` before outgoing cleanup and `live-earth-view-changed` after the incoming view is active. Primary and Secondary navigation share the owner identity format `primary:<id>` / `secondary:<id>`.

Earth Engine now owns one global quaternion snapshot (`x`, `y`, `z`, `w`) and automatically associates each `createEarthGlobe()` instance with the active owner. It captures only at view transitions and page hide, and applies once to an incoming existing group or when a group is created. Existing Stacks overlays continue to use the Home Earth group; future Secondary views may create their own Engine globe without adding viewpoint bridge code to individual views. Legacy Home-only V3/V2/V1 session snapshots are read for migration.

No camera/zoom transfer, continuous rotation observer, polling or per-frame storage was introduced. Home's group/surface identity, locked zoom, Moon additive orbit and independent Earth renderer remain protected.

# LIVE // EARTH — Current Status

**Updated:** 8 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Working branch:** `main`  
**Source baseline:** user-tested `Live-Earth-fullscreen-stacks-feature-views-v118.zip`  
**Working package:** V127 — Earth Engine Core/Graphics/Assets folder architecture, one canonical globe factory, strict Moon/Earth isolation, Home viewpoint hand-off and quaternion-stable Earth View dragging (includes V118 feature views and V120 Location service naming)

This checkpoint is based on the owner-supplied full source snapshot plus the subsequent incremental changes through V127. Re-check `main` before any later task.

## 1. Application

The application and existing source modules are production code. Important areas include:
- `index.html` — app shell.
- `Global/view-manager.js` — primary-view transitions.
- `Global/view-module-registry.js` — shared module and feature lifecycle/registry.
- `Global/orb-controls-v4.js` — protected Orb controls and orientation recovery.
- `ios-standalone-root-flow.js` — iOS full-screen root-flow support.
- `Global/sky-view-controller.js` — shared Sun/Moon sky stage.
- `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js` — Moon renderer and interface.
- `Sun/sun-view-controller.js` — Sun controller.
- `Stacks/stacks-feature-views.js` — shared feature runtime and Elevation view.
- `Weather/weather-view.js`, `Clouds/clouds-view.js`, `Traffic/traffic-view.js`, `Earthquakes/earthquakes-view.js` — dedicated full-screen Stacks feature views.
- `Editorial-Engine/engine-feature-views.js` — Editorial Engine workspace only.

## 2. Protected behaviour

- Global Orb behaviour/dependencies and the five Home Orbs are protected.
- Preserve the approved Home composition and visual baseline.
- Moon and Sun are independent views.
- Location is OFF unless manually enabled.
- Preserve runtime/offline assets, startup/update safeguards, local data and recovery paths.
- Do not clear browser storage or reset a database as a generic fix.

## 3. Retained editorial capability

The Universal Editorial Engine remains under `Editorial-Engine/`. Its Python core, browser helper, text-intelligence utility and two general editorial-quality test files are retained. The Editorial Engine Feature Orb remains registered.

The preserved Python core still contains its prior read-only approved-record input contract. That contract is dormant: the associated collection and publishing services were removed. No live content collection, scheduled feed or Publisher run is active.

## 4. Removed systems

At the owner's direction, this cleanup removes the former collection/Manager, Collector, Checker, Image Engine, Newsroom database writer, Source Scout, Feed Collector and mini-browser, feed service, Publisher workspace, and Magazine/Nature/Alien World publishing scaffold. Their directories, integration modules, view loaders, tests, and implementation-specific recovery snapshots are deleted. No app-shell, Home, Orb, Sun, Moon, Location, Stacks environmental, service-worker, or generic PDF Reader files are included in the deletion list.

## 5. Stacks feature views
Weather, Clouds, Traffic and Earthquakes now each have a dedicated top-level folder and view module. All four use the shared Stacks feature runtime and Home Earth layer interface. Their full-screen surfaces preserve the Global three-Orb dock (active feature toggle, Location toggle, Stacks library). Elevation remains in the shared Stacks module and retains its prior compact panel layout.

- Weather only reads an already-enabled, fresh Location fix; it never requests geolocation.
- Clouds uses NASA GIBS daily cloud-fraction imagery, not a fabricated cloud texture.
- Earthquakes uses the USGS latest-day GeoJSON feed and clears live data when offline.
- Traffic is a full-screen preview only until a verified live traffic source is approved.

## 6. Verification boundary

The user-supplied V118 ZIP was extracted as the baseline for V119. V119 JavaScript syntax checks pass for all 27 JavaScript files. The Earth/Home/Moon-orbit regression suite passes all 11 checks; the Stacks feature-folder/runtime tests and the Location Orb/Earth Scanner ownership test pass; all 24 Editorial Engine Python tests pass. `Global/orb-controls-v4.js` and `Global/view-module-registry.js` remain byte-for-byte unchanged from V118. `Tests/moon-engine-api.test.cjs` remains an existing stale test that expects a root `moon-engine.js` absent from V118; it was not changed. No claim is made about GitHub Actions, deployment or installed-iPhone acceptance until those are checked after upload.


## V119 — Location Orb controller path correction

V119 starts from the user-tested V118 full-screen feature-view package. The Home Location Orb permission/GPS lifecycle file is now `Location/location-orb-controller.js`; the Earth View Scanner button and marker visibility remain in `Earth/earth-view-controller.js`. The legacy readiness marker and public Location state APIs remain unchanged for compatibility. `index.html`, `sw.js`, startup recovery, shell asset list, script-error repair paths and documentation use the new filename. The service worker and update manager share `v119-location-orb-controller`. The dedicated Location ownership regression test was added. JavaScript syntax (27 files), the 11-check Earth/Home/Moon-orbit regression suite, Stacks feature tests, Location ownership test and 24 Editorial Engine Python tests pass. The pre-existing Moon API test still cannot start because `moon-engine.js` is absent from V118; that unrelated condition is not changed by V119.


## V120 — Location shared-service filename simplification

V120 starts from the V119 package and renames `Location/location-orb-controller.js` to `Location/location.js`. This names the file as a shared Location service rather than a view or Orb-specific controller. The Home Location Orb permission/GPS lifecycle, public state APIs and legacy `window.__liveEarthLocationScannerInstalled` readiness marker remain unchanged for compatibility. The Earth View Scanner button and marker visibility remain in `Earth/earth-view-controller.js`. `index.html`, service-worker shell/recovery/startup-repair paths, tests and active guidance use `Location/location.js`. The service worker and update manager share `v120-location-service`. The V119 path and original `Location/location-scanner.js` are both included in the manifest delete list. No Global Orb, Earth Scanner, GPS, privacy or data behaviour was changed.


## V121 — Home-to-viewpoint bridge

V121 adds `EarthEngine/Core/earth-viewpoint-bridge.js`. Home publishes an immutable quaternion snapshot of its Earth group at startup and after user rotation. The independent Earth View applies that snapshot to its own Earth group whenever activated, sharing only the starting globe orientation. The bridge is intentionally one-way: Earth View interaction does not rotate or otherwise change Home. Weather, Clouds, Elevation, Earthquakes and Traffic already attach to the Home Earth scene and therefore naturally share its orientation. Moon and Sun remain independent. The separate Earth Modes page still uses its own standalone `earth-orb-globe.js` renderer and is not connected by this change. The new bridge is in the service-worker app shell and required by startup verification/repair.


## 8 November 2026 — V122 persistent Earth viewpoint bridge (historical; group-only snapshot)

V121's in-memory-only orientation snapshot did not survive navigation to the separate Earth Modes document. V122 added same-tab `sessionStorage` persistence and connected Earth Modes with a group-only snapshot. The later V124 assumption that Moon Orbit must also rotate Earth's child surface was incorrect; V125 explicitly restores group-only ownership and removes that coupling.

## 8 November 2026 — V124 complete Earth viewpoint bridge (incorrect; superseded)

V124 incorrectly assumed Moon Orbit's sidereal surface write was part of the intended Home Earth pose, then copied that child-surface rotation through the bridge. This expanded a legacy ownership violation into every bridged Earth view. V124 must not be used. V125 removes both the Moon-to-Earth write and the child-surface transfer; this entry is retained only as a historical record of the faulty approach.


## V125 — one canonical Global Earth Engine; Moon cannot rotate Earth

V125 corrects the V124 architectural mistake. `Home/moon-orbit.js` previously found the Home Earth surface mesh and assigned `earthSurface.rotation.y` from Greenwich Mean Sidereal Time on initial creation and each scheduled Moon update. This directly changed the visible Earth independently of Home's user drag. V124 then copied that child-surface quaternion through the bridge, spreading the coupling into Independent Earth View and Earth Modes. Both behaviours are removed. Moon Orbit now updates only `moon.position`; it never locates or writes to an Earth object.

`EarthEngine/Core/earth-engine.js` is now used by all three Earth renderers: Home, Independent Earth View and Earth Modes Basic/HD/Offline. Each view receives a separate Engine-created instance to preserve its independent scene and renderer, but all use the same engine, local Earth texture and geometry profiles; the `-0.35` base surface calibration is now owned only by the Global Engine. The bridge returns to a group-only snapshot: it transfers only Home's user-controlled Earth-group quaternion. Camera/zoom is initialized after the Earth is created and viewpoint applied. Build identity is `v125-global-earth-engine-isolated`.


## V126 — Earth View first-touch drag stability
V125 correctly applies the Home quaternion on Earth View activation, but its drag handler then read and wrote `earthGroup.rotation.x/y`. When Home yaw is beyond +/-90 degrees, Three.js can represent the same valid quaternion using the alternate canonical Euler branch. The old pitch clamp then forced the alternate X value to +/-1.25 on the first pointer move, making the Earth appear to flip upside down. V126 recovers Home's original bounded pitch from the quaternion using the known Home XYZ convention and applies drag deltas with local-Y/world-X quaternion multiplication. It does not change Home gestures, Earth Engine calibration, camera/zoom, Moon Orbit, Sun, Location, or Global Orb behaviour. Build identity is `v127-earthengine-root-folder`.


## V127 — EarthEngine root-folder architecture

The reusable Earth Engine now has one dedicated repository-root folder with the approved separation:

```text
EarthEngine/
├── Core/
│   ├── earth-engine.js
│   └── earth-viewpoint-bridge.js
├── Graphics/
│   ├── earth-engine-3d-graphics-engine.js
│   └── earth-engine-3d-graphics-core.js
└── Assets/
    └── README.md
```

The Core facade keeps the public `createEarthGlobe` / `createGlobe` API stable. Graphics Engine assembles the Earth group, surface and atmosphere; Graphics Core owns the low-level geometry, materials, shared texture lease and disposal helpers. Home, Independent Earth View and Earth Modes retain their own scenes, cameras, renderers, controls and view state. Three.js remains a separate low-level runtime dependency under the existing `vendor/` virtual paths; Moon and Sun are not moved into EarthEngine.

The supplied source archive did not contain the Earth texture PNG as a repository file. To avoid substituting a different image or inserting a fake binary, the service worker continues to download the NASA Blue Marble texture (with its existing fallback) and caches it at the new same-origin runtime path `EarthEngine/Assets/earth-land-ocean-ice-2048.png`. `Assets/README.md` records this distinction and the NASA credit. The binary itself is therefore a cached runtime asset, not part of this ZIP payload. Build identity is `v127-earthengine-root-folder`.

## 9 November 2026 — V129 Engine-owned quaternion viewpoint

The former Home-only viewpoint bridge has been deleted. `EarthEngine/Core/earth-engine.js` is the sole viewpoint owner and reads/writes only `liveEarthGlobalViewpointV1`; the retired Home-only V3/V2/V1 session keys are no longer used as migration sources. The exact outgoing owner named in `live-earth-view-transition` determines which registered Earth group is captured, preventing a stale active-group pointer from supplying the wrong pose. `live-earth-view-changed` applies the saved quaternion immediately, and a group created asynchronously receives it during registration.

Home uses the Engine quaternion interaction controller and remains zoom-locked. Independent Earth View uses the same controller with its own camera zoom adapter. No Euler X/Y drag writes remain in the Home renderer. The independent Earth Modes renderer remains a separate path and was not modified by this Home cleanup. The Service Worker and Update Manager build identity is `v129-engine-quaternion-viewpoint`. The full local JavaScript regression suite and 24 Python tests pass; iPhone confirmation of the delayed viewpoint symptom remains pending.
