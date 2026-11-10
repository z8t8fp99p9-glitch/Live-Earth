# LIVE // EARTH — Illustrated Living Weather UI

**Date:** 10 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch baseline inspected:** `178a337072287aaa0bd18a9a61f8253a3ae8b02e`  
**Baseline Weather blob:** `cea3199c2b56e606eee945ab3817bcb34f1c39c4`  
**Baseline service worker blob:** `ab88ed78082ce78ca44283c3d5583592aae9074f`

## Design implemented

The Weather view is rebuilt around the uploaded 9 November Living Landscape ZIP's illustrated 2D SVG direction. The character layer and all character-specific behaviour are excluded.

- Soft gradient sky with a sun, moon and stars.
- Layered rolling hills, a winding river, small village details and foreground vegetation.
- Separate wide-screen landscape composition; portrait and landscape art preserve their proportions rather than stretching.
- Weather-driven cloud density and wind drift, rain, snow, fog, occasional storm lighting and gentle river movement.
- Dawn, daylight, evening and night palettes, including subtle stars and a moving sun position.
- Oversized temperature, vertical weather-condition phrase and local-time label.
- White rounded `Weather Today` card with an accessible horizontal 18-hour forecast. Selecting an hour changes the temperature, condition and illustrated atmosphere together.
- Existing Global Orb dock is not recreated or modified.

## Data, privacy and offline behaviour

- Uses Open-Meteo current conditions and hourly forecast, in Celsius, km/h and mm.
- The first forecast item is replaced by the actual current observation so an already-past hourly estimate is not shown as current.
- Reads coordinates only from the existing shared Location Orb service after permission is enabled.
- Does not call the browser Geolocation API, request location independently, or persist coordinates.
- Location OFF and offline states clear forecast values and weather effects. Stale values are not presented as current.
- Open-Meteo attribution is retained.

## Runtime boundaries

Only `Weather/weather-view.js` is replaced by this package. The existing Stacks `mount('weather')` and feature registration contracts remain in use. The Global Orb dock remains owned by the app shell.

The inspected `sw.js` already includes `./Weather/weather-view.js` in `APP_SHELL`; no service-worker, cache, Update Manager, Stacks, Location, Home, Earth, Moon or Sun changes are required.

## Verification

- `node --check Weather/weather-view.js`
- `Tests/weather-immersive-scene.test.cjs`
- `Tests/weather-floating-overlay-morning.test.cjs`
- `Tests/weather-detail-refinement.test.cjs`
- `Tests/weather-sky-dominant-composition.test.cjs`
- `Tests/weather-scene-runtime.test.cjs`

All five tests passed locally. No browser/device deployment test has been performed. Final iPhone safe-area and visual acceptance still requires deployment to the user's device.

## Package scope

The root `UPLOAD_MANIFEST.json` contains SHA-256 and byte-size checks for every payload. Upload the ZIP intact at the repository root; do not extract it manually.
