# Stacks Feature Views

## Ownership

The Global feature registry remains the owner of the feature Orb lifecycle and dock. The dock contains exactly three Orbs while a feature is active:

1. Active feature Orb — tap again to close the current feature.
2. Location Orb — toggles the existing Location service.
3. Stacks Orb — opens or closes the feature library.

Do not add a separate close button or modify the feature Orb dimensions, positions, touch targets, animation, hitbox alignment, or lifecycle. These rules are shared Global standards, not per-feature preferences.

## Folder layout

Each independent feature has one top-level folder; its files sit directly inside, without nested folders:

- `Weather/weather-view.js`
- `Clouds/clouds-view.js`
- `Traffic/traffic-view.js`
- `Earthquakes/earthquakes-view.js`

`Stacks/stacks-feature-views.js` remains the shared runtime and contains Elevation. `Global/view-module-registry.js` remains the shared lifecycle authority and is not duplicated inside feature folders.

## Full-screen layout contract

The four dedicated feature views occupy the full feature stage edge-to-edge. Safe-area insets are respected; the protected three-Orb dock remains visible above the view. There is one view scroll surface and no nested scrollers that could shift the Stacks scatter coordinate space. Elevation keeps its existing compact panel layout.

## Data and behaviour

- **Weather:** requests Open-Meteo current model conditions only after Location is ON and a fresh in-memory position is available. No geolocation permission is requested by Weather. Coordinates are not stored by the view. Live conditions are not shown offline.
- **Clouds:** displays NASA GIBS MODIS/Terra cloud-fraction imagery over the existing shared Earth. The source product is daily/nearest-available, and the view may check hourly for a newer product. No cached image is presented as current offline data.
- **Earthquakes:** displays the USGS latest-day GeoJSON feed and markers on the existing Earth. It refreshes while open and clears the live event list/markers when offline.
- **Traffic:** full-screen honest preview. No traffic source is currently connected; the view must not invent roads, congestion or route speeds.

## Weather's living 2D landscape

The Weather view uses one permanent, illustrated 2D landscape. The landscape composition does not swap when conditions change; only the sky palette, day/evening/night light, cloud density and drift, rain/snow particles, fog and storm flashes respond to the selected hourly forecast. The interface is built from inline SVG, CSS and lightweight DOM particles; it does not require a video background, 3D renderer or separate artwork download.

Exactly three small illustrated characters live in that landscape:

- In pleasant evening weather (selected local hour 16:00–19:00, comfortable temperature, low cloud, no precipitation/fog and gentle wind), they play together.
- In rain, the first two hold umbrellas while the third enjoys the rain.
- In snow, all three wear warm clothes and shiver.
- In heat, they react with sweat and hand fans.
- In fast wind, they lean and brace against the gusts. The current visual threshold is sustained wind at least 35 km/h or gusts at least 48 km/h.

Cyclone tracking and cyclone-specific visuals are not part of this Weather scene; they belong to the separate Cyclone Orb/view. Thunderstorm weather codes may produce rain and brief lightning in the Weather scene, but must not be represented as a cyclone.

The selected forecast hour drives both the displayed measurements and the scene. The view requests current conditions and up to 18 upcoming hourly forecast points from Open-Meteo, with Celsius, km/h and millimetres explicitly selected. It uses only a fresh position already provided by the enabled shared Location service, never requests geolocation itself, keeps coordinates in memory only, and clears live weather when Location is OFF or the device is offline. Reduced-motion preferences are respected.

## Shared Earth and cleanup

No feature creates a second Earth, renderer, camera or scene. Any layer must attach through `LiveEarthScene.registerLayer()` and return a disposal callback. Each feature must abort outstanding requests, clear timers and remove event listeners when deactivated. Keep Home Earth, Moon orbit, the Moon and Sun renderers, Location privacy and Stacks Orb behaviour untouched.
