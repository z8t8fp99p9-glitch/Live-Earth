# LIVE // EARTH Weather View v2

This package replaces only `Weather/weather-view.js` on `main`.

## Experience
- Full-screen Three.js WebGL environment built from live 3D geometry: Japanese pavilion, garden trees, mountain forms, water, clouds and weather particles.
- Large current temperature, condition, feels-like and local date/time.
- Compact horizontally scrollable hourly forecast cards for the current day.
- A 7 DAYS control switches to a seven-row weekly forecast; this is not a scrolling ticker.
- Temporary scene selector (clear, cloudy, rain, storm, snow, fog, wind, heat, night). It changes the 3D atmosphere only and does not replace live readings or forecast data. LIVE SCENE returns to actual conditions.
- Responsive portrait/landscape layout and measured clearance above the existing shared feature dock.

## Integration contract
- Registers through the existing `window.LiveEarthStacksFeatureRuntime.registerFeature('weather', ...)` API.
- Uses the existing `mount('weather')`, `isActive('weather')`, `globe().getLocation()` and `window.liveEarthLocationAllowed()` contracts.
- Does not call browser geolocation or create another location permission flow.
- Open-Meteo request is made only while the existing Location service is explicitly enabled and has supplied valid coordinates.
- Requests current, hourly and seven-day daily forecast values with cancellation, an 18-second timeout, stale-response protection and 15-minute refresh while active.
- Location OFF and offline states are labelled; sample values are not represented as live data.
- Uses the app's existing same-origin `./vendor/three.module.js` runtime dependency (Three.js r180 is already staged by the existing service worker). No CDN import is added.
- Does not modify the Stacks registry, Orb dock, Home/Earth, Moon, Sun, Location, service worker, database, or ZIP extractor.

## Upload
Upload the ZIP intact to the repository root on `main`. Do not unpack it. The root `UPLOAD_MANIFEST.json` is mandatory and is validated by the existing automatic extractor. The manifest commit title is `Rebuild Weather View with 3D Scene and Forecast Controls`.

## Verification boundary
Local JavaScript syntax, static integration-contract checks, manifest byte counts/SHA-256, and ZIP integrity were checked before packaging. A real iPhone Safari WebGL session, live API response, GitHub Actions extraction, and Pages deployment can only be confirmed after upload and device testing.
