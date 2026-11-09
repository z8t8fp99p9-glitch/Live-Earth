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

`Residents/resident-library.js` is a shared visual component library, not a feature view and not an Orb. It owns the three consistent resident identities, their compact SVG artwork, reusable poses and activity catalogue. Individual views host the residents and select an activity; they do not copy character artwork or change the residents' identities. Weather is the first host.

## Full-screen layout contract

The four dedicated feature views occupy the full feature stage edge-to-edge. Safe-area insets are respected; the protected three-Orb dock remains visible above the view. There is one view scroll surface and no nested scrollers that could shift the Stacks scatter coordinate space. Elevation keeps its existing compact panel layout.

## Data and behaviour

- **Weather:** requests Open-Meteo current model conditions and up to 18 hourly forecast points only after Location is ON and a fresh in-memory position is available. No geolocation permission is requested by Weather. Coordinates are not stored by the view. Forecast values and weather-driven effects are cleared when Location is OFF or the device is offline; stale data is not presented as live.
- **Clouds:** displays NASA GIBS MODIS/Terra cloud-fraction imagery over the existing shared Earth. The source product is daily/nearest-available, and the view may check hourly for a newer product. No cached image is presented as current offline data.
- **Earthquakes:** displays the USGS latest-day GeoJSON feed and markers on the existing Earth. It refreshes while open and clears the live event list/markers when offline.
- **Traffic:** full-screen honest preview. No traffic source is currently connected; the view must not invent roads, congestion or route speeds.

## Weather's living 2D landscape

Weather uses one permanent illustrated landscape. Hills, river, houses and trees stay in place. The sky palette, day/evening/night lighting, cloud density and drift, rain/snow particles, fog and occasional thunderstorm lightning respond to the selected hourly forecast. The interface uses inline SVG, CSS and lightweight DOM particles; no video background, 3D renderer or separate artwork download is required.

Exactly three small, original chibi-inspired residents live in the scene. They have consistent visual identities and remain deliberately small relative to the landscape:

- In a pleasant evening forecast (local hour 16:00–19:00, temperature 17–30°C, cloud cover <=55%, no precipitation/fog/thunder, wind <28 km/h and gusts <40 km/h), they play together.
- In rain, residents one and two hold umbrellas while resident three enjoys the rain.
- In snow, all three wear warm clothes and shiver.
- In heat (feels-like or air temperature >=34°C), they react with sweat and hand fans.
- In fast wind (sustained wind >=35 km/h or gusts >=48 km/h), they brace against the gusts. Resident three gets the brief lift only at gusts >=65 km/h.
- On a clear, calm night (cloud cover <=35%, no precipitation/fog/thunder and no fast wind), they look up and stargaze.

The reusable activity catalogue also defines walking, picnics, kite flying, gardening, local celebrations and camping for future view hosts. Those catalogue entries are not triggered at random. A view must supply context before using them; in particular, a festival activity must be grounded in the user's selected region and a verified local calendar.

Cyclone tracking and cyclone-specific visuals are not part of Weather; they belong to the separate Cyclone Orb/view. Thunderstorm weather codes may produce rain and brief lightning in Weather, but must never be presented as cyclone activity.

## Resident library loading and lifecycle

Weather warms the same-origin `Residents/resident-library.js` when the Weather feature module registers. The existing service worker handles this non-shell component through its bounded optional-resource cache, allowing the library to be reused offline after it has been fetched successfully once. The library does not need a new Orb, Global registry entry, essential-shell entry or BUILD_ID change.

The Residents API exposes the fixed roster, activity catalogue, SVG renderer, host mount, activity selection and unmount operations. Hosts own when and why the residents appear. The shared library owns their identity and appearance. Every host must call unmount as part of its view cleanup. Reduced-motion preferences are respected.

## Shared Earth and cleanup

No feature creates a second Earth, renderer, camera or scene. Any layer must attach through `LiveEarthScene.registerLayer()` and return a disposal callback. Each feature must abort outstanding requests, clear timers and remove event listeners when deactivated. Keep Home Earth, Moon orbit, Moon and Sun renderers, Location privacy and Stacks Orb behaviour untouched.
