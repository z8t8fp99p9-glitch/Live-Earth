# LIVE // EARTH — Numerical-world database foundation

## Current phase

The prepared database foundation remains scoped to the original six numerical worlds. Atmospheric Composition is a separate seventh numerical-style Stacks view; its data adapter is not included in the six-world database phase. The database foundation is separate from application view loading. No live database host, data source, collector, API or scheduler is connected in this phase.

## Application structure

Each numerical Orb has its own folder and dedicated JavaScript View Controller:

- `Atmosphere/atmosphere-view-controller.js`
- `Atmospheric-Composition/atmospheric-composition-view-controller.js` (separate Stacks view; adapter not connected)
- `Oceans/oceans-view-controller.js`
- `Land/land-view-controller.js`
- `Water-Ice/water-ice-view-controller.js`
- `Earth-Activity/earth-activity-view-controller.js`
- `Energy-Humanity/energy-humanity-view-controller.js`

The seven numerical-style Stacks controllers are declared in the shared catalogue and loaded one at a time only when the matching Orb is selected. The original database design below continues to cover the six previously defined numerical worlds only. There is no Data-folder controller loader or second navigation system.

The existing Global Feature Orb Contract and shared Orb controls remain in `Global/view-module-registry.js` and `Global/orb-controls-v4.js`. The Stacks feature runtime remains the owner of feature metadata, registration, the shared view shell, Earth-stage mounting and cleanup. Each dedicated numerical-world controller self-registers through `window.LiveEarthStacksFeatureRuntime` and owns its feature activation.

The catalogue order is preserved: Clouds, Weather, Elevation, Earthquakes and Traffic, followed by Atmosphere, Atmospheric Composition, Oceans, Land, Water & Ice, Earth Activity, Energy & Humanity and Editorial Engine. `Stacks/stacks-feature-views.js` owns the on-demand loader. It registers catalogue placeholders immediately, fetches only the selected controller, waits for self-registration and ignores late responses after the selected view changes.

## Database

- One PostgreSQL 16+ database shared by the six original numerical database worlds. Atmospheric Composition is not silently added to this database scope.
- Target retention: 365 days for numerical observations and derived events.
- Source-file metadata, provenance and checksums are tracked.
- No sample measurements or fabricated events are included.
- The schema is `Database/PostgreSQL/001_initial_schema.sql`.

The database is not provisioned or connected yet. The schema is prepared only. No provider, live database host, source API, collector or scheduler is configured.

## Preservation boundaries

The v155 startup-separation candidate moves all seven numerical-style Stacks controllers and feature-only grid helpers out of the essential shell. It retains the shared Stacks registry/runtime and core Earth Engine dependencies. It does not redesign the Global Orb contract or controls, Home, Earth, Moon, Sun, Location, Weather, Clouds, Elevation behaviour, Earthquakes, Traffic, or the existing Earth/Moon/Sun engines. Elevation's controller is only moved into the same on-demand loading boundary as the other Stacks views.

The existing `Data/data-store.js`, `Data/dataset-manifest.json`, and PostgreSQL schema remain untouched. The existing 32-day news-feed retention policy is unrelated and remains unchanged.

No imagery, satellite imagery, webcam frames, visual feeds, browser database, or local persistence is used as numerical data input. Numerical-world controllers remain placeholders until an approved database and verified numerical data sources are connected.
