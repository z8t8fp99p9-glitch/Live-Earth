# LIVE // EARTH — Shared Residents Library

**Updated:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Inspected base:** `e13130220496fc330b305a1579ce4ad37eee77f5` — `Add in-view previews for Weather resident activities`

## Three permanent neighbours

The shared cast remains exactly three residents, with stable identities and clothing:

1. **Red Hoodie Boy** — energetic, tousled curls and red hoodie.
2. **Little Lady** — chestnut wavy bob, cream blouse, denim pinafore, brown boots and satchel.
3. **Blue Jacket Boy** — soft curls, light hoodie and blue jacket.

Identity and activity definitions live in `Residents/resident-library.js`. The Weather view chooses the context and forecast state. It does not own duplicate character artwork or animation state.

## 3D engine

`Residents/resident-3d-engine.mjs` builds the characters from real Three.js meshes using the app's existing Three.js r180 runtime. It adds separate head, torso, shoulder, elbow, hip and knee pivots; dimensional hair, faces, eyes, clothing, footwear and small activity props. The result is a transparent WebGL canvas placed in the existing resident foreground overlay.

This is a lightweight procedural 3D prototype: the parts are articulated by joint pivots and animation curves. It is not yet a skinned GLB model or motion-capture rig. No new 3D framework, video, network model downloads or large character binaries are added. Existing WebP artwork is retained only as a graceful fallback if WebGL or the 3D module is unavailable.

## Movement catalogue

The engine animates each character independently:

- **Calm:** breathing, head sway and staggered blinks.
- **Exercise:** the red-hoodie boy jumps, the lady follows a fluttering butterfly, and the blue-jacket boy stretches.
- **Play / walk:** alternating hips and legs with opposite arm swing and body bounce.
- **Rain:** two umbrellas; the lady dances in the rain.
- **Snow:** winter hats and scarves with shivering.
- **Heat:** the lady fans herself while the others react.
- **Wind:** the trio braces in the gusts; strong-gust lift stays limited to the blue-jacket boy.
- **Stargazing:** heads tilt toward the sky.
- **Kite / garden / picnic / festival / camping:** activity props and distinct limb/body movement.

The existing Weather `Residents · Preview` buttons continue to drive the same activity API. **Live forecast** returns control to the forecast. Preview scenarios remain visual only; they do not change real forecast values, Location permission, GPS, network requests or stored data.

## Runtime and lifecycle

The library mounts a transparent canvas in the existing Weather-owned resident host. It loads `resident-3d-engine.mjs` from the same origin, which imports the same-origin virtual `vendor/three.module.js` already used by the Earth Engine. The engine renders at a capped mobile pixel ratio and approximately 30 fps, respects reduced-motion preferences, resizes with its host and disposes the WebGL renderer and animation loop when Weather closes.

The new `.mjs` file is handled by the existing service worker's bounded optional-resource cache. A successful online load makes it available for later offline use. If WebGL initialization fails, the library marks `data-render-mode="2d-fallback"` rather than pretending that the 3D scene loaded.

## Protected boundaries

Weather keeps its existing single landscape, forecast calculations, Open-Meteo attribution, Location privacy behaviour and resident preview controls. The Global Orb system, Home/Earth Engine, Moon, Sun, Location implementation, Stacks runtime, service-worker build identity and update-manager build identity are not changed by this Residents-only patch.

## Superseded visual implementation

Earlier revisions used static WebP character sprites placed in SVG. Those assets and their visual designs are retained as references and fallback artwork, but static sprites are no longer the normal Residents renderer. The new normal path is procedural 3D mesh rendering with articulated movement.

## Verification boundary

Source-level and syntax checks can verify the module contract, animation states, reduced-motion handling and cleanup. Actual WebGL rendering, iOS GPU performance, portrait/landscape scaling and offline acceptance still require testing in the installed app after upload. Do not describe those device checks as complete until they are observed.
