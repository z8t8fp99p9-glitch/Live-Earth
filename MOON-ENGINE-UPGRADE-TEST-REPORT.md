# Global Moon Engine v2 — Test Report

**Date:** 7 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`, branch `main`  
**Starting Moon Engine blob:** `120e0fd4c31bf56e8e1841146fdbfbd46850f5b2`

## Implemented

- Added `create`, `createObject` and `createObject3D` public API aliases.
- A view can request a Moon mesh without creating a second renderer, then place that mesh in its own scene.
- Each Moon object owns its geometry and material and exposes independent position, rotation, scale, visibility and material controls.
- The NASA LROC equirectangular colour map is now the Moon surface source.
- The image is fetched once and saved to `Cache Storage` when the browser supports CORS, Cache Storage and `createImageBitmap`; later page sessions can reuse that saved image offline.
- Active instances using the same Three.js module share one texture object. Disposing one Moon does not dispose the shared texture.
- Texture and renderer cleanup are handled at instance disposal and true page unload. Back/forward-cache pages retain their resources.
- Existing preview framing, drag rotation, pinch zoom, wheel zoom, phase display and shared orbital-scene API are retained.

## Automated checks passed

Command: `node --check moon-engine.js`  
Command: `node tests/moon-engine-api.test.cjs`

The mocked API test passed these checks:

1. Global Moon Engine v2 registers and exposes the expected public API aliases.
2. Two Moon objects use separate geometry/material and independent transforms.
3. The NASA image is fetched once and written once to Cache Storage.
4. Two standalone previews can coexist with different Moon sizes while reusing the same texture object.
5. Destroying one preview does not invalidate the other preview's surface.
6. The separate shared Earth/Moon/orbit scene still contains its three expected objects.
7. Renderer cleanup, reference release, pagehide cleanup and back/forward-cache protection pass.
8. A fresh simulated offline page can create a Moon from the saved Cache Storage response without a network request.

## Scope protection

Only `moon-engine.js` is replaced. Two documentation files and one standalone Node test are added. No edits are made to `moon-view-controller.js`, Moon Time Scroller code, `moon-orbit.js`, `astronomy.js`, `celestial-engine-feature-views.js`, the Feature Orb registry, `update-manager.js`, `sw.js`, Earth/Sun engines, or Global Orb dependencies/behaviour.

## Still requires a real device check

The automated test uses mocked Three.js and browser APIs. It does not verify the real NASA server's CORS response, actual WebGL rendering, iPhone touch handling, or offline loading in Safari. Those checks must be made in the app after the user uploads the package and refreshes the app. The first successful NASA image load requires an internet connection; after that, the image is saved for offline reuse where the browser supports the required APIs.
