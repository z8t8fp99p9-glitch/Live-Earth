# LIVE // EARTH — Sky-Dominant Living Coast & Riverlands

**Date:** 10 November 2026  
**Status:** Direct Weather-view revision prepared for owner upload  
**Repository baseline inspected:** `main` at `bbea90e8d2e07ab31c5c174a88005af37548ff4a`  
**Baseline Weather blob:** `174aeb7165c43245a4f268433d186a087a2cb609`

## Composition target

The approved portrait reference combines the earlier detailed mountain/river world with a broad coastal horizon, but the Weather view must prioritise atmosphere—not ocean scenery. Portrait camera composition targets are:

- **50% sky:** expanded open-air region for cloud formations, sun/moon, haze and precipitation.
- **35% land:** connected mountain ridges, forested foothills, living valleys, river and waterfalls.
- **15% water:** a narrow coastal foreground with animated sea texture, foam and shoreline detail.

These are camera/art-direction targets, not hard pixel masks. Weather overlays remain legible above the scene.

## Changes

- Lowered portrait camera pitch and raised its look target to place the distant horizon near the middle of the composition, opening a much larger sky window.
- Kept the physical terrain scale unchanged; no non-uniform X/Z scaling was introduced.
- Moved the main shoreline forward so the ocean is a smaller lower foreground rather than a dominant panel of water.
- Extended the winding river through the valley to the revised coast so it still reads as a continuous mountain-to-sea system.
- Extended the sky backdrop above the layered cloud field.
- Kept landscape, tablet and desktop viewport profiles separate; this iteration's exact 50/35/15 target applies to portrait. Landscape remains independently framed for later refinement.

## Working weather behaviour retained

- Selected forecast hour continues to drive current readings and the scene together.
- Forecast cloud coverage controls cloud visibility/density; wind drives downwind cloud motion.
- Local dawn/day/evening/night controls sky, horizon, celestial cue and lighting.
- Measured precipitation drives rain and river response; rain probability alone does not create rain particles.
- Snow, fog, thunderstorm-only lightning, waterfall/spray, river flow and wind-roughened sea remain separate weather-responsive systems.
- No unsupported wave height, tide or river-discharge data is invented.

## Preserved contracts

- Existing `Weather/weather-view.js` route in Stacks and existing Three.js runtime import.
- Open-Meteo current conditions and 18-hour forecast; Celsius, km/h and millimetres.
- Existing Location Orb permission gate; no direct Geolocation request and no coordinate persistence.
- Location-off clearing, offline freshness, attribution, refresh, forecast strip and scrubber.
- Reduced-motion behaviour, hidden-view pause, resize handling and WebGL resource cleanup.
- No edits to Home, Earth Engine, Moon, Sun, Location, Global Orbs, Stacks runtime, databases, service worker, Update Manager or unrelated views.

## Verification

Local checks run for this package:

```sh
node --check Weather/weather-view.js
node Tests/weather-immersive-scene.test.cjs
node Tests/weather-floating-overlay-morning.test.cjs
node Tests/weather-scene-runtime.test.cjs
node Tests/weather-sky-dominant-composition.test.cjs
```

The Three.js runtime test is mocked. It verifies construction/state/disposal wiring only; it does not establish actual device WebGL output or visual fidelity. Real iPhone portrait comparison against the reference remains necessary after owner upload and deployment.

**Commit title:** `Balance Weather World Around a Sky-Dominant Coastline`

No GitHub write, commit, push or deployment was performed while preparing this package.
