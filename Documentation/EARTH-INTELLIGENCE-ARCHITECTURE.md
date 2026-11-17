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

`Data/data-worlds.js` is only a sequential loader for these six controllers. It does not render or own any Orb view.

The existing `Stacks/stacks-feature-views.js` remains the shared Stacks registry and view-shell runtime. It owns registration, navigation, shared Earth stage mounting and cleanup. Each dedicated controller owns its own feature activation. The original five Stacks features and their registration order remain unchanged; the six numerical Orbs are appended after them in their existing order.

## Database

- One PostgreSQL 16+ database shared by all six numerical worlds.
- Target retention: 365 days for numerical observations and derived events.
- Source-file metadata, provenance and checksums are tracked.
- No sample measurements or fabricated events are included.
- The schema is `Database/PostgreSQL/001_initial_schema.sql`.

The database is not provisioned or connected yet. The schema is prepared only.

## Preservation boundaries

This change does not alter Home, Earth, Moon, Sun, Location, Weather, Clouds, Elevation, Earthquakes, Traffic, the shared Stacks registry, or the existing Earth/Moon/Sun engines and controllers. It does not alter the existing `Data/data-store.js` or `Data/dataset-manifest.json`.

No new imagery, visual feeds, browser database, or local persistence is used by these numerical-world placeholders.
