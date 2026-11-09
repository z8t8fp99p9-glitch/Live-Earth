# LIVE // EARTH — Weather Living Landscape

**Updated:** 10 November 2026  
**Repository:** `z8t8fp99p9-glitch/Live-Earth`  

## Weather scene

Weather keeps one continuous illustrated landscape. Hills, river, houses and trees remain in place. Sky palette, day/evening/night lighting, cloud coverage and drift, rain/snow particles, fog and occasional thunderstorm lightning respond to the selected hourly forecast. There is no character layer, character library, avatar, 3D character renderer or character-preview control in the Weather view.

## Forecast and atmosphere

Weather requests current conditions and up to 18 hourly forecast points from Open-Meteo. Selecting a forecast hour updates the same landscape rather than switching to a different scene. The scene can show:

- Dawn, daylight, evening and night sky palettes.
- Cloud density and drift based on forecast cloud cover and wind.
- Rain and snow particles based on precipitation and snowfall.
- Fog and restrained thunderstorm lightning based on the selected forecast weather code.
- A subtle landscape colour treatment during rain or strong wind.

The visual treatment is decorative; forecast values remain the source of truth. No simulated conditions are presented as real weather.

## Data and privacy

Weather only reads a fresh in-memory position supplied by the existing shared Location service after the user turns the Location Orb ON. It never calls the Geolocation API or saves coordinates. When Location is OFF or the device is offline, weather values and weather-driven particles are cleared; stale weather is never presented as current.

Weather requests current conditions and up to 18 hourly forecast points from Open-Meteo. Units are Celsius, km/h and millimetres. Provider attribution remains visible.

## Runtime boundary

The Weather view uses the existing single illustrated scene, CSS atmosphere and lightweight DOM particles. It does not load character models, character artwork, a character animation framework or an additional renderer. It uses the existing Location and Stacks lifecycle contracts and does not modify Home/Earth Engine, Moon, Sun, Location, Stacks or the Global Orb system.

The service worker build now removes previously cached character modules and prototype assets during activation, while preserving unrelated optional cache entries and user data.
