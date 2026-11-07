# LIVE // EARTH — Global Moon Engine API v2

## Purpose

`moon-engine.js` is the single reusable source for the Moon surface and Moon object. A production view should request a Moon object from this engine and add it to that view's existing Three.js scene. The requesting view continues to own its renderer, camera, lights, animation loop, layout, controls and lifecycle.

The Moon Engine does **not** create another WebGL renderer when a view uses `createObject`. This is the preferred integration path for Moon View, a Time Scroller, or any future view.

## Load the engine when a view needs it

The engine is lazy-loaded and registers itself globally when its script runs. A view can use this small shared loader pattern; the promise prevents two views from adding the same script at the same time:

```js
async function ensureMoonEngine() {
  if (window.LiveEarthCelestialEngines?.moon) return window.LiveEarthCelestialEngines.moon;
  if (!window.__liveEarthMoonEngineLoadPromise) {
    window.__liveEarthMoonEngineLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('./moon-engine.js', document.baseURI).href;
      script.async = true;
      script.onload = () => {
        const engine = window.LiveEarthCelestialEngines?.moon;
        if (engine) resolve(engine);
        else reject(new Error('Moon Engine loaded without registering its API.'));
      };
      script.onerror = () => reject(new Error('Moon Engine could not be loaded.'));
      document.head.appendChild(script);
    }).catch(error => {
      window.__liveEarthMoonEngineLoadPromise = null;
      throw error;
    });
  }
  return window.__liveEarthMoonEngineLoadPromise;
}

const moonEngine = await ensureMoonEngine();
```

## Basic integration

```js
// Use the same Three.js namespace that created this view's scene/renderer.
const moonHandle = await moonEngine.createObject({
  THREE,
  radius: 0.22,
  widthSegments: 64,
  heightSegments: 48
});

scene.add(moonHandle.object3D);
```

If the view already has no local `THREE` variable, the engine can load the app's bundled Three.js module itself:

```js
const moonHandle = await moonEngine.createObject({
  radius: 0.05,
  widthSegments: 24,
  heightSegments: 16
});
scene.add(moonHandle.object3D);
```

When adding the object to a scene that uses an existing renderer, passing that scene's own `THREE` namespace is recommended. It keeps all view objects on the same Three.js module instance.

## Independent controls

```js
moonHandle.setPosition(1.2, 0.4, -0.8);
moonHandle.setRotation({ x: 0, y: Math.PI / 3, z: 0 }); // radians
moonHandle.setScale(0.35);                               // uniform scale
moonHandle.setVisible(true);
moonHandle.updateMaterial({ roughness: 0.92, metalness: 0 });

// Read current values when needed.
const state = moonHandle.getState();

// On view close: remove this Moon and release only its geometry/material use.
moonHandle.dispose();
```

`setPosition` and `setRotation` accept either three numbers or an object/array with x, y and z values. `setScale` accepts one uniform number, three numbers, or an object/array. Rotation values are radians.

The returned `object3D` is the actual Three.js mesh. A view may also set its transform directly on `moonHandle.mesh` if preferred.

## Creation options

| Option | Default | Purpose |
|---|---:|---|
| `THREE` | App's bundled Three.js module | Pass the namespace used by the destination view. |
| `radius` | `1` | Sphere radius in the destination scene's world units. |
| `widthSegments` | `96` | Horizontal sphere detail; bounded to 8–256. |
| `heightSegments` | `64` | Vertical sphere detail; bounded to 6–256. |
| `roughness` | `0.98` | Standard-material roughness. |
| `metalness` | `0` | Standard-material metalness. |
| `position` | `(0, 0, 0)` | Initial position. |
| `rotation` | `(0, 0, 0)` | Initial Euler rotation in radians. |
| `scale` | `1` | Initial uniform or x/y/z scale. |
| `castShadow` | `false` | Whether the Moon mesh casts shadows. |
| `receiveShadow` | `false` | Whether the Moon mesh receives shadows. |
| `materialOptions` | `{}` | Additional `MeshStandardMaterial` options; the engine retains ownership of the NASA surface map. |

The host view supplies its own scene lighting. This is intentional: the same Moon can receive different lighting in different views without the engine taking over any view's lighting setup.

## Other engine methods

- `create`, `createObject` and `createObject3D` are aliases. They return an independently configurable Moon mesh handle.
- `createPreview(container, options)` creates the existing standalone immersive inspection preview, including its own renderer and touch/scroll controls. It continues to use the preview's established framing and gesture behaviour.
- `mountShared(container, options)` and `getShared()` preserve the separate shared orbital-scene interface.
- `releaseShared()` destroys only the shared orbital-scene instance.
- `surface` and `getSurfaceInfo()` describe the NASA LROC global colour map used by the engine.

## Shared texture and memory behaviour

The 2048 × 1024 NASA LROC image is fetched with CORS and saved in Cache Storage under `live-earth-moon-surface-v1` after the first successful load. Later views can reuse the saved image, including when offline. The first successful fetch requires a network connection.

Within one page and one Three.js module instance, simultaneous Moon objects share the same Three.js texture object and do not repeat the image download. A view's `dispose()` releases its own geometry, material and reference only; it does not dispose the shared texture used by other views. The shared texture is disposed when the page is actually unloaded. A page placed in the browser's back/forward cache keeps its resources intact.

A separate WebGL renderer/context may still upload its own GPU copy of a shared texture. That is normal WebGL behaviour; sharing the engine prevents duplicate image downloads and duplicate source textures, but does not promise one physical GPU allocation across independent contexts.

## Asset provenance

- Image: `lroc_color_2k.jpg` (2048 × 1024)
- Direct NASA file: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg
- NASA source page: https://svs.gsfc.nasa.gov/4720/
- Requested credit: NASA's Scientific Visualization Studio; Ernie Wright (USRA); Noah Petro (NASA/GSFC).

NASA describes this as an aesthetics-oriented 3D rendering map assembled from LROC Wide Angle Camera colour data, with polar gaps filled using a lower-resolution LOLA albedo map. It is a visual surface map, not a replacement for scientific source data.

## Isolation guarantee

This update changes only the Global Moon Engine API. It does not connect the engine to Moon View or the Moon Time Scroller, and does not alter their existing controllers. It does not change the Earth or Sun engines, the Feature Orb registry/lifecycle, Global Orb behaviour, or the service-worker startup contract.
