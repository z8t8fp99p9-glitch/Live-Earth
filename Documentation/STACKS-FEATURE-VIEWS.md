# Stacks Feature Views

## Shared contract

`Stacks/stacks-feature-views.js` owns the shared Stacks feature runtime and retains Elevation. Weather, Clouds, Traffic, Live Cams and Earthquakes live in independent top-level folders and register through this runtime.

Every feature must:
- Mount into the shared full-screen stage and remain below the existing three-Orb dock.
- Use the active feature Orb as its close action.
- Clean up timers, observers, animation frames, listeners and pending requests on close.
- Preserve the shared dock's size, position, hitboxes and navigation behaviour.
- Avoid direct primary-view state changes and duplicate navigation/dock implementations.
- Consume approved Location state only; never request GPS permission itself.

## Current features

| Feature | Source | Data and behaviour |
|---|---|---|
| Weather | `Weather/weather-view.js` | Full-screen 2D Canvas atmosphere; Open-Meteo live conditions only with an approved fresh Location fix; labelled samples otherwise |
| Clouds | `Clouds/clouds-view.js` | NASA GIBS cloud-fraction imagery |
| Traffic | `Traffic/traffic-view.js` | Independent traffic workspace; show traffic data only after a verified provider is connected |
| Live Cams | `LiveCams/live-cams-view.js` | Camera-directory discovery; show only permitted free previews or safe publisher links; clearly label unavailable, stale or disabled records |
| Earthquakes | `Earthquakes/earthquakes-view.js` | USGS latest-day GeoJSON |
| Elevation | `Stacks/stacks-feature-views.js` | Retained elevation workspace using the shared Home Earth layer |

Missing, stale, restricted or unsupported data must be presented honestly. Do not fabricate live traffic, camera video or weather readings.

## Testing

Check registration, repeated open/close, listener/observer cleanup, offline and reconnection states, Location ON/OFF, orientation changes, dock clearance and transitions to other features. Protect Home, Earth View, Moon and Sun.
