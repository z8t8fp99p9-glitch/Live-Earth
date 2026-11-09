# Stacks Feature Views

## Ownership

The Global feature registry remains the owner of the feature Orb lifecycle and dock. The dock contains exactly three Orbs while a feature is active:

1. Active feature Orb — tap again to close the current feature.
2. Location Orb — toggles the existing Location service.
3. Stacks Orb — opens or closes the feature library.

Do not add a separate close button or modify feature Orb dimensions, positions, touch targets, animation, hitbox alignment, or lifecycle.

## Code ownership and folders

Each independent feature has one top-level folder; its files sit directly inside, without nested folders:

- `Weather/weather-view.js`
- `Clouds/clouds-view.js`
- `Traffic/traffic-view.js`
- `Earthquakes/earthquakes-view.js`

`Stacks/stacks-feature-views.js` remains the shared feature runtime and contains Elevation. `Global/view-module-registry.js` remains the shared lifecycle authority and is not duplicated inside feature folders.

Weather is a self-contained feature view. It renders its illustrated landscape and forecast-driven atmosphere without a character layer or a separate character subsystem.

## Full-screen layout contract

The four dedicated feature views occupy the full feature stage edge-to-edge. Safe-area insets are respected; the protected three-Orb dock remains visible above the view. There is one view scroll surface and no nested scrollers that could shift the Stacks scatter coordinate space. Elevation keeps its existing compact panel layout.

## Data and behaviour

- **Weather:** requests Open-Meteo current model conditions and up to 18 hourly forecast points only after Location is ON and a fresh in-memory position is available. No geolocation permission is requested by Weather. Coordinates are not stored by the view. Forecast values and weather-driven effects are cleared when Location is OFF or the device is offline; stale data is not presented as live.
- **Clouds:** displays NASA GIBS MODIS/Terra cloud-fraction imagery over the existing shared Earth. The source product is daily/nearest-available, and the view may check hourly for a newer product. No cached image is presented as current offline data.
- **Earthquakes:** displays the USGS latest-day GeoJSON feed and markers on the existing Earth. It refreshes while open and clears the live event list/markers when offline.
- **Traffic:** full-screen honest preview. No traffic source is currently connected; the view must not invent roads, congestion or route speeds.

## Weather's living 2D landscape

Weather uses one permanent illustrated landscape. The sky, clouds, daylight, rain, snow, fog and occasional lightning respond to the selected hourly forecast. The view contains no character, avatar, additional character asset, character animation framework or character-preview controls.

Cyclone tracking and cyclone-specific visuals are not part of Weather; they belong to the separate Cyclone Orb/view. Thunderstorm weather codes may produce rain and brief lightning in Weather, but must never be presented as cyclone activity.

## Shared Earth and cleanup

No feature creates a second Earth, renderer, camera or scene. Any layer must attach through `LiveEarthScene.registerLayer()` and return a disposal callback. Each feature must abort outstanding requests, clear timers and remove event listeners when deactivated. Keep Home Earth, Moon orbit, Moon and Sun renderers, Location privacy and Stacks Orb behaviour untouched.
