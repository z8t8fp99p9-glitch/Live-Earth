# 8 November 2026 — Reusable Earth Engine

The owner clarified that Home Earth must stay as it is. The inline Home renderer in `index.html`, its existing `LiveEarthScene` service-worker injection, solar day/night shader, Location state and Home-only `Home/moon-orbit.js` integration are preserved. Only the controller bootstrap path in `index.html` changes to the renamed Earth View Controller.

A reusable `EarthEngine/Core/earth-engine.js` module now builds independent Earth globe objects for other views. Each caller supplies its own Three.js namespace and owns its scene, camera, renderer, controls and lifecycle. The Engine provides configurable radius, texture URL, basic/HD sphere geometry, initial surface rotation and optional atmosphere. It shares texture loads safely among simultaneous view instances, with reference-counted cleanup.

The separate full-screen Earth View is owned by `Earth/earth-view-controller.js`; it uses Earth Engine for its globe objects and retains its own stage, camera, renderer, responsive behaviour, solar day/night shading, gestures, zoom, Basic/HD controls and optional approved Location Scanner. The old `earth-mode-navigation.js` source path is retired. The worker shell and update-manager build identity are advanced together so new files are essential offline assets.

Static syntax checks and the focused Earth Engine isolation/texture-lifecycle test passed locally. The pre-existing `Tests/moon-engine-api.test.cjs` could not run because its referenced `moon-engine.js` is absent from the inspected `main` tree (GitHub returned 404); that unrelated test/source mismatch is not changed here. GitHub Actions, deployed behaviour and installed-iPhone online/offline testing remain pending owner upload and device verification.


## Home Earth adoption and fixed-camera boundary — V116

After the reusable Engine landed, Home was migrated to use the same Engine for its Earth surface, atmosphere, material and texture. Home continues to own its scene, camera, renderer, lighting, responsive camera fitting, pointer rotation, stars and draw loop. The Home module was rewritten into readable, structured code rather than leaving the renderer compressed into long single-line statements.

The Home module retains `group = earthGlobe.group` and `earth = earthGlobe.surface`. The exact Engine group is passed to `createMoonOrbit`; the surface remains a direct child `MeshStandardMaterial` sphere and remains the same object that the solar/day-night layer and Location marker use. The Moon source itself was not changed, and the Moon orbit remains Home-only.

The owner clarified that Home has a fixed zoom framing and no Basic/HD controls. Basic/HD and zoom belong exclusively to Independent Earth View. The Engine therefore now exposes generic `geometryDetail: "standard" | "high"` and `setGeometryDetail(...)` naming. Independent Earth View translates its own Basic/HD UI into those generic detail values. Home starts at fixed high detail (96 × 64 segments) and does not change geometry detail after initialization.

The Home `LiveEarthScene` service-worker API was narrowed to the current required interfaces: approved Location state, registered Stacks feature layers, Three.js access and redraw. Obsolete Home exploration, Basic/HD, unlock and pinch-zoom state was removed. Home retains rotation-only pointer input and locked camera framing. The Home API and solar-layer injection use the named `LIVE_EARTH_HOME_RENDERER_HOOKS` marker.

The service worker and update manager advance together to V116. No direct GitHub writes were made. Online/offline deployment and installed-iPhone acceptance remain pending the owner-uploaded ZIP, verified Action/commit and device tests.

## Global view ownership update — v128

The public Core factory now owns one global rotation quaternion across Engine-created Earth groups. It listens to the Global Orb System's pre-transition and post-transition events, captures only the outgoing active group's normalized quaternion, and applies it to the incoming group's quaternion. If the incoming group is created after the transition, `createEarthGlobe()` applies the current snapshot automatically. Current Stacks views reuse the Home group when they do not create a separate Engine globe.

The snapshot is restricted to `{x, y, z, w}` and is persisted to same-tab `sessionStorage` on view transitions and `pagehide`, not during pointer movement. Only the Engine-owned `liveEarthGlobalViewpointV1` key is read. The retired Home-only V3/V2/V1 keys are no longer migration sources. No camera, zoom, surface child transform, renderer, scene or Moon orbit state is transferred. Individual view controllers no longer import or call the Home-only bridge.
