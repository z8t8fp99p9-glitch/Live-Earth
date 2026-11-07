# App and View Architecture

## App shell and navigation
- `index.html` is the application shell.
- `view-manager.js` is the primary-view state/transition authority.
- `view-module-registry.js` manages registered view modules and shared feature lifecycle.
- `orb-controls-v4.js` implements the protected Home Orb controls and orientation-specific scroll recovery.
- `ios-standalone-root-flow.js` supports the iOS full-screen/root-flow behaviour.
- `earth-mode-navigation.js` owns Earth exploration controls and view-transition integration.

Do not create parallel primary-view state or bypass the existing manager without an explicit architecture decision.

## Primary views
- Earth/Home Explorer uses the existing Home/Earth scene and approved baseline.
- Moon uses `moon-view-controller.js` and `moon-lunar-interface.js`.
- Sun uses `sun-view-renderer.js`.
- `sky-view-controller.js` provides the shared Sun/Moon stage host.

The Moon and Sun implementations remain separate. See `docs/standards/INDEPENDENT-SUN-MOON-VIEWS.md`.

## Global utility features
Location and Stacks are utility features rather than replacement primary views. Location privacy is OFF by default. Stacks and feature workspaces use the shared feature registry and existing interaction/lifecycle safeguards.

## Other feature workspaces
`engine-feature-views.js` and `stacks-feature-views.js` are ordinary feature-workspace modules. The removal of experimental Celestial notes did not remove these files or the production Moon/Sun engines.

## Runtime and data
- `sw.js` manages service-worker resource caching and startup shell behaviour.
- `update-manager.js` coordinates readiness and staged updates.
- `runtime-assets/` and root Moon/Sun artwork contain real runtime assets.
- `data-store.js` and `data-recovery.js` support local data/recovery.
- `recovery/` contains rollback snapshots and instructions.

Every file referenced by the service worker, update manager, view controller or lazy-loading path is a dependency. Do not remove or relocate based on filename alone.
