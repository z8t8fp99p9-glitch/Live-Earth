# Celestial Engine Foundation — Test Report

**Date:** 7 November 2026  
**Repository baseline:** `main` at `fdcb1777d3806d240f6459e60f776445ad98a6ae`  
**Updated baseline file:** `update-manager.js` blob `e57d59eac3fdb545d32d909cc0b5b3c665c133c2`

## Passed checks

1. `node --check` passed for `earth-engine.js`.
2. `node --check` passed for `moon-engine.js`.
3. `node --check` passed for `sun-engine.js`.
4. `node --check` passed for `celestial-engine-feature-views.js`.
5. `node --check` passed for the updated `update-manager.js`.
6. Mocked script registration confirmed that all three global engine APIs register and expose `createPreview`, `mountShared`, `getShared` and `releaseShared`.
7. Mocked registration confirmed that shared renderers are not created automatically at app startup.
8. Mocked Feature Orb registration confirmed exactly three new inspection workspaces: `celestial-earth-engine`, `celestial-moon-engine` and `celestial-sun-engine`.
9. Mocked lifecycle test confirmed that opening a workspace creates one temporary preview and closing it destroys that preview.
10. Mocked Update Manager test confirmed the optional loader starts while retaining the existing service-worker readiness identity `v110-retired-news-views` / `LIVE_EARTH_APP_READY_V75`.

## Isolation review

- `index.html`, `sw.js`, `view-module-registry.js`, `engine-feature-views.js`, `astronomy.js`, `moon-orbit.js`, `sun-view-renderer.js` and `moon-view-controller.js` are not included in the package and are not changed.
- No Global Orb sizing, control, registration or open/close code is modified.
- The new inspection controller registers only three new feature IDs and leaves their `connected` metadata false because they are not connected to production views.
- Engine scripts are lazy-loaded only when their workspace is opened. Preview renderers are destroyed when their workspace closes.

## Not yet verified

The checks above are static and mocked lifecycle tests. They do not replace a real iPhone/iPad browser test. The following still require testing after upload and app refresh: actual WebGL rendering, successful local Three.js module loading, Earth/Sun texture retrieval through the service worker, touch dragging, portrait/landscape layout and Feature Orb transitions on device.

**No GitHub files were written by the assistant.** The user must upload the ZIP through the existing repository workflow and run the app/device test.
