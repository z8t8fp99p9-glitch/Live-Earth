# LIVE // EARTH — Weather Living Landscape

**Updated:** 9 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  
**Current Residents baseline:** `e13130220496fc330b305a1579ce4ad37eee77f5`

## Weather scene

Weather keeps one continuous illustrated landscape. Hills, river, houses and trees remain in place. Sky palette, day/evening/night lighting, cloud coverage and drift, rain/snow particles, fog and occasional thunderstorm lightning respond to the selected hourly forecast.

## Residents rendering

The three neighbours now render as procedural 3D mesh characters through `Residents/resident-3d-engine.mjs`, using the Three.js r180 module already used by the app. The Weather view keeps the same foreground resident host and calls the shared library API. The renderer is transparent and does not replace or recompose the Weather background.

The current engine is a lightweight articulated-mesh prototype, not a final skinned GLB/mocap rig. Heads, torso, upper/lower arms and legs have independent pivots. Hair/face/clothing details and activity props are 3D geometry. Static WebP artwork remains only as a fallback for a device where WebGL cannot initialize.

## Forecast-driven behaviour

- Pleasant evening play is limited to local hour 16:00–19:00, temperature 17–30°C, cloud cover <=55%, no rain/snow/fog/thunder, wind <28 km/h and gusts <40 km/h.
- Rain: the red-hoodie and blue-jacket boys use umbrellas; the little lady enjoys the rain.
- Snow: all three wear warm winter accessories and shiver.
- Heat: the characters react to high apparent/actual temperature; the little lady uses a hand fan.
- Fast wind: sustained wind >=35 km/h or gusts >=48 km/h; only the blue-jacket boy can briefly lift in a strong gust >=65 km/h.
- Stargazing: night, cloud cover <=35%, no precipitation, snow, thunder or fog, and no fast wind.
- Fair dawn: exercise and butterfly-chasing routine.

The activity preview strip in Weather shows these same scene states in the same landscape. It is a visual preview only and **Live forecast** restores automatic forecast control.

## Data and privacy

Weather only reads a fresh in-memory position supplied by the existing shared Location service after the user turns the Location Orb ON. It never calls the Geolocation API or saves coordinates. When Location is OFF or the device is offline, weather values and weather-driven particles are cleared; stale weather is never presented as current.

Weather requests current conditions and up to 18 hourly forecast points from Open-Meteo. Units are Celsius, km/h and millimetres. Provider attribution remains visible.

## Runtime boundary

The new engine dynamically imports its same-origin module and imports `../vendor/three.module.js`, already provided by the app's existing Three.js r180 runtime dependency. The engine is fetched through the existing bounded optional cache; after a successful online load it can be reused offline. It caps pixel ratio, targets about 30 fps, observes reduced-motion settings and disposes its animation loop and WebGL resources when Weather deactivates.

No changes are made to Home/Earth Engine, Global Orbs, Moon, Sun, Location, Stacks, the service-worker BUILD_ID or update-manager BUILD_ID in this patch. Cyclones remain outside Weather.
