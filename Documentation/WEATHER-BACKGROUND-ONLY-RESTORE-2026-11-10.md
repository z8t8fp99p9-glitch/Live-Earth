# LIVE // EARTH — Original 2D Weather Background Only

**Source of truth:** user-uploaded `weather-living-landscape-upload(1).zip` from 2026-11-10.

## What this restores
- The original ZIP `createAtmosphere()` illustrated 2D scene: original gradient sky, sun, moon, cloud layer, original rolling landscape SVG, weather particles, fog and lightning.
- No replacement artwork and no new river, hills, terrain or decorative additions. The illustration's own source artwork is retained as supplied.
- The only removed visual layer is the separate three-character SVG group and its character-specific animation/props.
- The scene caption is removed so the screen contains no extra text.
- The Weather panel, temperature, condition text, metrics, cards, hourly forecast controls, slider, refresh button and attribution are removed.
- Existing shared three Global Orbs are not recreated or modified.

## Weather operation
- The original 2D scene continues to respond to current Open-Meteo weather and local time: clear/cloudy, rain, storm, snow, fog, hot, dawn, day, evening and night.
- Cloud movement and precipitation effects use the current weather values.
- Location is read only from the shared Location Orb permission and in-memory `globe().getLocation()` fix. No direct Geolocation API calls or coordinate storage.
- Location OFF and offline clear weather effects; no stale conditions are shown as current.

## Integration
- Replaces only `Weather/weather-view.js` and focused Weather tests.
- Keeps `runtime.registerFeature('weather', activateWeather)` and existing `mount('weather')` contract.
- `sw.js` already includes `./Weather/weather-view.js` in `APP_SHELL`; no service-worker changes required.
- No GitHub changes were made while preparing this package.

## Verification
Run `node --check Weather/weather-view.js` and all `Tests/weather-background-*.test.cjs` plus `Tests/weather-immersive-scene.test.cjs`. Actual deployed iPhone visual acceptance still requires the user's device screenshot.
