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
Location and Stacks are utility features rather than replacement primary views. Location privacy is OFF by default. Stacks and its environmental feature workspaces use the shared feature registry and existing interaction/lifecycle safeguards.

## Retained editorial workspace
`Editorial-Engine/engine-feature-views.js` registers only the Universal Editorial Engine workspace. The Editorial Engine core is held in `Editorial-Engine/`. The feature does not register additional collection or publication views.

## Runtime and data
- `sw.js` manages service-worker resource caching and startup shell behaviour.
- `Global/update-manager.js` coordinates readiness and staged updates, including the Editorial Engine workspace.
- View-owned runtime artwork lives in the corresponding Home, Earth, Moon, Sun, Location and Stacks folders.
- `Data/data-store.js` and `Data/data-recovery.js` support local data/recovery.
- `Recovery/` contains general rollback instructions and retained snapshots.

Every file referenced by the service worker, update manager, view controller or lazy-loading path is a dependency. Do not remove or relocate based on filename alone.
