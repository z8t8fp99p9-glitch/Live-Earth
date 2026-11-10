# LIVE // EARTH — Living Topography Stage 0 Prototype

**Prepared:** 10 November 2026  
**Base:** `main` at `ea3e5576044f9edf999ea3b25b808111045c5f31`  
**Scope:** New, standalone visual proof at `Weather/LivingTopography/`. The legacy Weather implementation is not the design base and is not modified by this package.

## What is built

- Full-viewport immersive 3D landscape rather than a landscape card, flat illustration, or floating-island wallpaper.
- Procedurally elevated mountain ridges and valleys with terrain vertex shading and real sampled elevation contour lines.
- Instanced forest vegetation, a winding reflective river, waterfall and lower pool.
- Independent clustered 3D cloud volumes at separate heights and depths, with soft light response and slow drift.
- Directional sun lighting, shadows, atmospheric fog and responsive sky colour.
- Terrain/Contour Morphism forecast shelf, layered optical glass, fine instrument markings and fluid weather-state transitions.
- Clear, Cloud, Rain, Snow and Fog demonstration states. These are explicitly simulated; this prototype does not claim to show live weather.
- Mobile pixel-ratio cap, low-power renderer preference, 30 fps ceiling, reduced-motion support, pause-on-hidden behavior, and resource disposal on page exit.
- Existing same-origin `vendor/three.module.js` runtime only. No new third-party dependency, model download, texture download, network request, geolocation request or app-storage write.

## How to preview

After uploading and extracting this package with the existing repository ZIP workflow, open:

`/Weather/LivingTopography/`

The preview is intentionally separate from the production Weather entry. Stage 0 has no forecast-data integration and must be evaluated visually/performance-wise on the target iPhone before any production integration.

## Protected boundaries

No edits are made to `Weather/weather-view.js`, `Stacks/stacks-feature-views.js`, `sw.js`, `index.html`, the existing Earth Engine, Home, Moon, Sun, Location, Global Orbs, databases, cache policies or app update lifecycle. The prototype imports only the existing same-origin Three.js module.

## Validation

Run:

```sh
node --input-type=module --check < Weather/LivingTopography/living-topography.js
node Tests/weather-living-topography-prototype.test.cjs
```

These are source-level checks. They do not establish actual iPhone rendering, frame pacing, temperature/thermal behavior or memory stability. Those require opening the extracted preview on the user's device.

## Next milestone after device review

Connect verified local weather/forecast fields to the scene-state adapter, then build the Main Weather information hierarchy and connect the entry point to the existing Earth Engine Explorer without replacing it.
