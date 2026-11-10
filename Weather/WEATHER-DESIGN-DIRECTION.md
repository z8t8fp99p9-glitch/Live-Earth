# LIVE // EARTH — Weather visual direction

**Date:** 10 November 2026  
**Scope:** Production Weather Stacks view only

## Approved visual identity

Combine the three selected directions:

1. **Expressive typography** — oversized temperature and an editorial weather headline.
2. **Immersive full-screen atmosphere** — artwork fills the stage; weather information sits above it without competing with the composition.
3. **Japanese minimalist art** — art direction inspired by Japanese ink-wash and woodblock composition: quiet mountain layers, mist, water, a restrained red sun, maple foliage and a small architectural silhouette.

Japanese influence is visual artwork only. Do not add Japanese-language labels, decorative Japanese characters, or character/mascot figures.

## Composition rules

- Artwork is the visual anchor and must have room to breathe.
- Use a small number of translucent information groups rather than a crowded card dashboard.
- Keep the main temperature and condition immediately readable.
- Keep useful forecast information large enough for a phone screen.
- Use restrained red as an art accent, not as a general warning colour.
- Keep text in English and use the app's actual location/forecast data.

## Weather adaptation

The existing Open-Meteo current, hourly and daily response drives the visual state. The 2D artwork adapts its palette and lighting for clear, cloudy, rain, storm, snow, fog and hot conditions, plus dawn, daytime, evening and night. Rain, snow, fog and lightning are lightweight CSS effects. Reduced-motion preferences disable animation.

## Technical constraints

- Production Weather is 2D only: inline SVG, CSS and DOM. No Three.js, WebGL, canvas renderer or 3D scene.
- No external artwork or font dependency is added; the scene is bundled in `Weather/weather-view.js`.
- Weather reads only the app's already-enabled fresh Location fix. It must never request browser geolocation itself. Location remains OFF by default.
- Online data is refreshed while the view is active. Offline or unavailable data must not be presented as current; the artwork remains available.
- Respect iPhone safe areas and the existing shared Stacks Orb dock.

## Protected scope

Only `Weather/weather-view.js` and its Weather-specific regression tests are changed by this package. Do not alter Home, Earth/Earth Engine, Moon, Sun, Location, Global Orb/navigation lifecycle, Stacks runtime, service worker, update manager, databases or other views as part of this design work.
