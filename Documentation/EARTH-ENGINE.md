# Prime Earth and Earth Engine — Ownership Contract

## Canonical names

- **Prime Earth** is the persistent globe rendered by the Home screen.
- **Earth Engine** is the reusable factory and lifecycle API in `EarthEngine/Core/earth-engine.js`. It is not a globe instance and is not another name for Prime Earth.
- **Earth View** is an independent full-screen view. It creates and owns its own Earth Engine globe instance, scene, camera, renderer, controls and view UI.
- **Stacks features** currently mount overlays onto Prime Earth's scene through the explicit `window.LiveEarthPrimeScene` API. This is a compatibility architecture, not a rule that every future data world must use Prime Earth.
- **Independent world views** must create and dispose their own globe using `createEarthGlobe()` and must not borrow Prime Earth's scene, camera, renderer or layer registry.

## Runtime API

- `window.LiveEarthPrimeScene` is the canonical runtime API for Prime Earth's scene. It exposes the existing layer registration, rendering, Three.js and approved-location interfaces.
- `window.LiveEarthScene` remains a temporary compatibility alias to the exact same API object for legacy modules. New code must not introduce dependencies on this alias.
- The service worker injects the Prime Earth API at the stable Home renderer marker. This API is owned by the Home renderer and must not be treated as the Earth Engine factory.
- Earth View may consult Prime Earth's API only for the approved location marker/location state. Its visible globe is created independently through Earth Engine.

## Engine implementation

- `EarthEngine/Core/earth-engine.js` is the reusable globe factory and manages quaternion-only viewpoint continuity between Engine-owned views.
- `EarthEngine/Graphics/earth-engine-3d-graphics-engine.js` assembles the globe objects.
- `EarthEngine/Graphics/earth-engine-3d-graphics-core.js` contains reusable graphics primitives.
- Each independent view receives its own Engine-created globe instance because its scene and renderer are independent. Instances share the factory, geometry calibration and texture lifecycle contract, not scene ownership.

## Viewpoint contract

Earth Engine transfers only the normalized user-controlled parent-group quaternion (`x`, `y`, `z`, `w`) between Engine-owned Earth views. It does not transfer cameras, zoom, scenes, renderers, lighting, surface-child transforms or Moon state.

Earth View drag handling must preserve the inherited quaternion and use quaternion/axis-angle deltas. Do not write Euler X/Y after receiving the Engine viewpoint; that can cause a first-drag orientation jump at certain yaw angles.

## Protected boundaries

- Prime Earth remains the Home-owned scene with locked framing, Home camera/renderer, solar/day-night presentation and Moon orbit.
- Earth View owns its own camera, renderer, globe instance and zoom.
- Moon Orbit updates only Moon/orbit objects and never rotates or modifies Prime Earth.
- Sun/day-night shading may illuminate Prime Earth but must not rotate it.
- Existing Weather, Clouds, Elevation, Earthquakes, Traffic and current Atmosphere Stacks overlays use Prime Earth's explicit scene API unless a separately approved view owns another globe.
- Numerical worlds must declare their Earth ownership explicitly. Do not silently route an Engine request to Prime Earth.
- Keep Earth Engine runtime files and required texture/vendor dependencies in the offline shell.

## Verification

Test Prime Earth startup and locked framing; independent Earth View construction and teardown; Prime Earth layer registration/cleanup; Engine per-view scene isolation; shared texture disposal; quaternion continuity; drag orientation; Moon/Prime Earth isolation; service-worker dependency paths; and repeated Stacks open/close. Source checks do not replace installed-iPhone transition testing.
