# LIVE // EARTH — Weather Living Landscape

**Prepared:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch inspected:** `main`  
**Base HEAD for the residents-library revision:** `a297fc0035becc7d22e34e3088a10eb1301031ef` — `Bring Weather to life with a forecast-driven 2D landscape`

## Product direction

Weather uses one permanent 2D illustrated landscape. Hills, river, houses and trees remain in place. The sky palette, day/evening/night lighting, cloud coverage and drift, rain/snow particles, fog and occasional thunderstorm lightning respond to the selected hourly forecast. The interface uses inline SVG, CSS and lightweight DOM particles; there are no video backgrounds, 3D renderers or downloaded scene assets.

## Residents

The three small residents are now owned by the shared `Residents/resident-library.js`, not drawn directly by Weather. Their consistent original chibi-inspired designs are deliberately small in the landscape, with large expressive heads and compact bodies. The shared library owns artwork, identities, poses and activity definitions; Weather supplies the selected forecast-driven activity.

Weather supports calm idle, pleasant evening play, two umbrellas plus one rain-loving resident, bundled-up shivering in snow, fan-and-sweat reactions in heat, fast-wind bracing, and calm clear-night stargazing. The activity catalogue also includes walking, picnics, kite flying, gardening, local celebrations and camping for future hosts. These extra activities are not selected randomly; local celebrations require a selected region and verified local calendar.

## Weather behaviour and data

- Pleasant evening play is limited to local hour 16:00–19:00, temperature 17–30°C, cloud cover <=55%, no rain/snow/fog/thunder, wind <28 km/h and gusts <40 km/h.
- Rain: residents one and two hold umbrellas; resident three enjoys the rain.
- Snow: all residents wear warm clothes and shiver.
- Heat: reacts at temperature/feels-like >=34°C.
- Fast wind: sustained wind >=35 km/h or gusts >=48 km/h; the third resident is briefly lifted only for gusts >=65 km/h.
- Stargazing: night, cloud cover <=35%, no precipitation, snow, thunder or fog, and no fast wind.

The selected forecast hour updates the displayed measurements and the same unchanging scene. Weather requests current conditions and up to 18 hourly forecast points from Open-Meteo. Units are Celsius, km/h and millimetres.

Cyclones remain outside the Weather scene and belong to their separate Orb/view. Thunderstorm codes can produce rain and lightning but must not be shown as cyclone tracking.

## Data and privacy contract

Weather only reads a fresh in-memory position supplied by the existing shared Location service after the user turns the Location Orb ON. It never calls the Geolocation API, saves coordinates or makes weather requests while Location is OFF. When Location is OFF or the device is offline, forecast values and weather-driven particles are cleared; stale weather is never presented as current.

## Integration boundary

The Weather view remains loaded through the existing Stacks feature runtime and keeps the same shared Location, lifecycle and forecast data source. The Residents script is warmed from the existing same-origin optional-resource path when Weather registers. The existing bounded optional cache can retain it for offline reuse after a successful fetch.

This residents-library revision does not modify the service worker, update manager, BUILD_ID, Global view registry, Stacks shared runtime, Orb geometry, Home/Earth renderer, Location implementation, Moon/Sun renderer or Cyclone view. Weather itself remains part of the existing essential shell.

## Prepared payload and validation

The residents revision package contains only:

- `Weather/weather-view.js`
- `Residents/resident-library.js`
- `Tests/weather-immersive-scene.test.cjs`
- `Tests/weather-resident-library.test.cjs`
- `Documentation/STACKS-FEATURE-VIEWS.md`
- `Documentation/WEATHER-LIVING-LANDSCAPE-2026-11-09.md`
- `Documentation/RESIDENTS-LIBRARY-2026-11-09.md`
- `Documentation/INDEX.md`

Local syntax and focused source-contract tests are reported separately from GitHub Actions, upload/extraction, deployment and iPhone acceptance. No GitHub files have been written by this preparation.
