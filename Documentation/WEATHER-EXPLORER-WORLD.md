# Weather Explorer — Living World Design Contract

**Design status:** First implementation package prepared 15 November 2026  
**Repository baseline:** `de3b4f18048bc0802489dcee7209a81c11d1e603` (`main`)

## Visual idea

The Weather view is one continuous place, not a collection of weather wallpapers. Its landmark identity is a red Torii on a reflective lake, a Mount Fuji-inspired mountain, forested hills and autumn woodland.

## Composition rules

1. The protected hero composition is square (1:1). The master artwork is authored at 1024 × 1024 pixels.
2. The square is drawn at 82% of the viewport's shorter edge and centred. Its full scene remains visible in portrait and landscape; it is never stretched to the display's aspect ratio.
3. The surrounding environment adapts to the remaining screen. Landscape reveals side valleys and additional tree silhouettes. Portrait reveals more sky and lake breathing room.
4. The square is blended into a softly extended scene-derived backdrop. Its edge is feathered rather than shown as a hard-edged picture tile.
5. Weather information remains a minimal overlay. It must not take ownership of the shared Stacks dock or feature-close action.

## Current rendering implementation

- `Weather/weather-view.js` contains the renderer and the existing Weather feature/data lifecycle.
- `Weather/Art/weather-world-master-square.webp` is the square photographic master.
- Canvas layers create the surrounding extension and animate cloud drift, fog, water ripples, rain, splash rings, snow, wind-blown maple leaves, night lighting and storm flashes.
- The central master image is static. Motion is layered around and over it; the current implementation is 2.5D Canvas, not a full 3D terrain, dynamic tree rig, or physical water simulation.
- A procedural fallback draws a simple mountain, lake and Torii scene if the master image cannot load.

## Data and lifecycle safeguards

- Open-Meteo remains the forecast source.
- Weather reads only a location already approved through `Location/location.js`. It does not request location permission itself.
- Location remains OFF by default.
- The 15-minute refresh, preview/manual scene selector, status labels, offline/sample distinction and Stacks cleanup behavior remain in the Weather controller.
- Weather continues to register through `LiveEarthStacksFeatureRuntime`. The shared feature dock and active-Orb close contract remain unchanged.

## Caching and Essentials

The master artwork is intentionally not added to the app-shell essential list. The existing service worker sends non-shell same-origin assets through its bounded optional cache. After a successful online load, the artwork can be reused offline while it remains in that bounded cache. If it is unavailable, the procedural fallback is used. This keeps the Essentials count unchanged.

## Verification boundary

The package passed JavaScript syntax validation and mock-runtime smoke tests at 390 × 844 and 844 × 390, including all manual preview states. A browser screenshot run could not be completed in the available container, and installed-iPhone acceptance has not yet been performed. Verify on the device after upload, especially screen rotation, repeated open/close, feature switching, Location OFF/ON, offline startup and reconnection.
