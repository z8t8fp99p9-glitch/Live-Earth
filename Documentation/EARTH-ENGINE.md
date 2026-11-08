# Earth Engine and Earth View Controller

**Decision date:** 8 November 2026  
**Baseline:** owner-supplied repository snapshot, reorganized under build `v127-earthengine-root-folder`; global-viewpoint integration is build `v128-global-orb-system`.

## Naming and ownership

## Repository structure

```text
EarthEngine/
├── Core/
│   └── earth-engine.js
├── Graphics/
│   ├── earth-engine-3d-graphics-engine.js
│   └── earth-engine-3d-graphics-core.js
└── Assets/
    └── README.md
```

The two Graphics modules are actual working modules: Graphics Engine assembles the globe objects, while Graphics Core owns the reusable Three.js geometry, materials, texture lifecycle and disposal primitives. Three.js itself is still the separately cached low-level dependency at `vendor/three.module.js` and `vendor/three.core.js`; it is not duplicated or copied into this folder.

The source archive did not include the NASA texture as a tracked binary file. The service worker downloads it and caches it at the logical same-origin path `EarthEngine/Assets/earth-land-ocean-ice-2048.png`, with the pre-existing Three.js Earth texture fallback. See `EarthEngine/Assets/README.md`.


- **Home Earth** is the main globe rendered by the inline Three.js module in `index.html`. It uses Earth Engine only for its globe group, surface mesh, atmosphere, material, texture and fixed geometry detail. Home retains its own scene, locked camera framing, WebGL renderer, lights, responsive sizing, rotation input, stars, animation and Home-specific layers.
- **Earth Engine** (`EarthEngine/Core/earth-engine.js`) is the reusable globe-object factory for any view that supplies its own Three.js namespace. It creates independent globe groups/surfaces and owns the geometry/material/texture lifecycle. Its geometry API uses generic `standard` and `high` detail levels; it does not know about view-specific UI labels. It does not create a scene, camera, WebGL renderer, navigation state or Location permission state.
- **Earth View Controller** (`Earth/earth-view-controller.js`) owns the separate full-screen Earth View. It owns its stage, scene, camera, WebGL renderer, responsive sizing, solar shader, gestures, zoom, quality controls and Scanner UI. It obtains its Earth group/surface/atmosphere from Earth Engine.
- The existing `earth-mode-navigation.js` filename is retired. `index.html` bootstrap and `sw.js` shell/fallback paths point to `Earth/earth-view-controller.js`.

## Reusable API

A view imports `createEarthGlobe` or `createGlobe` from `EarthEngine/Core/earth-engine.js`, supplies its own Three.js namespace, and attaches the returned group to its own scene:

```js
import { createEarthGlobe } from "../EarthEngine/Core/earth-engine.js";
const globe = await createEarthGlobe({
  THREE,
  radius: 1,
  textureUrl: "./EarthEngine/Assets/earth-land-ocean-ice-2048.png",
  geometryDetail: "standard", // or "high"
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
- The Home Moon orbit is an independent, Home-only additive layer. It receives the Home Engine group and attaches only its own Moon/orbit objects. Its updates may change only Moon/orbit-owned objects, especially `moon.position`. It must never look up or write to the Earth surface or Earth group.
- Earth orientation is owned exclusively by the Home user's globe drag. Moon orbital calculations, sidereal time and Moon rendering have no authority to rotate or otherwise modify Earth.
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

Local tests cover: module syntax, separate per-view scene objects, radius/geometry isolation, shared-texture reference counting and disposal, fixed Home geometry and locked camera, Home surface identity, runtime proof that Moon Orbit cannot mutate Earth, independent Earth Basic/HD mapping to generic Engine detail, Home API scope, controller registration and service-worker shell/build wiring.

The checks do not establish GitHub Actions, deployment or installed-iPhone acceptance. Those require the owner-uploaded ZIP, verified Action/commit, and online/offline device testing.


## One Global Earth Engine and Home viewpoint bridge

- `EarthEngine/Core/earth-engine.js` is the only Earth globe construction engine. Home, `Earth/earth-view-controller.js` and `Earth/earth-orb-globe.js` all create their globe instances through this module, using the same local Earth texture. The one fixed `-0.35` surface calibration is owned centrally by the Engine, not repeated in view controllers.
- Each renderer receives its own Engine-created group/surface instance. This is required because Home, Independent Earth View and Earth Modes own separate scenes and WebGL renderers; they do not share or reparent one live Three.js mesh. They nevertheless render the same canonical Earth through the same Engine implementation and texture.
- `EarthEngine/Core/earth-engine.js` owns one global user-controlled parent-group quaternion across active Engine-created views. It does not read or apply the Earth surface child quaternion. The Engine-owned `-0.35` surface calibration remains identical in every view. The legacy bridge remains only as a migration reference; current view controllers do not call it.
- Home restores the saved group quaternion at startup, publishes pointer-move snapshots in memory, and persists the settled user orientation in same-tab `sessionStorage`. No Moon update may publish or modify the Earth viewpoint.
- Independent Earth View and Earth Modes first create their Earth through the Global Engine, then apply Home's parent-group orientation. Their own camera and zoom are initialized/animated afterward and remain independent.
- The bridge is one-way. Secondary Earth views must not publish rotations back into Home. Weather, Clouds, Elevation, Earthquakes and Traffic already attach layers to the exact Home Earth scene, so they follow its orientation without a bridge.
- Moon and Sun are separate celestial systems. Moon Orbit may update only its own Moon/orbit objects; it must never mutate Earth's surface or parent transform. Sun/day-night lighting may shade Earth but must not rotate it.

### V124 bridge correction superseded
V124 incorrectly treated the Moon-driven Earth surface rotation as part of the Home viewpoint and copied the child surface quaternion. That expanded a pre-existing Moon/Earth coupling into every bridged view. This was the wrong contract. V125 removes that transfer and removes the Moon Orbit write to the Earth surface. The canonical Engine base calibration remains fixed and identical across all Earth views.
