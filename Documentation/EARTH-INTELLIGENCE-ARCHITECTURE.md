# LIVE // EARTH — Numerical-world database foundation

## Current phase

Keep the six numerical-world Stacks Orbs. The database foundation is prepared separately from the application views. No live database host, data source, collector, API or scheduler is connected in this phase.

## Application structure

Each numerical Orb has its own folder and dedicated JavaScript View Controller:

- `Atmosphere/atmosphere-view-controller.js`
- `Oceans/oceans-view-controller.js`
- `Land/land-view-controller.js`
- `Water-Ice/water-ice-view-controller.js`
- `Earth-Activity/earth-activity-view-controller.js`
- `Energy-Humanity/energy-humanity-view-controller.js`

The six controllers are loaded directly by the existing `externalModules` sequence in `Stacks/stacks-feature-views.js`. There is no separate Data-folder loader or configuration script for these Orbs.

The existing Global Feature Orb Contract and shared Orb controls remain in `Global/view-module-registry.js` and `Global/orb-controls-v4.js`. The Stacks feature runtime remains the owner of feature metadata, registration, the shared view shell, Earth-stage mounting and cleanup. Each dedicated numerical-world controller self-registers through `window.LiveEarthStacksFeatureRuntime` and owns its feature activation.

The original Stacks feature order remains unchanged: Clouds, Weather, Elevation, Earthquakes and Traffic. The six numerical worlds are appended after those entries in this order: Atmosphere, Oceans, Land, Water & Ice, Earth Activity, Energy & Humanity. They use the existing sequential Stacks module loader and its unavailable-module fallback; no second loader is introduced.

## Database

- One PostgreSQL 16+ database shared by all six numerical worlds.
- Target retention: 365 days for numerical observations and derived events.
- Source-file metadata, provenance and checksums are tracked.
- No sample measurements or fabricated events are included.
- The schema is `Database/PostgreSQL/001_initial_schema.sql`.

The database is not provisioned or connected yet. The schema is prepared only. No provider, live database host, source API, collector or scheduler is configured.

## Preservation boundaries

This correction only extends the existing Stacks module list, removes obsolete Data-loader references from the service-worker shell, and aligns this document with the implemented loading architecture. It does not refactor the Global Orb contract or controls, Home, Earth, Moon, Sun, Location, Weather, Clouds, Elevation, Earthquakes, Traffic, or the existing Earth/Moon/Sun engines and controllers.

The existing `Data/data-store.js`, `Data/dataset-manifest.json`, and PostgreSQL schema remain untouched. The existing 32-day news-feed retention policy is unrelated and remains unchanged.

No imagery, satellite imagery, webcam frames, visual feeds, browser database, or local persistence is used as numerical data input. Numerical-world controllers remain placeholders until an approved database and verified numerical data sources are connected.
