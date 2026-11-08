# 8 November 2026 — Reusable Earth Engine

The owner clarified that Home Earth must stay as it is. The inline Home renderer in `index.html`, its existing `LiveEarthScene` service-worker injection, solar day/night shader, Location state and Home-only `moon-orbit.js` integration are preserved. Only the controller bootstrap path in `index.html` changes to the renamed Earth View Controller.

A reusable `earth-engine.js` module now builds independent Earth globe objects for other views. Each caller supplies its own Three.js namespace and owns its scene, camera, renderer, controls and lifecycle. The Engine provides configurable radius, texture URL, basic/HD sphere geometry, initial surface rotation and optional atmosphere. It shares texture loads safely among simultaneous view instances, with reference-counted cleanup.

The separate full-screen Earth View is owned by `earth-view-controller.js`; it uses Earth Engine for its globe objects and retains its own stage, camera, renderer, responsive behaviour, solar day/night shading, gestures, zoom, Basic/HD controls and optional approved Location Scanner. The old `earth-mode-navigation.js` source path is retired. The worker shell and update-manager build identity are advanced together so new files are essential offline assets.

Static syntax checks and the focused Earth Engine isolation/texture-lifecycle test passed locally. The pre-existing `tests/moon-engine-api.test.cjs` could not run because its referenced `moon-engine.js` is absent from the inspected `main` tree (GitHub returned 404); that unrelated test/source mismatch is not changed here. GitHub Actions, deployed behaviour and installed-iPhone online/offline testing remain pending owner upload and device verification.
