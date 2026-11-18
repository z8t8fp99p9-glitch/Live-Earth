# Stacks Feature Views

## Shared contract

`Stacks/stacks-feature-views.js` owns the shared Stacks feature runtime and retains Elevation. Weather, Clouds, Traffic and Earthquakes live in independent top-level folders and register through this runtime.

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
| Earthquakes | `Earthquakes/earthquakes-view.js` | USGS latest-day GeoJSON |
| Elevation | `Stacks/stacks-feature-views.js` | Retained elevation workspace using the shared Prime Earth layer |

## Numerical worlds

The numerical-world controllers use the same Stacks runtime and the same shared three-Orb dock. Atmosphere and Atmospheric Composition are separate worlds:

| World | Controller | Scope |
|---|---|---|
| Atmosphere | `Atmosphere/atmosphere-view-controller.js` | Temperature, pressure, wind and moisture |
| Atmospheric Composition | `Atmospheric-Composition/atmospheric-composition-view-controller.js` | Atmospheric constituents and chemistry, including greenhouse gases, ozone, aerosols and particulates |

Atmospheric Composition has its own catalogue ID (`atmospheric-composition`), Orb (`◌`), controller and lifecycle. It reuses the shared Earth Engine, Universal Grid System and GPU Grid Skin. Its verified data adapter is not connected yet, so it must not display sample or placeholder measurements. Its controller is included in the service-worker app shell.

Missing, stale, restricted or unsupported data must be presented honestly. Do not fabricate live traffic or weather readings.

## Testing

Check registration, repeated open/close, listener/observer cleanup, offline and reconnection states, Location ON/OFF, orientation changes, dock clearance and transitions to other features. Protect Home, Earth View, Moon and Sun.
