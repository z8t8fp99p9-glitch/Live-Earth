# LIVE // EARTH — Weather Living Landscape

**Prepared:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Branch inspected:** `main`  
**Source HEAD:** `d0cc44234171ae121e8ac1b2095d7575192fd6e3`

## Product direction

Weather is presented through one permanent 2D illustrated landscape. The hills, river, houses and trees stay in place. The sky palette, day/evening/night lighting, cloud coverage and drift, rain/snow particles, fog and occasional thunderstorm lightning change in response to the selected hourly forecast. The interface uses inline SVG, CSS and lightweight DOM particles; there are no video backgrounds, 3D renderers or downloaded scene assets.

## Three-character behaviour

The scene contains exactly three small illustrated characters:

- Pleasant evening conditions (selected local hour 16:00–19:00, temperature 17–30°C, cloud cover <=55%, no rain/snow/fog/thunder, wind <28 km/h and gusts <40 km/h): the three play together.
- Rain: the first two hold umbrellas; the third enjoys the rain with arms open.
- Snow: all three wear warm clothes and shiver.
- Heat: the characters sweat and use hand fans.
- Fast wind: the characters lean/bracing against gusts. At gusts >=65 km/h, the third character is briefly lifted by the wind. Base wind triggers at sustained wind >=35 km/h or gusts >=48 km/h.

Cyclones are outside the Weather scene and belong to their own separate Orb/view. Thunderstorm codes can create rain and lightning here, but must never be presented as cyclone tracking.

## Data and privacy contract

The view requests Open-Meteo current conditions and up to 18 upcoming hourly forecast points. Units are explicitly set to Celsius, km/h and millimetres. The selected forecast hour updates both the displayed values and the same scene's weather behaviour.

Weather only reads a fresh in-memory location supplied by the existing shared Location service after the user turns the Location Orb ON. It never calls the Geolocation API, saves coordinates or makes weather requests while Location is OFF. When Location is OFF or the device is offline, forecast values and particles are cleared; stale data is not presented as live.

## Integration boundary

`Weather/weather-view.js` was already present in the essential Service Worker shell and startup-repair paths at the inspected source HEAD. The visual upgrade adds no runtime files, so no Service Worker, Update Manager, Global registry, shared Stacks runtime, Orb, Home, Earth, Moon, Sun or other feature changes are required. Cyclone view code remains untouched.

## Prepared payload and validation

The feature package contains only:

- `Weather/weather-view.js`
- `Tests/weather-immersive-scene.test.cjs`
- `Documentation/STACKS-FEATURE-VIEWS.md`
- this design/continuity note
- `Documentation/INDEX.md` to index this note

The Weather module and test pass JavaScript syntax checks. The focused Weather source-contract test passed locally against the changed Weather source and inspected integration contracts. The full repository regression suite, GitHub Actions, deployed app and installed-iPhone acceptance have not been verified for this package. No GitHub files have been written by this preparation.
