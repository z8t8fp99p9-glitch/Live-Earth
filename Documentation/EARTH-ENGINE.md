# Earth Engine and Earth View Controller

**Decision date:** 8 November 2026  
**Baseline:** `main` at the V115 reusable-engine build; this change advances the app to V116.

## Naming and ownership

- **Home Earth** is the main globe rendered by the inline Three.js module in `index.html`. It uses Earth Engine only for its globe group, surface mesh, atmosphere, material, texture and fixed geometry detail. Home retains its own scene, locked camera framing, WebGL renderer, lights, responsive sizing, rotation input, stars, animation and Home-specific layers.
- **Earth Engine** (`Global/earth-engine.js`) is the reusable globe-object factory for any view that supplies its own Three.js namespace. It creates independent globe groups/surfaces and owns the geometry/material/texture lifecycle. Its geometry API uses generic `standard` and `high` detail levels; it does not know about view-specific UI labels. It does not create a scene, camera, WebGL renderer, navigation state or Location permission state.
- **Earth View Controller** (`Earth/earth-view-controller.js`) owns the separate full-screen Earth View. It owns its stage, scene, camera, WebGL renderer, responsive sizing, solar shader, gestures, zoom, quality controls and Scanner UI. It obtains its Earth group/surface/atmosphere from Earth Engine.
- The existing `earth-mode-navigation.js` filename is retired. `index.html` bootstrap and `sw.js` shell/fallback paths point to `Earth/earth-view-controller.js`.

## Reusable API

A view imports `createEarthGlobe` or `createGlobe` from `Global/earth-engine.js`, supplies its own Three.js namespace, and attaches the returned group to its own scene:

```js
import { createEarthGlobe } from "./earth-engine.js";
const globe = await createEarthGlobe({
  THREE,
  radius: 1,
  textureUrl: "./runtime-assets/earth-land-ocean-ice-2048.png",
  geometryDetail: "standard", // or "high"
  initialRotationY: 0,
  atmosphere: true
});
scene.add(globe.group);
// The calling view owns its camera, lights, animation and interaction.
// To release the globe when that view is permanently destroyed:
globe.dispose();
```

Each call creates its own group, surface mesh, geometry and materials. The module shares an asynchronously loaded surface texture between simultaneous globe instances using reference-counted ownership; disposing one view cannot invalidate another. The final dispose releases the shared texture. `setGeometryDetail("standard" | "high")` changes only that instance's sphere geometry.

## Home Earth integration contract

- Home assigns `group = earthGlobe.group` and `earth = earthGlobe.surface`, then attaches that exact group directly to the Home scene. These lexical references remain available to the service-worker-injected Home API and solar/day-night layer.
- Home starts at fixed **high** geometry detail (96 × 64 segments), matching its previous sphere geometry. Home has no Basic/HD selector, no zoom buttons and no pinch-to-zoom mode. Its camera framing, renderer, pixel ratio, lights, pointer rotation, stars and frame scheduler remain Home-owned.
- The Home Moon orbit remains an independent, Home-only layer. It receives the exact Engine group, locates the Earth surface among that group's direct children, updates that mesh's sidereal rotation, and attaches its Moon/orbit system to the same group.
- **Do not wrap the Engine group in another group or change the Earth surface into a nested child.** `Home/moon-orbit.js` relies on the current direct-child relationship and the surface being a `MeshStandardMaterial` sphere with the configured radius.
- The solar/day/night shader and Location marker continue to reference the same Earth surface mesh. Home geometry detail is fixed after initialization.
- The service-worker-injected `LiveEarthScene` API is limited to current Home integrations: approved Location state, registered feature layers, Three.js access and redraw. It does not expose Home zoom or Basic/HD controls. Its API and solar layer use the stable `// LIVE_EARTH_HOME_RENDERER_HOOKS` insertion marker.

## Protected boundaries

- Home Earth now uses Earth Engine for its globe objects, while its own scene, renderer, locked camera, solar layer, Location service and Moon orbit remain Home-owned.
- Do not move Home camera, renderer, navigation, Location permission, feature-layer host or Orb behaviour into Earth Engine.
- Do not attach `Home/moon-orbit.js` to Earth Engine. That orbit remains a Home-only layer.
- Do not let Earth View change Home Earth renderer, scene, camera, rotation, geometry detail or pixel ratio.
- Keep both new JavaScript files and the already-approved Earth texture/Three.js files in the service-worker essential app shell so first offline use can resolve the module.
- Keep `sw.js` at the repository root and its cache/build identity synchronized with `Global/update-manager.js`.

## Verification

Local tests cover: module syntax, separate per-view scene objects, radius/geometry isolation, shared-texture reference counting and disposal, fixed Home geometry and locked camera, Home surface identity, compatibility with the Moon orbit direct-child lookup, independent Earth Basic/HD mapping to generic Engine detail, Home API scope, controller registration and service-worker shell/build wiring.

The checks do not establish GitHub Actions, deployment or installed-iPhone acceptance. Those require the owner-uploaded ZIP, verified Action/commit, and online/offline device testing.


## Home-to-viewpoint bridge

- `Global/earth-viewpoint-bridge.js` is a small shared orientation hand-off, separate from the reusable Earth Engine. Home publishes its Earth group quaternion after startup and whenever the user rotates Home.
- The independent Earth View reads that snapshot when activated and applies it to its own Earth group. It shares only the starting globe orientation—not the scene, camera, renderer, zoom, lighting, geometry, textures, feature layers or interaction state.
- The bridge is deliberately one-way. Independent Earth View exploration must not write its orientation back into Home; the Home scene and rotation remain protected.
- Weather, Clouds, Elevation, Earthquakes and Traffic attach layers to the exact Home Earth scene, so they already follow Home's orientation without copying or bridging anything.
- Moon and Sun are separate celestial views and do not consume Earth's orientation. The separate Earth Modes page currently uses `Earth/earth-orb-globe.js`, not Earth Engine; it is not part of this bridge.
- Future independent Earth Engine views should call `applyHomeOrientation()` on their newly created Earth group. Do not move orientation ownership into `Global/earth-engine.js`; the engine remains a reusable object factory without navigation state.
