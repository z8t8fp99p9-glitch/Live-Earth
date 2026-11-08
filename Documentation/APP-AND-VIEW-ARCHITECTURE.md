# App and View Architecture

## App shell and navigation
- `index.html` is the application shell.
- `Global/view-manager.js` is the primary-view state/transition authority.
- `Global/view-module-registry.js` manages registered view modules and shared feature lifecycle.
- `Global/orb-controls-v4.js` implements protected Home Orb controls and orientation-specific scroll recovery.
- `ios-standalone-root-flow.js` supports iOS full-screen/root-flow behaviour.
- `earth-mode-navigation.js` owns Earth exploration controls and view-transition integration.

Do not create parallel primary-view state or bypass the existing manager without an explicit architecture decision.

## Primary views
- Earth/Home Explorer uses the existing Home/Earth scene and approved baseline.
- Moon uses `Moon/moon-view-controller.js` and `Moon/moon-lunar-interface.js`.
- Sun uses `Sun/sun-view-controller.js`.
- `Global/sky-view-controller.js` provides the shared Sun/Moon stage host.

The Moon and Sun implementations remain separate. See `Documentation/INDEPENDENT-SUN-MOON-VIEWS.md`.

## Global utility features
Location and Stacks are utility features rather than replacement primary views. `Location/location.js` owns the Home Location Orb's explicit permission request, GPS watch, fresh-fix validation and ON/OFF lifecycle. The separate Scanner button and marker visibility in `Earth/earth-view-controller.js` belong to Earth View and only consume an already-approved position; they never request geolocation. Location privacy is OFF by default. Stacks feature workspaces use the shared feature registry and existing interaction/lifecycle safeguards. The Global registry owns the protected three-Orb feature dock: active feature toggle, Location toggle and Stacks library.

## Stacks feature workspaces
`Stacks/stacks-feature-views.js` is the shared feature runtime and retains Elevation. The independently-owned full-screen views are held in four flat top-level folders: `Weather/weather-view.js`, `Clouds/clouds-view.js`, `Traffic/traffic-view.js` and `Earthquakes/earthquakes-view.js`. Each module registers through the shared Stacks runtime; none creates a second Earth scene or bypasses the Home Earth feature-layer contract.

The full-screen feature surfaces remain underneath the protected Global three-Orb dock. The active feature Orb is the close action; the other two Orbs continue to control Location and the Stacks library. Avoid adding a close button, changing Orb geometry, or introducing nested scroll containers that shift the feature scatter/hitbox coordinate space.

Weather reads only a fresh position already provided by the explicitly enabled Location system. Clouds uses NASA GIBS cloud-fraction imagery. Earthquakes uses the USGS latest-day GeoJSON feed. Traffic remains an honest preview until a verified traffic data source is approved; it must not fabricate congestion.

## Retained editorial workspace
`Editorial-Engine/engine-feature-views.js` registers only the Universal Editorial Engine workspace. The Editorial Engine core is held in `Editorial-Engine/`. The feature does not register additional collection or publication views.

## Runtime and data
- `sw.js` manages service-worker resource caching and startup shell behaviour.
- `Global/update-manager.js` coordinates readiness and staged updates, including the Editorial Engine workspace.
- View-owned runtime artwork lives in the corresponding Home, Earth, Moon, Sun, Location, Stacks and feature folders.
- `Data/data-store.js` and `Data/data-recovery.js` support local data/recovery.
- `Recovery/` contains general rollback instructions and retained snapshots.

Every file referenced by the service worker, update manager, view controller or lazy-loading path is a dependency. Do not remove or relocate based on filename alone.


## Shared Earth viewpoint
`Global/earth-engine.js` is the one canonical Earth globe factory used by Home, Independent Earth View and Earth Modes Basic/HD/Offline. Each view receives its own globe instance because each owns a separate scene and renderer, but all instances use the same engine, local Earth texture, geometry profiles and fixed base-surface calibration. `Global/earth-viewpoint-bridge.js` transfers only Home's user-controlled parent-group quaternion. It never copies the child surface transform, Moon state, camera or zoom, and secondary views never write their orientation back to Home. Stacks feature layers already use the Home Earth scene and naturally share its orientation. Moon and Sun remain independent.
