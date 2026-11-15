# Earth Engine and Earth Views

## Ownership

- `EarthEngine/Core/earth-engine.js` is the shared globe factory and owns the global viewpoint snapshot.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` assembles the globe objects.
- `EarthEngine/Graphics/earth-engine-3d-graphics-core.js` contains reusable graphics primitives.
- `Earth/earth-view-controller.js` owns the independent full-screen Earth View: scene, camera, renderer, view controls and Scanner UI.
- Home owns its own scene, camera, renderer, locked framing, solar/day-night layer, Moon orbit and Home-specific presentation.

Each view receives its own Engine-created globe instance because its scene and renderer are independent. They use the same factory, geometry calibration and Earth texture lifecycle.

## Viewpoint contract

Earth Engine transfers only the normalized user-controlled parent-group quaternion (`x`, `y`, `z`, `w`) between Engine-owned Earth views. It does not transfer cameras, zoom, scenes, renderers, lighting, surface-child transforms or Moon state.

Earth View drag handling must preserve the inherited quaternion and use quaternion/axis-angle deltas. Do not write Euler X/Y after receiving the Home pose; that can cause a first-drag orientation jump at certain yaw angles.

## Protected boundaries

- Home remains locked zoom; exploration settings must not leak into Home.
- Earth View owns its own camera and zoom.
- Moon Orbit updates only Moon/orbit objects and never rotates or modifies Earth.
- Sun/day-night shading may illuminate Earth but must not rotate it.
- Weather, Clouds, Elevation, Earthquakes and Traffic overlays use the existing Home Earth/Stacks contract unless a separately approved view owns another globe.
- Keep Earth Engine runtime files and required texture/vendor dependencies in the offline shell.

## Verification

Test globe construction, per-view scene isolation, shared texture disposal, quaternion continuity, drag orientation, fixed Home zoom, Moon/Earth isolation and service-worker dependency paths. A source test does not replace installed-iPhone transition testing.
