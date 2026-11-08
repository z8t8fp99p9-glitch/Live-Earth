# 8 November 2026 — Reusable Earth Engine

The owner clarified that Home Earth must stay as it is. The inline Home renderer in `index.html`, its existing `LiveEarthScene` service-worker injection, solar day/night shader, Location state and Home-only `Home/moon-orbit.js` integration are preserved. Only the controller bootstrap path in `index.html` changes to the renamed Earth View Controller.

A reusable `Global/earth-engine.js` module now builds independent Earth globe objects for other views. Each caller supplies its own Three.js namespace and owns its scene, camera, renderer, controls and lifecycle. The Engine provides configurable radius, texture URL, basic/HD sphere geometry, initial surface rotation and optional atmosphere. It shares texture loads safely among simultaneous view instances, with reference-counted cleanup.

The separate full-screen Earth View is owned by `Earth/earth-view-controller.js`; it uses Earth Engine for its globe objects and retains its own stage, camera, renderer, responsive behaviour, solar day/night shading, gestures, zoom, Basic/HD controls and optional approved Location Scanner. The old `earth-mode-navigation.js` source path is retired. The worker shell and update-manager build identity are advanced together so new files are essential offline assets.

Static syntax checks and the focused Earth Engine isolation/texture-lifecycle test passed locally. The pre-existing `Tests/moon-engine-api.test.cjs` could not run because its referenced `moon-engine.js` is absent from the inspected `main` tree (GitHub returned 404); that unrelated test/source mismatch is not changed here. GitHub Actions, deployed behaviour and installed-iPhone online/offline testing remain pending owner upload and device verification.


## Home Earth adoption and fixed-camera boundary — V116

After the reusable Engine landed, Home was migrated to use the same Engine for its Earth surface, atmosphere, material and texture. Home continues to own its scene, camera, renderer, lighting, responsive camera fitting, pointer rotation, stars and draw loop. The Home module was rewritten into readable, structured code rather than leaving the renderer compressed into long single-line statements.

The Home module retains `group = earthGlobe.group` and `earth = earthGlobe.surface`. The exact Engine group is passed to `createMoonOrbit`; the surface remains a direct child `MeshStandardMaterial` sphere and remains the same object that the solar/day-night layer and Location marker use. The Moon source itself was not changed, and the Moon orbit remains Home-only.

The owner clarified that Home has a fixed zoom framing and no Basic/HD controls. Basic/HD and zoom belong exclusively to Independent Earth View. The Engine therefore now exposes generic `geometryDetail: "standard" | "high"` and `setGeometryDetail(...)` naming. Independent Earth View translates its own Basic/HD UI into those generic detail values. Home starts at fixed high detail (96 × 64 segments) and does not change geometry detail after initialization.

The Home `LiveEarthScene` service-worker API was narrowed to the current required interfaces: approved Location state, registered Stacks feature layers, Three.js access and redraw. Obsolete Home exploration, Basic/HD, unlock and pinch-zoom state was removed. Home retains rotation-only pointer input and locked camera framing. The Home API and solar-layer injection use the named `LIVE_EARTH_HOME_RENDERER_HOOKS` marker.

The service worker and update manager advance together to V116. No direct GitHub writes were made. Online/offline deployment and installed-iPhone acceptance remain pending the owner-uploaded ZIP, verified Action/commit and device tests.
