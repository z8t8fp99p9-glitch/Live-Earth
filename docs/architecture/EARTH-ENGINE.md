# Earth Engine and Earth View Controller

**Decision date:** 8 November 2026  
**Baseline:** `main` at `ed71101e506efe9462027a991a669ad34418ecfb`

## Naming and ownership

- **Home Earth** is the existing main globe rendered by the inline Three.js module in `index.html`. It remains unchanged by the reusable Engine work.
- **Earth Engine** (`earth-engine.js`) is a reusable module that builds independently transformable Earth globe objects for any view that supplies its own Three.js namespace. It does not create a scene, camera, WebGL renderer, navigation state or Location permission state.
- **Earth View Controller** (`earth-view-controller.js`) owns the separate full-screen Earth View. It owns its stage, scene, camera, WebGL renderer, responsive sizing, solar shader, gestures, zoom, quality controls and Scanner UI. It obtains its Earth group/surface/atmosphere from Earth Engine.
- The existing `earth-mode-navigation.js` filename is retired. `index.html` bootstrap and `sw.js` shell/fallback paths point to `earth-view-controller.js`.

## Reusable API

A view imports `createEarthGlobe` or `createGlobe` from `earth-engine.js`, supplies its own Three.js namespace, and attaches the returned group to its own scene:

```js
import { createEarthGlobe } from "./earth-engine.js";
const globe = await createEarthGlobe({
  THREE,
  radius: 1,
  textureUrl: "./runtime-assets/earth-land-ocean-ice-2048.png",
  quality: "basic", // or "hd"
  initialRotationY: 0,
  atmosphere: true
});
scene.add(globe.group);
// The calling view owns its camera, lights, animation and interaction.
// To release the globe when that view is permanently destroyed:
globe.dispose();
```

Each call creates its own group, surface mesh, geometry and materials. The module shares an asynchronously loaded surface texture between simultaneous globe instances using reference-counted ownership; disposing one view cannot invalidate another. The final dispose releases the shared texture. `setQuality("basic" | "hd")` changes only that instance's sphere geometry.

## Protected boundaries

- Do not redirect Home Earth to Earth Engine as part of this work.
- Do not copy the Home `LiveEarthScene` unlock/lock, camera or Location API into Earth Engine.
- Do not attach `moon-orbit.js` to Earth Engine. That orbit remains a Home-only layer.
- Do not let Earth View change Home Earth renderer, scene, camera, rotation, quality or pixel ratio.
- Keep both new JavaScript files and the already-approved Earth texture/Three.js files in the service-worker essential app shell so first offline use can resolve the module.
- Keep `sw.js` at the repository root and its cache/build identity synchronized with `update-manager.js`.

## Verification

Local tests cover: module syntax, separate per-view scene objects, radius/geometry isolation, shared-texture reference counting and disposal, reloading after disposal, untouched inline Home renderer, no Home-renderer mutation by Earth View, controller registration and service-worker shell/build wiring.

The checks do not establish GitHub Actions, deployment or installed-iPhone acceptance. Those require the owner-uploaded ZIP, verified Action/commit, and online/offline device testing.
